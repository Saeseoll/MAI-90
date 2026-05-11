const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const os   = require('os');
const path = require('path');
const fs   = require('fs/promises');

const testLogsPath = path.join(os.tmpdir(), `mai90-intake-${Date.now()}`);
process.env.LOGS_PATH = testLogsPath;

const { intakeFile } = require('../ingestion/intake-file');

let tmpDir;

before(async () => {
  await fs.mkdir(testLogsPath, { recursive: true });
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mai90-intake-files-'));
});

async function tmp(name, content) {
  const p = path.join(tmpDir, name);
  await fs.writeFile(p, content);
  return p;
}

const validRecord = {
  hierarchy: { tier: 'T1' },
  provenance: { license: 'CC BY 4.0', source_name: 'Lab', source_locator: 'https://example.com', collected_at: '2026-01-01' },
  engineering_fact: { subject: 'Pump A', parameter: 'current', value: 9.0, unit: 'A', condition: 'normal' },
};

// ── TXT extractor ──────────────────────────────────────────────────────────
test('.txt NDJSON: valid line parsed, malformed line quarantined', async () => {
  const p = await tmp('a.txt', JSON.stringify(validRecord) + '\n{bad json\n');
  const { records, quarantined } = await intakeFile(p);
  assert.equal(records.length, 1);
  assert.equal(quarantined, 1);
  assert.equal(records[0].hierarchy.tier, 'T1');
});

test('.txt JSON array: all records parsed', async () => {
  const p = await tmp('arr.txt', JSON.stringify([validRecord, validRecord]));
  const { records, quarantined } = await intakeFile(p);
  assert.equal(records.length, 2);
  assert.equal(quarantined, 0);
});

// ── JSON extractor ─────────────────────────────────────────────────────────
test('.json: single object parsed', async () => {
  const p = await tmp('b.json', JSON.stringify(validRecord));
  const { records, quarantined } = await intakeFile(p);
  assert.equal(records.length, 1);
  assert.equal(quarantined, 0);
});

test('.json: array of objects parsed', async () => {
  const p = await tmp('c.json', JSON.stringify([validRecord, validRecord]));
  const { records, quarantined } = await intakeFile(p);
  assert.equal(records.length, 2);
  assert.equal(quarantined, 0);
});

test('.json: malformed file quarantined', async () => {
  const p = await tmp('bad.json', '{broken');
  const { records, quarantined } = await intakeFile(p);
  assert.equal(records.length, 0);
  assert.equal(quarantined, 1);
});

// ── CSV extractor ──────────────────────────────────────────────────────────
test('.csv: flat rows normalized to MAI-90 shape', async () => {
  const csv = [
    'tier,license,source_name,source_locator,collected_at,subject,parameter,value,unit,condition,threshold',
    'T1,CC BY 4.0,LabA,https://example.com/a,2026-01-01,Pump A,current,9.5,A,normal load,10.0',
    'T2,CC BY 4.0,LabB,https://example.com/b,2026-01-02,Pump B,vibration,3.2,mm/s,full load,',
  ].join('\n');
  const p = await tmp('d.csv', csv);
  const { records, quarantined } = await intakeFile(p);
  assert.equal(records.length, 2);
  assert.equal(quarantined, 0);
  // Normalized structure
  assert.equal(records[0].hierarchy.tier, 'T1');
  assert.equal(records[0].provenance.source_name, 'LabA');
  assert.equal(records[0].engineering_fact.value, 9.5);
  assert.equal(records[0].engineering_fact.threshold, 10.0);
  // Empty threshold → undefined (not set)
  assert.equal(records[1].engineering_fact.threshold, undefined);
});

test('.csv: mismatched column count quarantines that row', async () => {
  const csv = [
    'tier,license,source_name,source_locator,collected_at,subject,parameter,value,unit,condition',
    'T1,CC BY 4.0,LabA,https://example.com,2026-01-01,Pump A,current,9.5,A,normal',
    'T2,CC BY 4.0,only-five-columns',
  ].join('\n');
  const p = await tmp('e.csv', csv);
  const { records, quarantined } = await intakeFile(p);
  assert.equal(records.length, 1);
  assert.equal(quarantined, 1);
});

// ── Markdown extractor ─────────────────────────────────────────────────────
test('.md: JSON code block extracted', async () => {
  const md = `# Inspection\n\n\`\`\`json\n${JSON.stringify(validRecord, null, 2)}\n\`\`\`\n\nNotes.`;
  const p = await tmp('f.md', md);
  const { records, quarantined } = await intakeFile(p);
  assert.equal(records.length, 1);
  assert.equal(quarantined, 0);
  assert.equal(records[0].engineering_fact.subject, 'Pump A');
});

test('.md: code block with JSON array', async () => {
  const md = `# Report\n\n\`\`\`json\n${JSON.stringify([validRecord, validRecord])}\n\`\`\`\n`;
  const p = await tmp('g.md', md);
  const { records, quarantined } = await intakeFile(p);
  assert.equal(records.length, 2);
  assert.equal(quarantined, 0);
});

test('.md: no code blocks → quarantined', async () => {
  const md = '# Empty Report\n\nNo JSON here.\n';
  const p = await tmp('h.md', md);
  const { records, quarantined } = await intakeFile(p);
  assert.equal(records.length, 0);
  assert.equal(quarantined, 1);
});

// ── Unsupported types ──────────────────────────────────────────────────────
test('unsupported .pdf extension throws descriptive error', async () => {
  const p = await tmp('doc.pdf', '%PDF-1.4');
  await assert.rejects(
    () => intakeFile(p),
    (err) => {
      assert.ok(err.message.includes('지원하지 않는 파일 형식'));
      assert.ok(err.message.includes('.pdf'));
      return true;
    },
  );
});

test('unsupported .xlsx extension throws descriptive error', async () => {
  const p = await tmp('data.xlsx', 'dummy');
  await assert.rejects(
    () => intakeFile(p),
    (err) => {
      assert.ok(err.message.includes('지원하지 않는 파일 형식'));
      assert.ok(err.message.includes('.xlsx'));
      return true;
    },
  );
});

test('no extension throws descriptive error', async () => {
  const p = await tmp('noext', 'data');
  await assert.rejects(
    () => intakeFile(p),
    (err) => {
      assert.ok(err.message.includes('지원하지 않는 파일 형식'));
      return true;
    },
  );
});
