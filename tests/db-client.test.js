const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');

process.env.DB_PATH = path.join(os.tmpdir(), `mai90-test-${Date.now()}.db`);

const { initDb, insertRecord } = require('../db/client');

const record = {
  hierarchy: { tier: 'T1' },
  provenance: {
    license: 'CC BY 4.0',
    source_name: 'Test Source',
    source_locator: 'https://example.com/data/pump-001',
    collected_at: '2026-05-01',
  },
  engineering_fact: {
    subject: 'Test pump',
    parameter: 'current',
    value: 9.0,
    unit: 'A',
    condition: 'normal load',
    threshold: 10.0,
  },
};

before(async () => {
  await initDb();
});

test('first insert returns inserted: true', async () => {
  const result = await insertRecord(record);
  assert.equal(result.inserted, true);
  assert.ok(typeof result.id === 'string' && result.id.length > 0);
});

test('same record inserted again returns inserted: false', async () => {
  const result = await insertRecord(record);
  assert.equal(result.inserted, false);
});

test('deterministic id: same record always produces the same id', async () => {
  const r1 = await insertRecord(record);
  const r2 = await insertRecord(record);
  assert.equal(r1.id, r2.id);
});
