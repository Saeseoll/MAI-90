# MAI-90 Implementation Guard

> Use this checklist before and during implementation.
> Its purpose is to prevent avoidable MVP mistakes: missing dependencies, plan-code drift, unsafe wording, hidden sync I/O, and misleading verification counts.

---

## 1. Stop Before Coding

Before writing files, answer these checks in the plan:

1. What is the smallest working MVP for this step?
2. Which behavior must be verified by tests or a manual API check?
3. Which dependencies are required by the code being written?
4. Does any planned code conflict with `CLAUDE.md`?
5. Does the implementation produce safety recommendations only, never machine-control commands?

If any answer is unclear, pause and clarify before implementing.

---

## 2. Dependency Consistency

Every `require()` or imported package must appear in `package.json`, unless it is a Node.js built-in module.

Before finishing:

- Search for `require('...')` and `import ... from '...'`.
- Compare external packages against `package.json`.
- If `require('dotenv').config()` is used, `dotenv` must be in dependencies.
- Do not add a dependency unless it removes real complexity.

Preferred MVP rule:

- If a dependency may fail installation on Windows or requires native compilation, consider a simpler alternative first.
- For the first MAI-90 MVP, flat JSON storage is acceptable if SQLite setup adds friction.

---

## 3. File I/O Rule

`CLAUDE.md` says file I/O must use `fs/promises`.

Do not use:

```js
fs.existsSync(...)
fs.mkdirSync(...)
fs.readFileSync(...)
fs.writeFileSync(...)
```

Use:

```js
await fs.mkdir(dir, { recursive: true });
await fs.readFile(file, 'utf8');
await fs.writeFile(file, text);
```

If a selected library is intentionally synchronous, such as `better-sqlite3`, document the exception clearly and keep ordinary file operations async.

---

## 4. Parse Behavior Must Match Reality

Do not claim that malformed records inside a JSON array can be quarantined one-by-one.

Correct behavior:

- JSON array format: the entire file must be valid JSON. If the array parse fails, quarantine the whole file.
- NDJSON format: one JSON object per line. If one line is malformed, quarantine only that line and continue.

If per-record fault tolerance is required, prefer NDJSON for sample data and tests.

---

## 5. Counts Must Tell the Truth

API responses must include all records handled by the pipeline.

If parsing quarantines malformed input, the ingest response must report it.

Preferred shape:

```js
{
  processed: 5,
  inserted: 2,
  quarantined: 1,
  held: 1,
  rejected: 1
}
```

Implementation hint:

`parseRecords()` should return metadata, not just records:

```js
{
  records: [],
  quarantined: 0
}
```

Then `POST /api/ingest` can include parse-stage quarantine counts in the final response.

---

## 6. Safety Wording

MAI-90 recommends. It does not command machine control.

Avoid command-like action text:

```text
Stop or isolate the equipment immediately.
```

Prefer advisory, procedure-based text:

```text
Treat as immediate risk. Notify a supervisor and follow site lockout or isolation procedure before continuing work.
```

Rules:

- Never tell the system to change machine state automatically.
- Never imply AI has authority over the worker.
- Use supervisor review, site procedure, inspection, and evidence language.
- Keep recommendations short.

---

## 7. UNKNOWN Is Not A Fourth Signal Color

Approved signal colors:

- Green: `#2d9e2d`
- Yellow: `#e6a817`
- Red: `#cc2222`

`UNKNOWN` should be plain monochrome text, not a new colored badge.

Acceptable:

```css
.status-UNKNOWN {
  color: #1a1a1a;
  background: transparent;
  border: 1px solid #777;
}
```

Avoid making `UNKNOWN` look like a fourth traffic-light state.

---

## 8. Rule Engine Guardrails

The rule engine is the only source of safety status.

Required behavior:

- No records -> `UNKNOWN`
- No threshold -> `UNKNOWN`
- Missing required measurement data -> `UNKNOWN`
- Latest value above hard threshold -> `RED`
- Latest value above caution threshold -> `YELLOW`
- Sufficient data within threshold -> `GREEN`

Never let the explanation layer or UI change the status.

---

## 9. End-of-Step Self Review

Before saying a step is complete, run this review:

1. Does the code run with the dependencies in `package.json`?
2. Did I use any sync filesystem method?
3. Does the test or sample data match what the parser can actually do?
4. Are quarantine, HOLD, and REJECT counts accurate?
5. Are safety actions advisory rather than commands?
6. Does `UNKNOWN` remain visually neutral?
7. Did I change only files required by this task?
8. Did I verify the behavior I claimed was complete?

If any answer is "no", fix it before continuing.

---

## 10. Recommended First Correction Pass

If this guard is being applied to the current MAI-90 MVP implementation, check these likely issues first:

1. Add `dotenv` to `package.json` or remove `require('dotenv').config()`.
2. Replace sync filesystem calls in `db/client.js`.
3. Change `parseRecords()` to return `{ records, quarantined }`.
4. Make `POST /api/ingest` include parse-stage quarantine counts.
5. Make sample malformed data NDJSON, not a broken JSON array.
6. Change `RED` action text to advisory procedure language.
7. Make `UNKNOWN` UI monochrome without a colored badge background.

