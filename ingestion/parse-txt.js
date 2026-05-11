const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const LOGS_PATH = process.env.LOGS_PATH || './logs';

async function writeQuarantineFile(raw, reason) {
  const quarantineDir = path.join(LOGS_PATH, 'quarantine');
  await fs.mkdir(quarantineDir, { recursive: true });
  const id = crypto.randomUUID();
  const file = path.join(quarantineDir, `${id}.json`);
  await fs.writeFile(file, JSON.stringify({ id, reason, raw, quarantined_at: new Date().toISOString() }, null, 2));
}

// Supports two formats:
//   JSON array  — must be entirely valid JSON. If parse fails, whole file is quarantined.
//   NDJSON      — one JSON object per non-empty line. Malformed lines are quarantined individually.
//
// Returns { records: [...], quarantined: N }
async function parseRecords(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  const trimmed = text.trim();

  if (trimmed.startsWith('[')) {
    // JSON array: all-or-nothing parse
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        await writeQuarantineFile(trimmed, 'expected JSON array but top-level value is not an array');
        return { records: [], quarantined: 1 };
      }
      return { records: parsed, quarantined: 0 };
    } catch (e) {
      await writeQuarantineFile(trimmed, `JSON array parse failed: ${e.message}`);
      return { records: [], quarantined: 1 };
    }
  }

  // NDJSON: per-line fault isolation
  const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
  const records = [];
  let quarantined = 0;

  for (const line of lines) {
    try {
      records.push(JSON.parse(line));
    } catch (e) {
      await writeQuarantineFile(line, `JSON parse error on line: ${e.message}`);
      quarantined++;
    }
  }

  return { records, quarantined };
}

module.exports = { parseRecords };
