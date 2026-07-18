import { ZodError } from "zod";
import { generateDemo } from "../../generator/src/generate.js";
import { classFeatureVectorSchema } from "../../shared/contracts.js";

interface Environment {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
}

interface PagesContext<Env> {
  request: Request;
  env: Env;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

/**
 * Cloudflare Pages file-based route: POST /api/generate.
 *
 * The only API-key reference is context.env, which Cloudflare injects into this
 * server-side function. The request body is an aggregate feature vector only.
 */
export async function onRequestPost(context: PagesContext<Environment>): Promise<Response> {
  if (!context.env.OPENAI_API_KEY) {
    return json(500, { error: "Live generation is not configured." });
  }

  try {
    const feature = classFeatureVectorSchema.parse(await context.request.json());
    const script = await generateDemo(feature, {
      apiKey: context.env.OPENAI_API_KEY,
      model: context.env.OPENAI_MODEL,
      fallbackOnError: false
    });
    return json(200, script);
  } catch (error) {
    if (error instanceof ZodError) return json(400, { error: "Invalid class-level feature vector." });
    console.error("ColdOpen live generation failed", error);
    return json(502, { error: "Live generation is temporarily unavailable. The fixture script is still available." });
  }
}
