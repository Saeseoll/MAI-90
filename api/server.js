require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const os = require('os');
const multer = require('multer');

const { parseRecords } = require('../ingestion/parse-txt');
const { validateRecord } = require('../ingestion/validate-record');
const { filterLicense } = require('../ingestion/license-filter');
const { initDb, insertRecord, listRecords, listBySubject } = require('../db/client');
const { evaluateEquipment } = require('../engine/rule-engine');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../ui')));

const LOGS_PATH = process.env.LOGS_PATH || './logs';
const upload = multer({ dest: os.tmpdir() });

async function appendRejectedLog(entry) {
  const logFile = path.join(LOGS_PATH, 'rejected_log.json');
  let existing = [];
  try {
    existing = JSON.parse(await fs.readFile(logFile, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  existing.push(entry);
  await fs.writeFile(logFile, JSON.stringify(existing, null, 2));
}

async function quarantineRecord(raw, reason) {
  const quarantineDir = path.join(LOGS_PATH, 'quarantine');
  await fs.mkdir(quarantineDir, { recursive: true });
  const id = crypto.randomUUID();
  await fs.writeFile(
    path.join(quarantineDir, `${id}.json`),
    JSON.stringify({ id, reason, raw, quarantined_at: new Date().toISOString() }, null, 2)
  );
}

async function runIngestPipeline(filePath) {
  await fs.mkdir(LOGS_PATH, { recursive: true });
  await fs.mkdir(path.join(LOGS_PATH, 'quarantine'), { recursive: true });

  let rawRecords, parseQuarantined;
  try {
    ({ records: rawRecords, quarantined: parseQuarantined } = await parseRecords(filePath));
  } catch (err) {
    throw new Error(`cannot read file: ${err.message}`);
  }

  const counts = {
    processed: rawRecords.length + parseQuarantined,
    inserted: 0,
    quarantined: parseQuarantined,
    held: 0,
    rejected: 0,
  };

  for (const raw of rawRecords) {
    const validation = validateRecord(raw);
    if (!validation.valid) {
      await quarantineRecord(raw, validation.reason);
      counts.quarantined++;
      continue;
    }

    const licenseResult = filterLicense(raw.provenance);
    if (licenseResult.result !== 'PASS') {
      await appendRejectedLog({
        timestamp: new Date().toISOString(),
        source_name: raw.provenance?.source_name,
        source_locator: raw.provenance?.source_locator,
        license: raw.provenance?.license,
        result: licenseResult.result,
        reason: licenseResult.reason,
      });
      if (licenseResult.result === 'HOLD') counts.held++;
      else counts.rejected++;
      continue;
    }

    const { inserted } = await insertRecord(raw);
    if (inserted) counts.inserted++;
  }

  return counts;
}

// POST /api/ingest — server-side file path
app.post('/api/ingest', async (req, res) => {
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'filePath is required' });
  try {
    res.json(await runIngestPipeline(filePath));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/upload — browser file upload (multipart)
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file is required' });
  try {
    res.json(await runIngestPipeline(req.file.path));
  } catch (err) {
    res.status(400).json({ error: err.message });
  } finally {
    await fs.unlink(req.file.path).catch(() => {});
  }
});

// GET /api/records
app.get('/api/records', (_req, res) => {
  res.json(listRecords());
});

// GET /api/status?subject=X
app.get('/api/status', (req, res) => {
  const subject = req.query.subject;
  if (!subject) return res.status(400).json({ error: 'subject query parameter is required' });
  const records = listBySubject(subject);
  res.json(evaluateEquipment(subject, records));
});

const PORT = process.env.PORT || 3000;

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`MAI-90 running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err.message);
  process.exit(1);
});
