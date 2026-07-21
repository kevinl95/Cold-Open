# ColdOpen

ColdOpen turns aggregate class interaction patterns into a short, teacher-led
recommendation. The teacher page starts with two built-in sample classes and can
generate a new five-minute recommendation with OpenAI. An unpacked Chrome extension
can also send aggregate-only summaries into the prototype flow.

## What is included

- A teacher-facing page with sample classes: **8AM class** and **2PM class**.
- A Cloudflare Pages Function that generates structured recommendations server-side.
- An unpacked Chrome extension that sends aggregate session summaries to a configured
  endpoint.
- A temporary Pages receiver and class list for testing the full extension-to-page
  flow without introducing a database or accounts.

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000. The 8AM class loads immediately. Choose 2PM class to
view the second sample. Choosing a class or changing the week updates the page;
**Generate a fresh recommendation** runs the model-backed version when it is
available.

Run the checks with:

```bash
npm test
```

## Deploy to Cloudflare Pages

1. Push the repository to GitHub or GitLab.
2. In Cloudflare, select **Workers & Pages** → **Create application** → **Pages** →
   **Connect to Git**, then select this repository.
3. Configure the build:

   | Setting | Value |
   | --- | --- |
   | Framework preset | None |
   | Build command | `npm run build:pages` |
   | Build output directory | `dist-pages` |
   | Root directory | repository root |

4. After the first deployment, go to **Settings** → **Environment variables**.
   Add `OPENAI_API_KEY` as an encrypted secret in Production and Preview. Optionally
   set `OPENAI_MODEL`; otherwise ColdOpen uses `gpt-4.1-mini`.
5. Push to the production branch to deploy updates. Other branches receive preview
   deployments.

The OpenAI key is read only by
[`functions/api/generate.ts`](functions/api/generate.ts) in the Pages runtime. It is
not included in the frontend, sample files, or extension.

## Connect the extension

The extension is loaded unpacked and is not published or deployed with the Pages
site.

1. Open `chrome://extensions`, enable **Developer mode**, and choose **Load
   unpacked**.
2. Select this repository’s `extension/` directory.
3. Open the extension’s **Details** page, then choose **Extension options**.
4. Enter your Pages summary endpoint, for example:
   `https://your-project.pages.dev/api/class-summaries`
5. Enter the classroom sites ColdOpen may observe, separated by commas. For example:
   `https://classroom-tool.example, https://practice-tool.example`. For local
   testing, leave it as `http://localhost`.
6. Enter an opaque class ID such as `period-3`, then save and approve Chrome’s
   request to use the endpoint and selected capture sites.

The extension sends one aggregate summary after 30 observed events or 90 seconds.
Reload each selected capture site after saving, then reload the teacher page after a
summary is delivered. The temporary class appears in the Class menu and selecting it
loads its aggregate and sets the matching week.

For a local-only extension walkthrough, start the local server first:

```bash
npm run seed:novice
npm start
```

## How the prototype data flow works

```
extension → POST /api/class-summaries → class aggregate
teacher page → GET /api/classes → selected class feature vector
teacher page → POST /api/generate → structured recommendation
```

Only class-level aggregates are used by the recommendation endpoint. The extension
records event timing and event shape on the configured capture sites; it does not
read page text, form values, filenames, URLs, screenshots, or key identity. Session
IDs and raw events are not retained in class aggregates.

## Current prototype limits

The deployed summary receiver has no database or authentication. It keeps aggregate
state in Cloudflare Function runtime memory, so a deploy, cold start, or another
runtime can clear it. Treat the extension-to-page connection as a working integration
prototype, not a durable data service. The built-in sample classes remain available
independently of that temporary state.
