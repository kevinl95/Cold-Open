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

function publicGenerationError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("(401)")) return "OpenAI rejected the server’s API key. Check OPENAI_API_KEY in Cloudflare.";
  if (message.includes("(429)")) return "OpenAI is rate limiting this project. Try again in a moment.";
  if (message.includes("(400)")) return "OpenAI rejected the generation request. Check the model setting or Function logs.";
  return "Could not reach OpenAI right now. Try again in a moment.";
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
    return json(502, { error: publicGenerationError(error) });
  }
}
