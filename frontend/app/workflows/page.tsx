"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, Clock3, Compass, Play, RefreshCw, X } from "lucide-react";
import { travelApi, type AgentResponse, type Preferences } from "@/lib/travel";
import styles from "./dashboard.module.css";

type Run = { id: string; message: string; template: string; status: string; created_at: number; duration_ms?: number; preferences: Preferences; trace: {agent: string; status: string; detail: string}[]; result: AgentResponse | null; error: string | null; events: {action: string; at: number}[] };
const statusName = (s: string) => s.replaceAll("_", " ");

export default function Dashboard() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const [template, setTemplate] = useState("trip");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { const data = await travelApi<{runs: Run[]}>("research-runs"); setRuns(data.runs); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load workflows."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void load();
    const timer = setInterval(() => { if (!document.hidden) void load(); }, 3000);
    return () => clearInterval(timer);
  }, [load]);
  const active = runs.find(r => r.id === selected) ?? runs[0];
  const working = runs.some(r => r.status === "running");
  async function action(path: string, body?: object) {
    setBusy(true); setError("");
    try {
      const run = await travelApi<Run>(path, {method: "POST", body: JSON.stringify(body ?? {})});
      setSelected(run.id); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "The action could not complete."); }
    finally { setBusy(false); }
  }
  return <main className={styles.page}>
    <aside className={styles.sidebar}>
      <Link className={styles.brand} href="/">Vacanes<span>Travel workspace</span></Link>
      <nav aria-label="Workspace navigation"><Link className={styles.current} href="/workflows"><Compass size={18}/> Workflows</Link><Link href="/planner">Chat & preferences <ArrowUpRight size={16}/></Link><Link href="/bookings">Bookings <ArrowUpRight size={16}/></Link><Link href="/"><ArrowLeft size={16}/> Back to explore</Link></nav>
      <p>Research, review, then decide.<br/>You stay in control.</p>
    </aside>
    <div className={styles.main}>
      <header className={styles.header}><div><span>Your travel desk</span><h1>Good journeys start<br/>with a little curiosity.</h1></div><Link href="/planner">Edit preferences <ArrowUpRight size={16}/></Link></header>
      <div className={styles.metrics}>
        <div><strong>{runs.filter(r => r.status === "running").length}</strong><span>Researching</span></div>
        <div><strong>{runs.filter(r => r.status === "awaiting_review").length}</strong><span>Ready for review</span></div>
        <div><strong>{runs.filter(r => r.status === "approved").length}</strong><span>Approved plans</span></div>
        <div><strong>{runs.length}</strong><span>Recent workflows</span></div>
      </div>
      {error && <div role="alert" className={styles.error}>{error} <button onClick={() => void load()}>Retry loading</button></div>}
      <section className={styles.composer} aria-labelledby="new-run"><div><h2 id="new-run">Where are we heading?</h2><p>Specialists use your saved preferences to research a plan for your review.</p></div>
        <form onSubmit={e => { e.preventDefault(); void action("research-runs", {message, template}); }}>
          <label>Workflow<select value={template} onChange={e => setTemplate(e.target.value)}><option value="trip">Plan a trip</option><option value="stays">Research stays</option><option value="transport">Compare transport</option></select></label>
          <label className={styles.prompt}>Your brief<textarea required minLength={3} maxLength={4000} value={message} onChange={e => setMessage(e.target.value)} placeholder="Three relaxed days in Goa, with quiet beaches and vegan food…" /></label>
          <button className={styles.primary} disabled={busy || working || message.trim().length < 3}><Play size={16}/>{working ? "Research in progress" : busy ? "Starting…" : "Start research"}</button>
        </form>
      </section>
      <div className={styles.workspace}>
        <section className={styles.list}><h2>Your workflows</h2>{loading ? <p>Loading saved workflows…</p> : runs.length === 0 ? <div className={styles.empty}><Compass size={32}/><h3>A world of possibilities.</h3><p>Start with a destination or an idea. Your research and decisions will stay here.</p></div> : runs.map(run => <button key={run.id} onClick={() => setSelected(run.id)} aria-pressed={active?.id === run.id} className={styles.run}><span className={styles.badge} data-status={run.status}>{statusName(run.status)}</span><strong>{run.message}</strong><small>{new Date(run.created_at * 1000).toLocaleString()}</small></button>)}</section>
        <section className={styles.detail} aria-label="Workflow details" aria-live="polite">
          {active ? <>
            <div className={styles.detailHeader}><h2>{active.message}</h2><span className={styles.badge} data-status={active.status}>{statusName(active.status)}</span></div>
            <p className={styles.preferences}>{active.preferences.dietary} meals · {active.preferences.pace} pace · INR {active.preferences.budget.toLocaleString()} · {active.preferences.travelers} traveler(s)</p>
            <div className={styles.trace}><h3>Agent activity</h3>{active.trace.length ? active.trace.map((step,i) => <div key={`${step.agent}-${i}`}><span>{step.status === "complete" || step.status === "live" ? <Check size={15}/> : <Clock3 size={15}/>}</span><p><strong>{step.agent}</strong><small>{step.detail}</small></p><em>{step.status}</em></div>) : <p>{active.status === "running" ? "The coordinator is reading your brief…" : "No completed steps recorded."}</p>}</div>
            {active.error && <p className={styles.error}>{active.error}</p>}
            {active.result && <div className={styles.result}><span className={styles.badge}>{active.result.mode === "ai" ? "AI-assisted research" : "Sample guidance"}</span><p>{active.result.answer}</p>{active.result.itinerary?.map(day => <article key={day.day}><h3>Day {day.day}: {day.title}</h3><ul>{day.activities.map((a,i) => <li key={i}>{a}</li>)}</ul><p>{day.meals}</p></article>)}{active.result.sources?.length > 0 && <div><h3>Research sources</h3>{active.result.sources.map((source,i) => /^https?:\/\//.test(source.url) && <a key={i} href={source.url} target="_blank" rel="noopener noreferrer">{source.title} <ArrowUpRight size={13}/></a>)}</div>}{active.result.notices?.map(n => <p key={n} className={styles.notice}>{n}</p>)}</div>}
            {active.status === "awaiting_review" && <div className={styles.review}><p>Approve to keep this plan as reviewed. This does not book travel or charge you.</p><div><button disabled={busy} className={styles.primary} onClick={() => void action(`research-runs/${active.id}/review`, {decision: "approved"})}><Check size={16}/>Approve plan</button><button disabled={busy} onClick={() => void action(`research-runs/${active.id}/review`, {decision: "rejected"})}><X size={16}/>Reject</button></div></div>}
            {["failed", "interrupted", "rejected"].includes(active.status) && <button disabled={busy || working} onClick={() => void action(`research-runs/${active.id}/retry`)}><RefreshCw size={16}/>Rerun with current preferences</button>}
            <details className={styles.audit}><summary>Run history{active.duration_ms ? ` · ${(active.duration_ms/1000).toFixed(1)} seconds` : ""}</summary>{active.events.map((e,i) => <p key={i}>{statusName(e.action)} · {new Date(e.at*1000).toLocaleString()}</p>)}<small>Run ID: {active.id}</small></details>
          </> : <div className={styles.empty}><h3>Every detail, in view.</h3><p>Select a workflow to see its research, sources, and review history.</p></div>}
        </section>
      </div>
    </div>
  </main>;
}
