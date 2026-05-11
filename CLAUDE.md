# CLAUDE.md - MAI-90

> Canonical behavioral guidelines and project context for Claude Code.
> Read this entire file before every session. Do not skip sections.

---

## 0. Scope and Precedence

This file is the canonical instruction file for Claude Code working on MAI-90.

- The canonical language for agent instructions is English.
- Korean may be used in user-facing UI copy, team notes, or a separate `README.ko.md`.
- If another coding agent reads this file, it should follow the product and safety rules, but adapt tool-specific workflow steps to its own environment.
- Do not mix project requirements with tool-specific commands unless the command is explicitly available in the current session.
- User instructions in the active conversation may refine the task, but they must not override safety, licensing, or data-ingestion rules unless the human explicitly changes the project policy.

Core rule:

> MAI-90 is a human-led safety support system. The system may recommend and explain. It must never autonomously control machinery or replace a worker's decision.

---

## 1. Project Identity

**MAI-90 (Maintenance & Analysis Intelligence)** is a human-led AI support system for aging industrial facilities in emerging-market conditions.

### 1.1 Core Principles

- Human operators decide. AI only recommends.
- Offline-first, low-cost, explainable, and robust under weak infrastructure.
- Designed for aging equipment, incomplete records, and low-resource environments.
- Safety signals must be derived from deterministic rules and validated records, not from generative model judgment.
- When data is uncertain, the system must say so plainly.

### 1.2 Problem Context

MAI-90 addresses a specific industrial safety gap:

- Aging facilities produce fragmented maintenance and inspection data.
- Workers often lack fast, interpretable support for reading that data.
- Emerging-market plants face higher fatality rates, weaker infrastructure, and tighter carbon-related regulation pressure.
- Contractors and outsourced workers are often exposed to the highest risk.

Reference statistics in this repository are planning context. Verify all figures before public release, competition submission, publication, or investor-facing use.

### 1.3 What We Are Not Building

- Autonomous machine control.
- A replacement for field workers, engineers, or safety managers.
- A high-end AI platform for fully modernized plants.
- A system that treats LLM output as the source of safety truth.
- A multi-page enterprise dashboard for the MVP.

### 1.4 Stages

Current stage:

- First agent prototype for internal team use.
- Web-based.
- Uses collected records for simple question answering and field-note-style recommendations.
- May use Claude API for explanations, but not for safety signal decisions.

Next stage:

- Public-facing service expansion.
- More robust ingestion, audit logs, and deployment boundaries.

Later stage:

- Second agent for direct field-worker use.
- Offline operation required.
- Short Green / Yellow / Red / Unknown signal and plain-language recommendation.

---

## 2. Behavioral Guidelines

### 2.1 Think Before Coding

Do not hide confusion. Do not silently choose among materially different interpretations.

Before implementation:

- State assumptions when they affect behavior, safety, data policy, or architecture.
- List meaningful interpretations if the request is ambiguous.
- Push back when a simpler approach would solve the problem.
- Ask before changing safety behavior, license policy, data deletion behavior, user-facing semantics, deployment assumptions, or architecture boundaries.

You may decide locally without asking when the choice is low-risk and can be inferred from existing code:

- File names and function names that follow local conventions.
- Small internal helper structure.
- Test location.
- Minor UI spacing within the stated UI rules.
- Simple implementation details that do not change product behavior.

### 2.2 Simplicity First

Write the minimum code that solves the verified task.

- No speculative features.
- No abstraction for code used in only one place.
- No configuration knobs unless the project already needs them.
- No defensive handling for impossible scenarios.
- If 200 lines can honestly be 50 lines, simplify.

Ask yourself:

> Would a senior engineer call this overbuilt?

If yes, simplify before committing to the design.

### 2.3 Surgical Changes

Touch only what the task requires.

- Do not refactor adjacent code just because it looks imperfect.
- Do not reformat unrelated files.
- Do not delete unrelated dead code. Mention it separately.
- Match existing style even if you would design it differently from scratch.
- Remove only unused imports, variables, or functions introduced by your own change.

Every changed line should trace back to the user's request, a test, or a stated safety/data requirement.

### 2.4 Goal-Driven Execution

Translate every task into a verifiable goal.

Examples:

- "Add validation" means: invalid input has a test, is rejected or quarantined correctly, and the pipeline continues.
- "Fix a bug" means: reproduce the bug with a test, then make the test pass.
- "Add UI status" means: the rendered output shows the correct status for a known record without overlapping or changing layout unexpectedly.

For multi-step work, write a short plan before coding:

```text
1. [Step] -> Verification: [observable check]
2. [Step] -> Verification: [observable check]
3. [Step] -> Verification: [observable check]
```

For non-trivial implementation work, save the plan as Markdown under `docs/plans/` unless the user asks for a chat-only answer.

---

## 3. Workflow

Use this workflow for meaningful changes.

1. Read this file and relevant local code.
2. Define the smallest useful success criteria.
3. Write a plan with verification checks.
4. Run adversarial review when available.
5. Update the plan based on valid criticism.
6. Implement the smallest scoped change.
7. Verify with tests, local scripts, or browser checks as appropriate.
8. Review the implementation for overbuild, hidden assumptions, and unintended diffs.

### 3.1 Adversarial Review

When an external review command or agent is available, use it before large implementation and again after implementation.

Examples:

- Use `/codex review` if it is available in the environment.
- Use another reviewer agent only if the current tool session explicitly supports it.
- If no external review path exists, perform a self-review using the same standard: find bugs, missing tests, unclear behavior, overbroad changes, and safety-policy violations.

Do not assume `/codex`, `/compact`, `/rescue`, or model-specific commands exist unless the current environment confirms them.

### 3.2 Session Management

- Continue the existing working context whenever possible.
- Avoid starting a new session when continuation is available.
- Compact or summarize before context pressure causes important decisions to be lost.
- If blocked, name the blocker precisely and propose the smallest next action.

---

## 4. Architecture

### 4.1 Data Flow

```text
Google Drive .txt files containing JSON
        |
        v
ingestion/          parse text, extract records, validate JSON
        |
        v
license-filter/     mandatory second-stage license check
        |
        v
local DB            SQLite or flat JSON through db/client.js
        |
        v
rule-engine/        deterministic Green / Yellow / Red / Unknown signal
        |
        v
explain/            Claude API explanation layer
        |
        v
ui/                 single-screen field-document display
```

### 4.2 Boundary Between Rule Engine and Claude API

This boundary is mandatory.

- The rule engine determines `GREEN`, `YELLOW`, `RED`, or `UNKNOWN`.
- Claude API may explain the rule-engine output in plain language.
- Claude API must not upgrade, downgrade, invent, or override the safety signal.
- Claude API must not invent measurements, sources, thresholds, or inspection history.
- If the source data is insufficient, the explanation must preserve that uncertainty.

Good:

```text
Rule engine: YELLOW
Explanation: Current readings are above the local caution threshold in three recent records. Reduce load only if the supervisor approves and inspect during the next shift.
```

Bad:

```text
Claude sees a pattern and changes YELLOW to RED without a rule-engine decision.
```

### 4.3 Web-Portable Structure

- Keep configuration in `.env`.
- Never commit `.env`.
- Commit `.env.example` with safe placeholder values.
- Do not hardcode API keys, ports, database paths, or source directories.
- Use `db/client.js` as a thin database boundary.
- Keep the API layer in Express so the frontend can be replaced later.
- Do not introduce an ORM unless explicitly requested.

The database boundary should stay small:

- `insertRecord`
- `listRecords`
- `getRecordById`
- task-specific functions only when the code actually needs them

Do not build a generic repository framework for the MVP.

### 4.4 Target File Structure

```text
mai-90/
├── CLAUDE.md
├── .env
├── .env.example
├── .gitignore
├── package.json
├── ingestion/
│   ├── parse-txt.js
│   ├── validate-record.js
│   └── license-filter.js
├── db/
│   ├── client.js
│   └── mai90.db
├── engine/
│   ├── rule-engine.js
│   └── explain.js
├── api/
│   └── server.js
├── ui/
│   └── index.html
├── tests/
│   ├── validate-record.test.js
│   ├── license-filter.test.js
│   └── rule-engine.test.js
└── logs/
    ├── rejected_log.json
    └── quarantine/
```

This is a target structure, not permission to create every file before it is needed.

---

## 5. Data Rules

### 5.1 Minimum Record Schema

A record must include these fields before it can enter the operational database:

```json
{
  "hierarchy": {
    "tier": "T1"
  },
  "provenance": {
    "license": "CC BY 4.0",
    "source_name": "Example Source",
    "source_locator": "URL, DOI, file path, or collection identifier",
    "collected_at": "2026-05-12"
  },
  "engineering_fact": {
    "subject": "Cooling pump #3",
    "parameter": "current",
    "value": 12.4,
    "unit": "A",
    "condition": "operating load 70%"
  }
}
```

Required fields:

- `hierarchy.tier`: one of `T1`, `T2`, `T3`, `T4`
- `provenance.license`
- `provenance.source_name`
- `provenance.source_locator`
- `provenance.collected_at`
- `engineering_fact.subject`
- `engineering_fact.parameter`
- `engineering_fact.value`
- `engineering_fact.unit`
- `engineering_fact.condition`

Optional but recommended:

- `provenance.publisher`
- `provenance.author`
- `provenance.source_url`
- `engineering_fact.threshold`
- `engineering_fact.observed_at`
- `engineering_fact.notes`

If an upstream source lacks an ID, the ingestion pipeline may generate a stable local ID. The generated ID must not replace provenance.

### 5.2 JSON Validation

Validation happens before license filtering and before database writes.

If JSON is malformed or required fields are missing:

- Move or copy the rejected input record to `logs/quarantine/`.
- Record the reason.
- Continue processing other records.
- Do not crash the entire pipeline because of one bad record.

Implementation rules:

- Use `try/catch` around per-record parsing and validation.
- Never silently drop records.
- Do not write invalid records to the database.
- Use `fs/promises` for all file I/O.
- Do not use sync filesystem methods.

### 5.3 License Filter

The license filter is mandatory for every ingestion path.

No record may be written to the database before passing the license filter.

| Result | Meaning |
| --- | --- |
| `PASS` | The record has an explicit reusable license accepted by this project. |
| `HOLD` | The license is missing, ambiguous, incomplete, or needs human review. |
| `REJECT` | The source is clearly not reusable under the project policy. |

Accepted `PASS` examples:

- `CC BY`
- `CC BY 4.0`
- `CC0`
- `Public Domain`
- clear government/public-data license allowing reuse
- explicit open-access license with reuse rights

`HOLD` examples:

- missing license
- plain `open access` with no license terms
- `academic citation only`
- `fair use`
- unclear translation of a license
- publisher name is present but the exact reuse license is not
- source terms are not machine-readable or are incomplete

`REJECT` examples:

- explicit copyright notice with no reuse license
- terms prohibiting redistribution or derivative use
- `Elsevier`, `Springer`, `IEEE`, or `Wiley` source with no explicit reusable license
- paywalled or proprietary content copied without license clarity

Publisher names are risk signals, not complete license decisions.

- If a restricted publisher is present and no explicit reusable license exists, use `REJECT` or `HOLD` according to available evidence.
- If a restricted publisher is present but the record has an exact accepted license such as `CC BY 4.0`, the record may `PASS`.
- When in doubt, use `HOLD`, not `PASS`.

Logging rules:

- Every `HOLD` and `REJECT` must be logged to `logs/rejected_log.json`.
- Include timestamp, source name, source locator, license text, result, and reason.
- Do not silently drop any record.
- Do not store `HOLD` or `REJECT` records in the operational database.

---

## 6. Rule Engine

The rule engine is the source of truth for safety status.

### 6.1 Required Statuses

The system must support four statuses:

- `GREEN`
- `YELLOW`
- `RED`
- `UNKNOWN`

`UNKNOWN` is required. In low-data environments, "not enough information" is a valid and important result. Do not force unknown or incomplete data into `GREEN`.

### 6.2 Status Meanings

`GREEN`:

- Data is sufficient.
- Measurements are within known operating range.
- No recent anomaly is detected by the available rules.

`YELLOW`:

- Repeated abnormal trend.
- Mild threshold crossing.
- Stale but concerning data.
- Plausible risk that requires inspection, reduced load, or supervisor review.

`RED`:

- Immediate safety risk.
- Hard threshold exceeded.
- Known failure condition detected.
- Critical inspection is missing where policy treats absence as dangerous.

`UNKNOWN`:

- Insufficient data.
- Inconsistent records.
- Missing threshold or unit.
- Source quality prevents confident classification.

### 6.3 Rule Output Shape

The rule engine should return a small structured object:

```json
{
  "status": "YELLOW",
  "equipment": "Cooling pump #3",
  "action": "Inspect during the next shift. Do not change machine state without supervisor approval.",
  "reason": "Current exceeded the caution threshold in 3 recent records.",
  "evidence": ["record-id-1", "record-id-2", "record-id-3"]
}
```

Rules:

- `action` is advisory only.
- Never output autonomous control instructions.
- Always preserve enough evidence IDs to trace the decision.
- If evidence is insufficient, return `UNKNOWN`.

---

## 7. Explanation Layer

The explanation layer may use Claude API for plain-language summaries.

It receives:

- validated source records
- rule-engine output
- optional user question

It may produce:

- short explanation
- concise reason
- cautious next-step recommendation

It must not produce:

- a safety status different from the rule engine
- invented facts, measurements, sources, or thresholds
- legal conclusions about license validity beyond the license filter result
- autonomous machine-control commands
- long chatty responses

Recommended output length:

- 2 to 3 sentences maximum for each recommendation.
- Use plain language suitable for field and maintenance context.

---

## 8. UI Rules

The UI must feel like a field document, not a tech product.

### 8.1 Visual Rules

- Single screen only.
- No tabs.
- No modals.
- No sidebar.
- No decorative fonts.
- Use monospace or plain sans-serif fonts.
- Use only these signal colors:
  - Green: `#2d9e2d`
  - Yellow: `#e6a817`
  - Red: `#cc2222`
- `UNKNOWN` should be displayed in plain monochrome text, not as a fourth signal color.
- Avoid gradients, decorative cards, chat bubbles, and AI-branding patterns.

### 8.2 Interaction Rules

- Natural-language questions are allowed.
- Responses must render as field-note records, not chat messages.
- Do not use labels such as "AI says" or "assistant response".
- Do not expose internal prompts, model names, or chain-of-thought-like reasoning.
- Keep recommendation text short and practical.

### 8.3 Display Format

Use a simple field format:

```text
Equipment: Cooling pump #3
Status:    [YELLOW]
Action:    Reduce RPM by 3% only with supervisor approval. Inspect during next shift.
Reason:    Current exceeded the caution threshold in the last 3 measurements.
Source:    record-id-1, record-id-2, record-id-3
```

If Korean copy is needed for users, localize the labels and messages while preserving the same structure and safety meaning.

---

## 9. Coding Conventions

### 9.1 Language and Runtime

- Use JavaScript with Node.js.
- Do not use TypeScript unless explicitly requested.
- Use `kebab-case.js` for file names.
- Use `async/await`.
- Extract a function when an async flow exceeds roughly three meaningful steps.

### 9.2 File I/O

- Use `fs/promises`.
- Do not use sync filesystem methods.
- Keep file operations explicit and traceable.

### 9.3 Data and Database

- Use SQLite raw queries or flat JSON for the MVP.
- Do not use an ORM.
- Keep `db/client.js` thin.
- Do not hardcode database paths; use environment configuration.

### 9.4 API

- Use Express for the API layer.
- Keep API routes small.
- Validate input before calling business logic.
- Do not let API handlers contain license-filter or rule-engine internals directly.

### 9.5 Logging

- `console.log` is acceptable during development.
- Remove temporary logs before finishing.
- Keep intentional operational logging minimal and structured.

### 9.6 Dependencies

- Add dependencies only when they remove real complexity.
- Prefer built-in Node.js APIs for simple parsing and file work.
- Do not add frontend frameworks unless explicitly requested.

---

## 10. MVP Boundaries

The first useful MVP should prove the safety-data path before proving the conversational layer.

### 10.1 MVP Success Criteria

The MVP is successful when it can:

1. Read one `.txt` input containing JSON records.
2. Parse each JSON record.
3. Validate required fields.
4. Quarantine malformed or incomplete records.
5. Run the mandatory license filter.
6. Store only `PASS` records.
7. Log every `HOLD` and `REJECT`.
8. Run a deterministic rule-engine decision.
9. Display a single-screen field-document result.

Claude API explanation is second priority. It should be added only after the deterministic ingestion and rule path is testable.

### 10.2 Explicitly Out of Scope for MVP

- Autonomous control.
- Authentication.
- Real-time streaming.
- WebSocket.
- Cloud sync.
- Advanced ML model training.
- Multi-page application.
- Complex role management.
- Predictive maintenance model claims that are not backed by local rules or validated data.

---

## 11. Verification and Tests

Write tests in proportion to risk.

Mandatory test areas:

- Missing required field goes to quarantine.
- Malformed JSON does not crash the pipeline.
- Missing license becomes `HOLD` and is logged.
- Accepted license becomes `PASS`.
- Restricted publisher with no open license becomes `HOLD` or `REJECT`.
- Only `PASS` records enter the database.
- Rule engine returns `UNKNOWN` for insufficient data.
- Rule engine does not return `GREEN` when required data is missing.

For bug fixes:

1. Write or identify a failing test that reproduces the bug.
2. Fix the bug.
3. Run the test again.
4. Check for unintended changes.

For UI changes:

- Verify desktop and mobile viewport layout.
- Confirm text does not overlap.
- Confirm colors match the approved signal colors.
- Confirm the UI still looks like a field document, not a chat product.

---

## 12. Security, Privacy, and Secrets

- Never commit `.env`.
- Never commit API keys.
- Never print secrets to logs.
- Use `.env.example` for safe placeholders.
- Treat source documents, industrial records, and worker-related data as sensitive.
- Do not include copyrighted source text in logs beyond what is needed for traceability.
- Keep provenance metadata even when source content is rejected.

---

## 13. Project References

These references are planning context, not automatically verified facts for publication.

### 13.1 Industrial Safety Context

- South Korean steelworks have recorded serious fatal accidents over the last decade.
- Contractors and outsourced workers are disproportionately exposed.
- Emerging-market industrial fatality rates can be several times higher than developed-market rates.

### 13.2 Research Context

Relevant topics:

- Agentic AI in smart manufacturing.
- Explainable AI for quality and condition monitoring.
- Digital twins for energy efficiency.
- Edge-cloud architectures for process industries.
- Human-in-the-loop safety support.

### 13.3 Market Context

Relevant market themes:

- Predictive maintenance.
- AI-assisted fault diagnosis.
- Maintenance cost reduction.
- Carbon and energy-efficiency pressure.

Verify all numbers, citations, and claims before external use.

---

## 14. Guidelines Are Working If

- Diffs are small and directly tied to the task.
- The license filter runs before every database write.
- `HOLD` and `REJECT` are logged, not silently discarded.
- Missing or weak data becomes `UNKNOWN`, not false confidence.
- Claude explains but does not decide the safety signal.
- The UI looks like a field document.
- Tests cover the behavior that can fail.
- The implementation is simple enough that another engineer can audit it quickly.

