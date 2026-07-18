import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeInteractionEvent, sessionSummarySchema } from "../shared/contracts.js";

test("event sanitizer copies only the privacy-safe allowlist", () => {
  const event = sanitizeInteractionEvent({
    session: "f8f30a6f-f4a8-4e7d-946e-37442df7335f", t: 23, type: "key_interval", dt_prev: 5,
    key: "a", filename: "homework.docx", text: "student answer", meta: { unsafe: true }
  });
  assert.deepEqual(event, { session: "f8f30a6f-f4a8-4e7d-946e-37442df7335f", t: 23, type: "key_interval", dt_prev: 5 });
});

test("session summaries reject unexpected data fields", () => {
  assert.throws(() => sessionSummarySchema.parse({ session_id: "f8f30a6f-f4a8-4e7d-946e-37442df7335f", class_id: "demo-class", window: "2026-09-08/2026-09-12", event_count: 0, drag_starts: 0, drag_abandons: 0, dialogs_opened: 0, dead_end_dialogs: 0, dialog_cycles: 0, hesitation_samples_ms: [], key_intervals_ms: [], focus_changes: 0, page_text: "not allowed" }));
});
