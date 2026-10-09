"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Activity, ArrowLeft, ArrowUpRight, BarChart2, Brain,
  CheckCircle, Compass, GitMerge, LoaderCircle, RefreshCw,
  Trash2, XCircle
} from "lucide-react";
import { travelApi, Approval, MemoryItem, Metrics, Workflow, AgentRole } from "@/lib/travel";
import styles from "./dashboard.module.css";

export default function AgentDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [memory, setMemory] = useState<MemoryItem[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [roles, setRoles] = useState<AgentRole[]>([]);
  const [trace, setTrace] = useState<{ agent: string; event_type: string; payload: Record<string, unknown>; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Add-memory form state
  const [memKey, setMemKey] = useState("");
  const [memValue, setMemValue] = useState("");
  const [memKind, setMemKind] = useState<"fact" | "preference" | "decision" | "note">("fact");

  // Add-workflow form state
  const [wfName, setWfName] = useState("");
  const [wfKind, setWfKind] = useState<"travel_plan" | "hotel_search" | "flight_search" | "destination_compare" | "custom">("travel_plan");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [m, a, mem, wf, r, t] = await Promise.all([
        travelApi<Metrics>("metrics"),
        travelApi<{ approvals: Approval[] }>("approvals?all=true"),
        travelApi<{ items: MemoryItem[] }>("memory/long-term"),
        travelApi<{ workflows: Workflow[] }>("workflows"),
        travelApi<{ roles: AgentRole[] }>("agents/roles"),
        travelApi<{ events: typeof trace }>("trace?limit=50"),
      ]);
      setMetrics(m);
      setApprovals(a.approvals);
      setMemory(mem.items);
      setWorkflows(wf.workflows);
      setRoles(r.roles);
      setTrace(t.events);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function decide(approvalId: string, decision: "approve" | "reject") {
    setBusy(true);
    try {
      await travelApi(`approvals/${approvalId}/decide`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      setApprovals(prev => prev.map(a => a.id === approvalId ? { ...a, status: "decided", decision } : a));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record decision.");
    } finally { setBusy(false); }
  }

  async function addMemory(e: React.FormEvent) {
    e.preventDefault();
    if (!memKey.trim() || !memValue.trim()) return;
    setBusy(true);
    try {
      const result = await travelApi<{ item: MemoryItem }>("memory/long-term", {
        method: "POST",
        body: JSON.stringify({ key: memKey.trim(), value: memValue.trim(), kind: memKind }),
      });
      setMemory(prev => [result.item, ...prev.filter(m => m.key !== result.item.key)]);
      setMemKey(""); setMemValue("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save memory item.");
    } finally { setBusy(false); }
  }

  async function deleteMemory(key: string) {
    setBusy(true);
    try {
      await travelApi(`memory/long-term/${encodeURIComponent(key)}`, { method: "DELETE" });
      setMemory(prev => prev.filter(m => m.key !== key));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete memory item.");
    } finally { setBusy(false); }
  }

  async function addWorkflow(e: React.FormEvent) {
    e.preventDefault();
    if (!wfName.trim()) return;
    setBusy(true);
    try {
      const result = await travelApi<{ workflow: Workflow }>("workflows", {
        method: "POST",
        body: JSON.stringify({ name: wfName.trim(), kind: wfKind, payload: {} }),
      });
      setWorkflows(prev => [result.workflow, ...prev]);
      setWfName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create workflow.");
    } finally { setBusy(false); }
  }

  async function updateWorkflowStatus(id: string, status: string) {
    setBusy(true);
    try {
      const result = await travelApi<{ workflow: Workflow }>(`workflows/${id}?status=${status}`, { method: "PATCH" });
      setWorkflows(prev => prev.map(w => w.id === id ? result.workflow : w));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update workflow.");
    } finally { setBusy(false); }
  }

  const pending = approvals.filter(a => a.status === "pending");

  return (
    <main className={styles.workspace}>
      <nav style={{padding:"18px 32px",display:"flex",gap:24}} aria-label="Platform navigation"><Link href="/studio">Workflow studio</Link><Link href="/workflows">Travel research</Link></nav>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}>
          <Compass size={22} /> Vacanes <span>/ agent dashboard</span>
        </Link>
        <nav className={styles.topLinks}>
          <Link href="/planner"><ArrowLeft size={14} /> Planner</Link>
          <Link href="/bookings">Bookings <ArrowUpRight size={14} /></Link>
          <button className={styles.panelAction} onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
        </nav>
      </header>

      <div className={styles.container}>
        <h1 className={styles.heading}>Agent Dashboard</h1>
        <p className={styles.subheading}>
          Monitor your AI agent team, manage approval requests, review long-term memory, and track workflows.
        </p>

        {error && <div className={styles.error} role="alert">{error}</div>}
        {loading && (
          <p className={styles.empty}>
            <LoaderCircle className={styles.spin} size={16} style={{ display: "inline" }} /> Loading…
          </p>
        )}

        {/* Stats */}
        {metrics && (
          <div className={styles.statsGrid}>
            <div className={styles.stat}>
              <p className={styles.statLabel}>Total events</p>
              <p className={styles.statValue}>{metrics.total_events}</p>
              <p className={styles.statHint}>Agent actions logged</p>
            </div>
            <div className={styles.stat}>
              <p className={styles.statLabel}>Pending approvals</p>
              <p className={styles.statValue} style={{ color: pending.length > 0 ? "#dc2626" : undefined }}>
                {metrics.pending_approvals}
              </p>
              <p className={styles.statHint}>Awaiting your decision</p>
            </div>
            <div className={styles.stat}>
              <p className={styles.statLabel}>Active workflows</p>
              <p className={styles.statValue}>{metrics.active_workflows}</p>
              <p className={styles.statHint}>In progress</p>
            </div>
            <div className={styles.stat}>
              <p className={styles.statLabel}>Error events</p>
              <p className={styles.statValue} style={{ color: metrics.error_events > 0 ? "#b45309" : undefined }}>
                {metrics.error_events}
              </p>
              <p className={styles.statHint}>Timeouts, fallbacks</p>
            </div>
          </div>
        )}

        {/* Main sections */}
        <div className={styles.sections}>

          {/* Approval queue */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}><CheckCircle size={16} /> Approval Queue</span>
              <span style={{ fontSize: "0.8rem", color: pending.length > 0 ? "#dc2626" : "#64748b" }}>
                {pending.length} pending
              </span>
            </div>
            <div className={styles.panelBody}>
              {approvals.length === 0 && (
                <p className={styles.empty}>No approval requests yet. Human-in-the-loop checkpoints will appear here.</p>
              )}
              {approvals.map(a => (
                <div key={a.id} className={styles.approvalItem}>
                  <div className={styles.approvalMeta}>
                    <span className={styles.approvalAgent}>{a.agent}</span>
                    <span>·</span>
                    <span>{a.kind}</span>
                    <span>·</span>
                    <span>{new Date(a.created_at).toLocaleString()}</span>
                    {a.status === "decided" && (
                      <span style={{ marginLeft: "auto", color: a.decision === "approve" ? "#166534" : "#991b1b", fontWeight: 600 }}>
                        {a.decision === "approve" ? "Approved" : "Rejected"}
                      </span>
                    )}
                  </div>
                  <p className={styles.approvalPrompt}>{a.prompt}</p>
                  {a.status === "pending" && (
                    <div className={styles.approvalActions}>
                      <button
                        className={styles.approveBtn}
                        disabled={busy}
                        onClick={() => void decide(a.id, "approve")}
                      >
                        <CheckCircle size={13} style={{ display: "inline", marginRight: 4 }} />
                        Approve
                      </button>
                      <button
                        className={styles.rejectBtn}
                        disabled={busy}
                        onClick={() => void decide(a.id, "reject")}
                      >
                        <XCircle size={13} style={{ display: "inline", marginRight: 4 }} />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Long-term memory */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}><Brain size={16} /> Long-term Memory</span>
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{memory.length} item(s)</span>
            </div>
            <div className={styles.panelBody}>
              <form onSubmit={e => void addMemory(e)} className={styles.addMemoryForm}>
                <input
                  placeholder="Key (e.g. prefers_vegan)"
                  value={memKey}
                  onChange={e => setMemKey(e.target.value)}
                  maxLength={200}
                  required
                />
                <input
                  placeholder="Value"
                  value={memValue}
                  onChange={e => setMemValue(e.target.value)}
                  maxLength={2000}
                  required
                />
                <select value={memKind} onChange={e => setMemKind(e.target.value as typeof memKind)}>
                  <option value="fact">Fact</option>
                  <option value="preference">Preference</option>
                  <option value="decision">Decision</option>
                  <option value="note">Note</option>
                </select>
                <button type="submit" className={styles.addBtn} disabled={busy}>Save</button>
              </form>
              {memory.length === 0 && (
                <p className={styles.empty}>No long-term memory yet. Facts saved here persist across sessions.</p>
              )}
              {memory.map(item => (
                <div key={item.key} className={styles.memoryItem}>
                  <span className={styles.memoryKey}>{item.key}</span>
                  <span className={styles.memoryValue}>{item.value}</span>
                  <span className={styles.memoryKind}>{item.kind}</span>
                  <button
                    className={styles.memoryDelete}
                    onClick={() => void deleteMemory(item.key)}
                    disabled={busy}
                    aria-label={`Delete ${item.key}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Workflows */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}><GitMerge size={16} /> Workflows</span>
            </div>
            <div className={styles.panelBody}>
              <form onSubmit={e => void addWorkflow(e)} className={styles.addWorkflowForm}>
                <input
                  placeholder="Workflow name"
                  value={wfName}
                  onChange={e => setWfName(e.target.value)}
                  maxLength={200}
                  required
                />
                <select value={wfKind} onChange={e => setWfKind(e.target.value as typeof wfKind)}>
                  <option value="travel_plan">Travel Plan</option>
                  <option value="hotel_search">Hotel Search</option>
                  <option value="flight_search">Flight Search</option>
                  <option value="destination_compare">Destination Compare</option>
                  <option value="custom">Custom</option>
                </select>
                <button type="submit" className={styles.addBtn} disabled={busy}>Create</button>
              </form>
              {workflows.length === 0 && (
                <p className={styles.empty}>No workflows yet. Create one to track multi-step agent tasks.</p>
              )}
              {workflows.map(wf => (
                <div key={wf.id} className={styles.workflowItem}>
                  <div>
                    <p className={styles.workflowName}>{wf.name}</p>
                    <p className={styles.workflowKind}>{wf.kind} · updated {new Date(wf.updated_at).toLocaleDateString()}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span className={`${styles.statusBadge} ${styles[`status${wf.status.charAt(0).toUpperCase() + wf.status.slice(1)}` as keyof typeof styles] ?? ""}`}>
                      {wf.status}
                    </span>
                    {wf.status === "active" && (
                      <button
                        className={styles.panelAction}
                        disabled={busy}
                        onClick={() => void updateWorkflowStatus(wf.id, "completed")}
                        title="Mark completed"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Agent roles */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}><Activity size={16} /> Agent Roles</span>
            </div>
            <div className={styles.panelBody}>
              {roles.length === 0 && <p className={styles.empty}>Loading roles…</p>}
              <div className={styles.roleGrid}>
                {roles.map(role => (
                  <div key={role.id} className={styles.roleCard}>
                    <p className={styles.roleName}>{role.name}</p>
                    <p className={styles.roleDesc}>{role.description}</p>
                    {role.tools.length > 0 && (
                      <div className={styles.roleTools}>
                        {role.tools.map(t => (
                          <span key={t} className={styles.toolBadge}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Observability trace */}
          <div className={styles.panel} style={{ gridColumn: "1 / -1" }}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}><BarChart2 size={16} /> Agent Event Trace</span>
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Last 50 events</span>
            </div>
            <div className={styles.panelBody}>
              {/* Per-agent breakdown */}
              {metrics && metrics.by_agent.length > 0 && (
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                  {metrics.by_agent.map(a => (
                    <span key={a.agent} style={{ fontSize: "0.8rem", background: "#f1f5f9", borderRadius: "0.35rem", padding: "0.2rem 0.55rem", color: "#334155" }}>
                      {a.agent}: <strong>{a.count}</strong>
                    </span>
                  ))}
                </div>
              )}
              <div className={styles.traceList}>
                {trace.length === 0 && (
                  <p className={styles.empty}>No trace events yet. Start a conversation in the planner to see events here.</p>
                )}
                {trace.map((evt, i) => (
                  <div key={i} className={styles.traceEvent}>
                    <span className={styles.traceAgent}>{evt.agent}</span>
                    <span className={styles.traceType}>·</span>
                    <span>{evt.event_type}</span>
                    <span className={styles.traceTime}> · {new Date(evt.created_at).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
