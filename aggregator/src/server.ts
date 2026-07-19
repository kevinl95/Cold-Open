import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { sessionSummarySchema } from "../../shared/contracts.js";
import { generateDemo } from "../../generator/src/generate.js";
import { AggregateStore } from "./store.js";

// The executable is compiled into dist/, while web/ and fixtures/ remain source assets.
const projectRoot = process.cwd();
const port = Number(process.env.PORT ?? 3000);
const store = new AggregateStore(process.env.COLDOPEN_DATA ?? join(projectRoot, "data", "class-aggregates.json"));

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8"
};

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += data.length;
    if (length > 128_000) throw new Error("Request body too large");
    chunks.push(data);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function serveStatic(pathname: string, response: ServerResponse) {
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  if (relative.includes("..")) return sendJson(response, 404, { error: "Not found" });
  try {
    // `npm start` builds the same static-first site that Cloudflare Pages serves.
    const file = join(projectRoot, "dist-pages", relative);
    const content = await readFile(file);
    response.writeHead(200, { "Content-Type": contentTypes[extname(file)] ?? "application/octet-stream" });
    response.end(content);
  } catch { sendJson(response, 404, { error: "Not found" }); }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    const classMatch = url.pathname.match(/^\/api\/classes\/([A-Za-z0-9_-]+)\/(features|demo)$/);
    if (request.method === "GET" && url.pathname === "/api/health") return sendJson(response, 200, { ok: true });
    if (request.method === "GET" && url.pathname === "/api/classes") {
      return sendJson(response, 200, { classes: await store.list(), storage: "local" });
    }
    if (request.method === "POST" && url.pathname === "/api/class-summaries") {
      const feature = await store.merge(sessionSummarySchema.parse(await readJson(request)));
      return sendJson(response, 201, feature);
    }
    if (classMatch && request.method === "GET" && classMatch[2] === "features") {
      const feature = await store.get(classMatch[1], url.searchParams.get("window") ?? "");
      return feature ? sendJson(response, 200, feature) : sendJson(response, 404, { error: "No aggregate exists for this class and window" });
    }
    if (classMatch && request.method === "POST" && classMatch[2] === "demo") {
      const feature = await store.get(classMatch[1], url.searchParams.get("window") ?? "");
      if (!feature) return sendJson(response, 404, { error: "No aggregate exists for this class and window" });
      return sendJson(response, 200, await generateDemo(feature, {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL
      }));
    }
    return serveStatic(url.pathname, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return sendJson(response, message === "Request body too large" ? 413 : 400, { error: message });
  }
});

server.listen(port, () => console.log(`ColdOpen teacher view: http://localhost:${port}`));
