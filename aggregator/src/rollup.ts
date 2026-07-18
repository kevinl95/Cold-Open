import {
  type ClassFeatureVector,
  type Confidence,
  type SessionSummary,
  classFeatureVectorSchema
} from "../../shared/contracts.js";

export interface ClassAggregate {
  class_id: string;
  window: string;
  n_sessions: number;
  event_count: number;
  drag_starts: number;
  drag_abandons: number;
  dialogs_opened: number;
  dead_end_dialogs: number;
  dialog_cycles: number;
  hesitation_samples_ms: number[];
  key_intervals_ms: number[];
  focus_changes: number;
}

export function emptyAggregate(classId: string, window: string): ClassAggregate {
  return {
    class_id: classId, window, n_sessions: 0, event_count: 0,
    drag_starts: 0, drag_abandons: 0, dialogs_opened: 0, dead_end_dialogs: 0,
    dialog_cycles: 0, hesitation_samples_ms: [], key_intervals_ms: [], focus_changes: 0
  };
}

/** Session IDs intentionally do not appear in ClassAggregate or persisted storage. */
export function mergeSummary(aggregate: ClassAggregate, summary: SessionSummary): ClassAggregate {
  if (aggregate.class_id !== summary.class_id || aggregate.window !== summary.window) {
    throw new Error("Cannot merge a summary into a different class/window");
  }
  return {
    ...aggregate,
    n_sessions: aggregate.n_sessions + 1,
    event_count: aggregate.event_count + summary.event_count,
    drag_starts: aggregate.drag_starts + summary.drag_starts,
    drag_abandons: aggregate.drag_abandons + summary.drag_abandons,
    dialogs_opened: aggregate.dialogs_opened + summary.dialogs_opened,
    dead_end_dialogs: aggregate.dead_end_dialogs + summary.dead_end_dialogs,
    dialog_cycles: aggregate.dialog_cycles + summary.dialog_cycles,
    hesitation_samples_ms: [...aggregate.hesitation_samples_ms, ...summary.hesitation_samples_ms].slice(-6000),
    key_intervals_ms: [...aggregate.key_intervals_ms, ...summary.key_intervals_ms].slice(-12000),
    focus_changes: aggregate.focus_changes + summary.focus_changes
  };
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[midpoint] : (sorted[midpoint - 1] + sorted[midpoint]) / 2;
}

export function confidenceFor(sessionCount: number, prevalence: number): Confidence {
  if (sessionCount < 6 || prevalence < 0.12) return "low";
  if (sessionCount < 15 || prevalence < 0.25) return "medium";
  return "high";
}

export function featureVector(aggregate: ClassAggregate): ClassFeatureVector {
  const dragRate = aggregate.drag_starts ? aggregate.drag_abandons / aggregate.drag_starts : 0;
  const deadEndRate = aggregate.dialogs_opened ? aggregate.dead_end_dialogs / aggregate.dialogs_opened : 0;
  const dialogCycleRate = aggregate.dialogs_opened ? aggregate.dialog_cycles / aggregate.dialogs_opened : 0;
  const focusRate = aggregate.event_count ? aggregate.focus_changes / aggregate.event_count : 0;
  const prevalence = Math.max(dragRate, deadEndRate, dialogCycleRate, focusRate);
  return classFeatureVectorSchema.parse({
    class_id: aggregate.class_id,
    n_sessions: aggregate.n_sessions,
    window: aggregate.window,
    signals: {
      drag_abandon_rate: dragRate,
      dead_end_dialog_rate: deadEndRate,
      dialog_cycle_rate: dialogCycleRate,
      median_hesitation_ms: median(aggregate.hesitation_samples_ms),
      median_key_interval_ms: median(aggregate.key_intervals_ms),
      focus_change_rate: focusRate
    },
    confidence: confidenceFor(aggregate.n_sessions, prevalence)
  });
}
