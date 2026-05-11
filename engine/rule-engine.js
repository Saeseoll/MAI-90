const ACTIONS = {
  RED: 'Treat as immediate risk. Notify a supervisor and follow site lockout or isolation procedure before continuing work.',
  YELLOW: 'Inspect during the next shift. Do not change machine state without supervisor approval.',
  GREEN: 'No action required. Continue normal monitoring.',
  UNKNOWN: 'Insufficient data to determine status. Inspect and record baseline measurements.',
};

function evaluateEquipment(subject, records) {
  if (!records || records.length === 0) {
    return {
      status: 'UNKNOWN',
      equipment: subject,
      action: ACTIONS.UNKNOWN,
      reason: 'No records found for this equipment.',
      evidence: [],
    };
  }

  // Sort newest first by collected_at
  const sorted = [...records].sort((a, b) =>
    (b.collected_at || '').localeCompare(a.collected_at || '')
  );

  const withThreshold = sorted.filter(r => r.threshold !== null && r.threshold !== undefined);

  if (withThreshold.length === 0) {
    return {
      status: 'UNKNOWN',
      equipment: subject,
      action: ACTIONS.UNKNOWN,
      reason: 'No threshold defined in any record. Cannot classify.',
      evidence: sorted.map(r => r.id),
    };
  }

  const latest = withThreshold[0];
  const { value, threshold, unit, parameter } = latest;
  const valueLabel = `${value} ${unit}`;
  const thresholdLabel = `${threshold} ${unit}`;

  // Hard threshold significantly exceeded → RED
  if (value > threshold * 1.2) {
    return {
      status: 'RED',
      equipment: subject,
      action: ACTIONS.RED,
      reason: `${parameter} critically exceeded threshold: ${valueLabel} > 120% of ${thresholdLabel}.`,
      evidence: [latest.id],
    };
  }

  // Latest value above threshold → YELLOW
  if (value > threshold) {
    return {
      status: 'YELLOW',
      equipment: subject,
      action: ACTIONS.YELLOW,
      reason: `${parameter} exceeded threshold in the latest record: ${valueLabel} > ${thresholdLabel}.`,
      evidence: [latest.id],
    };
  }

  // Latest is within threshold — check stale trend: 2+ earlier records exceeded
  const earlierExceeded = withThreshold.slice(1).filter(r => r.value > r.threshold);
  if (earlierExceeded.length >= 2) {
    return {
      status: 'YELLOW',
      equipment: subject,
      action: ACTIONS.YELLOW,
      reason: `${parameter} was above threshold in ${earlierExceeded.length} recent records. Current reading is within range but trend warrants inspection.`,
      evidence: earlierExceeded.map(r => r.id),
    };
  }

  return {
    status: 'GREEN',
    equipment: subject,
    action: ACTIONS.GREEN,
    reason: `${parameter} is within threshold: ${valueLabel} <= ${thresholdLabel}.`,
    evidence: [latest.id],
  };
}

module.exports = { evaluateEquipment };
