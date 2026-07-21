import { type ClassFeatureVector, type DemoScript, demoScriptSchema } from "../../shared/contracts.js";

function fallback(feature: ClassFeatureVector): DemoScript {
  const s = feature.signals;
  if (s.dead_end_dialog_rate >= s.drag_abandon_rate && s.dead_end_dialog_rate >= 0.2) {
    return demoScriptSchema.parse({
      diagnosis: "This class may need a clearer mental model of where files go and how a file picker works.",
      confidence: feature.confidence,
      evidence: [
        `${Math.round(s.dead_end_dialog_rate * 100)}% of observed file-dialog interactions ended without a selection.`,
        `The class produced ${feature.n_sessions} anonymous session summaries; this is a class-level pattern, not a student record.`
      ],
      demo: {
        duration_min: 5,
        setup: "Project a blank document and open the Save As dialog before students arrive.",
        steps: [
          "Say: a file has both a name and a home; Downloads is one possible home, not the computer itself.",
          "Save one sample file to Downloads, then use the left-side locations to save a second copy in a class folder.",
          "Close the dialog, reopen it, and point out how the location shown tells you where the file will appear later.",
          "Ask students to predict where each sample will be before you open the folder to check."
        ],
        check: "Have the class tell you which location to choose to find each sample file, then open that location together."
      }
    });
  }
  if (s.drag_abandon_rate >= 0.2) {
    return demoScriptSchema.parse({
      diagnosis: "This class may need a short demonstration of click, hold, move, and release as one drag action.",
      confidence: feature.confidence,
      evidence: [
        `${Math.round(s.drag_abandon_rate * 100)}% of observed drag starts ended before a completed drop.`,
        `The pattern is aggregated from ${feature.n_sessions} anonymous sessions.`
      ],
      demo: {
        duration_min: 5,
        setup: "Project a slide with two large shapes and an empty target box.",
        steps: [
          "Narrate the four parts: point, press and keep holding, move, then release only over the target.",
          "Deliberately release too early once and name why that did not move the shape.",
          "Move one shape slowly into the target while students say hold and release at the matching moments.",
          "Invite two students to direct the next move using the four words."
        ],
        check: "Ask students to show a partner the four motions in the air and name when the button stays down."
      }
    });
  }
  return demoScriptSchema.parse({
    diagnosis: "The aggregate does not yet support a specific skill diagnosis; demonstrate one basic navigation routine and collect another class window.",
    confidence: feature.confidence,
    evidence: [
      `The strongest available aggregate signal is below the threshold for a focused recommendation.`,
      `Only ${feature.n_sessions} anonymous session summaries are in this window.`
    ],
    demo: {
      duration_min: 5,
      setup: "Project a browser window with one familiar classroom link and the Downloads folder ready.",
      steps: [
        "Show how to open the class link, return to the tab, and use the back button once.",
        "Say aloud what each step changes on screen before doing it.",
        "Have students predict the next screen after each navigation action."
      ],
      check: "Ask for a thumbs-up only after students can name what the back button will do before you press it."
    }
  });
}

function modelInstructions(): string {
  return [
    "You generate a teacher-run five-minute classroom demo from aggregate, privacy-preserving interaction statistics.",
    "Never infer anything about an individual child, disability, motivation, home life, identity, or content they worked on.",
    "Calibrate claims with may/might and the supplied confidence. Explain the strongest aggregates in plain language.",
    "Keep each field concise: diagnosis and evidence under two sentences; setup, each step, and check under three sentences.",
    "Return only JSON matching the supplied schema."
  ].join(" ");
}

function responseText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const value = payload as { output_text?: unknown; output?: Array<{ content?: Array<{ text?: unknown }> }> };
  if (typeof value.output_text === "string") return value.output_text;
  for (const output of value.output ?? []) {
    for (const content of output.content ?? []) if (typeof content.text === "string") return content.text;
  }
  return null;
}

async function openAIError(response: Response): Promise<Error> {
  let detail = "";
  let code = "";
  try {
    const payload = await response.json() as { error?: { message?: unknown; code?: unknown; type?: unknown } };
    if (typeof payload.error?.message === "string") detail = payload.error.message;
    if (typeof payload.error?.code === "string") code = payload.error.code;
    else if (typeof payload.error?.type === "string") code = payload.error.type;
  } catch { /* An empty or non-JSON response is still useful by status code. */ }
  return new Error(`OpenAI request failed (${response.status})${code ? ` [${code}]` : ""}${detail ? `: ${detail}` : ""}`);
}

export interface GenerateDemoOptions {
  /** Supplied by the server runtime; never accepted from a browser request. */
  apiKey?: string;
  model?: string;
  request?: typeof fetch;
  /** Local development retains its deterministic fallback; production disables it. */
  fallbackOnError?: boolean;
}

function localEnvironment(): { apiKey?: string; model?: string } {
  // `process` does not exist in the Cloudflare Workers runtime.
  if (typeof process === "undefined") return {};
  return { apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL };
}

export async function generateDemo(feature: ClassFeatureVector, options: GenerateDemoOptions = {}): Promise<DemoScript> {
  const local = localEnvironment();
  const apiKey = options.apiKey ?? local.apiKey;
  const model = options.model ?? local.model ?? "gpt-5.6";
  const request = options.request ?? fetch;
  const fallbackOnError = options.fallbackOnError ?? true;
  if (!apiKey) {
    if (fallbackOnError) return fallback(feature);
    throw new Error("OpenAI API key is not configured");
  }
  try {
    const response = await request("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        instructions: modelInstructions(),
        input: JSON.stringify(feature),
        text: {
          format: {
            type: "json_schema",
            name: "coldopen_demo_script",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["diagnosis", "confidence", "evidence", "demo"],
              properties: {
                diagnosis: { type: "string", description: "A concise, cautious class-level diagnosis." },
                confidence: { type: "string", enum: ["low", "medium", "high"] },
                evidence: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", description: "One concise aggregate-only observation." } },
                demo: {
                  type: "object",
                  additionalProperties: false,
                  required: ["duration_min", "setup", "steps", "check"],
                  properties: {
                    duration_min: { type: "integer", enum: [5] },
                    setup: { type: "string", description: "Brief teacher preparation." },
                    steps: { type: "array", minItems: 2, maxItems: 6, items: { type: "string", description: "One concise teacher action." } },
                    check: { type: "string", description: "A brief whole-class check for understanding." }
                  }
                }
              }
            }
          }
        }
      })
    });
    if (!response.ok) throw await openAIError(response);
    const text = responseText(await response.json());
    if (!text) throw new Error("No structured text in OpenAI response");
    return demoScriptSchema.parse(JSON.parse(text));
  } catch (error) {
    if (!fallbackOnError) throw error;
    console.warn("Demo generation fell back to local template:", error instanceof Error ? error.message : error);
    return fallback(feature);
  }
}
