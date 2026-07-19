import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost } from "../functions/api/generate.js";

const feature = {
  class_id: "demo-novice-class", n_sessions: 6, window: "2026-09-08/2026-09-12", confidence: "medium" as const,
  signals: { drag_abandon_rate: 0.43, dead_end_dialog_rate: 0.56, dialog_cycle_rate: 0.48, median_hesitation_ms: 3700, median_key_interval_ms: 590, focus_change_rate: 0.11 }
};

test("Pages Function refuses live generation when its server environment has no key", async () => {
  const response = await onRequestPost({
    request: new Request("https://example.pages.dev/api/generate", { method: "POST", body: JSON.stringify(feature) }),
    env: {}
  });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Live generation is not configured." });
});

test("Pages Function supplies its environment key to the server-side model call only", async () => {
  const originalFetch = globalThis.fetch;
  let authorization = "";
  globalThis.fetch = async (_input, init) => {
    authorization = new Headers(init?.headers).get("Authorization") ?? "";
    return new Response(JSON.stringify({ output_text: JSON.stringify({
      diagnosis: "This class may benefit from a short file-location demonstration.", confidence: "medium",
      evidence: ["Aggregated dialog exits are elevated."],
      demo: { duration_min: 5, setup: "Open a blank document.", steps: ["Show one save location.", "Ask for a prediction."], check: "Students name the location." }
    }) }), { status: 200 });
  };
  try {
    const response = await onRequestPost({
      request: new Request("https://example.pages.dev/api/generate", { method: "POST", body: JSON.stringify(feature) }),
      env: { OPENAI_API_KEY: "server-only-test-key", OPENAI_MODEL: "test-model" }
    });
    assert.equal(response.status, 200);
    assert.equal(authorization, "Bearer server-only-test-key");
    assert.equal((await response.json() as { demo: { duration_min: number } }).demo.duration_min, 5);
  } finally { globalThis.fetch = originalFetch; }
});

test("Pages Function rejects non-aggregate input before calling the model", async () => {
  const response = await onRequestPost({
    request: new Request("https://example.pages.dev/api/generate", { method: "POST", body: JSON.stringify({ ...feature, page_text: "not allowed" }) }),
    env: { OPENAI_API_KEY: "server-only-test-key" }
  });
  assert.equal(response.status, 400);
});

test("Pages Function reports a malformed model response as a generation failure, not bad input", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ output_text: JSON.stringify({ diagnosis: "Too short", confidence: "medium", evidence: [], demo: {} }) }), { status: 200 });
  try {
    const response = await onRequestPost({
      request: new Request("https://example.pages.dev/api/generate", { method: "POST", body: JSON.stringify(feature) }),
      env: { OPENAI_API_KEY: "server-only-test-key" }
    });
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: "OpenAI returned a script that did not match the expected format. The fixture recommendation is still available." });
  } finally { globalThis.fetch = originalFetch; }
});

test("Pages Function gives the page a useful, non-secret API-key error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: "Incorrect API key provided: sk-should-not-be-exposed" } }), { status: 401 });
  try {
    const response = await onRequestPost({
      request: new Request("https://example.pages.dev/api/generate", { method: "POST", body: JSON.stringify(feature) }),
      env: { OPENAI_API_KEY: "server-only-test-key" }
    });
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: "OpenAI rejected the server’s API key. Check OPENAI_API_KEY in Cloudflare." });
  } finally { globalThis.fetch = originalFetch; }
});

test("Pages Function distinguishes an API budget error from a short rate limit", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: "insufficient_quota", message: "You exceeded your current quota." } }), { status: 429 });
  try {
    const response = await onRequestPost({
      request: new Request("https://example.pages.dev/api/generate", { method: "POST", body: JSON.stringify(feature) }),
      env: { OPENAI_API_KEY: "server-only-test-key" }
    });
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: "This OpenAI project has no available API budget. Check API billing, credits, and the project spend limit." });
  } finally { globalThis.fetch = originalFetch; }
});
