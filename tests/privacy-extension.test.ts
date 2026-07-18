import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("extension declares no persistent or broad surveillance permissions", async () => {
  const manifest = JSON.parse(await readFile("extension/manifest.json", "utf8"));
  assert.deepEqual(manifest.permissions, []);
  assert.deepEqual(manifest.host_permissions, ["http://localhost:3000/*"]);
  const source = await readFile("extension/content.js", "utf8");
  for (const forbidden of ["querySelector", "textContent", "event.key", "event.code", "chrome.storage"]) assert.doesNotMatch(source, new RegExp(forbidden.replace(".", "\\.")));
});
