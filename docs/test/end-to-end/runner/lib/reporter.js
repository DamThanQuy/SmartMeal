/**
 * lib/reporter.js
 * Generates a self-contained HTML timeline report for an E2E test run.
 * No external npm packages required — uses only Node.js built-ins.
 *
 * Each "step" object is expected to have:
 *   {
 *     name:         string   — human-readable step name
 *     status:       'pass'|'fail'|'skip'|'info'
 *     duration:     number   — milliseconds this step took
 *     screenshotPath?: string — absolute local path to a PNG file (optional)
 *     error?:       string   — error message if status === 'fail'
 *     details?:     string   — additional info/notes
 *     timestamp?:   number   — Date.now() when the step ran
 *   }
 */
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Read a PNG file and encode it as a base64 data URI.
 * Returns null if the file does not exist or cannot be read.
 * @param {string} filePath
 * @returns {string|null}
 */
function encodeImageAsDataUri(filePath) {
  if (!filePath) return null;
  try {
    const ext = path.extname(filePath).slice(1).toLowerCase() || 'png';
    const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };
    const mime = mimeMap[ext] || 'image/png';
    const buf = fs.readFileSync(filePath);
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch (_e) {
    return null;
  }
}

/**
 * Map a step status to a CSS color and icon.
 * @param {string} status
 */
function statusStyle(status) {
  const map = {
    pass: { color: '#2ecc71', icon: '✔', bg: '#eafaf1' },
    fail: { color: '#e74c3c', icon: '✖', bg: '#fdedec' },
    skip: { color: '#f39c12', icon: '⚠', bg: '#fef9e7' },
    info: { color: '#3498db', icon: 'ℹ', bg: '#eaf4fb' }
  };
  return map[status] || map.info;
}

/**
 * Escape HTML special characters.
 * @param {string} str
 * @returns {string}
 */
function htmlEscape(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format milliseconds into a human-readable string.
 * @param {number} ms
 * @returns {string}
 */
function formatDuration(ms) {
  if (!ms || isNaN(ms)) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Build the HTML body for one step row.
 */
function renderStep(step, index) {
  const normStatus = (step.status || step.result || 'info').toLowerCase();
  const style = statusStyle(normStatus);
  const imgUri = encodeImageAsDataUri(step.screenshotPath);
  const ts = step.timestamp ? new Date(step.timestamp).toLocaleTimeString() : '';
  const stepName = step.name || (step.action ? `${step.action} -> ${step.target || ''}` : `Step ${index + 1}`);

  return `
  <div class="step" id="step-${index}" style="border-left: 4px solid ${style.color}; background:${style.bg}">
    <div class="step-header">
      <span class="step-icon" style="color:${style.color}">${style.icon}</span>
      <span class="step-name">${htmlEscape(stepName)}</span>
      <span class="step-meta">
        ${ts ? `<span class="step-ts">⏱ ${htmlEscape(ts)}</span>` : ''}
        <span class="step-dur" style="color:#888">${formatDuration(step.duration || 0)}</span>
        <span class="step-status" style="color:${style.color}">${htmlEscape(normStatus.toUpperCase())}</span>
      </span>
    </div>
    ${step.details ? `<div class="step-details">${htmlEscape(step.details)}</div>` : ''}
    ${step.error ? `<div class="step-error">❌ ${htmlEscape(step.error)}</div>` : ''}
    ${imgUri ? `
    <div class="step-screenshot">
      <img
        src="${imgUri}"
        alt="Screenshot step ${index + 1}"
        class="screenshot-thumb"
        onclick="this.classList.toggle('screenshot-full')"
        title="Click to expand"
      />
    </div>` : ''}
  </div>`;
}

/**
 * Generate and write an HTML test timeline report.
 *
 * @param {string} testName - display name for the test suite
 * @param {Array<object>} steps - array of step objects (see module jsdoc)
 * @param {string} outPath - absolute path where the HTML file will be written
 * @returns {string} the resolved path of the written file
 */
function generateHtmlReport(testName, steps, outPath) {
  if (!Array.isArray(steps)) throw new TypeError('steps must be an array');
  if (!outPath) throw new TypeError('outPath is required');

  const totalSteps = steps.length;
  const passed = steps.filter(s => (s.status || s.result || '').toLowerCase() === 'pass').length;
  const failed = steps.filter(s => (s.status || s.result || '').toLowerCase() === 'fail').length;
  const skipped = steps.filter(s => (s.status || s.result || '').toLowerCase() === 'skip').length;
  const totalDuration = steps.reduce((acc, s) => acc + (s.duration || 0), 0);

  const overallPass = failed === 0;
  const summaryColor = overallPass ? '#2ecc71' : '#e74c3c';
  const summaryLabel = overallPass ? '✔ PASSED' : '✖ FAILED';
  const generatedAt = new Date().toLocaleString();

  const stepsHtml = steps.map((step, i) => renderStep(step, i)).join('\n');

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>E2E Report — ${htmlEscape(testName)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      margin: 0; padding: 0;
      background: #f5f7fa;
      color: #333;
    }
    header {
      background: linear-gradient(135deg, #1a2a6c, #2d6a4f);
      color: #fff;
      padding: 24px 32px;
    }
    header h1 { margin: 0 0 4px; font-size: 1.6em; }
    header .subtitle { font-size: 0.9em; opacity: 0.8; }
    .summary {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      padding: 20px 32px;
      background: #fff;
      border-bottom: 1px solid #e0e0e0;
    }
    .summary-card {
      border-radius: 8px;
      padding: 14px 24px;
      flex: 1;
      min-width: 120px;
      text-align: center;
    }
    .summary-card .label { font-size: 0.75em; text-transform: uppercase; letter-spacing: 1px; opacity: 0.7; }
    .summary-card .value { font-size: 1.9em; font-weight: 700; }
    .card-overall { background: ${summaryColor}22; }
    .card-pass { background: #eafaf1; }
    .card-fail { background: #fdedec; }
    .card-skip { background: #fef9e7; }
    .card-dur  { background: #eaf4fb; }
    .steps-container { padding: 24px 32px; }
    .step {
      border-radius: 8px;
      margin-bottom: 12px;
      padding: 14px 18px;
      border-left-width: 4px;
      border-left-style: solid;
    }
    .step-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .step-icon { font-size: 1.2em; min-width: 22px; }
    .step-name { font-weight: 600; flex: 1; word-break: break-word; }
    .step-meta { display: flex; align-items: center; gap: 10px; font-size: 0.83em; white-space: nowrap; }
    .step-ts { color: #666; }
    .step-status { font-weight: 700; }
    .step-details {
      font-size: 0.85em;
      color: #555;
      margin-top: 6px;
      margin-left: 32px;
      white-space: pre-wrap;
    }
    .step-error {
      font-size: 0.85em;
      color: #e74c3c;
      margin-top: 6px;
      margin-left: 32px;
      white-space: pre-wrap;
    }
    .step-screenshot { margin-top: 10px; margin-left: 32px; }
    .screenshot-thumb {
      max-width: 280px;
      max-height: 160px;
      border-radius: 6px;
      border: 2px solid #ccc;
      cursor: zoom-in;
      transition: max-width 0.3s, max-height 0.3s;
      display: block;
    }
    .screenshot-thumb.screenshot-full {
      max-width: 100%;
      max-height: none;
      cursor: zoom-out;
    }
    footer {
      text-align: center;
      font-size: 0.8em;
      color: #aaa;
      padding: 24px 0 32px;
    }
  </style>
</head>
<body>

<header>
  <h1>📊 SmartMeal E2E Report</h1>
  <div class="subtitle">
    Test: <strong>${htmlEscape(testName)}</strong> &nbsp;|&nbsp;
    Generated: ${htmlEscape(generatedAt)}
  </div>
</header>

<div class="summary">
  <div class="summary-card card-overall">
    <div class="label">Result</div>
    <div class="value" style="color:${summaryColor}">${summaryLabel}</div>
  </div>
  <div class="summary-card card-pass">
    <div class="label">Passed</div>
    <div class="value" style="color:#2ecc71">${passed}</div>
  </div>
  <div class="summary-card card-fail">
    <div class="label">Failed</div>
    <div class="value" style="color:#e74c3c">${failed}</div>
  </div>
  <div class="summary-card card-skip">
    <div class="label">Skipped</div>
    <div class="value" style="color:#f39c12">${skipped}</div>
  </div>
  <div class="summary-card card-dur">
    <div class="label">Total Steps</div>
    <div class="value" style="color:#3498db">${totalSteps}</div>
  </div>
  <div class="summary-card card-dur">
    <div class="label">Duration</div>
    <div class="value" style="color:#8e44ad">${formatDuration(totalDuration)}</div>
  </div>
</div>

<div class="steps-container">
  <h2 style="margin-top:0">🧭 Test Steps Timeline</h2>
  ${stepsHtml || '<p style="color:#888">No steps recorded.</p>'}
</div>

<footer>
  SmartMeal E2E Runner &mdash; Node.js built-in HTML reporter &mdash; ${htmlEscape(generatedAt)}
</footer>

</body>
</html>`;

  const resolvedPath = path.resolve(outPath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  fs.writeFileSync(resolvedPath, html, 'utf8');
  return resolvedPath;
}

module.exports = {
  generateHtmlReport
};
