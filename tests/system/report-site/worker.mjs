const runPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/;
const hashPattern = /^[a-f0-9]{64}$/;
const json = (value, status = 200) => Response.json(value, { status, headers: { 'cache-control': 'no-store' } });
const validPath = value => typeof value === 'string' && value.length < 500 &&
  /^[A-Za-z0-9_./-]+$/.test(value) && value.split('/').every(part => part && part !== '.' && part !== '..');

async function authorized(request, env) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ') || !env.REPORT_PUBLISH_KEY_SHA256) return false;
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(header.slice(7)));
  const hash = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
  return hash === env.REPORT_PUBLISH_KEY_SHA256;
}

async function commit(request, env) {
  const text = await request.text();
  if (text.length > 1_000_000) return json({ error: 'Manifest too large' }, 413);
  let input;
  try { input = JSON.parse(text); } catch { return json({ error: 'Invalid manifest JSON' }, 400); }
  const files = input.files;
  if (!runPattern.test(input.runId || '') || !Array.isArray(files) || !files.length || files.length > 2000 ||
    files.some(file => !validPath(file.path) || !hashPattern.test(file.sha256 || '') || !Number.isSafeInteger(file.size) || file.size < 0) ||
    !files.some(file => file.path === 'index.html') || new Set(files.map(file => file.path)).size !== files.length) {
    return json({ error: 'Invalid run or report paths' }, 400);
  }
  // Nothing points at this run until every asset is present and verified.
  for (const file of files) {
    const stored = await env.BUCKET.head(`assets/${file.sha256}`);
    if (!stored || stored.size !== file.size || stored.customMetadata?.sha256 !== file.sha256) {
      return json({ error: 'Report assets missing or incomplete' }, 409);
    }
  }
  const manifestKey = `runs/${input.runId}`;
  const previous = await env.BUCKET.get(manifestKey);
  if (previous && JSON.stringify((await previous.json()).files) !== JSON.stringify(files)) {
    return json({ error: 'An existing run cannot be replaced with different files' }, 409);
  }
  const manifest = { runId: input.runId, files, gitSha: String(input.gitSha || ''), stats: input.stats || null, publishedAt: new Date().toISOString() };
  if (!previous) {
    const created = await env.BUCKET.put(manifestKey, JSON.stringify(manifest), { onlyIf: { etagDoesNotMatch: '*' } });
    if (!created) {
      const winner = await env.BUCKET.get(manifestKey);
      if (!winner || JSON.stringify((await winner.json()).files) !== JSON.stringify(files)) {
        return json({ error: 'A different report already committed this run ID' }, 409);
      }
    }
  }
  await env.BUCKET.put('latest', JSON.stringify({ runId: input.runId }));
  return json({ runId: input.runId, fileCount: files.length, reportPath: `/runs/${input.runId}/` });
}

async function serve(request, env, pathname) {
  if (pathname === '/' || pathname === '/index.html' || pathname === '/api/report-status') {
    const pointer = await env.BUCKET.get('latest');
    if (!pointer) return json({ error: 'No report published yet' }, 404);
    const { runId } = await pointer.json();
    if (pathname !== '/api/report-status') return new Response(null, { status: 302, headers: { location: `/runs/${runId}/`, 'cache-control': 'no-store' } });
    const manifest = await (await env.BUCKET.get(`runs/${runId}`)).json();
    const { files, ...metadata } = manifest;
    return json({ ...metadata, fileCount: files.length });
  }
  const match = /^\/runs\/([^/]+)\/(.*)$/.exec(pathname);
  if (!match || !runPattern.test(match[1])) return new Response('Not found', { status: 404 });
  const assetPath = match[2] || 'index.html';
  if (!validPath(assetPath)) return new Response('Not found', { status: 404 });
  const manifest = await env.BUCKET.get(`runs/${match[1]}`);
  if (!manifest) return new Response('Not found', { status: 404 });
  const file = (await manifest.json()).files.find(item => item.path === assetPath);
  if (!file) return new Response('Not found', { status: 404 });
  const object = await env.BUCKET.get(`assets/${file.sha256}`, { range: request.headers });
  if (!object) return new Response('Not found', { status: 404 });
  const headers = new Headers({
    'cache-control': 'public, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff', 'x-smartmeal-run': match[1], 'accept-ranges': 'bytes',
  });
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('content-length', String(object.range?.length ?? object.size));
  if (object.range) headers.set('content-range', `bytes ${object.range.offset}-${object.range.offset + object.range.length - 1}/${object.size}`);
  return new Response(request.method === 'HEAD' ? null : object.body, { status: object.range ? 206 : 200, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!env.BUCKET) return json({ error: 'Report storage unavailable' }, 503);
    if (url.pathname.startsWith('/api/report-publish/')) {
      if (!(await authorized(request, env))) return json({ error: 'Unauthorized' }, 401);
      if (url.pathname === '/api/report-publish/ready' && request.method === 'GET') return json({ ready: true });
      const asset = /^\/api\/report-publish\/assets\/([a-f0-9]{64})$/.exec(url.pathname);
      if (asset && request.method === 'PUT') {
        try {
          await env.BUCKET.put(`assets/${asset[1]}`, request.body, {
            sha256: asset[1], customMetadata: { sha256: asset[1] },
            httpMetadata: { contentType: request.headers.get('content-type') || 'application/octet-stream' },
          });
          return json({ uploaded: true });
        } catch { return json({ error: 'Upload failed or checksum mismatch' }, 400); }
      }
      if (url.pathname === '/api/report-publish/commit' && request.method === 'POST') return commit(request, env);
      return json({ error: 'Unknown publishing operation' }, 404);
    }
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
    return serve(request, env, url.pathname);
  },
};
