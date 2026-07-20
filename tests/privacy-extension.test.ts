import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

test("extension keeps telemetry in memory and asks only for a configured delivery endpoint", async () => {
  const manifest = JSON.parse(await readFile("extension/manifest.json", "utf8"));
  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.deepEqual(manifest.host_permissions, ["http://localhost/*"]);
  assert.deepEqual(manifest.optional_host_permissions, ["https://*/*"]);
  assert.equal(manifest.options_ui.page, "options.html");
  assert.deepEqual(manifest.icons, {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  });
  assert.deepEqual(manifest.action.default_icon, manifest.icons);
  await Promise.all(Object.values(manifest.icons).map((path) => access(`extension/${path}`)));
  const source = await readFile("extension/content.js", "utf8");
  for (const forbidden of ["querySelector", "textContent", "event.key", "event.code", "chrome.storage"]) assert.doesNotMatch(source, new RegExp(forbidden.replace(".", "\\.")));
  const background = await readFile("extension/background.js", "utf8");
  assert.match(background, /chrome\.storage\.sync/);
  assert.match(background, /never telemetry, events, session IDs, or retry queues/);
});
