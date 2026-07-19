import {
  type ClassFeatureVector,
  type SessionSummary
} from "../../shared/contracts.js";
import {
  type ClassAggregate,
  emptyAggregate,
  featureVector,
  mergeSummary
} from "../../aggregator/src/rollup.js";

const aggregates = new Map<string, ClassAggregate>();

function key(classId: string, window: string) {
  return `${classId}:${window}`;
}

/**
 * Demo-only runtime store for Pages Functions. It intentionally holds aggregate
 * counters and bounded timing samples only; neither session IDs nor raw events
 * are retained. Cloudflare may discard this module state at any time.
 */
export function mergeEphemeralSummary(summary: SessionSummary): ClassFeatureVector {
  const aggregateKey = key(summary.class_id, summary.window);
  const current = aggregates.get(aggregateKey) ?? emptyAggregate(summary.class_id, summary.window);
  const updated = mergeSummary(current, summary);
  aggregates.set(aggregateKey, updated);
  return featureVector(updated);
}

export function listEphemeralFeatures(window?: string): ClassFeatureVector[] {
  return [...aggregates.values()]
    .filter((aggregate) => !window || aggregate.window === window)
    .map(featureVector)
    .sort((left, right) => left.class_id.localeCompare(right.class_id));
}
