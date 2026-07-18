import test from "node:test";
import assert from "node:assert/strict";
import { generateDemo } from "../generator/src/generate.js";

test("generator produces validated local fallback without an API key", async () => {
  const previous = process.env.OPENAI_API_KEY; delete process.env.OPENAI_API_KEY;
  const script = await generateDemo({ class_id: "demo-class", n_sessions: 20, window: "2026-09-08/2026-09-12", confidence: "high", signals: { drag_abandon_rate: 0.1, dead_end_dialog_rate: 0.45, dialog_cycle_rate: 0.4, median_hesitation_ms: 3200, median_key_interval_ms: 600, focus_change_rate: 0.02 } });
  if (previous) process.env.OPENAI_API_KEY = previous;
  assert.equal(script.demo.duration_min, 5);
  assert.match(script.diagnosis, /file/i);
});
