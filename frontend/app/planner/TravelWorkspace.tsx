"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, Compass, LoaderCircle, Mic, Send, Settings2, ShieldCheck, Sparkles, Trash2, Volume2, VolumeX } from "lucide-react";
import { AgentResponse, Capabilities, ChatMessage, defaultPreferences, Preferences, travelApi } from "@/lib/travel";
import styles from "./planner.module.css";

type Recognition = { lang: string; interimResults: boolean; onresult: ((event: { results: { transcript: string }[][] }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
const currency = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
const greeting: ChatMessage = { role: "assistant", content: "Hello, explorer. Tell me where you’d like to go, or let’s find a place that feels like you. Save your travel preferences on the right and I’ll keep them in mind." };

export default function TravelWorkspace() {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [saved, setSaved] = useState<Preferences>(defaultPreferences);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([greeting]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [voice, setVoice] = useState(false);
  const [listening, setListening] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const recognition = useRef<Recognition | null>(null);
  const pending = useRef(false);
  const dirty = JSON.stringify(preferences) !== JSON.stringify(saved);

  const initialize = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // First response creates the HttpOnly session before retrieving its history.
      const profile = await travelApi<{ preferences: Preferences; capabilities: Capabilities }>("profile");
      setPreferences(profile.preferences);
      setSaved(profile.preferences);
      setCapabilities(profile.capabilities);
      const memory = await travelApi<{ messages: ChatMessage[] }>("memory");
      setMessages(memory.messages.length ? memory.messages : [greeting]);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not connect to your travel companion.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void initialize(); }, [initialize]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "instant", block: "end" }); }, [messages, busy]);
  useEffect(() => () => { recognition.current?.stop(); window.speechSynthesis?.cancel(); }, []);

  async function savePreferences() {
    if (saving || busy) return;
    setSaving(true);
    setError("");
    setSaveNotice("");
    try {
      const result = await travelApi<{ preferences: Preferences }>("profile", { method: "PUT", body: JSON.stringify(preferences) });
      setPreferences(result.preferences);
      setSaved(result.preferences);
      setSaveNotice("Preferences saved. Your next answer will use these choices.");
      setPreferencesOpen(false);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Preferences could not be saved.");
    } finally { setSaving(false); }
  }

  async function send(text = input) {
    const message = text.trim();
    if (!message || pending.current || saving || loading || !capabilities) return;
    if (dirty) { setError("Save your updated preferences first so I can use them in this answer."); setPreferencesOpen(true); return; }
    pending.current = true;
    setBusy(true);
    setError("");
    setInput("");
    setMessages(current => [...current, { role: "user", content: message }]);
    try {
      const response = await travelApi<AgentResponse>("ai/agent", { method: "POST", body: JSON.stringify({ message }) });
      setMessages(current => [...current, { role: "assistant", content: response.answer, payload: response }]);
      if (voice && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(response.answer);
        utterance.lang = ({ English: "en-IN", Hindi: "hi-IN", French: "fr-FR", Spanish: "es-ES", Arabic: "ar-SA", German: "de-DE" } as Record<string, string>)[saved.language];
        window.speechSynthesis.speak(utterance);
      }
    } catch (problem) {
      // Failed turns aren't stored by the backend. Restore the draft for retry.
      setMessages(current => current.slice(0, -1));
      setInput(message);
      setError(problem instanceof Error ? problem.message : "I couldn’t prepare that response. Please try again.");
    } finally { pending.current = false; setBusy(false); }
  }

  async function clearChat() {
    if (busy || loading) return;
    try {
      await travelApi("memory", { method: "DELETE" });
      setMessages([greeting]);
      window.speechSynthesis?.cancel();
      setError("");
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Chat could not be cleared."); }
  }

  function startVoice() {
    if (listening) { recognition.current?.stop(); return; }
    const SpeechRecognition = (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition;
    if (!SpeechRecognition) { setError("Voice input isn’t supported in this browser. You can type your message instead."); return; }
    const session = new SpeechRecognition();
    session.lang = ({ English: "en-IN", Hindi: "hi-IN", French: "fr-FR", Spanish: "es-ES", Arabic: "ar-SA", German: "de-DE" } as Record<string, string>)[saved.language];
    session.interimResults = false;
    session.onresult = event => setInput(event.results[0][0].transcript);
    session.onerror = () => { setError("Voice input couldn’t start. Check microphone access or type your message."); setListening(false); };
    session.onend = () => setListening(false);
    recognition.current = session;
    try { session.start(); setListening(true); } catch { setError("Voice input is unavailable. Please type your message."); }
  }

  function update<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPreferences(current => ({ ...current, [key]: value }));
    setSaveNotice("");
  }

  return <main className={styles.workspace}>
    <header className={styles.topbar}>
      <Link href="/" className={styles.brand}><Compass size={25} /> Vacanes<span> / your travel companion</span></Link>
      <nav className={styles.topLinks}><Link href="/bookings" className={styles.back}>Offers & bookings <ArrowUpRight size={15} /></Link><Link href="/" className={styles.back}><ArrowLeft size={15} /> Explore</Link></nav>
    </header>
    <div className={styles.intro}><div><p className={styles.eyebrow}>A little more you. A lot more adventure.</p><h1>Your next chapter starts here.</h1><p>A travel companion that remembers how you like to explore.</p></div><button className={styles.mobileFilters} onClick={() => setPreferencesOpen(!preferencesOpen)}><Settings2 size={18} /> Preferences</button></div>
    <div className={styles.layout}>
      <section className={styles.chat} aria-label="Travel assistant">
        <div className={styles.chatHeader}><div className={styles.assistantName}><span className={styles.avatar}><Sparkles size={18} /></span><div><strong>Ask Vacanes</strong><span>{capabilities ? capabilities.ai ? "AI companion" : "Local sample planner" : "Connecting…"}{capabilities?.search ? " · Live research" : ""}</span></div></div><div className={styles.headerActions}><button aria-label={voice ? "Disable spoken answers" : "Enable spoken answers"} aria-pressed={voice} onClick={() => { setVoice(!voice); if (voice) window.speechSynthesis?.cancel(); }}>{voice ? <Volume2 size={17} /> : <VolumeX size={17} />}<span>Voice</span></button><button onClick={clearChat} disabled={busy || loading} aria-label="Clear conversation"><Trash2 size={16} /><span>Clear</span></button></div></div>
        <div className={styles.messages} role="log" aria-live="polite" aria-busy={busy || loading}>
          {loading ? <div className={styles.connection}><LoaderCircle className={styles.spin} size={22} /> Loading your preferences and conversation…</div> : messages.map((message, index) => <div key={index} className={`${styles.message} ${message.role === "user" ? styles.userMessage : styles.assistantMessage}`}>
            <span className={styles.messageLabel}>{message.role === "user" ? "You" : "Vacanes"}</span>
            <div className={styles.bubble} dir="auto">{message.content}</div>
            {message.payload && <ResponseDetails response={message.payload} onChoose={destination => void send(`Plan a trip to ${destination} using my saved preferences`)} disabled={busy || dirty} />}
          </div>)}
          {!loading && messages.length === 1 && <div className={styles.starters}><span>Start with a little inspiration</span>{["Suggest destinations for my preferences", "Plan a 5-day trip to Goa", "What hotels would suit me in Kerala?"].map(text => <button key={text} onClick={() => void send(text)} disabled={busy || !capabilities}>{text}<ArrowUpRight size={16} /></button>)}</div>}
          {busy && <div className={styles.thinking}><LoaderCircle size={17} className={styles.spin} /> Preparing an answer around your preferences…</div>}
          <div ref={bottom} />
        </div>
        {error && <div className={styles.error} role="alert">{error}{!capabilities && <button onClick={() => void initialize()}>Reconnect</button>}</div>}
        <form className={styles.composer} onSubmit={event => { event.preventDefault(); void send(); }}>
          <label className={styles.srOnly} htmlFor="travel-message">Your travel question</label>
          <textarea id="travel-message" rows={1} value={input} maxLength={4000} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} placeholder={listening ? "Listening…" : "Ask about your next trip…"} disabled={loading || busy} />
          <button type="button" onClick={startVoice} disabled={loading || busy} aria-label={listening ? "Stop voice input" : "Dictate a travel question"} className={listening ? styles.listening : ""}><Mic size={19} /></button>
          <button type="submit" className={styles.send} disabled={!input.trim() || busy || loading || saving || !capabilities} aria-label="Send message">{busy ? <LoaderCircle className={styles.spin} size={18} /> : <Send size={18} />}</button>
        </form>
        <p className={styles.disclaimer}>A plan is a starting point. Verify prices, access and availability before booking.</p>
      </section>
      <aside className={`${styles.preferences} ${preferencesOpen ? styles.preferencesOpen : ""}`} aria-label="Travel preferences">
        <div className={styles.preferenceHeader}><Settings2 size={18} /><h2>Your travel preferences</h2><span>{dirty ? "Unsaved" : "Saved"}</span></div>
        <div className={styles.preferenceBody}>
          <fieldset><legend>Who’s coming along?</legend><div className={styles.styleGrid}>{[["solo", "Solo", "Your own rhythm"], ["couple", "Couple", "Shared discoveries"], ["family", "Family", "Room for everyone"], ["friends", "Friends", "Good company"]].map(([value, title, detail]) => <label key={value} className={preferences.travel_style === value ? styles.selected : ""}><input type="radio" name="travel-style" checked={preferences.travel_style === value} onChange={() => update("travel_style", value as Preferences["travel_style"])} /><strong>{title}</strong><span>{detail}</span></label>)}</div></fieldset>
          <fieldset><legend className={styles.budgetLegend}>Total trip budget <strong>{currency(preferences.budget)}</strong></legend><div className={styles.presets}>{[15000, 35000, 75000, 150000].map(value => <button key={value} onClick={() => update("budget", value)} aria-pressed={preferences.budget === value}>{currency(value)}</button>)}</div><label className={styles.srOnly} htmlFor="budget-range">Total budget in INR</label><input id="budget-range" type="range" min={3000} max={200000} step={1000} value={Math.min(preferences.budget, 200000)} onChange={event => update("budget", Number(event.target.value))} /><label className={styles.budgetInput}>Exact budget (INR)<input type="number" min={3000} max={1000000} value={preferences.budget} onChange={event => update("budget", Number(event.target.value))} /></label><small>For the whole group, including transport.</small></fieldset>
          <fieldset><legend>What draws you in?</legend><div className={styles.chips}>{["beaches", "nature", "culture", "adventure", "food", "wellness"].map(interest => <button key={interest} aria-pressed={preferences.interests.includes(interest)} className={preferences.interests.includes(interest) ? styles.activeChip : ""} onClick={() => update("interests", preferences.interests.includes(interest) ? preferences.interests.filter(i => i !== interest) : [...preferences.interests, interest])}>{interest}</button>)}</div></fieldset>
          <div className={styles.formGrid}>
            <SelectField label="Food preference" value={preferences.dietary} options={["any", "vegetarian", "vegan", "halal"]} onChange={value => update("dietary", value as Preferences["dietary"])} />
            <SelectField label="Travel pace" value={preferences.pace} options={["relaxed", "balanced", "packed"]} onChange={value => update("pace", value as Preferences["pace"])} />
            <SelectField label="Stay style" value={preferences.hotel_type} options={["budget", "boutique", "luxury"]} onChange={value => update("hotel_type", value as Preferences["hotel_type"])} />
            <SelectField label="Transport" value={preferences.transport} options={["any", "train", "flight", "road"]} onChange={value => update("transport", value as Preferences["transport"])} />
          </div>
          <label className={styles.checkbox}><input type="checkbox" checked={preferences.accessibility} onChange={event => update("accessibility", event.target.checked)} /> Prioritise step-free access</label>
          <details className={styles.tripDetails}><summary>Trip details & language</summary><div className={styles.formGrid}>
            <label>Leaving from<input value={preferences.origin} maxLength={100} placeholder="e.g. Kolkata" onChange={event => update("origin", event.target.value)} /></label>
            <label>Destination<input value={preferences.destination} maxLength={100} placeholder="Open to ideas" onChange={event => update("destination", event.target.value)} /></label>
            <label>Days<input type="number" min={1} max={30} value={preferences.days} onChange={event => update("days", Number(event.target.value))} /></label>
            <label>Travelers<input type="number" min={1} max={20} value={preferences.travelers} onChange={event => update("travelers", Number(event.target.value))} /></label>
            <label>Departure<input type="date" value={preferences.departure_date ?? ""} onChange={event => update("departure_date", event.target.value || null)} /></label>
            <label>Return<input type="date" min={preferences.departure_date ?? undefined} value={preferences.return_date ?? ""} onChange={event => update("return_date", event.target.value || null)} /></label>
            <SelectField label="Answer language" value={preferences.language} options={["English", "Hindi", "French", "Spanish", "Arabic", "German"]} onChange={value => update("language", value)} />
          </div><small>Multilingual conversation requires an AI key. Dates override the day count when both are selected.</small></details>
          <button className={styles.saveButton} onClick={() => void savePreferences()} disabled={saving || loading || busy || !capabilities}>{saving ? <LoaderCircle className={styles.spin} size={17} /> : <Check size={17} />} {saving ? "Saving…" : "Save preferences"}</button>
          {saveNotice && <p className={styles.saveNotice} role="status">{saveNotice}</p>}
          <div className={styles.memoryNote}><ShieldCheck size={18} /><p>Your choices are remembered in this browser’s travel session and used in every new answer. Chat messages can override trip details for one request.</p></div>
        </div>
      </aside>
    </div>
  </main>;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label>{label}<select value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option} value={option}>{option === "any" ? "No preference" : option[0].toUpperCase() + option.slice(1)}</option>)}</select></label>;
}

function ResponseDetails({ response, onChoose, disabled }: { response: AgentResponse; onChoose: (destination: string) => void; disabled: boolean }) {
  return <div className={styles.responseDetails}>
    <div className={styles.usedPreferences}><span>{response.mode === "ai" ? "AI guidance" : "Sample guidance"}</span><span>{response.preferences_used.pace}</span><span>{response.preferences_used.dietary === "any" ? "Flexible meals" : response.preferences_used.dietary}</span><span>{currency(response.preferences_used.budget)} total</span></div>
    {!!response.recommendations.length && <div className={styles.recommendations}>{response.recommendations.map(item => <button key={item.destination} onClick={() => onChoose(item.destination)} disabled={disabled}><div><strong>{item.destination}</strong><ArrowUpRight size={17} /></div><p>{item.reason}</p><small>Sample ground cost: {currency(item.estimated_ground_cost)} · excludes travel to destination</small></button>)}</div>}
    {!!response.itinerary.length && <details className={styles.plan} open><summary>Day-by-day sample outline <span>{response.itinerary.length} days</span></summary><div className={styles.dayList}>{response.itinerary.map(day => <div key={day.day} className={styles.day}><span>{String(day.day).padStart(2, "0")}</span><div><h3>{day.title}</h3><ul>{day.activities.map((activity, i) => <li key={i}>{activity}</li>)}</ul><p>{day.meals}</p></div></div>)}</div></details>}
    {response.budget && <details className={styles.plan}><summary>Your budget allocation <span>{currency(response.budget.total)}</span></summary><div className={styles.budgetBreakdown}>{Object.entries(response.budget.allocations).map(([key, value]) => <div key={key}><span>{key}</span><strong>{currency(value)}</strong></div>)}<p>{response.budget.notice}</p>{response.budget.warning && <p className={styles.budgetWarning}>{response.budget.warning}</p>}</div></details>}
    {!!response.sources.length && <div className={styles.sources}><strong>Research sources</strong>{response.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ArrowUpRight size={13} /></a>)}</div>}
    {!!response.notices.length && <details className={styles.dataNotes}><summary>Data availability & limitations</summary>{response.notices.map(notice => <p key={notice}>{notice}</p>)}</details>}
    <details className={styles.dataNotes}><summary>How this answer was prepared</summary>{response.trace.map((step, index) => <p key={index}><strong>{step.agent}</strong> · {step.status}<br />{step.detail}</p>)}</details>
  </div>;
}
