'use strict';
const fs = require('fs/promises');

// Parses CSV files with a header row.
// Expected columns (order-independent, case-insensitive):
//   tier, license, source_name, source_locator, collected_at,
//   subject, parameter, value, unit, condition, threshold
//
// Returns flat row objects — normalize-record.js maps them to MAI-90 shape.
// Returns { records: Array<flatObject>, errors: Array<{raw, reason}> }

function parseCsvLine(line) {
  const cells = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQ = !inQ; }
    } else if (ch === ',' && !inQ) {
      cells.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

async function extractCsv(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const errors = [];

  if (rawLines.length < 2) {
    errors.push({ raw: text.slice(0, 200), reason: 'CSV must have a header row and at least one data row' });
    return { records: [], errors };
  }

  const headers = parseCsvLine(rawLines[0]).map(h => h.trim().toLowerCase());
  const records = [];

  for (let i = 1; i < rawLines.length; i++) {
    const cells = parseCsvLine(rawLines[i]);
    if (cells.length !== headers.length) {
      errors.push({
        raw: rawLines[i],
        reason: `row ${i + 1}: column count ${cells.length} does not match header ${headers.length}`,
      });
      continue;
    }
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = cells[j].trim();
    }
    records.push(row);
  }

  return { records, errors };
}

module.exports = { extractCsv };
