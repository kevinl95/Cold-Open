import { z } from "zod";

export const EVENT_TYPES = [
  "click",
  "drag_start",
  "drag_abandon",
  "drag_complete",
  "dialog_open",
  "dialog_close_noop",
  "key_interval",
  "scroll",
  "focus_change"
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

const opaqueId = z.string().min(3).max(128).regex(/^[A-Za-z0-9_-]+$/);

export const interactionEventSchema = z.object({
  session: z.string().uuid(),
  t: z.number().finite().nonnegative(),
  type: z.enum(EVENT_TYPES),
  dt_prev: z.number().finite().nonnegative()
}).strict();

export type InteractionEvent = z.infer<typeof interactionEventSchema>;

/**
 * Converts an untrusted browser message into the only event shape this project
 * recognizes. Deliberately does not copy event.key, targets, URLs, text, or metadata.
 */
export function sanitizeInteractionEvent(input: unknown): InteractionEvent {
  if (!input || typeof input !== "object") throw new Error("Event must be an object");
  const candidate = input as Record<string, unknown>;
  return interactionEventSchema.parse({
    session: candidate.session,
    t: candidate.t,
    type: candidate.type,
    dt_prev: candidate.dt_prev
  });
}

export const sessionSummarySchema = z.object({
  session_id: z.string().uuid(),
  class_id: opaqueId,
  window: z.string().regex(/^\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}$/),
  event_count: z.number().int().nonnegative(),
  drag_starts: z.number().int().nonnegative(),
  drag_abandons: z.number().int().nonnegative(),
  dialogs_opened: z.number().int().nonnegative(),
  dead_end_dialogs: z.number().int().nonnegative(),
  dialog_cycles: z.number().int().nonnegative(),
  hesitation_samples_ms: z.array(z.number().finite().nonnegative()).max(250),
  key_intervals_ms: z.array(z.number().finite().positive()).max(1000),
  focus_changes: z.number().int().nonnegative()
}).strict();

export type SessionSummary = z.infer<typeof sessionSummarySchema>;

export const confidenceSchema = z.enum(["low", "medium", "high"]);
export type Confidence = z.infer<typeof confidenceSchema>;

export const classFeatureVectorSchema = z.object({
  class_id: opaqueId,
  n_sessions: z.number().int().nonnegative(),
  window: z.string().regex(/^\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}$/),
  signals: z.object({
    drag_abandon_rate: z.number().min(0).max(1),
    dead_end_dialog_rate: z.number().min(0).max(1),
    dialog_cycle_rate: z.number().min(0).max(1),
    median_hesitation_ms: z.number().nonnegative(),
    median_key_interval_ms: z.number().nonnegative(),
    focus_change_rate: z.number().nonnegative()
  }).strict(),
  confidence: confidenceSchema
}).strict();

export type ClassFeatureVector = z.infer<typeof classFeatureVectorSchema>;

export const demoScriptSchema = z.object({
  diagnosis: z.string().min(10).max(240),
  confidence: confidenceSchema,
  evidence: z.array(z.string().min(8).max(240)).min(1).max(3),
  demo: z.object({
    duration_min: z.literal(5),
    setup: z.string().min(8).max(500),
    steps: z.array(z.string().min(8).max(500)).min(2).max(6),
    check: z.string().min(8).max(500)
  }).strict()
}).strict();

export type DemoScript = z.infer<typeof demoScriptSchema>;
