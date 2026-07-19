import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("extension keeps telemetry in memory and asks only for a configured delivery endpoint", async () => {
  const manifest = JSON.parse(await readFile("extension/manifest.json", "utf8"));
  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.deepEqual(manifest.host_permissions, ["http://localhost/*"]);
  assert.deepEqual(manifest.optional_host_permissions, ["https://*/*"]);
  assert.equal(manifest.options_ui.page, "options.html");
  const source = await readFile("extension/content.js", "utf8");
  for (const forbidden of ["querySelector", "textContent", "event.key", "event.code", "chrome.storage"]) assert.doesNotMatch(source, new RegExp(forbidden.replace(".", "\\.")));
  const background = await readFile("extension/background.js", "utf8");
  assert.match(background, /chrome\.storage\.sync/);
  assert.match(background, /never telemetry, events, session IDs, or retry queues/);
});
