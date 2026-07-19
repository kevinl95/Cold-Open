import { ZodError } from "zod";
import { sessionSummarySchema } from "../../shared/contracts.js";
import { mergeEphemeralSummary } from "../_lib/ephemeral-aggregates.js";
import { corsJson, corsOptions } from "../_lib/http.js";

interface PagesContext {
  request: Request;
}

/**
 * Cloudflare Pages route: POST /api/class-summaries.
 *
 * This accepts the extension's already-aggregated session summary and combines
 * it into process memory. It is intentionally a demo bridge, not persistence:
 * deploys, cold starts, and different Cloudflare isolates can lose or split it.
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  try {
    const summary = sessionSummarySchema.parse(await context.request.json());
    return corsJson(201, { feature: mergeEphemeralSummary(summary), storage: "ephemeral" });
  } catch (error) {
    if (error instanceof ZodError) return corsJson(400, { error: "Invalid aggregate session summary." });
    return corsJson(400, { error: "Invalid JSON request body." });
  }
}

export function onRequestOptions(): Response {
  return corsOptions();
}
