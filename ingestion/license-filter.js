// Publishers whose content is REJECT unless an explicit open license is present
const RESTRICTED_PUBLISHERS = ['elsevier', 'springer', 'ieee', 'wiley', 'sciencedirect'];

const PASS_PATTERNS = [
  /^cc\s*by(\s*4\.0)?$/i,
  /^cc\s*0$/i,
  /^cc0$/i,
  /^public\s*domain$/i,
  /^creative\s*commons\s*(attribution|by)(\s*4\.0)?$/i,
];

const REJECT_PATTERNS = [
  /copyright.*all rights reserved/i,
  /no redistribution/i,
  /redistribution.*prohibited/i,
  /proprietary/i,
];

function isRestrictedPublisher(provenance) {
  const name = (provenance.source_name || '').toLowerCase();
  const url = (provenance.source_url || '').toLowerCase();
  const locator = (provenance.source_locator || '').toLowerCase();
  return RESTRICTED_PUBLISHERS.some(p => name.includes(p) || url.includes(p) || locator.includes(p));
}

function filterLicense(provenance) {
  const license = (provenance.license || '').trim();

  if (!license) {
    return { result: 'HOLD', reason: 'license field is missing or empty' };
  }

  // Check for explicit PASS
  if (PASS_PATTERNS.some(p => p.test(license))) {
    return { result: 'PASS', reason: `accepted license: ${license}` };
  }

  // Check for explicit REJECT patterns
  if (REJECT_PATTERNS.some(p => p.test(license))) {
    return { result: 'REJECT', reason: `license prohibits reuse: ${license}` };
  }

  // Restricted publisher with no explicit open license → REJECT
  if (isRestrictedPublisher(provenance)) {
    return { result: 'REJECT', reason: `restricted publisher with no explicit open license: ${provenance.source_name}` };
  }

  // Ambiguous licenses
  const ambiguous = [
    /open\s*access/i,
    /academic.*only/i,
    /fair\s*use/i,
    /citation.*only/i,
    /personal.*use/i,
  ];
  if (ambiguous.some(p => p.test(license))) {
    return { result: 'HOLD', reason: `ambiguous license requires human review: ${license}` };
  }

  return { result: 'HOLD', reason: `unrecognized license requires human review: ${license}` };
}

module.exports = { filterLicense };
