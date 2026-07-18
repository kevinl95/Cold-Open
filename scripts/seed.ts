import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { sessionSummarySchema } from "../shared/contracts.js";
import { AggregateStore } from "../aggregator/src/store.js";

const fixtureName = process.argv[2];
if (!fixtureName || !/^[a-z0-9-]+$/.test(fixtureName)) {
  throw new Error("Usage: node dist/scripts/seed.js <fixture-name>");
}
const projectRoot = process.cwd();
const fixturePath = join(projectRoot, "fixtures", "traces", `${fixtureName}.json`);
const summaries = JSON.parse(await readFile(fixturePath, "utf8")) as unknown[];
const store = new AggregateStore(process.env.COLDOPEN_DATA ?? join(projectRoot, "data", "class-aggregates.json"));
await store.reset();
for (const summary of summaries) await store.merge(sessionSummarySchema.parse(summary));
console.log(`Seeded ${summaries.length} aggregate-only summaries from ${fixtureName}.`);
