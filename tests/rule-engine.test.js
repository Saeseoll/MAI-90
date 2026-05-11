const { test } = require('node:test');
const assert = require('node:assert/strict');
const { evaluateEquipment } = require('../engine/rule-engine');

const subject = 'Test pump';

function rec(id, value, threshold, collected_at = '2026-05-01') {
  return { id, value, threshold, unit: 'A', parameter: 'current', collected_at };
}

test('no records → UNKNOWN', () => {
  assert.equal(evaluateEquipment(subject, []).status, 'UNKNOWN');
});

test('records without threshold → UNKNOWN', () => {
  assert.equal(evaluateEquipment(subject, [rec('r1', 5, null)]).status, 'UNKNOWN');
});

test('value well above threshold (>120%) → RED', () => {
  // threshold 10, value 12.5 = 125% of threshold
  assert.equal(evaluateEquipment(subject, [rec('r1', 12.5, 10)]).status, 'RED');
});

test('value just above threshold → YELLOW', () => {
  // threshold 10, value 11 = 110% (between 100% and 120%)
  assert.equal(evaluateEquipment(subject, [rec('r1', 11, 10)]).status, 'YELLOW');
});

test('value within threshold → GREEN', () => {
  assert.equal(evaluateEquipment(subject, [rec('r1', 9, 10)]).status, 'GREEN');
});

test('latest within threshold but 2+ older records exceeded → YELLOW (stale trend)', () => {
  const records = [
    rec('r1', 9,  10, '2026-05-03'),   // newest — within threshold
    rec('r2', 11, 10, '2026-05-02'),   // exceeded
    rec('r3', 12, 10, '2026-05-01'),   // exceeded
  ];
  assert.equal(evaluateEquipment(subject, records).status, 'YELLOW');
});

test('latest within threshold and only 1 older exceeded → GREEN', () => {
  const records = [
    rec('r1', 9,  10, '2026-05-03'),   // newest — within threshold
    rec('r2', 11, 10, '2026-05-02'),   // exceeded (only 1)
  ];
  assert.equal(evaluateEquipment(subject, records).status, 'GREEN');
});

test('result includes equipment name and evidence IDs', () => {
  const result = evaluateEquipment(subject, [rec('rec-abc', 9, 10)]);
  assert.equal(result.equipment, subject);
  assert.ok(Array.isArray(result.evidence));
});

test('RED result contains non-empty action', () => {
  const result = evaluateEquipment(subject, [rec('r1', 15, 10)]);
  assert.equal(result.status, 'RED');
  assert.ok(result.action.length > 0);
});
