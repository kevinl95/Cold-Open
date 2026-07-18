import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AggregateStore } from "../aggregator/src/store.js";

test("durable store contains aggregate fields but never a session id", async () => {
  const dir = await mkdtemp(join(tmpdir(), "coldopen-")); const file = join(dir, "aggregate.json");
  const store = new AggregateStore(file);
  await store.merge({ session_id: "f8f30a6f-f4a8-4e7d-946e-37442df7335f", class_id: "demo-class", window: "2026-09-08/2026-09-12", event_count: 4, drag_starts: 1, drag_abandons: 1, dialogs_opened: 0, dead_end_dialogs: 0, dialog_cycles: 0, hesitation_samples_ms: [1500], key_intervals_ms: [], focus_changes: 0 });
  const raw = await readFile(file, "utf8");
  assert.doesNotMatch(raw, /session_id|f8f30a6f/);
});
