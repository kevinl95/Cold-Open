// Session state is service-worker memory only. Chrome storage is deliberately unused.
const ENDPOINT = "http://localhost:3000/api/class-summaries";
const CLASS_ID = "demo-extension-class"; // Replace at build/deployment time with an opaque class ID.
const EVENT_TYPES = new Set(["click", "drag_start", "drag_abandon", "drag_complete", "dialog_open", "dialog_close_noop", "key_interval", "scroll", "focus_change"]);
let sessionId = crypto.randomUUID();
let events = [];
let flushTimer;

function isoDate(date) { return date.toISOString().slice(0, 10); }
function currentWindow() {
  const date = new Date();
  const day = (date.getDay() + 6) % 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - day);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return `${isoDate(monday)}/${isoDate(friday)}`;
}

function count(type) { return events.reduce((total, event) => total + (event.type === type ? 1 : 0), 0); }
function summarize() {
  const dialogOpens = count("dialog_open");
  return {
    session_id: sessionId,
    class_id: CLASS_ID,
    window: currentWindow(),
    event_count: events.length,
    drag_starts: count("drag_start"),
    drag_abandons: count("drag_abandon"),
    dialogs_opened: dialogOpens,
    dead_end_dialogs: count("dialog_close_noop"),
    dialog_cycles: Math.min(dialogOpens, count("dialog_close_noop")),
    hesitation_samples_ms: events.filter((event) => event.dt_prev >= 1000).map((event) => event.dt_prev).slice(-250),
    key_intervals_ms: events.filter((event) => event.type === "key_interval").map((event) => event.dt_prev).slice(-1000),
    focus_changes: count("focus_change")
  };
}

async function flush() {
  if (!events.length) return;
  const summary = summarize();
  events = [];
  sessionId = crypto.randomUUID();
  try {
    await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(summary) });
  } catch (error) {
    // Never persist a retry queue: it would turn anonymous timing into a durable per-device record.
    console.warn("ColdOpen aggregate summary was not delivered", error);
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (!message || message.kind !== "coldopen-telemetry" || !EVENT_TYPES.has(message.type)) return;
  if (!Number.isFinite(message.t) || !Number.isFinite(message.dt_prev) || message.dt_prev < 0) return;
  events.push({ type: message.type, t: Math.round(message.t), dt_prev: Math.round(message.dt_prev) });
  if (events.length >= 30) void flush();
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => { void flush(); }, 90_000);
});
