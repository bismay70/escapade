"""Session-owned, persisted travel research runs with an explicit review gate.

Research is read-only. Approval saves a plan, never creates a reservation/payment.
The local worker uses a lease so abandoned runs become retryable after a restart.
"""
import asyncio
import json
import time
from uuid import uuid4

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field
from typing import Literal

from backend.models import Preferences


class RunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    message: str = Field(min_length=3, max_length=4000)
    template: Literal["trip", "stays", "transport"] = "trip"


class ReviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    decision: Literal["approved", "rejected"]


class Workflows:
    def __init__(self, store, agent):
        self.store, self.agent = store, agent
        self.tasks = set()
        with store.connect() as c:
            c.executescript("""
                CREATE TABLE IF NOT EXISTS workflow_runs(
                  id TEXT PRIMARY KEY, session TEXT NOT NULL, status TEXT NOT NULL,
                  payload TEXT NOT NULL, created REAL NOT NULL, updated REAL NOT NULL);
                CREATE INDEX IF NOT EXISTS workflow_owner ON workflow_runs(session,created);
            """)

    def expire(self):
        with self.store.connect() as c:
            c.execute("UPDATE workflow_runs SET status='interrupted',updated=? WHERE status='running' AND updated<?", (time.time(), time.time()-150))

    def get(self, sid, run_id):
        self.expire()
        with self.store.connect() as c:
            row = c.execute("SELECT * FROM workflow_runs WHERE session=? AND id=?", (sid, run_id)).fetchone()
        if not row:
            raise HTTPException(404, "Workflow not found.")
        return {**json.loads(row["payload"]), "id": row["id"], "status": row["status"], "created_at": row["created"], "updated_at": row["updated"]}

    def list(self, sid):
        self.expire()
        with self.store.connect() as c:
            rows = c.execute("SELECT id FROM workflow_runs WHERE session=? ORDER BY created DESC LIMIT 100", (sid,)).fetchall()
        return [self.get(sid, row["id"]) for row in rows]

    def create(self, sid, request):
        self.expire()
        now, run_id = time.time(), str(uuid4())
        if not request.message.strip():
            raise HTTPException(422, "Describe your trip first.")
        payload = {"message": request.message.strip(), "template": request.template,
                   "preferences": self.store.profile(sid).model_dump(mode="json"),
                   "history": self.store.history(sid), "trace": [], "result": None,
                   "events": [{"action": "created", "at": now}], "error": None}
        with self.store.connect() as c:
            c.execute("BEGIN IMMEDIATE")
            if c.execute("SELECT COUNT(*) FROM workflow_runs WHERE session=? AND status='running'", (sid,)).fetchone()[0]:
                raise HTTPException(409, "Wait for your current workflow to finish.")
            if c.execute("SELECT COUNT(*) FROM workflow_runs WHERE session=? AND created>?", (sid, now-60)).fetchone()[0] >= 6:
                raise HTTPException(429, "Please wait a minute before starting more workflows.")
            c.execute("INSERT INTO workflow_runs VALUES(?,?,?,?,?,?)", (run_id, sid, "running", json.dumps(payload), now, now))
        return self.get(sid, run_id)

    def mutate(self, sid, run_id, allowed, status, change):
        with self.store.connect() as c:
            c.execute("BEGIN IMMEDIATE")
            row = c.execute("SELECT * FROM workflow_runs WHERE id=? AND session=?", (run_id, sid)).fetchone()
            if not row:
                raise HTTPException(404, "Workflow not found.")
            if row["status"] not in allowed:
                raise HTTPException(409, "This workflow has already changed. Refresh and try again.")
            payload = json.loads(row["payload"])
            change(payload)
            c.execute("UPDATE workflow_runs SET status=?,payload=?,updated=? WHERE id=? AND session=?", (status, json.dumps(payload), time.time(), run_id, sid))

    def review(self, sid, run_id, decision):
        self.mutate(sid, run_id, {"awaiting_review"}, decision,
                    lambda p: p["events"].append({"action": decision, "at": time.time()}))
        return self.get(sid, run_id)

    def retry(self, sid, run_id):
        old = self.get(sid, run_id)
        if old["status"] not in ("failed", "interrupted", "rejected"):
            raise HTTPException(409, "Only failed, interrupted or rejected workflows can be rerun.")
        # A new run takes current saved preferences; never silently reuse stale ones.
        return self.create(sid, RunRequest(message=old["message"], template=old["template"]))

    def start(self, sid, run_id):
        task = asyncio.create_task(self.execute(sid, run_id))
        self.tasks.add(task)
        task.add_done_callback(self.tasks.discard)

    async def close(self):
        for task in self.tasks:
            task.cancel()
        await asyncio.gather(*self.tasks, return_exceptions=True)

    async def execute(self, sid, run_id):
        started = time.monotonic()
        run = self.get(sid, run_id)
        def progress(trace):
            self.mutate(sid, run_id, {"running"}, "running", lambda p: p.update(trace=trace))
        try:
            prompts = {"trip": "Plan a trip: ", "stays": "Research hotels and stays: ", "transport": "Research transport and flights: "}
            result = await asyncio.wait_for(self.agent.run(prompts[run["template"]]+run["message"], Preferences.model_validate(run["preferences"]), run["history"], on_progress=progress), timeout=110)
            def finish(p):
                p.update(result=result, trace=result.get("trace", []), duration_ms=round((time.monotonic()-started)*1000))
                p["events"].append({"action": "ready_for_review", "at": time.time()})
            self.mutate(sid, run_id, {"running"}, "awaiting_review", finish)
        except asyncio.CancelledError:
            self.mutate(sid, run_id, {"running"}, "interrupted", lambda p: p.update(error="Service stopped. Rerun this workflow to research again."))
            raise
        except Exception:
            self.mutate(sid, run_id, {"running"}, "failed", lambda p: p.update(error="Research could not complete. Check provider availability and rerun."))


def public_run(run):
    return {k: v for k, v in run.items() if k != "history"}
