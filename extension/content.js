// Privacy boundary: this file never reads DOM nodes, text, URLs, form values,
// key identity, files, or screenshots. It emits only an allowlisted event shape.
const EVENT_TYPES = new Set(["click", "drag_start", "drag_abandon", "drag_complete", "key_interval", "scroll", "focus_change"]);
let lastTimestamp = performance.now();
let pointerIsDragging = false;
let nativeDragStarted = false;
let lastKeyTimestamp = null;

function emit(type, timestamp = performance.now()) {
  if (!EVENT_TYPES.has(type)) return;
  const t = Math.round(timestamp);
  const dt_prev = Math.max(0, Math.round(t - lastTimestamp));
  lastTimestamp = t;
  chrome.runtime.sendMessage({ kind: "coldopen-telemetry", type, t, dt_prev });
}

addEventListener("pointerdown", () => { pointerIsDragging = true; }, { capture: true, passive: true });
addEventListener("pointermove", () => {
  if (pointerIsDragging && !nativeDragStarted) {
    nativeDragStarted = true;
    emit("drag_start");
  }
}, { capture: true, passive: true });
addEventListener("pointerup", () => {
  if (nativeDragStarted) emit("drag_abandon");
  pointerIsDragging = false;
  nativeDragStarted = false;
}, { capture: true, passive: true });
addEventListener("dragstart", () => { nativeDragStarted = true; emit("drag_start"); }, { capture: true, passive: true });
addEventListener("drop", () => { if (nativeDragStarted) emit("drag_complete"); nativeDragStarted = false; }, { capture: true, passive: true });
addEventListener("click", () => emit("click"), { capture: true, passive: true });
addEventListener("scroll", () => emit("scroll"), { capture: true, passive: true });
addEventListener("focus", () => emit("focus_change"), { capture: true, passive: true });
addEventListener("blur", () => emit("focus_change"), { capture: true, passive: true });
addEventListener("keydown", (event) => {
  // The event is used only as a timing pulse. No event property is inspected.
  void event;
  const now = performance.now();
  if (lastKeyTimestamp !== null) emit("key_interval", now);
  lastKeyTimestamp = now;
}, { capture: true, passive: true });
