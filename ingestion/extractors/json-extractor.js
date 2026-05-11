'use strict';
const fs = require('fs/promises');

// Accepts a .json file containing a single MAI-90 record object or an array of records.
// Returns { records: Array<object>, errors: Array<{raw, reason}> }
async function extractJson(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  const errors = [];

  let parsed;
  try {
    parsed = JSON.parse(text.trim());
  } catch (e) {
    errors.push({ raw: text.slice(0, 500), reason: `JSON parse failed: ${e.message}` });
    return { records: [], errors };
  }

  if (Array.isArray(parsed)) {
    const records = [];
    for (const item of parsed) {
      if (item && typeof item === 'object') records.push(item);
      else errors.push({ raw: String(item), reason: 'array element is not an object' });
    }
    return { records, errors };
  }

  if (parsed && typeof parsed === 'object') {
    return { records: [parsed], errors };
  }

  errors.push({ raw: text.slice(0, 500), reason: 'file is not a JSON object or array' });
  return { records: [], errors };
}

module.exports = { extractJson };
