import test from "node:test";
import assert from "node:assert/strict";
import { emptyAggregate, featureVector, mergeSummary } from "../aggregator/src/rollup.js";

test("rollup distinguishes novice-style fixture signals and calibrates small samples", () => {
  let aggregate = emptyAggregate("demo-class", "2026-09-08/2026-09-12");
  for (let i = 0; i < 6; i++) {
    aggregate = mergeSummary(aggregate, { session_id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, class_id: "demo-class", window: "2026-09-08/2026-09-12", event_count: 20, drag_starts: 4, drag_abandons: 2, dialogs_opened: 4, dead_end_dialogs: 2, dialog_cycles: 2, hesitation_samples_ms: [3200], key_intervals_ms: [520], focus_changes: 2 });
  }
  const vector = featureVector(aggregate);
  assert.equal(vector.signals.drag_abandon_rate, 0.5);
  assert.equal(vector.signals.dead_end_dialog_rate, 0.5);
  assert.equal(vector.confidence, "medium");
});
