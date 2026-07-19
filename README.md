# ColdOpen

ColdOpen is a hackathon demo that turns a class-level interaction summary into a
five-minute teacher demo. It ships with two fixture classes, so the main experience
works even when the model API is unavailable.

## Try it locally

```bash
npm install
npm start
```

Open http://localhost:3000. The default class, **8AM class**, loads a committed
script immediately. Try **2PM class** to see the comparison fixture.

**Generate a fresh recommendation** is for the deployed Pages app. Locally, the
committed fixture remains the reliable demo path.

Run the checks with:

```bash
npm test
```

## Deploy to Cloudflare Pages

1. Push the repository to GitHub or GitLab.
2. In Cloudflare, go to **Workers & Pages** → **Create application** → **Pages** →
   **Connect to Git**. Select this repository.
3. Use these build settings:

   | Setting | Value |
   | --- | --- |
   | Framework preset | None |
   | Build command | `npm run build:pages` |
   | Build output directory | `dist-pages` |
   | Root directory | repository root |

4. After the first deploy, open **Settings** → **Environment variables** and add
   `OPENAI_API_KEY` as an encrypted secret in both Production and Preview. You can
   also set `OPENAI_MODEL`; it defaults to `gpt-4.1-mini`.
5. Open the Pages URL. The fixture recommendation appears immediately. Click
   **Generate a fresh recommendation** to call the model.

Cloudflare deploys pushes to the production branch automatically and creates preview
deployments for other branches.

## How the live call works

The browser sends the current class-level feature vector to `POST /api/generate`.
[`functions/api/generate.ts`](functions/api/generate.ts) validates it, reads the key
from Cloudflare’s server-side environment, calls OpenAI, and returns the same demo
script shape used by the page.

The key is not included in the page, fixture files, or extension. Do not add it to a
frontend environment file or commit it to the repository.

If the live call fails, the page keeps showing the already loaded fixture script. That
is intentional: use the fixture for the demo, then use **Generate a fresh
recommendation** to show the real integration.

## Extension-to-page prototype path

The extension can now send its aggregate-only session summaries to a Pages project,
and the teacher page will list the resulting temporary class. This is useful for a
live walkthrough of the full path:

```
unpacked extension → POST /api/class-summaries → temporary class aggregate
→ teacher-page class list → POST /api/generate
```

It deliberately has **no database and no auth**. The Pages Functions keep the class
aggregate only in runtime memory. A cold start, deploy, or request handled by a
different Cloudflare runtime may make it disappear. Do not use this endpoint for
real data collection; the receiver is public and the data is not durable.

After deploying this version, reload the unpacked extension. In Chrome, open its
**Details** page, choose **Extension options**, and enter:

| Setting | Example |
| --- | --- |
| Summary endpoint | `https://your-project.pages.dev/api/class-summaries` |
| Class ID | `period-3` |

Saving asks Chrome to allow that one endpoint. The setting stores only the endpoint
and opaque class ID—not interaction data. Use the extension on its local test page
until it flushes (after 30 events or 90 seconds), then reload the Pages teacher page.
The temporary class appears in the Class menu and selecting it switches the week to
the one sent by the extension. Click **Generate a fresh recommendation** to complete
the model portion of the walkthrough.

## Extension video setup

The extension is local-only and is not deployed with the Pages site.

```bash
npm run seed:novice
npm start
```

Then open `chrome://extensions`, turn on **Developer mode**, choose **Load unpacked**,
and select the repository’s `extension/` directory. For the deployed prototype,
configure the endpoint through **Details** → **Extension options** as described above.

## Data and privacy

The deployed site contains class-level fixture vectors and scripts, plus the
temporary runtime-only aggregate bridge described above. It does not include a
database, raw trace fixtures, accounts, or authentication.

The extension records interaction timing and event shape only. It does not read page
text, form values, filenames, URLs, screenshots, or key identity. Both the local
server and temporary Pages bridge merge session summaries into class aggregates and do
not retain session IDs.
