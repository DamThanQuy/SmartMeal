import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import worker from './report-site/worker.mjs';
import { loadPublishConfiguration, publishPlaywrightReport, checkPublishingAccess } from './publish.mjs';

const token = 'test-publishing-key-with-at-least-32-characters';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

// Only the external R2 service is substituted; HTTP, files, hashing and both
// production endpoints run for real. Live verification also exercises hosted R2.
class TestBucket {
  objects = new Map();
  async put(key, value, options = {}) {
    const bytes = Buffer.from(await new Response(value).arrayBuffer());
    if (options.sha256 && digest(bytes) !== options.sha256) throw new Error('Checksum mismatch');
    if (options.onlyIf?.etagDoesNotMatch === '*' && this.objects.has(key)) return null;
    this.objects.set(key, { bytes, ...options });
    return { key };
  }
  async head(key) {
    const value = this.objects.get(key);
    return value && { size: value.bytes.length, customMetadata: value.customMetadata || {} };
  }
  async get(key, options = {}) {
    const value = this.objects.get(key);
    if (!value) return null;
    let bytes = value.bytes;
    let range;
    const match = /^bytes=(\d+)-(\d*)$/.exec(options.range?.get('range') || '');
    if (match) {
      const offset = Number(match[1]);
      const end = match[2] ? Number(match[2]) : bytes.length - 1;
      bytes = bytes.subarray(offset, end + 1);
      range = { offset, length: bytes.length };
    }
    return {
      body: bytes, size: value.bytes.length, range, httpEtag: `"${digest(value.bytes)}"`,
      json: async () => JSON.parse(value.bytes.toString()),
      writeHttpMetadata(headers) { headers.set('content-type', value.httpMetadata?.contentType || 'application/octet-stream'); },
    };
  }
}

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'smartmeal-publish-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const runDir = path.join(root, '20261107-test');
  await mkdir(path.join(runDir, 'playwright-report/data'), { recursive: true });
  await writeFile(path.join(runDir, 'playwright-report/index.html'), '<html><title>QA result</title><img src="data/example.png"></html>');
  await writeFile(path.join(runDir, 'playwright-report/data/example.png'), Buffer.from([137, 80, 78, 71, 0, 255]));
  await writeFile(path.join(runDir, 'playwright.json'), JSON.stringify({ stats: { expected: 1, unexpected: 0, flaky: 0, skipped: 0 } }));
  const env = { BUCKET: new TestBucket(), REPORT_PUBLISH_KEY_SHA256: digest(token) };
  const server = createServer(async (req, res) => {
    try {
      const body = ['GET', 'HEAD'].includes(req.method) ? undefined : Readable.toWeb(req);
      const request = new Request(`http://127.0.0.1${req.url}`, { method: req.method, headers: req.headers, body, duplex: 'half' });
      const response = await worker.fetch(request, env);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) { res.writeHead(500); res.end(error.message); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  return { root, runDir, env, url, config: { url, token } };
}

test('one publication makes the complete report and binary attachments publicly readable', async t => {
  const f = await fixture(t);
  const result = await publishPlaywrightReport({ runDir: f.runDir, runId: '20261107-first', gitSha: 'abc123' }, f.config);
  assert.equal(result.url, f.url);
  assert.equal(result.fileCount, 2);
  const response = await fetch(f.url);
  assert.equal(response.url, `${f.url}/runs/20261107-first/`);
  assert.match(await response.text(), /QA result/);
  const image = await fetch(`${response.url}data/example.png`);
  assert.equal(image.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), Buffer.from([137, 80, 78, 71, 0, 255]));
  assert.equal(JSON.parse(await readFile(path.join(f.runDir, 'publication.json'), 'utf8')).runId, '20261107-first');
});

test('preflight verifies the publishing key before any expensive QA work', async t => {
  const f = await fixture(t);
  assert.equal(await checkPublishingAccess(f.config), f.url);
  await assert.rejects(checkPublishingAccess({ ...f.config, token: 'wrong-key' }), /401/);
  assert.equal(f.env.BUCKET.objects.size, 0);
});

test('wrong keys cannot upload, replace or commit a report', async t => {
  const f = await fixture(t);
  await assert.rejects(publishPlaywrightReport({ runDir: f.runDir, runId: '20261107-denied' }, { ...f.config, token: 'incorrect' }), /401/);
  assert.equal(f.env.BUCKET.objects.size, 0);
  const response = await fetch(`${f.url}/api/report-publish/commit`, { method: 'POST', body: '{}' });
  assert.equal(response.status, 401);
});

test('an incomplete upload cannot replace the latest complete report', async t => {
  const f = await fixture(t);
  await publishPlaywrightReport({ runDir: f.runDir, runId: '20261107-good' }, f.config);
  const response = await fetch(`${f.url}/api/report-publish/commit`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ runId: '20261107-broken', files: [{ path: 'index.html', size: 10, sha256: 'a'.repeat(64) }] }),
  });
  assert.equal(response.status, 409);
  assert.equal((await (await fetch(`${f.url}/api/report-status`)).json()).runId, '20261107-good');
});

test('new runs update the stable link while previous run pages and assets stay intact', async t => {
  const f = await fixture(t);
  await publishPlaywrightReport({ runDir: f.runDir, runId: '20261107-old' }, f.config);
  await writeFile(path.join(f.runDir, 'playwright-report/index.html'), '<html>New result</html>');
  await publishPlaywrightReport({ runDir: f.runDir, runId: '20261107-new' }, f.config);
  assert.equal(await (await fetch(f.url)).text(), '<html>New result</html>');
  assert.match(await (await fetch(`${f.url}/runs/20261107-old/`)).text(), /QA result/);
  assert.equal((await fetch(`${f.url}/runs/20261107-old/not-present.html`)).status, 404);
});

test('a published run is immutable and ranged attachments retain their exact bytes', async t => {
  const f = await fixture(t);
  await publishPlaywrightReport({ runDir: f.runDir, runId: '20261107-immutable' }, f.config);
  const partial = await fetch(`${f.url}/runs/20261107-immutable/data/example.png`, { headers: { range: 'bytes=1-3' } });
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get('content-range'), 'bytes 1-3/6');
  assert.deepEqual(Buffer.from(await partial.arrayBuffer()), Buffer.from([80, 78, 71]));
  await writeFile(path.join(f.runDir, 'playwright-report/index.html'), '<html>Changed result</html>');
  await assert.rejects(publishPlaywrightReport({ runDir: f.runDir, runId: '20261107-immutable' }, f.config), /409/);
  assert.match(await (await fetch(f.url)).text(), /QA result/);
});

test('simultaneous commits cannot overwrite the same immutable run', async t => {
  const f = await fixture(t);
  const contents = ['<html>first result</html>', '<html>second result</html>'];
  const manifests = [];
  for (const content of contents) {
    const sha256 = digest(content);
    const upload = await fetch(`${f.url}/api/report-publish/assets/${sha256}`, {
      method: 'PUT', headers: { authorization: `Bearer ${token}` }, body: content,
    });
    assert.equal(upload.status, 200);
    manifests.push({ runId: 'concurrent-run', files: [{ path: 'index.html', size: Buffer.byteLength(content), sha256 }] });
  }
  const originalGet = f.env.BUCKET.get.bind(f.env.BUCKET);
  let arrivals = 0;
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  f.env.BUCKET.get = async (...args) => {
    const snapshot = await originalGet(...args);
    if (args[0] === 'runs/concurrent-run' && arrivals < 2) {
      if (++arrivals === 2) release();
      await barrier;
    }
    return snapshot;
  };
  const responses = await Promise.all(manifests.map(manifest => fetch(`${f.url}/api/report-publish/commit`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(manifest),
  })));
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
});

test('a report with failed browser tests is published with its failure counts unchanged', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.runDir, 'playwright.json'), JSON.stringify({ stats: { expected: 0, unexpected: 1, flaky: 0, skipped: 0 } }));
  await publishPlaywrightReport({ runDir: f.runDir, runId: '20261107-failed' }, f.config);
  assert.equal((await (await fetch(`${f.url}/api/report-status`)).json()).stats.unexpected, 1);
});

test('missing evidence and empty browser runs cannot publish an old or incomplete result', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.runDir, 'playwright.json'), JSON.stringify({ stats: { expected: 0, unexpected: 0, flaky: 0, skipped: 2 } }));
  await assert.rejects(publishPlaywrightReport({ runDir: f.runDir, runId: '20261107-empty' }, f.config), /executed|zero/i);
  assert.equal(f.env.BUCKET.objects.size, 0);
});

test('configuration is required by default and keys never appear in failure messages', async t => {
  const f = await fixture(t);
  await assert.rejects(loadPublishConfiguration(f.root, {}), /publish.*config|publishing.*config/i);
  const configPath = path.join(f.root, '.e2e-results/publisher.json');
  await mkdir(path.dirname(configPath));
  await writeFile(configPath, JSON.stringify(f.config));
  assert.deepEqual(await loadPublishConfiguration(f.root, {}), f.config);
  const result = await loadPublishConfiguration(f.root, { SMARTMEAL_E2E_PUBLISH_TOKEN: 'override-key' });
  assert.equal(result.token, 'override-key');
  await assert.rejects(publishPlaywrightReport({ runDir: f.runDir, runId: '20261107-network' }, { url: 'http://127.0.0.1:1', token }), error => {
    assert.equal(error.message.includes(token), false);
    return /publish|upload|fetch|network/i.test(error.message);
  });
});

test('uploaded bytes must match their digest and unsafe report paths cannot be committed', async t => {
  const f = await fixture(t);
  const badUpload = await fetch(`${f.url}/api/report-publish/assets/${'0'.repeat(64)}`, {
    method: 'PUT', headers: { authorization: `Bearer ${token}` }, body: 'not the expected content',
  });
  assert.equal(badUpload.status, 400);
  const traversal = await fetch(`${f.url}/api/report-publish/commit`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ runId: 'safe-run', files: [{ path: '../index.html', size: 1, sha256: 'a'.repeat(64) }] }),
  });
  assert.equal(traversal.status, 400);
});
