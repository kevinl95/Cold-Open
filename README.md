# ColdOpen

**Privacy-preserving classroom telemetry that tells a teacher what to demo on Monday.**

Many students in under-resourced districts arrive without basic computer skills. They struggle with mice, typing, and file systems, because their only computer at home was a phone. Teachers can see who is behind but not why, and their only realistic intervention is a five-minute demo at the front of the room. They have no data telling them what to demo, so they guess.

ColdOpen watches *how* a class interacts, never *what* they work on, and turns the aggregate into the one artifact a teacher can use: a five-minute demo script, with the evidence behind it, ready to run cold on Monday morning.

Built for OpenAI Build Week, spec-first with Codex against [a design document](design-doc.md) whose non-goals mattered more than its goals.

## The privacy claim is enforced, not promised

The extension cannot see content. Not page text, not form values, not filenames, not URLs, not screenshots, not which keys were pressed. This is a structural property of the code:

- The content script observes event **timing and shape** only. The keydown handler uses the event purely as a timing pulse and never reads a property.
- [`tests/privacy-extension.test.ts`](tests/privacy-extension.test.ts) reads the content script's source and **fails the build** if it ever references DOM selectors, text content, or key identity.
- Individual sessions collapse into a single class-level feature vector. Identity is discarded at aggregation. There are no per-student records anywhere, because there is nothing per-student to record.

Class-level aggregation is not a privacy compromise. A teacher with 30 students has five minutes per class, not ten minutes per kid, so the class is the grain they can act on. The privacy win comes free with getting the product right.

## How it works

```
extension → POST /api/class-summaries → class aggregate
teacher page → GET /api/classes → selected class feature vector
teacher page → POST /api/generate → structured five-minute demo script
```

The extension emits timing events (hesitation before clicks, abandoned drags, file dialogs dismissed without a selection, keystroke intervals) from an explicit allow-list of capture sites. The rollup produces a class feature vector. One server-side model call turns that vector into a structured recommendation: diagnosis, plain-language evidence, setup, steps, and a comprehension check. If the model call fails or returns invalid JSON, a deterministic fallback keeps the teacher's page working.

The classroom device does almost nothing, by design. The Chromebooks this is built for are base-model, years-old, 4GB machines that Google's built-in AI will never reach and that per-seat SaaS tools price out. One cached model call per class per week puts the cost floor at fractions of a cent per classroom.

## Run it locally

```bash
npm install
npm start
```

Open http://localhost:3000. The 8AM sample class loads immediately from committed fixtures; choose 2PM class for the second sample. **Generate a fresh recommendation** runs the live model-backed version when a key is configured.

Run the checks, including the privacy invariant:

```bash
npm test
```

Seed a novice-pattern class for a local extension walkthrough:

```bash
npm run seed:novice
npm start
```

## Deploy to Cloudflare Pages

1. Push the repository to GitHub or GitLab.
2. In Cloudflare, select **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**, then select this repository.
3. Configure the build:

   | Setting | Value |
   | --- | --- |
   | Framework preset | None |
   | Build command | `npm run build:pages` |
   | Build output directory | `dist-pages` |
   | Root directory | repository root |

4. After the first deployment, go to **Settings** → **Environment variables**. Add `OPENAI_API_KEY` as an encrypted secret in Production and Preview. Optionally set `OPENAI_MODEL`; otherwise ColdOpen uses `gpt-4.1-mini`.
5. Push to the production branch to deploy updates. Other branches receive preview deployments.

The key is read only by [`functions/api/generate.ts`](functions/api/generate.ts) in the Pages runtime. It never appears in the frontend, the fixtures, or the extension.

## Connect the extension

The extension loads unpacked and is not published or deployed with the Pages site.

1. Open `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked**.
2. Select this repository's `extension/` directory.
3. Open the extension's **Details** page, then choose **Extension options**.
4. Enter your Pages summary endpoint, for example: `https://your-project.pages.dev/api/class-summaries`
5. Enter the classroom sites ColdOpen may observe, separated by commas. For local testing, leave it as `http://localhost`.
6. Enter an opaque class ID such as `period-3`, then save and approve Chrome's permission requests.

**Capture sites are an allow-list, not a default.** ColdOpen runs nowhere until you name specific site origins, and Chrome asks for access to each one. When the list changes, the extension stops listening on removed sites and drops the permissions it no longer needs. The summary endpoint is separate: it is where aggregates are sent, not where activity is collected.

The extension sends one aggregate summary after 30 observed events or 90 seconds. Reload the capture site after saving, then reload the teacher page once a summary is delivered; the temporary class appears in the Class menu.

## Prototype limits

The deployed summary receiver has no database or authentication by design (see the [non-goals](design-doc.md)). It keeps aggregate state in Cloudflare Function runtime memory, so a deploy or cold start clears it. Treat the extension-to-page connection as a working integration prototype, not a durable data service. The built-in sample classes work independently of that temporary state.

## How we built with Codex

ColdOpen was built through a human-led, Codex-assisted, **spec-driven** workflow.
[`design-doc.md`](design-doc.md) framed the work before implementation and remained
the reference point for scope, privacy boundaries, interface contracts, and non-goals.
The product decisions remained deliberate: focus on a five-minute teacher
intervention rather than a dashboard, aggregate at class level rather than collect
student records, keep the extension unpacked, and ship committed fixtures so the
teacher experience has a reliable starting point.

Codex accelerated the engineering work around those decisions. It translated the
design document into shared Zod contracts, the extension, aggregation code, Pages
Functions, fixture build, and tests, then kept changes checked against that spec. It
also shortened the feedback loop while we iterated on the teacher UI, added the
teacher-configured capture-site allow-list, and diagnosed live integration issues such
as feature-vector validation, OpenAI API errors, and structured-output validation.

GPT-5.6 contributed through the Codex development collaboration: it helped reason
through privacy boundaries, turn product choices into bounded implementation tasks,
and produce and verify changes in the repository. Codex did not replace product
judgment; the team made the calls about what ColdOpen would collect, deploy, and show.
The model used by the deployed recommendation endpoint is a separate runtime choice:
it defaults to `gpt-4.1-mini` and can be changed with `OPENAI_MODEL`.

## Stack

TypeScript · MV3 Chrome extension · Cloudflare Pages Functions · OpenAI API · Zod contracts shared across the pipeline · Node test runner
