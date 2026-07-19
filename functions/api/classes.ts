import { listEphemeralFeatures } from "../_lib/ephemeral-aggregates.js";
import { corsJson, corsOptions } from "../_lib/http.js";

interface PagesContext {
  request: Request;
}

/** Cloudflare Pages route: GET /api/classes?window=YYYY-MM-DD/YYYY-MM-DD. */
export function onRequestGet(context: PagesContext): Response {
  const window = new URL(context.request.url).searchParams.get("window") ?? undefined;
  return corsJson(200, { classes: listEphemeralFeatures(window), storage: "ephemeral" });
}

export function onRequestOptions(): Response {
  return corsOptions();
}
