// Interaction state is service-worker memory only. Storage holds delivery settings,
// never telemetry, events, session IDs, or retry queues.
const DEFAULT_CONFIG = {
  endpoint: "http://localhost:3000/api/class-summaries",
  classId: "my-demo-class",
  captureOrigins: ["http://localhost/*"]
};
const EVENT_TYPES = new Set(["click", "drag_start", "drag_abandon", "drag_complete", "dialog_open", "dialog_close_noop", "key_interval", "scroll", "focus_change"]);
let sessionId = crypto.randomUUID();
let events = [];
let flushTimer;
let config = { ...DEFAULT_CONFIG };

function captureOrigins(value, legacyValue) {
  const values = Array.isArray(value) ? value : typeof legacyValue === "string" ? [legacyValue] : DEFAULT_CONFIG.captureOrigins;
  const valid = values.filter((item) => typeof item === "string" && /^(https:\/\/[^/]+|http:\/\/localhost)\/\*$/.test(item));
  return [...new Set(valid.length ? valid : DEFAULT_CONFIG.captureOrigins)];
}

async function applyCaptureScope() {
  try {
    await chrome.scripting.unregisterContentScripts({ ids: ["coldopen-capture"] });
  } catch {
    // There is no registered script on a first install or after a manual removal.
  }
  try {
    await chrome.scripting.registerContentScripts([{
      id: "coldopen-capture",
      js: ["content.js"],
      matches: config.captureOrigins,
      runAt: "document_start",
      persistAcrossSessions: true
    }]);
  } catch (error) {
    console.warn("ColdOpen could not apply its selected capture sites", error);
  }
}

const configurationReady = chrome.storage.sync.get(["endpoint", "classId", "captureOrigins", "captureOrigin"]).then(async (stored) => {
  config = {
    endpoint: typeof stored.endpoint === "string" ? stored.endpoint : DEFAULT_CONFIG.endpoint,
    classId: typeof stored.classId === "string" ? stored.classId : DEFAULT_CONFIG.classId,
    captureOrigins: captureOrigins(stored.captureOrigins, stored.captureOrigin)
  };
  // Preserve a teacher's existing single-site setting when upgrading this prototype.
  if (!Array.isArray(stored.captureOrigins)) await chrome.storage.sync.set({ captureOrigins: config.captureOrigins });
  await applyCaptureScope();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (changes.endpoint) config.endpoint = changes.endpoint.newValue;
  if (changes.classId) config.classId = changes.classId.newValue;
  const captureScopeChanged = Boolean(changes.captureOrigins || changes.captureOrigin);
  if (captureScopeChanged) config.captureOrigins = captureOrigins(changes.captureOrigins?.newValue, changes.captureOrigin?.newValue);
  if (captureScopeChanged) {
    // Never combine timing collected on previous capture sites with the next set.
    events = [];
    sessionId = crypto.randomUUID();
    void applyCaptureScope();
  }
});

chrome.runtime.onStartup.addListener(() => { void configurationReady; });

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
    class_id: config.classId,
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
  await configurationReady;
  const summary = summarize();
  events = [];
  sessionId = crypto.randomUUID();
  try {
    const response = await fetch(config.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(summary) });
    if (!response.ok) throw new Error(`Endpoint returned ${response.status}`);
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
