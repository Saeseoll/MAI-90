'use strict';

// Converts a raw extracted object to a MAI-90 record candidate.
//
// If the object already has the nested MAI-90 shape
// (hierarchy / provenance / engineering_fact), it is returned as-is.
//
// Otherwise flat field names — as produced by csv-extractor.js — are mapped
// to the nested shape. Numeric fields (value, threshold) are coerced with
// Number(); empty strings are left as undefined so validate-record.js can
// flag them as missing.
//
// Does NOT validate. validate-record.js handles that.
//
// Manual / conversation input:
//   Records submitted by users directly (not from a file) should carry:
//     provenance.source_type: "manual_input"
//     provenance.source_name: "User provided observation"
//     provenance.source_locator: <session-id or timestamp-based local id>
//     provenance.collected_at: <ISO timestamp of submission>
//   The license filter will typically HOLD these (no recognized open license),
//   which prevents them from entering the operational DB until reviewed.

function toNum(raw) {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const n = Number(raw);
  return isNaN(n) ? raw : n; // preserve raw string if not numeric; validate-record catches it
}

function normalizeRecord(raw) {
  if (!raw || typeof raw !== 'object') return raw;

  // Already MAI-90 shaped — pass through
  if (raw.hierarchy && raw.provenance && raw.engineering_fact) return raw;

  // Flat shape (e.g. from CSV rows)
  const result = {
    hierarchy: {
      tier: raw.tier || raw['hierarchy.tier'],
    },
    provenance: {
      license:        raw.license        || raw['provenance.license'],
      source_name:    raw.source_name    || raw['provenance.source_name'],
      source_locator: raw.source_locator || raw['provenance.source_locator'],
      collected_at:   raw.collected_at   || raw['provenance.collected_at'],
    },
    engineering_fact: {
      subject:   raw.subject   || raw['engineering_fact.subject'],
      parameter: raw.parameter || raw['engineering_fact.parameter'],
      value:     toNum(raw.value   !== undefined ? raw.value   : raw['engineering_fact.value']),
      unit:      raw.unit      || raw['engineering_fact.unit'],
      condition: raw.condition || raw['engineering_fact.condition'],
    },
  };

  // Optional provenance fields
  if (raw.source_type)    result.provenance.source_type    = raw.source_type;
  if (raw.publisher)      result.provenance.publisher      = raw.publisher;
  if (raw.author)         result.provenance.author         = raw.author;

  // Optional engineering_fact fields
  const thresholdRaw = raw.threshold !== undefined ? raw.threshold : raw['engineering_fact.threshold'];
  const threshold = toNum(thresholdRaw);
  if (threshold !== undefined) result.engineering_fact.threshold = threshold;
  if (raw.notes) result.engineering_fact.notes = raw.notes;

  return result;
}

module.exports = { normalizeRecord };
