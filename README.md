# ColdOpen

ColdOpen turns privacy-safe, class-level interaction aggregates into a five-minute
teacher demo. It is a local Build Week prototype, not a district deployment or a
compliance claim.

## Deploy the generator to Cloudflare Pages

The deployed product is static-first: the page embeds committed aggregate-only fixture
vectors and scripts at build time, so the initial recommendation never waits on a
model or a database. `Regenerate live` posts that aggregate vector to the Pages
Function at `/api/generate`; the function is the sole OpenAI caller.

1. Push this repository to GitHub or GitLab. In Cloudflare, open **Workers & Pages**,
   choose **Create application → Pages → Connect to Git**, and select the repository.
2. Use the repository root, choose the **None** framework preset, set the production
   branch, build command to `npm run build:pages`, and build output directory to
   `dist-pages`.
3. Finish the first deployment. Git integration then deploys every push to the
   production branch and creates preview deployments for other branches.
4. Open the Pages project’s **Settings → Environment variables**. Add
   `OPENAI_API_KEY` as an encrypted secret for both Production and Preview. Optionally
   add `OPENAI_MODEL` (the default is `gpt-4.1-mini`) in the same environments.
5. Open the deployed URL. The fixture script is already rendered. Click
   **Regenerate live** to make the server-side model call.

Do not put the key in a frontend `.env` file, the extension, or a commit. The only
production key read is `context.env.OPENAI_API_KEY` in
[`functions/api/generate.ts`](functions/api/generate.ts); the browser sends only the
validated class-level feature vector to that route. Cloudflare maps that file to
`/api/generate` and `_routes.json` restricts Function invocation to `/api/*`.

## Run the local video setup

```bash
npm install
npm run seed:novice
npm start
```

Open `http://localhost:3000`. The page uses its committed static fixtures; the local
aggregate server remains available only to support the unpacked extension demo.

To show the extension in the video, open `chrome://extensions`, enable **Developer
mode**, choose **Load unpacked**, and select this repository’s `extension/` directory.
It is intentionally localhost-only and is never part of the Pages deployment. The
seeded sample is intentionally novice-like; use `npm run seed:competent` to load a
lower-signal local aggregate comparison.

The local setup is deliberately static-only. `Regenerate live` is enabled by the
deployed Pages Function after its environment secret is configured; a live-call failure
there leaves the already rendered static script untouched.

## Privacy boundary

The MV3 extension transmits a session summary only, never raw events. The local server
stores class/window aggregate counters and distributions; it discards the ephemeral
session ID after merging. The content script neither reads page text, DOM values,
filenames, URLs, key identity, nor screenshots. Its localhost-only manifest is a
prototype configuration, not a managed-Chromebook deployment path.

The browser cannot identify a native file dialog without inspecting a page element,
which this design forbids. Consequently, live extension telemetry emits general
event-shape signals only; dialog signals in the synthetic fixture demonstrate the
aggregate/generation contract for a future consented training surface.