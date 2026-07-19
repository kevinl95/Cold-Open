import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost } from "../functions/api/class-summaries.js";
import { onRequestGet } from "../functions/api/classes.js";

const summary = {
  session_id: "00000000-0000-4000-8000-000000000099",
  class_id: "extension-demo-99",
  window: "2026-07-13/2026-07-17",
  event_count: 20,
  drag_starts: 4,
  drag_abandons: 2,
  dialogs_opened: 4,
  dead_end_dialogs: 2,
  dialog_cycles: 2,
  hesitation_samples_ms: [2100],
  key_intervals_ms: [410],
  focus_changes: 2
};

test("Pages demo receiver aggregates extension summaries without retaining a session ID", async () => {
  const received = await onRequestPost({
    request: new Request("https://example.pages.dev/api/class-summaries", { method: "POST", body: JSON.stringify(summary) })
  });
  assert.equal(received.status, 201);
  assert.equal(received.headers.get("Access-Control-Allow-Origin"), "*");
  const body = await received.json() as { feature: { class_id: string; n_sessions: number }; storage: string };
  assert.equal(body.storage, "ephemeral");
  assert.deepEqual(body.feature, { ...body.feature, class_id: "extension-demo-99", n_sessions: 1 });
  assert.doesNotMatch(JSON.stringify(body), /session_id/);

  const listed = await onRequestGet({ request: new Request("https://example.pages.dev/api/classes") });
  const list = await listed.json() as { classes: Array<{ class_id: string; n_sessions: number }> };
  assert.deepEqual(list.classes.find((feature) => feature.class_id === "extension-demo-99"), { ...body.feature });
});

test("Pages demo receiver rejects raw or malformed events", async () => {
  const response = await onRequestPost({
    request: new Request("https://example.pages.dev/api/class-summaries", { method: "POST", body: JSON.stringify({ ...summary, page_text: "not allowed" }) })
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid aggregate session summary." });
});
