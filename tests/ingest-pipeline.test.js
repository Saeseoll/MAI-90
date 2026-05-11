const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');
const fs = require('fs/promises');

const testDbPath = path.join(os.tmpdir(), `mai90-pipeline-${Date.now()}.db`);
const testLogsPath = path.join(os.tmpdir(), `mai90-logs-${Date.now()}`);
process.env.DB_PATH = testDbPath;
process.env.LOGS_PATH = testLogsPath;

const { intakeFile } = require('../ingestion/intake-file');
const { validateRecord } = require('../ingestion/validate-record');
const { filterLicense } = require('../ingestion/license-filter');
const { initDb, insertRecord } = require('../db/client');

// Fixture: 2 PASS records, 1 HOLD record, 1 malformed line
const RECORD_A = JSON.stringify({
  hierarchy: { tier: 'T1' },
  provenance: { license: 'CC BY 4.0', source_name: 'Test', source_locator: 'https://example.com/a', collected_at: '2026-05-01' },
  engineering_fact: { subject: 'Pump A', parameter: 'current', value: 9.0, unit: 'A', condition: 'normal', threshold: 10.0 },
});

const RECORD_B = JSON.stringify({
  hierarchy: { tier: 'T1' },
  provenance: { license: 'CC BY 4.0', source_name: 'Test', source_locator: 'https://example.com/b', collected_at: '2026-05-02' },
  engineering_fact: { subject: 'Pump B', parameter: 'current', value: 11.5, unit: 'A', condition: 'high load', threshold: 10.0 },
});

const RECORD_HOLD = JSON.stringify({
  hierarchy: { tier: 'T1' },
  provenance: { license: 'open access', source_name: 'Some Journal', source_locator: 'https://somejournal.com/article', collected_at: '2026-05-01' },
  engineering_fact: { subject: 'Pump C', parameter: 'pressure', value: 150.0, unit: 'bar', condition: 'rated load' },
});

const MALFORMED = '{this line is intentionally malformed JSON';

let fixturePath;

before(async () => {
  await initDb();
  await fs.mkdir(testLogsPath, { recursive: true });
  fixturePath = path.join(os.tmpdir(), `mai90-fixture-${Date.now()}.txt`);
  await fs.writeFile(fixturePath, [RECORD_A, RECORD_B, RECORD_HOLD, MALFORMED].join('\n'));
});

async function runPipeline(filePath) {
  const { records: rawRecords, quarantined: parseQuarantined } = await intakeFile(filePath);
  const counts = { processed: rawRecords.length + parseQuarantined, inserted: 0, quarantined: parseQuarantined, held: 0, rejected: 0 };

  for (const raw of rawRecords) {
    const validation = validateRecord(raw);
    if (!validation.valid) { counts.quarantined++; continue; }

    const licenseResult = filterLicense(raw.provenance);
    if (licenseResult.result === 'HOLD') { counts.held++; continue; }
    if (licenseResult.result === 'REJECT') { counts.rejected++; continue; }

    const { inserted } = await insertRecord(raw);
    if (inserted) counts.inserted++;
  }
  return counts;
}

test('first ingest: correct counts (processed=4, inserted=2, quarantined=1, held=1, rejected=0)', async () => {
  const counts = await runPipeline(fixturePath);
  assert.equal(counts.processed, 4);
  assert.equal(counts.inserted, 2);
  assert.equal(counts.quarantined, 1);
  assert.equal(counts.held, 1);
  assert.equal(counts.rejected, 0);
});

test('second ingest of same file: inserted=0 (no duplicates written)', async () => {
  const counts = await runPipeline(fixturePath);
  assert.equal(counts.inserted, 0);
  assert.equal(counts.processed, 4);
});
