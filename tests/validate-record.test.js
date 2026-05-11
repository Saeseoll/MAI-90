const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateRecord } = require('../ingestion/validate-record');

const base = {
  hierarchy: { tier: 'T1' },
  provenance: {
    license: 'CC BY 4.0',
    source_name: 'Test Source',
    source_locator: 'https://example.com/data',
    collected_at: '2026-05-01',
  },
  engineering_fact: {
    subject: 'Cooling pump #3',
    parameter: 'current',
    value: 9.0,
    unit: 'A',
    condition: 'operating load 70%',
  },
};

function makeRecord(overrides) {
  return JSON.parse(JSON.stringify({ ...base, ...overrides }));
}

test('valid complete record passes', () => {
  assert.deepEqual(validateRecord(base), { valid: true });
});

test('missing hierarchy.tier fails', () => {
  const r = makeRecord({ hierarchy: {} });
  const result = validateRecord(r);
  assert.equal(result.valid, false);
  assert.ok(result.reason.includes('hierarchy.tier'));
});

test('invalid tier value fails', () => {
  const r = makeRecord({ hierarchy: { tier: 'T9' } });
  const result = validateRecord(r);
  assert.equal(result.valid, false);
  assert.ok(result.reason.includes('hierarchy.tier'));
});

test('missing provenance.license fails', () => {
  const r = makeRecord({ provenance: { ...base.provenance, license: '' } });
  const result = validateRecord(r);
  assert.equal(result.valid, false);
  assert.ok(result.reason.includes('provenance.license'));
});

test('missing engineering_fact.value fails', () => {
  const r = makeRecord();
  delete r.engineering_fact.value;
  const result = validateRecord(r);
  assert.equal(result.valid, false);
  assert.ok(result.reason.includes('engineering_fact.value'));
});

test('non-numeric value fails', () => {
  const r = makeRecord({ engineering_fact: { ...base.engineering_fact, value: 'twelve' } });
  const result = validateRecord(r);
  assert.equal(result.valid, false);
  assert.ok(result.reason.includes('engineering_fact.value'));
});

test('missing engineering_fact.subject fails', () => {
  const r = makeRecord();
  r.engineering_fact.subject = '';
  const result = validateRecord(r);
  assert.equal(result.valid, false);
  assert.ok(result.reason.includes('engineering_fact.subject'));
});

test('null input fails gracefully', () => {
  const result = validateRecord(null);
  assert.equal(result.valid, false);
});
