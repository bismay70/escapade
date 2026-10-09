"""Long-term semantic memory store.

Provides a lightweight keyword-based memory layer that persists facts across sessions.
When a vector DB (e.g. Pinecone, Chroma) is configured via VECTOR_DB_URL the results
are enriched; without one it falls back to SQLite full-text search so the app always
works offline.

Architecture note: The Store class already persists short-term conversation history
(up to 100 messages per session). This module manages *long-term* memory items that
survive across sessions and can be retrieved semantically:
  - User facts ("prefers vegan food", "loves beaches")
  - Learned destination preferences ("loved Goa", "found Paris expensive")
  - Agent decisions that should influence future interactions
"""
import json
import re
import sqlite3
from contextlib import contextmanager
from pathlib import Path

from backend.config import database_path
from backend.vector_memory import embed, similarity


class MemoryStore:
    """Long-term memory; session-scoped, full-text-searchable."""

    def __init__(self, path: Path | None = None):
        self.path = path or database_path()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            conn.executescript("""
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS long_term_memory(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session TEXT NOT NULL,
                    kind TEXT NOT NULL DEFAULT 'fact',
                    key TEXT NOT NULL,
                    value TEXT NOT NULL,
                    source TEXT DEFAULT 'user',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS memory_vectors(session TEXT,key TEXT,vector TEXT,PRIMARY KEY(session,key));
                CREATE INDEX IF NOT EXISTS ltm_session ON long_term_memory(session);
                CREATE INDEX IF NOT EXISTS ltm_session_key ON long_term_memory(session, key);
                CREATE TABLE IF NOT EXISTS agent_events(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session TEXT NOT NULL,
                    workflow_id TEXT,
                    agent TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS ae_session ON agent_events(session);
                CREATE INDEX IF NOT EXISTS ae_workflow ON agent_events(workflow_id);
                CREATE TABLE IF NOT EXISTS approvals(
                    id TEXT PRIMARY KEY,
                    session TEXT NOT NULL,
                    workflow_id TEXT,
                    agent TEXT NOT NULL,
                    kind TEXT NOT NULL DEFAULT 'review',
                    prompt TEXT NOT NULL,
                    context TEXT NOT NULL DEFAULT '{}',
                    status TEXT NOT NULL DEFAULT 'pending',
                    decision TEXT,
                    feedback TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    decided_at TEXT
                );
                CREATE INDEX IF NOT EXISTS approvals_session ON approvals(session, status);
                CREATE TABLE IF NOT EXISTS workflows(
                    id TEXT PRIMARY KEY,
                    session TEXT NOT NULL,
                    name TEXT NOT NULL,
                    kind TEXT NOT NULL DEFAULT 'travel_plan',
                    status TEXT NOT NULL DEFAULT 'active',
                    payload TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS wf_session ON workflows(session);
            """)

    @contextmanager
    def _connect(self):
        conn = sqlite3.connect(self.path, timeout=10)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    # ──────────────────────────────────────── long-term memory ─────────

    def remember(self, session: str, key: str, value: str, kind: str = "fact", source: str = "agent") -> dict:
        """Upsert a memory item for this session."""
        key = key.strip()[:200]
        value = value.strip()[:2000]
        if not key or not value:
            raise ValueError("Memory key and value cannot be blank.")
        with self._connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            conn.execute("DELETE FROM long_term_memory WHERE session=? AND key=?", (session,key))
            conn.execute("INSERT INTO long_term_memory(session,kind,key,value,source) VALUES(?,?,?,?,?)", (session,kind,key,value,source))
            conn.execute("INSERT INTO memory_vectors VALUES(?,?,?) ON CONFLICT(session,key) DO UPDATE SET vector=excluded.vector",(session,key,json.dumps(embed(key+' '+value))))
        return {"key": key, "value": value, "kind": kind, "source": source}

    def recall(self, session: str, query: str = "", limit: int = 20) -> list[dict]:
        """Vector-ranked lexical retrieval, scoped to identity; not neural semantics."""
        limit=max(1,min(limit,100))
        with self._connect() as conn:
            rows=conn.execute("SELECT m.key,m.value,m.kind,m.source,m.created_at,v.vector FROM long_term_memory m LEFT JOIN memory_vectors v ON m.session=v.session AND m.key=v.key WHERE m.session=? ORDER BY m.id DESC LIMIT 1000",(session,)).fetchall()
        items=[dict(row) for row in rows]
        if re.search(r'\w',query):
            target=embed(query)
            for item in items:
                item['score']=similarity(target,json.loads(item['vector']) if item['vector'] else embed(item['key']+' '+item['value']))
            items=sorted((item for item in items if item['score']>.08),key=lambda item:item['score'],reverse=True)
        elif query.strip():
            return []
        return [{k:v for k,v in item.items() if k!='vector'} for item in items[:limit]]

    def forget(self, session: str, key: str) -> bool:
        with self._connect() as conn:
            conn.execute("DELETE FROM memory_vectors WHERE session=? AND key=?", (session,key))
            cursor = conn.execute("DELETE FROM long_term_memory WHERE session=? AND key=?", (session, key))
        return cursor.rowcount > 0

    def clear_memory(self, session: str):
        with self._connect() as conn:
            conn.execute("DELETE FROM memory_vectors WHERE session=?", (session,))
            conn.execute("DELETE FROM long_term_memory WHERE session=?", (session,))

    # ──────────────────────────────────────── observability ────────────

    def log_event(self, session: str, agent: str, event_type: str, payload: dict, workflow_id: str | None = None):
        """Append a structured agent event for audit and replay."""
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO agent_events(session, workflow_id, agent, event_type, payload) VALUES (?,?,?,?,?)",
                (session, workflow_id, agent, event_type, json.dumps(payload))
            )
            # Keep last 500 events per session to bound storage.
            conn.execute(
                "DELETE FROM agent_events WHERE session=? AND id NOT IN (SELECT id FROM agent_events WHERE session=? ORDER BY id DESC LIMIT 500)",
                (session, session)
            )

    def events(self, session: str, workflow_id: str | None = None, limit: int = 100) -> list[dict]:
        with self._connect() as conn:
            if workflow_id:
                rows = conn.execute(
                    "SELECT agent, event_type, payload, created_at FROM agent_events WHERE session=? AND workflow_id=? ORDER BY id DESC LIMIT ?",
                    (session, workflow_id, limit)
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT agent, event_type, payload, created_at, workflow_id FROM agent_events WHERE session=? ORDER BY id DESC LIMIT ?",
                    (session, limit)
                ).fetchall()
        return [{**dict(row), "payload": json.loads(row["payload"])} for row in rows]

    def metrics(self, session: str) -> dict:
        """Aggregate KPIs for the observability dashboard."""
        with self._connect() as conn:
            total = conn.execute("SELECT COUNT(*) FROM agent_events WHERE session=?", (session,)).fetchone()[0]
            by_agent = conn.execute(
                "SELECT agent, COUNT(*) as count FROM agent_events WHERE session=? GROUP BY agent ORDER BY count DESC",
                (session,)
            ).fetchall()
            errors = conn.execute(
                "SELECT COUNT(*) FROM agent_events WHERE session=? AND event_type IN ('error','timeout','fallback')",
                (session,)
            ).fetchone()[0]
            pending_approvals = conn.execute(
                "SELECT COUNT(*) FROM approvals WHERE session=? AND status='pending'",
                (session,)
            ).fetchone()[0]
            workflows_active = conn.execute(
                "SELECT COUNT(*) FROM workflows WHERE session=? AND status='active'",
                (session,)
            ).fetchone()[0]
        return {
            "total_events": total,
            "error_events": errors,
            "pending_approvals": pending_approvals,
            "active_workflows": workflows_active,
            "by_agent": [dict(row) for row in by_agent],
        }

    # ──────────────────────────────────────── human-in-the-loop ────────

    def create_approval(self, session: str, approval_id: str, agent: str, kind: str, prompt: str, context: dict, workflow_id: str | None = None) -> dict:
        with self._connect() as conn:
            conn.execute(
                "INSERT OR IGNORE INTO approvals(id, session, workflow_id, agent, kind, prompt, context) VALUES (?,?,?,?,?,?,?)",
                (approval_id, session, workflow_id, agent, kind, prompt, json.dumps(context))
            )
            row = conn.execute("SELECT * FROM approvals WHERE id=?", (approval_id,)).fetchone()
        return self._public_approval(row)

    def decide_approval(self, session: str, approval_id: str, decision: str, feedback: str = "") -> dict | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM approvals WHERE id=? AND session=?", (approval_id, session)).fetchone()
            if not row or row["status"] != "pending":
                return None
            conn.execute(
                "UPDATE approvals SET status='decided', decision=?, feedback=?, decided_at=CURRENT_TIMESTAMP WHERE id=?",
                (decision, feedback, approval_id)
            )
            row = conn.execute("SELECT * FROM approvals WHERE id=?", (approval_id,)).fetchone()
        return self._public_approval(row)

    def pending_approvals(self, session: str) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM approvals WHERE session=? AND status='pending' ORDER BY created_at ASC",
                (session,)
            ).fetchall()
        return [self._public_approval(row) for row in rows]

    def all_approvals(self, session: str, limit: int = 50) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM approvals WHERE session=? ORDER BY created_at DESC LIMIT ?",
                (session, limit)
            ).fetchall()
        return [self._public_approval(row) for row in rows]

    @staticmethod
    def _public_approval(row) -> dict:
        d = dict(row)
        d["context"] = json.loads(d["context"])
        return d

    # ──────────────────────────────────────── workflows ────────────────

    def save_workflow(self, session: str, workflow_id: str, name: str, kind: str, payload: dict) -> dict:
        with self._connect() as conn:
            conn.execute(
                """INSERT INTO workflows(id, session, name, kind, payload)
                   VALUES (?, ?, ?, ?, ?)
                   ON CONFLICT(id) DO UPDATE SET
                       name=excluded.name, payload=excluded.payload,
                       updated_at=CURRENT_TIMESTAMP""",
                (workflow_id, session, name, kind, json.dumps(payload))
            )
            row = conn.execute("SELECT * FROM workflows WHERE id=?", (workflow_id,)).fetchone()
        return self._public_workflow(row)

    def update_workflow_status(self, session: str, workflow_id: str, status: str) -> dict | None:
        with self._connect() as conn:
            conn.execute(
                "UPDATE workflows SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND session=?",
                (status, workflow_id, session)
            )
            row = conn.execute("SELECT * FROM workflows WHERE id=?", (workflow_id,)).fetchone()
        return self._public_workflow(row) if row else None

    def list_workflows(self, session: str, limit: int = 50) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM workflows WHERE session=? ORDER BY updated_at DESC LIMIT ?",
                (session, limit)
            ).fetchall()
        return [self._public_workflow(row) for row in rows]

    @staticmethod
    def _public_workflow(row) -> dict:
        d = dict(row)
        d["payload"] = json.loads(d["payload"])
        return d
