'use strict';
const fs   = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const { extractTxt }      = require('./extractors/txt-extractor');
const { extractJson }     = require('./extractors/json-extractor');
const { extractCsv }      = require('./extractors/csv-extractor');
const { extractMarkdown } = require('./extractors/markdown-extractor');
const { normalizeRecord } = require('./normalize-record');

// Supported extractors keyed by file extension (lowercase)
const EXTRACTORS = {
  '.txt':      extractTxt,
  '.json':     extractJson,
  '.csv':      extractCsv,
  '.md':       extractMarkdown,
  '.markdown': extractMarkdown,
};

// Planned future extractors — add when the library is available:
// '.pdf':  extractPdf    — PDF text/table extraction or OCR
// '.docx': extractDocx   — Word document parsing
// '.xlsx': extractXlsx   — Excel spreadsheet parsing
// image extensions: OCR via external service

async function writeQuarantine(raw, reason) {
  const logsPath = process.env.LOGS_PATH || './logs';
  const dir = path.join(logsPath, 'quarantine');
  await fs.mkdir(dir, { recursive: true });
  const id = crypto.randomUUID();
  await fs.writeFile(
    path.join(dir, `${id}.json`),
    JSON.stringify({ id, reason, raw, quarantined_at: new Date().toISOString() }, null, 2),
  );
}

// intakeFile(filePath) → { records: Array<normalizedRecord>, quarantined: number }
//
// Throws an Error if the file extension is not supported. The error message
// is user-readable and names the unsupported extension and the supported list.
async function intakeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const extractor = EXTRACTORS[ext];

  if (!extractor) {
    const supported = Object.keys(EXTRACTORS)
      .filter((e, i, arr) => arr.indexOf(e) === i) // deduplicate .markdown alias
      .join(', ');
    throw new Error(
      `지원하지 않는 파일 형식입니다: "${ext}". 지원 포맷: ${supported}`,
    );
  }

  const { records: rawRecords, errors } = await extractor(filePath);

  for (const { raw, reason } of errors) {
    await writeQuarantine(raw, reason);
  }

  const records = rawRecords.map(normalizeRecord);

  return { records, quarantined: errors.length };
}

module.exports = { intakeFile };
