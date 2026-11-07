import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { parseCounts } from './report.mjs';

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webm': 'video/webm', '.mp4': 'video/mp4', '.zip': 'application/zip',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

function normalizeConfig(config) {
  let url;
  try { url = new URL(config.url); } catch { throw new Error('Invalid publishing configuration URL.'); }
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)))) {
    throw new Error('Publishing configuration requires an HTTPS origin (HTTP is allowed only on localhost).');
  }
  if (typeof config.token !== 'string' || !config.token.trim()) throw new Error('Publishing configuration has no key.');
  return { url: url.origin, token: config.token };
}

export async function loadPublishConfiguration(repoRoot, environment = process.env) {
  let stored = {};
  try { stored = JSON.parse((await readFile(path.join(repoRoot, '.e2e-results/publisher.json'), 'utf8')).replace(/^\uFEFF/, '')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Cannot read the local publishing configuration.');
  }
  return normalizeConfig({
    url: environment.SMARTMEAL_E2E_PUBLISH_URL || stored.url,
    token: environment.SMARTMEAL_E2E_PUBLISH_TOKEN || stored.token,
  });
}

async function reportFiles(directory, relative = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error('Report uploads cannot contain symbolic links.');
    if (entry.isDirectory()) files.push(...await reportFiles(filename, name));
    else if (entry.isFile()) {
      if (!/^[A-Za-z0-9_./-]+$/.test(name) || name.split('/').some(part => part === '.' || part === '..')) throw new Error('Unsafe report asset path.');
      const bytes = await readFile(filename);
      files.push({ path: name, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

async function request(url, options = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    let response;
    try { response = await fetch(url, { ...options, signal: AbortSignal.timeout(120_000), redirect: 'error' }); }
    catch {
      if (attempt === 2) throw new Error('Report publishing network request failed; check the connection and retry publication.');
      await delay(500 * (attempt + 1));
      continue;
    }
    if (response.ok) return response;
    await response.body?.cancel();
    if (attempt < 2 && (response.status === 429 || response.status >= 500)) { await delay(500 * (attempt + 1)); continue; }
    throw new Error(`Report publishing failed (HTTP ${response.status}).`);
  }
}

export async function checkPublishingAccess(configuration) {
  const config = normalizeConfig(configuration);
  const response = await request(`${config.url}/api/report-publish/ready`, { headers: { authorization: `Bearer ${config.token}` } });
  if ((await response.json()).ready !== true) throw new Error('Report publishing endpoint is not ready.');
  return config.url;
}

export async function publishPlaywrightReport({ runDir, runId, gitSha = '' }, configuration) {
  const config = normalizeConfig(configuration);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(runId || '')) throw new Error('Invalid report run ID.');
  const reportDirectory = path.join(runDir, 'playwright-report');
  if ((await lstat(reportDirectory)).isSymbolicLink()) throw new Error('Report directory cannot be a symbolic link.');
  const evidence = JSON.parse(await readFile(path.join(runDir, 'playwright.json'), 'utf8'));
  parseCounts('playwright', evidence); // Reject missing evidence and zero executed tests, while retaining genuine failures.
  const files = await reportFiles(reportDirectory);
  if (!files.some(file => file.path === 'index.html')) throw new Error('Playwright report index.html is missing.');
  const headers = { authorization: `Bearer ${config.token}` };
  const pending = [...files];
  await Promise.all(Array.from({ length: Math.min(4, files.length) }, async () => {
    while (pending.length) {
      const file = pending.shift();
      const bytes = await readFile(path.join(reportDirectory, file.path));
      if (bytes.length !== file.size || createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new Error('Report files changed during publication.');
      const response = await request(`${config.url}/api/report-publish/assets/${file.sha256}`, {
        method: 'PUT', headers: { ...headers, 'content-type': types[path.extname(file.path)] || 'application/octet-stream' }, body: bytes,
      });
      await response.body?.cancel();
    }
  }));
  const response = await request(`${config.url}/api/report-publish/commit`, {
    method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ runId, gitSha, files, stats: evidence.stats }),
  });
  const committed = await response.json();
  if (committed.runId !== runId || committed.fileCount !== files.length) throw new Error('Report publication returned inconsistent evidence.');
  const latest = await (await request(`${config.url}/api/report-status`)).json();
  if (latest.runId !== runId) throw new Error('The hosted latest report does not match this run.');
  const reportUrl = `${config.url}/runs/${runId}/`;
  const readback = await request(reportUrl);
  await readback.body?.cancel();
  const publication = { runId, url: config.url, reportUrl, fileCount: files.length, publishedAt: latest.publishedAt };
  await writeFile(path.join(runDir, 'publication.json'), `${JSON.stringify(publication, null, 2)}\n`);
  return publication;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  try {
    if (!process.argv[2]) throw new Error('Usage: npm run test:e2e:publish -- .e2e-results/<run-id>');
    if (process.argv[2] === '--check') {
      console.log(`[E2E] Publishing ready: ${await checkPublishingAccess(await loadPublishConfiguration(repoRoot))}`);
    } else {
      const runDir = path.resolve(repoRoot, process.argv[2]);
      const publication = await publishPlaywrightReport({ runDir, runId: path.basename(runDir) }, await loadPublishConfiguration(repoRoot));
      console.log(`[E2E] Published: ${publication.url}\n[E2E] This run: ${publication.reportUrl}`);
    }
  } catch (error) { console.error(`[E2E] ${error.message}`); process.exitCode = 1; }
}
