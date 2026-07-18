# ColdOpen — Design Doc

Status: draft
Owner: Kevin Loeffler
Target: OpenAI Build Week submission, 8 day window
Last updated: 2026-07-13

> Sections marked **[CODEX]** are implementation targets.

---

## 1. Problem

Students in under-resourced districts arrive without basic computer skills: mouse
control, typing, and file system mental models. The gap is exposure, not aptitude.
Kids with a home computer and a parent who used one for work arrive fluent. Kids
whose only computing was a phone arrive without a concept of a file having a
location. The deficit compounds across every subject, every year.

Teachers cannot see this. They see the kid who is behind, not the reason. Their
only realistic intervention is a whole-class demo of a few minutes. They have no
data telling them what to demo, so they guess.

Existing classroom software that watches student screens is punitive surveillance
software, bought by districts, hated by teachers, and aimed at catching misuse
rather than diagnosing skill gaps.

## 2. Proposal

A privacy-preserving telemetry client plus an aggregation layer that tells a teacher
**what to demo on Monday**, and generates the demo script.

Core claim: the useful resolution of the data is set by the teacher's intervention
capacity. They can only run whole-class demos, so class-level aggregate is the
correct grain. Per-student records would be both a privacy liability and unactionable
noise. Aggregation is not a compromise, it is the design.

Second claim: the tool is structurally incapable of seeing student content. No
keystrokes, no screenshots, no filenames, no page text. Only interaction timing and
event shape. This is a hard constraint, not a policy promise.

## 3. Non-goals

Explicitly not building, and the doc should say why:

- **Per-student profiles.** Unactionable at the teacher's real intervention grain, and
  turns the tool into a record about a child.
- **Student-facing agentic coach.** Inherently per-kid, requires screen access, and an
  agent that does the navigating prevents the fluency it claims to build.
- **Any content capture.** See section 6.
- **A typing tutor.** Commodity. The novel part is diagnosis, not drill.
- **A dashboard as the deliverable.** The dashboard is setup. The demo script is the payoff.

## 4. Where the model earns its place

State this explicitly, because "specifically push forward AI for education" is the
judging bar and a rules engine would be the obvious objection.

The interpretation step is the model's job: turning a noisy, low-level behavioral
event stream into a claim about a *mental model* ("this class does not understand
that a file has a location") and then into a concrete five-minute demo a teacher can
run cold with no prep. Rules can detect a slow click. They cannot infer a missing
concept, and they cannot write the lesson.

The model sees Aggregate event statistics only to best preserve privacy.

## 5. Riskiest assumption, tested first

**Separability.** That interaction timing distinguishes *doesn't know how* from *bored /
distracted / broken trackpad*.

Day 1 test:
- Instrument myself performing a file management task normally.
- Instrument myself performing it as a novice would: hunt-and-peck, wrong menu, wrong
  mental model of file location, abandoned drags, repeated dialog opens.
- Do the traces visibly diverge without a classifier? Plot them.

If they do not diverge, the project is a random number generator and I stop on day 1.

**Known limitation to state in the writeup:** the real classroom confound is likely
confused-vs-checked-out, which I cannot test in July. Name it, do not hide it.

## 6. Privacy model

Non-negotiable constraints on the client:

- No content script access to page text, DOM contents, form values, or filenames.
- No screenshots, no keylogging. Key *timing* only, never key identity.
- No student identifiers persisted. Events carry an ephemeral per-session ID used only
  to stitch a session, discarded at aggregation.
- Aggregation to class level happens before anything is written to durable storage. This occurs client-side.

Corollary: no per-student record means the privacy surface is small. Say so, but do not
claim compliance. I am not a lawyer and the writeup should not pretend otherwise.

## 7. Deployment reality

The only path onto a managed Chromebook is a force-installed Chrome extension pushed
by district admin. That is procurement, and it will not happen inside 8 days.

For the submission this means:
- Demo runs on self-generated and synthetic traces.
- Say this loudly. "School is out; here is the September validation plan" is a credible
  engineering answer and reads better than a suspiciously clean demo.

**[FILL]** September validation plan, one paragraph. Which district, which teacher,
what would count as the tool being right.

## 8. Architecture

**[CODEX]** Implementation starts here.

```
extension/          MV3 Chrome extension
  content.js        event capture, no content access
  background.js     batching, session buffer
aggregator/         class-level rollup, per-teacher
  rollup.py         event stream -> class-level feature vector
generator/
  prompt.py         feature vector -> demo script
  schema.py         structured output contract
web/                teacher view: one page, current class, current script
fixtures/
  traces/           self-recorded + synthetic traces for the demo
```

### 8.1 Event schema


```json
{
  "session": "ephemeral-uuid",
  "t": 12843,
  "type": "click | drag_start | drag_abandon | drag_complete | dialog_open | dialog_close_noop | key_interval | scroll | focus_change",
  "dt_prev": 4210,
  "meta": {}
}
```

Candidate signals, keep the list short and defensible:
- Hesitation: interval between a UI element becoming available and first interaction.
- Abandoned drags: started, released outside any target.
- Dead-end dialogs: file picker opened and dismissed with no selection.
- Backtracking: repeated open/close of the same UI surface.
- Save-location entropy: everything landing in Downloads is the file-system-mental-model tell.
  Investigate if we can even observe this without filename access? Possibly via dialog
  interaction shape only. Resolve before committing to it.
- Key intervals and backspace rate.

### 8.2 Class-level feature vector

Rollup emits per class, never per student:

```json
{
  "class_id": "opaque",
  "n_sessions": 24,
  "window": "2026-09-08/2026-09-12",
  "signals": {
    "drag_abandon_rate": 0.31,
    "median_hesitation_ms": 3200,
    "dead_end_dialog_rate": 0.44,
    "...": "..."
  },
  "confidence": "low | medium | high"
}
```

**Small-n honesty.** A class is ~25 kids. Six kids struggling is signal. Two is noise
or a broken trackpad. The UI must surface confidence, because the first false alarm
burns credibility with a skeptical teacher permanently. Aggregating across grade or
school costs nothing privacy-wise and helps a lot.

### 8.3 Demo script generator

Input: class-level feature vector. Output: a five-minute demo a teacher runs cold.


Structured output contract, roughly:

```json
{
  "diagnosis": "one sentence, the missing concept",
  "confidence": "medium",
  "evidence": ["which signals drove this, in plain language"],
  "demo": {
    "duration_min": 5,
    "setup": "what to have open before class",
    "steps": ["..."],
    "check": "how the teacher knows it landed"
  }
}
```

## 9. Eight day plan

| Day | Work |
|-----|------|
| 1 | Separability test. Go / no-go. |
| 2-3 | Extension + event capture + schema locked. |
| 4 | Rollup + feature vector. |
| 5 | Demo script generator. Handwritten target first, then prompt to match it. |
| 6 | **Teacher review.** Send a generated script to a teacher who hates AI. Their reaction, quoted, goes in the submission. Two days left to fix it if they say it is useless. |
| 7-8 | Writeup, buffer. |

Scope discipline: instrumentation + demo script generator is a complete submission.
The dashboard, the per-kid view, the coach layer, the live assist are all scope creep.

## 10. Submission narrative

- The equity gap is not AI access, it is adult attention and prior exposure.
- The tool cannot see what a child is working on. By construction.

## 11. Open questions

- Does the teacher see one class or all their sections? A: One class
- What is the refresh cadence: weekly digest, or on-demand "what should I demo"? A: On-demand
