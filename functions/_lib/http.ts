export function corsHeaders(): HeadersInit {
  // This is an intentionally unauthenticated demo receiver. The extension has
  // an explicit user-granted host permission for its configured endpoint.
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store"
  };
}

export function corsJson(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders() }
  });
}

export function corsOptions(): Response {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
