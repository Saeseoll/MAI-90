'use strict';
const fs = require('fs/promises');

// Extracts MAI-90 record candidates from markdown files.
// Looks for JSON objects/arrays inside fenced code blocks (```json ... ``` or ``` ... ```).
// Returns { records: Array<object>, errors: Array<{raw, reason}> }

async function extractMarkdown(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  const errors = [];
  const records = [];

  // Match fenced code blocks: ```[json] ... ```
  const fenceRe = /^```(?:json)?\s*\n([\s\S]*?)^```\s*$/gm;
  let match;
  let foundAny = false;

  while ((match = fenceRe.exec(text)) !== null) {
    const block = match[1].trim();
    if (!block) continue;
    foundAny = true;

    try {
      const parsed = JSON.parse(block);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === 'object') records.push(item);
          else errors.push({ raw: String(item), reason: 'array element in code block is not an object' });
        }
      } else if (parsed && typeof parsed === 'object') {
        records.push(parsed);
      } else {
        errors.push({ raw: block.slice(0, 200), reason: 'code block content is not a JSON object or array' });
      }
    } catch (e) {
      errors.push({ raw: block.slice(0, 200), reason: `code block JSON parse failed: ${e.message}` });
    }
  }

  if (!foundAny) {
    errors.push({ raw: text.slice(0, 200), reason: 'no fenced code blocks found in markdown file' });
  }

  return { records, errors };
}

module.exports = { extractMarkdown };
