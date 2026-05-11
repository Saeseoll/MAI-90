const VALID_TIERS = new Set(['T1', 'T2', 'T3', 'T4']);

function validateRecord(record) {
  if (!record || typeof record !== 'object') {
    return { valid: false, reason: 'record is not an object' };
  }

  const { hierarchy, provenance, engineering_fact } = record;

  if (!hierarchy || !VALID_TIERS.has(hierarchy.tier)) {
    return { valid: false, reason: `missing or invalid: hierarchy.tier (must be T1-T4, got ${hierarchy?.tier})` };
  }

  const provFields = ['license', 'source_name', 'source_locator', 'collected_at'];
  for (const f of provFields) {
    if (!provenance?.[f]) {
      return { valid: false, reason: `missing: provenance.${f}` };
    }
  }

  const factFields = ['subject', 'parameter', 'unit', 'condition'];
  for (const f of factFields) {
    if (!engineering_fact?.[f]) {
      return { valid: false, reason: `missing: engineering_fact.${f}` };
    }
  }

  if (engineering_fact?.value === undefined || engineering_fact?.value === null) {
    return { valid: false, reason: 'missing: engineering_fact.value' };
  }
  if (typeof engineering_fact.value !== 'number') {
    return { valid: false, reason: 'invalid: engineering_fact.value must be a number' };
  }

  return { valid: true };
}

module.exports = { validateRecord };
