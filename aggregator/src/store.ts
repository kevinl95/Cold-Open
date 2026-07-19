import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { type ClassFeatureVector, type SessionSummary, sessionSummarySchema } from "../../shared/contracts.js";
import { type ClassAggregate, emptyAggregate, featureVector, mergeSummary } from "./rollup.js";

type Database = { aggregates: ClassAggregate[] };

function key(classId: string, window: string) { return `${classId}:${window}`; }

export class AggregateStore {
  private loaded = false;
  private data: Database = { aggregates: [] };

  constructor(private readonly filePath: string) {}

  private async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const parsed = JSON.parse(await readFile(this.filePath, "utf8")) as Database;
      this.data = { aggregates: Array.isArray(parsed.aggregates) ? parsed.aggregates : [] };
    } catch (error: unknown) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.tmp`;
    await writeFile(tempPath, JSON.stringify(this.data, null, 2), "utf8");
    await rename(tempPath, this.filePath);
  }

  async merge(input: unknown): Promise<ClassFeatureVector> {
    const summary = sessionSummarySchema.parse(input);
    await this.load();
    const summaryKey = key(summary.class_id, summary.window);
    const index = this.data.aggregates.findIndex((item) => key(item.class_id, item.window) === summaryKey);
    const current = index === -1 ? emptyAggregate(summary.class_id, summary.window) : this.data.aggregates[index];
    const updated = mergeSummary(current, summary);
    if (index === -1) this.data.aggregates.push(updated); else this.data.aggregates[index] = updated;
    await this.persist();
    return featureVector(updated);
  }

  async get(classId: string, window: string): Promise<ClassFeatureVector | null> {
    await this.load();
    const aggregate = this.data.aggregates.find((item) => item.class_id === classId && item.window === window);
    return aggregate ? featureVector(aggregate) : null;
  }

  async list(): Promise<ClassFeatureVector[]> {
    await this.load();
    return this.data.aggregates
      .map(featureVector)
      .sort((left, right) => left.class_id.localeCompare(right.class_id));
  }

  async reset(): Promise<void> {
    this.loaded = true;
    this.data = { aggregates: [] };
    await this.persist();
  }
}
