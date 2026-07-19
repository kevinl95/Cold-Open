import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { classFeatureVectorSchema, demoScriptSchema } from "../shared/contracts.js";

const execFileAsync = promisify(execFile);

test("Pages build embeds aggregate-only fixture scripts and routes only API requests to Functions", async () => {
  await execFileAsync(process.execPath, ["scripts/build-pages.mjs"]);
  const [index, app, routes] = await Promise.all([
    readFile("dist-pages/index.html", "utf8"), readFile("dist-pages/app.js", "utf8"), readFile("dist-pages/_routes.json", "utf8")
  ]);
  assert.match(index, /window\.COLDOPEN_FIXTURES=/);
  assert.doesNotMatch(index, /session_id|OPENAI_API_KEY|api\/classes/);
  assert.match(app, /fetch\("\/api\/generate"/);
  assert.match(app, /fetch\("\/api\/classes"/);
  assert.doesNotMatch(app, /OPENAI_API_KEY/);
  assert.deepEqual(JSON.parse(routes), { version: 1, include: ["/api/*"], exclude: [] });

  for (const id of ["8AM-class", "2PM-class"]) {
    const [feature, script] = await Promise.all([
      readFile(`fixtures/classes/${id}.json`, "utf8").then(JSON.parse),
      readFile(`fixtures/scripts/${id}.json`, "utf8").then(JSON.parse)
    ]);
    classFeatureVectorSchema.parse(feature);
    demoScriptSchema.parse(script);
    assert.doesNotMatch(JSON.stringify(feature), /session_id/);
  }
});
