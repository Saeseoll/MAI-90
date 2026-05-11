'use strict';
const fs = require('fs/promises');

// Supports NDJSON (one JSON object per non-empty line) and JSON array format.
// Returns { records: Array<object>, errors: Array<{raw, reason}> }
async function extractTxt(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  const trimmed = text.trim();
  const errors = [];

  // JSON array: all-or-nothing
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        errors.push({ raw: trimmed.slice(0, 500), reason: 'expected JSON array at top level' });
        return { records: [], errors };
      }
      const records = [];
      for (const item of parsed) {
        if (item && typeof item === 'object') records.push(item);
        else errors.push({ raw: String(item), reason: 'array element is not an object' });
      }
      return { records, errors };
    } catch (e) {
      errors.push({ raw: trimmed.slice(0, 500), reason: `JSON array parse failed: ${e.message}` });
      return { records: [], errors };
    }
  }

  // NDJSON: per-line fault isolation
  const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
  const records = [];
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj && typeof obj === 'object') records.push(obj);
      else errors.push({ raw: line, reason: 'line is not a JSON object' });
    } catch (e) {
      errors.push({ raw: line, reason: `JSON parse error: ${e.message}` });
    }
  }

  return { records, errors };
}

module.exports = { extractTxt };
