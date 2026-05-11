'use strict';
// sql.js is pure WebAssembly — no native compilation needed.
// insertRecord is async because it persists the in-memory DB to disk after each write.
// Read-only functions (listRecords, getRecordById, listBySubject) remain synchronous.
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'mai90.db');

let db = null;

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    subject TEXT NOT NULL,
    parameter TEXT NOT NULL,
    value REAL NOT NULL,
    unit TEXT NOT NULL,
    condition TEXT NOT NULL,
    threshold REAL,
    tier TEXT NOT NULL,
    license TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_locator TEXT NOT NULL,
    collected_at TEXT NOT NULL,
    raw_json TEXT NOT NULL,
    ingested_at TEXT NOT NULL
  )`;

async function initDb() {
  const SQL = await initSqlJs();
  try {
    const data = await fs.readFile(DB_PATH);
    db = new SQL.Database(data);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    db = new SQL.Database();
  }
  db.run(CREATE_TABLE);
  await persist();
}

async function persist() {
  const data = db.export();
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, Buffer.from(data));
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

function makeRecordId(record) {
  const { provenance, engineering_fact } = record;
  const key = [
    provenance.source_locator,
    engineering_fact.subject,
    engineering_fact.parameter,
    provenance.collected_at,
    String(engineering_fact.value),
    engineering_fact.unit,
  ].join('|');
  return crypto.createHash('sha256').update(key).digest('hex');
}

async function insertRecord(record) {
  const { hierarchy, provenance, engineering_fact } = record;
  const id = record.id || makeRecordId(record);
  getDb().run(
    `INSERT OR IGNORE INTO records
       (id, subject, parameter, value, unit, condition, threshold, tier,
        license, source_name, source_locator, collected_at, raw_json, ingested_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      engineering_fact.subject,
      engineering_fact.parameter,
      engineering_fact.value,
      engineering_fact.unit,
      engineering_fact.condition,
      engineering_fact.threshold ?? null,
      hierarchy.tier,
      provenance.license,
      provenance.source_name,
      provenance.source_locator,
      provenance.collected_at,
      JSON.stringify(record),
      new Date().toISOString(),
    ]
  );
  const changes = getDb().exec('SELECT changes()')[0].values[0][0];
  const inserted = changes > 0;
  if (inserted) await persist();
  return { id, inserted };
}

function stmtRows(stmt) {
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function listRecords() {
  return stmtRows(getDb().prepare('SELECT * FROM records ORDER BY ingested_at DESC'));
}

function getRecordById(id) {
  const stmt = getDb().prepare('SELECT * FROM records WHERE id = ?');
  stmt.bind([id]);
  const rows = stmtRows(stmt);
  return rows[0] || null;
}

function listBySubject(subject) {
  const stmt = getDb().prepare('SELECT * FROM records WHERE subject = ? ORDER BY collected_at DESC');
  stmt.bind([subject]);
  return stmtRows(stmt);
}

module.exports = { initDb, insertRecord, listRecords, getRecordById, listBySubject };
