const { test } = require('node:test');
const assert = require('node:assert/strict');
const { filterLicense } = require('../ingestion/license-filter');

test('CC BY 4.0 passes', () => {
  assert.equal(filterLicense({ license: 'CC BY 4.0' }).result, 'PASS');
});

test('CC BY passes', () => {
  assert.equal(filterLicense({ license: 'CC BY' }).result, 'PASS');
});

test('CC0 passes', () => {
  assert.equal(filterLicense({ license: 'CC0' }).result, 'PASS');
});

test('Public Domain passes', () => {
  assert.equal(filterLicense({ license: 'Public Domain' }).result, 'PASS');
});

test('missing license is HOLD', () => {
  assert.equal(filterLicense({ license: '' }).result, 'HOLD');
});

test('open access without terms is HOLD', () => {
  assert.equal(filterLicense({ license: 'Open Access' }).result, 'HOLD');
});

test('academic citation only is HOLD', () => {
  assert.equal(filterLicense({ license: 'Academic citation only' }).result, 'HOLD');
});

test('fair use is HOLD', () => {
  assert.equal(filterLicense({ license: 'fair use' }).result, 'HOLD');
});

test('unknown license is HOLD', () => {
  assert.equal(filterLicense({ license: 'some unknown terms v2' }).result, 'HOLD');
});

test('explicit copyright is REJECT', () => {
  assert.equal(filterLicense({ license: 'Copyright all rights reserved' }).result, 'REJECT');
});

test('redistribution prohibited is REJECT', () => {
  assert.equal(filterLicense({ license: 'redistribution prohibited' }).result, 'REJECT');
});

test('Elsevier source without open license is REJECT', () => {
  assert.equal(filterLicense({ license: 'journal article', source_name: 'Elsevier' }).result, 'REJECT');
});

test('Elsevier source WITH CC BY 4.0 is PASS', () => {
  assert.equal(filterLicense({ license: 'CC BY 4.0', source_name: 'Elsevier' }).result, 'PASS');
});

test('ScienceDirect URL in source_locator without open license is REJECT', () => {
  assert.equal(filterLicense({
    license: 'journal article',
    source_name: 'Industrial Safety Journal',
    source_locator: 'https://www.sciencedirect.com/science/article/pii/S0000000000000000',
  }).result, 'REJECT');
});

test('ScienceDirect URL in source_locator WITH CC BY 4.0 is PASS', () => {
  assert.equal(filterLicense({
    license: 'CC BY 4.0',
    source_name: 'Industrial Safety Journal',
    source_locator: 'https://www.sciencedirect.com/science/article/pii/S0000000000000000',
  }).result, 'PASS');
});
