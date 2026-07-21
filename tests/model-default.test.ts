import test from "node:test";
import assert from "node:assert/strict";
import { generateDemo } from "../generator/src/generate.js";

const feature = {
  class_id: "model-default-class",
  n_sessions: 6,
  window: "2026-09-08/2026-09-12",
  confidence: "medium" as const,
  signals: {
    drag_abandon_rate: 0.2,
    dead_end_dialog_rate: 0.2,
    dialog_cycle_rate: 0.2,
    median_hesitation_ms: 1000,
    median_key_interval_ms: 300,
    focus_change_rate: 0.1
  }
};

test("live generation defaults to GPT-5.6 while retaining an explicit model override", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousModel = process.env.OPENAI_MODEL;
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_MODEL;
  let requestedModel = "";
  try {
    await generateDemo(feature, {
      apiKey: "server-only-test-key",
      request: async (_input, init) => {
        requestedModel = JSON.parse(String(init?.body)).model;
        return new Response(JSON.stringify({ output_text: JSON.stringify({
          diagnosis: "This class may benefit from a short demonstration of file locations.",
          confidence: "medium",
          evidence: ["Aggregate dialog exits are elevated."],
          demo: { duration_min: 5, setup: "Open a blank document.", steps: ["Show one save location.", "Ask students to predict the result."], check: "Students name the location." }
        }) }), { status: 200 });
      }
    });
    assert.equal(requestedModel, "gpt-5.6");

    await generateDemo(feature, {
      apiKey: "server-only-test-key",
      model: "test-override",
      request: async (_input, init) => {
        requestedModel = JSON.parse(String(init?.body)).model;
        return new Response(JSON.stringify({ output_text: JSON.stringify({
          diagnosis: "This class may benefit from a short demonstration of file locations.",
          confidence: "medium",
          evidence: ["Aggregate dialog exits are elevated."],
          demo: { duration_min: 5, setup: "Open a blank document.", steps: ["Show one save location.", "Ask students to predict the result."], check: "Students name the location." }
        }) }), { status: 200 });
      }
    });
    assert.equal(requestedModel, "test-override");
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.OPENAI_MODEL; else process.env.OPENAI_MODEL = previousModel;
  }
});
