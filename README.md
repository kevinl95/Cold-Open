# ColdOpen

ColdOpen is a hackathon demo that turns a class-level interaction summary into a
five-minute teacher demo. It ships with two fixture classes, so the main experience
works even when the model API is unavailable.

## Try it locally

```bash
npm install
npm start
```

Open http://localhost:3000. The default class, `demo-novice-class`, loads a committed
script immediately. Try `demo-competent-class` to see the comparison fixture.

The **Regenerate live** button is for the deployed Pages app. Locally, the committed
fixture remains the reliable demo path.

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
   **Regenerate live** to call the model.

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
is intentional: use the fixture for the demo, then use **Regenerate live** to show the
real integration.

## Extension video setup

The extension is local-only and is not deployed with the Pages site.

```bash
npm run seed:novice
npm start
```

Then open `chrome://extensions`, turn on **Developer mode**, choose **Load unpacked**,
and select the repository’s `extension/` directory. Its endpoint is localhost-only.

## Data and privacy

The deployed site contains only class-level fixture vectors and fixture scripts. It
does not include the local aggregate store, raw trace fixtures, extension, accounts,
or authentication.

The local extension records interaction timing and event shape only. It does not read
page text, form values, filenames, URLs, screenshots, or key identity. The local
server merges session summaries into class aggregates and does not retain session IDs.
