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

test("generator accepts a structurally valid response even when model copy exceeds old display-length limits", async () => {
  const longDiagnosis = "This class may benefit from a concise demonstration of the file picker and the difference between a file name and its saved location. ".repeat(3);
  const script = await generateDemo({
    class_id: "demo-class", n_sessions: 20, window: "2026-09-08/2026-09-12", confidence: "high",
    signals: { drag_abandon_rate: 0.1, dead_end_dialog_rate: 0.45, dialog_cycle_rate: 0.4, median_hesitation_ms: 3200, median_key_interval_ms: 600, focus_change_rate: 0.02 }
  }, {
    apiKey: "test-key",
    request: async () => new Response(JSON.stringify({ output_text: JSON.stringify({
      diagnosis: longDiagnosis,
      confidence: "high",
      evidence: ["Aggregated dialog exits are elevated."],
      demo: { duration_min: 5, setup: "Open a blank document.", steps: ["Show one save location.", "Ask for a prediction."], check: "Students name the location." }
    }) }), { status: 200 })
  });
  assert.equal(script.diagnosis, longDiagnosis.trim());
});
