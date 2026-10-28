import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile, access, open, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { parseCounts, collectBrowserCases, writeSystemReport } from './report.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(directory, '../..');
const mobile = path.join(repoRoot, 'frontend/SmartMealMobile');
const admin = path.join(repoRoot, 'frontend/admin-web');
const startedAt = new Date().toISOString();
const stamp = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
}).format(new Date()).replace(/[^0-9]/g, '');
const runId = `${stamp}-${process.pid}`;
const runDir = path.join(repoRoot, '.e2e-results', runId);
const lockPath = path.join(repoRoot, '.e2e-results/system-run.lock');
const lockOwner = { pid: process.pid, runId, token: randomUUID(), startedAt };
let ownsLock = false;
const stages = [];
const notes = ['Browser mobile coverage uses Chromium/WebKit, not a physical iPhone.',
  'Mobile browser tests serve an Expo web export through Vite preview, without an Expo development server.',
  'QA uses disposable PostgreSQL, demo AI, fake checkout credentials and no real SMTP/payment keys.'];
const children = new Set();
const fresh = process.argv.includes('--fresh');
const headed = process.argv.includes('--headed');
const compose = ['compose', '-p', 'smartmeal-e2e', '-f', path.join(directory, 'docker-compose.e2e.yml')];
const env = { ...process.env, SMARTMEAL_E2E_OUTPUT: runDir, EXPO_NO_DOTENV: '1', CI: '1' };
const liveEnv = {
  ...env, LIVE_API_URL: 'http://127.0.0.1:5001/api', EXPO_PUBLIC_API_URL: 'http://127.0.0.1:5001/api',
  EXPO_PUBLIC_API_PORT: '5001', EXPO_PUBLIC_APP_ENV: 'development',
  LIVE_BE_LOG: path.join(runDir, 'backend-live.log'),
  SMARTMEAL_E2E_API_URL: 'http://127.0.0.1:5001/api',
  SMARTMEAL_E2E_ADMIN_URL: 'http://127.0.0.1:3001',
  SMARTMEAL_E2E_MOBILE_URL: 'http://127.0.0.1:8082',
};
// Preserve corporate/network proxy settings for dependency downloads, but keep
// Expo's exported QA bundle free of an inherited public tunnel configuration.
const expoEnv = { ...liveEnv, BROWSER: 'none', EXPO_PACKAGER_PROXY_URL: '', REACT_NATIVE_PACKAGER_HOSTNAME: '127.0.0.1' };
for (const key of ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy']) delete expoEnv[key];

async function exists(file) { try { await access(file); return true; } catch { return false; } }

function pidRunning(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error('Runner lock has no valid PID; refusing to replace it.');
  try { process.kill(pid, 0); return true; } catch (error) {
    if (error.code === 'ESRCH') return false;
    // An inaccessible process is still alive; it cannot be treated as stale.
    if (error.code === 'EPERM') return true;
    throw error;
  }
}

async function createLock() {
  const handle = await open(lockPath, 'wx');
  try { await handle.writeFile(JSON.stringify(lockOwner)); ownsLock = true; }
  finally { await handle.close(); }
}

async function acquireLock() {
  try { await createLock(); return; } catch (error) { if (error.code !== 'EEXIST') throw error; }
  const owner = JSON.parse(await readFile(lockPath, 'utf8'));
  if (pidRunning(owner.pid)) throw new Error(`System E2E is already running: PID ${owner.pid}, run ${owner.runId}. Its QA project was not touched.`);
  // Serialize stale-lock recovery so simultaneous reruns cannot unlink the new
  // owner's lock. A leftover recovery guard fails closed instead of risking QA.
  const guardPath = `${lockPath}.recover`;
  const guard = await open(guardPath, 'wx');
  try {
    await guard.writeFile(JSON.stringify(lockOwner));
    let current;
    try { current = JSON.parse(await readFile(lockPath, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (current) {
      if (pidRunning(current.pid)) throw new Error(`System E2E is already running: PID ${current.pid}, run ${current.runId}.`);
      await unlink(lockPath);
    }
    await createLock();
    notes.push(`Replaced stale runner lock from PID ${owner.pid}, run ${owner.runId}.`);
  } finally {
    await guard.close();
    await unlink(guardPath);
  }
}

async function releaseLock() {
  if (!ownsLock) return;
  const current = JSON.parse(await readFile(lockPath, 'utf8'));
  if (current.token !== lockOwner.token || current.pid !== process.pid) throw new Error('Runner lock owner changed; refusing to unlink another run lock.');
  await unlink(lockPath);
  ownsLock = false;
}

async function stop(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    await new Promise(resolve => {
      const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      killer.once('error', resolve);
      killer.once('close', resolve);
    });
  } else {
    try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); }
    await Promise.race([new Promise(resolve => child.once('close', resolve)), delay(2000)]);
    if (child.exitCode === null && child.signalCode === null) {
      try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
    }
  }
}

function execute(executable, args, { cwd = repoRoot, environment = env, logFile, timeout = 600_000, append = false } = {}) {
  return new Promise(resolve => {
    const log = createWriteStream(logFile, { flags: append ? 'a' : 'w' });
    log.on('error', error => console.error(`Log error: ${error.message}`));
    log.write(`Executable: ${executable}\nArguments: ${JSON.stringify(args)}\nDirectory: ${cwd}\n`);
    const began = Date.now();
    let output = '';
    let error;
    let timedOut = false;
    const child = spawn(executable, args, { cwd, env: environment, windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    children.add(child);
    const capture = chunk => { log.write(chunk); output = (output + chunk.toString()).slice(-128_000); };
    child.stdout?.on('data', capture);
    child.stderr?.on('data', capture);
    child.once('error', caught => { error = caught.message; log.write(`${error}\n`); });
    const timer = setTimeout(() => { timedOut = true; void stop(child); }, timeout);
    child.once('close', (exitCode, signal) => {
      clearTimeout(timer);
      children.delete(child);
      log.end(() => resolve({ exitCode, durationMs: Date.now() - began, output,
        error: timedOut ? `Timed out after ${timeout}ms` : error || (signal ? `Terminated by ${signal}` : undefined) }));
    });
  });
}

async function stage(id, name, executable, args, options = {}) {
  if (interrupted && !options.cleanup) throw new Error('Run interrupted');
  console.log(`[E2E] ${name}`);
  const logFile = path.join(runDir, `${id}.log`);
  const result = await execute(executable, args, { ...options, logFile });
  const item = { id, name, kind: options.kind || 'check', status: result.exitCode === 0 && !result.error ? 'passed' : 'failed',
    exitCode: result.exitCode, durationMs: result.durationMs, logFile, error: result.error };
  if (options.resultFile) {
    item.resultFile = options.resultFile;
    try {
      const raw = await readFile(options.resultFile, 'utf8');
      item.counts = parseCounts(item.kind, item.kind === 'trx' ? raw : JSON.parse(raw));
      if (item.counts.failed > 0 || item.counts.total === 0 || item.counts.passed === 0) item.status = 'failed';
    } catch (error) { item.status = 'failed'; item.error = [item.error, `Result evidence: ${error.message}`].filter(Boolean).join('; '); }
  }
  if (options.requiredFile && !(await exists(options.requiredFile))) {
    item.status = 'failed';
    item.error = [item.error, `Required artifact missing: ${options.requiredFile}`].filter(Boolean).join('; ');
  }
  stages.push(item);
  console.log(`[E2E] ${item.status.toUpperCase()}: ${name}${item.counts ? ` (${item.counts.passed}/${item.counts.total}, skipped ${item.counts.skipped})` : ''}`);
  return item.status === 'passed';
}

function blocked(id, name, error) {
  stages.push({ id, name, kind: 'check', status: 'blocked', exitCode: null, durationMs: 0, error });
  console.log(`[E2E] BLOCKED: ${name}: ${error}`);
}

async function npmCommand() {
  const candidates = [process.env.npm_execpath, path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')].filter(Boolean);
  for (const candidate of candidates) if (await exists(candidate)) return candidate;
  throw new Error('Cannot find npm CLI. Start this runner with npm run test:e2e.');
}

async function ensureDependencies(id, cwd, npmCli) {
  if (interrupted) throw new Error('Run interrupted');
  const logFile = path.join(runDir, `${id}-dependencies.log`);
  const began = Date.now();
  let result = await execute(process.execPath, [npmCli, 'ls', '--depth=0'], { cwd, logFile });
  if (fresh || result.exitCode !== 0 || result.error) {
    result = await execute(process.execPath, [npmCli, 'ci', '--no-audit', '--no-fund'], { cwd, logFile, append: true, timeout: 900_000 });
    if (result.exitCode === 0 && !result.error) result = await execute(process.execPath, [npmCli, 'ls', '--depth=0'], { cwd, logFile, append: true });
  }
  const passed = result.exitCode === 0 && !result.error;
  stages.push({ id: `${id}-dependencies`, name: `${id} locked dependencies`, kind: 'check', status: passed ? 'passed' : 'failed',
    exitCode: result.exitCode, durationMs: Date.now() - began, logFile, error: result.error });
  console.log(`[E2E] ${passed ? 'READY' : 'FAILED'}: ${id} dependencies`);
  return passed;
}

async function ready(url, timeout = 180_000, child) {
  const until = Date.now() + timeout;
  let lastError = '';
  while (Date.now() < until) {
    if (child && (child.exitCode !== null || child.signalCode !== null)) throw new Error(`QA server exited before ${url} became ready`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      await response.body?.cancel();
      if (response.status === 200) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) { lastError = error.message; }
    await delay(1500);
  }
  throw new Error(`Readiness failed for ${url}: ${lastError}`);
}

async function freePort(port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () => reject(new Error(`Port ${port} is already occupied; no existing service was stopped.`)));
    server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
}

function background(executable, args, { cwd = repoRoot, environment = env, logFile }) {
  const stream = createWriteStream(logFile);
  stream.on('error', error => console.error(`Log error: ${error.message}`));
  const child = spawn(executable, args, { cwd, env: environment, windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
  children.add(child);
  child.stdout.on('data', chunk => stream.write(chunk));
  child.stderr.on('data', chunk => stream.write(chunk));
  child.on('error', error => stream.write(`${error.message}\n`));
  child.once('close', () => { children.delete(child); stream.end(); });
  return child;
}

async function serverStage(id, name, executable, args, options, url, port) {
  const began = Date.now();
  const logFile = path.join(runDir, `${id}.log`);
  try {
    await freePort(port);
    const child = background(executable, args, { ...options, logFile });
    await ready(url, 240_000, child);
    stages.push({ id, name, kind: 'check', status: 'passed', exitCode: 0, durationMs: Date.now() - began, logFile });
    return true;
  } catch (error) {
    stages.push({ id, name, kind: 'check', status: 'failed', exitCode: 1, durationMs: Date.now() - began, logFile, error: error.message });
    return false;
  }
}

let dockerReady = false;
let composeTouched = false;
let gitSha = 'unavailable';
let interrupted = false;
// Let the active command close, then run the normal finally/report path.
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  interrupted = true;
  for (const child of children) void stop(child);
});

await mkdir(runDir, { recursive: true });
await writeFile(path.join(runDir, 'empty.env'), '');
console.log(`[E2E] Run ${runId}; evidence: ${runDir}`);
try {
  await acquireLock();
  stages.push({ id: 'runner-lock', name: 'Exclusive system QA run', kind: 'check', status: 'passed', exitCode: 0, durationMs: 0 });
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 24 || (major === 24 && minor < 3)) throw new Error(`Node >=24.3 is required; found ${process.versions.node}`);
  stages.push({ id: 'node', name: 'Node >=24.3', kind: 'check', status: 'passed', exitCode: 0, durationMs: 0 });
  await stage('runner-unit', 'Runner report and failure-propagation tests', process.execPath,
    ['--test', path.join(directory, 'report.test.mjs')], { timeout: 60_000 });
  const git = await execute('git', ['rev-parse', 'HEAD'], { logFile: path.join(runDir, 'git.log') });
  if (git.exitCode === 0) gitSha = git.output.trim();
  const npmCli = await npmCommand();
  let docker = await execute('docker', ['info', '--format', '{{.ServerVersion}}'], { logFile: path.join(runDir, 'docker-preflight.log'), timeout: 30_000 });
  if (docker.exitCode !== 0 && process.platform === 'win32') {
    const candidates = [path.join(process.env.LOCALAPPDATA || '', 'Programs/DockerDesktop/Docker Desktop.exe'),
      path.join(process.env.ProgramFiles || 'C:/Program Files', 'Docker/Docker/Docker Desktop.exe')];
    for (const candidate of candidates) {
      if (!(await exists(candidate))) continue;
      // The app path is environment data, never interpolated into shell code.
      await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Start-Process -FilePath $env:SMARTMEAL_E2E_DOCKER_DESKTOP -WindowStyle Hidden'],
        { environment: { ...env, SMARTMEAL_E2E_DOCKER_DESKTOP: candidate }, logFile: path.join(runDir, 'docker-start.log'), timeout: 30_000 });
      const until = Date.now() + 150_000;
      while (Date.now() < until && docker.exitCode !== 0) {
        await delay(3000);
        docker = await execute('docker', ['info', '--format', '{{.ServerVersion}}'], { logFile: path.join(runDir, 'docker-preflight.log'), append: true, timeout: 15_000 });
      }
      break;
    }
  }
  dockerReady = docker.exitCode === 0 && !docker.error;
  stages.push({ id: 'docker', name: 'Docker daemon', kind: 'check', status: dockerReady ? 'passed' : 'blocked', exitCode: docker.exitCode,
    durationMs: docker.durationMs, logFile: path.join(runDir, 'docker-preflight.log'), error: dockerReady ? undefined : docker.error || 'Docker daemon unavailable' });

  const systemDeps = await ensureDependencies('browser', directory, npmCli);
  const adminDeps = await ensureDependencies('admin', admin, npmCli);
  const mobileDeps = await ensureDependencies('mobile', mobile, npmCli);
  const playwrightCli = path.join(directory, 'node_modules/playwright/cli.js');
  const browsers = systemDeps && await stage('browser-install', 'Install Chromium and WebKit', process.execPath,
    [playwrightCli, 'install', 'chromium', 'webkit'], { cwd: directory, timeout: 900_000 });
  if (!systemDeps) blocked('browser-install', 'Install Chromium and WebKit', 'Browser dependencies unavailable');

  let apiReady = false;
  if (dockerReady) {
    composeTouched = true;
    const reset = await stage('qa-reset', 'Reset disposable QA Compose project', 'docker', [...compose, 'down', '-v', '--remove-orphans']);
    const up = reset && await stage('qa-up', 'Build and start isolated QA API', 'docker', [...compose, 'up', '-d', '--build', 'db', 'api'], { timeout: 1_200_000 });
    if (!reset) blocked('qa-up', 'Build and start isolated QA API', 'QA reset failed');
    if (up) {
      const began = Date.now();
      try {
        await ready('http://127.0.0.1:5001/swagger/v1/swagger.json');
        apiReady = true;
        stages.push({ id: 'qa-ready', name: 'QA Swagger HTTP 200', kind: 'check', status: 'passed', exitCode: 0, durationMs: Date.now() - began });
        background('docker', [...compose, 'logs', '--no-color', '-f', 'api'], { logFile: liveEnv.LIVE_BE_LOG });
      } catch (error) { blocked('qa-ready', 'QA API readiness', error.message); }
    }
    if (up) await stage('backend', 'Backend PostgreSQL integration suite', 'docker', [...compose, 'run', '--rm', '--no-deps', 'backend-tests'],
      { kind: 'trx', resultFile: path.join(runDir, 'backend/backend.trx'), timeout: 1_200_000 });
    else blocked('backend', 'Backend PostgreSQL integration suite', 'QA database startup failed');
  } else {
    blocked('qa-up', 'QA database/API startup', 'Docker daemon unavailable');
    blocked('backend', 'Backend PostgreSQL integration suite', 'Docker daemon unavailable');
  }

  if (mobileDeps && apiReady) await stage('mobile', 'Mobile Jest including live API suites', process.execPath,
    [path.join(mobile, 'node_modules/jest/bin/jest.js'), '--runInBand', '--testTimeout=15000', '--json', `--outputFile=${path.join(runDir, 'mobile.json')}`],
    { cwd: mobile, environment: liveEnv, kind: 'jest', resultFile: path.join(runDir, 'mobile.json'), timeout: 1_200_000 });
  else blocked('mobile', 'Mobile Jest including live API suites', 'Mobile dependencies or QA API unavailable');
  if (adminDeps && apiReady) await stage('admin', 'Admin Vitest including live API suites', process.execPath,
    [path.join(admin, 'node_modules/vitest/vitest.mjs'), 'run', '--reporter=default', '--reporter=json', `--outputFile=${path.join(runDir, 'admin.json')}`],
    { cwd: admin, environment: liveEnv, kind: 'vitest', resultFile: path.join(runDir, 'admin.json'), timeout: 900_000 });
  else blocked('admin', 'Admin Vitest including live API suites', 'Admin dependencies or QA API unavailable');

  if (mobileDeps) {
    await stage('mobile-types', 'Mobile TypeScript', process.execPath, [path.join(mobile, 'node_modules/typescript/bin/tsc'), '--noEmit'], { cwd: mobile });
    await stage('mobile-lint', 'Mobile lint', process.execPath, [npmCli, 'run', 'lint'], { cwd: mobile });
  } else { blocked('mobile-types', 'Mobile TypeScript', 'Mobile dependencies unavailable'); blocked('mobile-lint', 'Mobile lint', 'Mobile dependencies unavailable'); }
  if (adminDeps) {
    await stage('admin-lint', 'Admin lint', process.execPath, [npmCli, 'run', 'lint'], { cwd: admin });
    await stage('admin-build', 'Admin production build', process.execPath, [npmCli, 'run', 'build'], { cwd: admin, environment: liveEnv });
  } else { blocked('admin-lint', 'Admin lint', 'Admin dependencies unavailable'); blocked('admin-build', 'Admin production build', 'Admin dependencies unavailable'); }

  const mobileExportDir = path.join(runDir, 'mobile-web');
  const mobileWebBuilt = mobileDeps && await stage('mobile-web-build', 'Export QA mobile web bundle', process.execPath,
    [path.join(mobile, 'node_modules/expo/bin/cli'), 'export', '--platform', 'web', '--max-workers', '2', '--output-dir', mobileExportDir],
    { cwd: mobile, environment: expoEnv, timeout: 900_000, requiredFile: path.join(mobileExportDir, 'index.html') });
  if (!mobileDeps) blocked('mobile-web-build', 'Export QA mobile web bundle', 'Mobile dependencies unavailable');
  let adminReady = false;
  let mobileReady = false;
  if (adminDeps && apiReady) adminReady = await serverStage('admin-server', 'QA Admin on 3001', process.execPath,
    [path.join(admin, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '3001', '--strictPort'],
    { cwd: admin, environment: { ...liveEnv, VITE_API_PROXY_TARGET: 'http://127.0.0.1:5001' } }, 'http://127.0.0.1:3001', 3001);
  else blocked('admin-server', 'QA Admin on 3001', 'Admin dependencies or QA API unavailable');
  if (mobileWebBuilt && adminDeps && apiReady) mobileReady = await serverStage('mobile-server', 'QA mobile web export on 8082', process.execPath,
    [path.join(admin, 'node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', '8082', '--strictPort', '--outDir', mobileExportDir],
    { cwd: admin, environment: { ...expoEnv, VITE_API_PROXY_TARGET: 'http://127.0.0.1:5001' } }, 'http://127.0.0.1:8082', 8082);
  else blocked('mobile-server', 'QA mobile web export on 8082', 'Mobile export, Vite dependencies or QA API unavailable');
  const browserProjects = [...(adminReady ? ['admin'] : []), ...(mobileReady ? ['mobile-chromium', 'mobile-webkit'] : [])];
  if (browsers && browserProjects.length > 0 && !interrupted) await stage('playwright', 'Admin and mobile browser E2E', process.execPath,
    [playwrightCli, 'test', '--config', path.join(directory, 'playwright.config.mjs'), ...browserProjects.flatMap(project => ['--project', project]), ...(headed ? ['--headed'] : [])],
    { cwd: directory, environment: liveEnv, kind: 'playwright', resultFile: path.join(runDir, 'playwright.json'), timeout: 2_400_000 });
  else blocked('playwright', 'Admin and mobile browser E2E', 'Browser installation or QA UI startup unavailable');
} catch (error) {
  blocked('runner', 'System runner', error.stack || error.message);
} finally {
  if (interrupted) blocked('interrupted', 'Run interrupted', 'Received a termination signal');
  // Snapshot final backend logs before stopping only processes this run owns.
  if (composeTouched) await stage('qa-logs', 'Capture QA backend logs', 'docker', [...compose, 'logs', '--no-color', 'api'], { timeout: 30_000, cleanup: true });
  for (const child of [...children]) await stop(child);
  if (composeTouched) await stage('qa-cleanup', 'Remove disposable QA Compose project', 'docker', [...compose, 'down', '-v', '--remove-orphans'], { timeout: 120_000, cleanup: true });
  try { await releaseLock(); }
  catch (error) { blocked('runner-lock-release', 'Release owned runner lock', error.message); }
  let browserCases = [];
  try { browserCases = collectBrowserCases(JSON.parse(await readFile(path.join(runDir, 'playwright.json'), 'utf8'))); } catch { /* Stage records missing evidence as a failure. */ }
  try {
    const report = await writeSystemReport({ repoRoot, runDir, runId, startedAt, finishedAt: new Date().toISOString(), gitSha, stages, notes, browserCases });
    console.log(`[E2E] ${report.outcome}: ${report.reportPath}`);
    process.exitCode = report.outcome === 'PASS' && stages.every(item => item.status === 'passed') ? 0 : 1;
  } catch (error) {
    await writeFile(path.join(runDir, 'runner-failure.json'), JSON.stringify({ error: error.stack, stages, notes }, null, 2));
    console.error(`[E2E] Report generation failed: ${error.message}; raw evidence retained in ${runDir}`);
    process.exitCode = 1;
  }
}
