import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCounts, summarizeStages, collectBrowserCases } from './report.mjs';

test('Jest counts include skipped tests without calling them passed', () => {
  assert.deepEqual(parseCounts('jest', {
    numTotalTests: 9, numPassedTests: 6, numFailedTests: 1, numPendingTests: 2,
  }), { total: 9, passed: 6, failed: 1, skipped: 2 });
});

test('Vitest JSON follows the same explicit counts contract', () => {
  assert.deepEqual(parseCounts('vitest', {
    numTotalTests: 5, numPassedTests: 5, numFailedTests: 0, numPendingTests: 0,
  }), { total: 5, passed: 5, failed: 0, skipped: 0 });
});

test('TRX includes infrastructure errors in failed count', () => {
  const xml = '<TestRun><ResultSummary><Counters total="8" executed="7" passed="5" failed="1" error="1" timeout="0" aborted="0" notExecuted="1" /></ResultSummary></TestRun>';
  assert.deepEqual(parseCounts('trx', xml), { total: 8, passed: 5, failed: 2, skipped: 1 });
});

test('Playwright flaky/unexpected results are not silently reported as passing', () => {
  assert.deepEqual(parseCounts('playwright', { stats: { expected: 4, unexpected: 1, flaky: 1, skipped: 2 } }),
    { total: 8, passed: 4, failed: 2, skipped: 2 });
});

test('missing or empty result data cannot become a passing stage', () => {
  assert.throws(() => parseCounts('jest', {}), /result|count|test/i);
  assert.throws(() => parseCounts('trx', '<TestRun />'), /counter|result/i);
  assert.throws(() => parseCounts('playwright', { stats: { expected: 0, unexpected: 0, flaky: 0, skipped: 0 } }), /zero|test/i);
});

test('a failed CLI makes the whole run fail even when its JSON counts look green', () => {
  const summary = summarizeStages([
    { name: 'Backend', status: 'passed', exitCode: 0, counts: { total: 3, passed: 3, failed: 0, skipped: 0 } },
    { name: 'Mobile', status: 'failed', exitCode: 1, counts: { total: 2, passed: 2, failed: 0, skipped: 0 } },
  ]);
  assert.equal(summary.outcome, 'FAIL');
  assert.deepEqual(summary.counts, { total: 5, passed: 5, failed: 0, skipped: 0 });
});

test('blocked dependencies make a run incomplete and failing', () => {
  assert.equal(summarizeStages([{ name: 'UI', status: 'blocked', exitCode: null }]).outcome, 'FAIL');
  assert.equal(summarizeStages([]).outcome, 'FAIL');
});

test('browser evidence retains project, status and actual screenshot attachment', () => {
  const cases = collectBrowserCases({ suites: [{ title: 'admin.spec.mjs', specs: [{
    title: 'recipe survives reload', tests: [{ projectName: 'admin', status: 'expected', results: [{
      status: 'passed', duration: 100, attachments: [{ name: 'screenshot', contentType: 'image/png', path: '/run/recipe.png' }],
    }] }],
  }] }] });
  assert.equal(cases.length, 1);
  assert.equal(cases[0].project, 'admin');
  assert.equal(cases[0].status, 'passed');
  assert.deepEqual(cases[0].screenshots, ['/run/recipe.png']);
});
