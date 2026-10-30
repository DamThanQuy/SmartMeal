import path from 'node:path';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const zero = () => ({ total: 0, passed: 0, failed: 0, skipped: 0 });
const cleanText = value => String(value ?? '').replace(/\u001b\[[0-9;]*m/g, '');
const cell = value => cleanText(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('|', '\\|').replace(/\r?\n/g, '<br>');
const integer = (value, label) => {
  if (!Number.isInteger(value) || value < 0) throw new Error(`Invalid test count: ${label}`);
  return value;
};

function validateCounts(counts) {
  for (const [name, count] of Object.entries(counts)) integer(count, name);
  if (counts.total !== counts.passed + counts.failed + counts.skipped) {
    throw new Error('Inconsistent test result counts: total does not match outcomes');
  }
  if (counts.passed + counts.failed === 0) throw new Error('Zero executed tests in result data');
  return counts;
}

/** Parse explicit results only. Missing files, missing counters and all-skipped runs cannot pass. */
export function parseCounts(kind, input) {
  if (kind === 'trx') {
    const match = /<(?:[\w-]+:)?Counters\b([^>]*)\/?\s*>/i.exec(String(input ?? ''));
    if (!match) throw new Error('TRX result has no Counters element');
    const attributes = Object.fromEntries([...match[1].matchAll(/([\w]+)\s*=\s*["'](\d+)["']/g)]
      .map(([, name, value]) => [name, Number(value)]));
    const total = integer(attributes.total, 'TRX total');
    const passed = integer(attributes.passed, 'TRX passed');
    let failed = ['failed', 'error', 'timeout', 'aborted', 'disconnected', 'passedButRunAborted']
      .reduce((sum, key) => sum + (attributes[key] ?? 0), 0);
    const executed = attributes.executed ?? (passed + failed);
    // Inconclusive/unfinished executed results are not successful results.
    failed += Math.max(0, executed - passed - failed);
    const skipped = attributes.notExecuted ?? Math.max(0, total - executed);
    return validateCounts({ total, passed, failed, skipped });
  }
  const data = typeof input === 'string' ? JSON.parse(input) : input;
  if (!data || typeof data !== 'object') throw new Error('Missing test result data');
  if (kind === 'jest' || kind === 'vitest') {
    return validateCounts({
      total: integer(data.numTotalTests, 'numTotalTests'),
      passed: integer(data.numPassedTests, 'numPassedTests'),
      failed: integer(data.numFailedTests, 'numFailedTests'),
      skipped: integer(data.numPendingTests, 'numPendingTests') + integer(data.numTodoTests ?? 0, 'numTodoTests'),
    });
  }
  if (kind === 'playwright') {
    if (!data.stats) throw new Error('Missing Playwright result stats');
    const passed = integer(data.stats.expected, 'expected');
    const failed = integer(data.stats.unexpected, 'unexpected') + integer(data.stats.flaky, 'flaky');
    const skipped = integer(data.stats.skipped, 'skipped');
    return validateCounts({ total: passed + failed + skipped, passed, failed, skipped });
  }
  throw new Error(`Unsupported test result kind: ${kind}`);
}

/** CLI failures, blocked stages and invalid/empty evidence keep the overall run failing. */
export function summarizeStages(stages) {
  const counts = zero();
  let successful = Array.isArray(stages) && stages.length > 0;
  for (const stage of stages ?? []) {
    if (stage.status !== 'passed' || stage.exitCode !== 0 || stage.error) successful = false;
    if (stage.counts) {
      try { validateCounts(stage.counts); } catch { successful = false; }
      for (const key of Object.keys(counts)) {
        const count = stage.counts[key];
        if (Number.isInteger(count) && count >= 0) counts[key] += count;
      }
      if (stage.counts.failed > 0) successful = false;
    } else if (['jest', 'vitest', 'trx', 'playwright'].includes(stage.kind)) {
      successful = false;
    }
  }
  // Successful infrastructure checks alone are not evidence of executed tests.
  if (counts.passed + counts.failed === 0) successful = false;
  return { outcome: successful ? 'PASS' : 'FAIL', counts };
}

function errorText(error) {
  if (typeof error === 'string') return cleanText(error);
  return cleanText(error?.message ?? error?.value ?? JSON.stringify(error));
}

/** Preserve every project/test, including failed, flaky, timed out, interrupted and skipped cases. */
export function collectBrowserCases(json) {
  const cases = [];
  function visit(suites, ancestors = []) {
    for (const suite of suites ?? []) {
      const titles = suite.title ? [...ancestors, suite.title] : ancestors;
      for (const spec of suite.specs ?? []) {
        for (const test of spec.tests ?? []) {
          const results = test.results ?? [];
          const last = results.at(-1);
          const status = ['unexpected', 'flaky'].includes(test.status) ? 'failed'
            : test.status === 'skipped' || last?.status === 'skipped' ? 'skipped'
              : test.status === 'expected' && last?.status === 'passed' ? 'passed' : 'failed';
          const screenshots = [...new Set(results.flatMap(result => (result.attachments ?? [])
            .filter(attachment => attachment.path && (attachment.contentType === 'image/png' || /\.png$/i.test(attachment.path)))
            .map(attachment => attachment.path)))];
          const errors = [...new Set(results.flatMap(result => [
            ...(result.errors ?? []), ...(result.error ? [result.error] : []),
          ]).map(errorText))];
          if (status === 'failed' && !errors.length) errors.push(`Playwright outcome: ${test.status ?? last?.status ?? 'missing result'}`);
          cases.push({
            title: [...titles, spec.title].filter(Boolean).join(' › '),
            project: test.projectName ?? 'unknown', status,
            durationMs: results.reduce((sum, result) => sum + (Number.isFinite(result.duration) ? result.duration : 0), 0),
            screenshots, errors,
          });
        }
      }
      visit(suite.suites, titles);
    }
  }
  visit(json?.suites);
  return cases;
}

function dateInSaigon(instant) {
  const date = new Date(instant);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid report timestamp');
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

const xmlText = value => cleanText(value).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&#x([\da-f]+);/gi, (_match, hex) => String.fromCodePoint(parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_match, decimal) => String.fromCodePoint(Number(decimal)))
  .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&amp;', '&');
const shortError = value => {
  const text = cleanText(value);
  return text.length > 2400 ? `${text.slice(0, 2400)}\n… (rút gọn; xem kết quả gốc)` : text;
};

async function stageDiagnostics(stage) {
  if (!stage.resultFile || !['jest', 'vitest', 'trx'].includes(stage.kind)) return [];
  const raw = await readFile(stage.resultFile, 'utf8');
  if (stage.kind === 'trx') {
    return [...raw.matchAll(/<(?:[\w-]+:)?UnitTestResult\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:[\w-]+:)?UnitTestResult>)/g)]
      .flatMap(([, attributes, body = '']) => {
        const values = Object.fromEntries([...attributes.matchAll(/([\w]+)\s*=\s*["']([^"']*)["']/g)].map(([, key, value]) => [key, xmlText(value)]));
        if (values.outcome === 'Passed') return [];
        const message = /<(?:[\w-]+:)?Message\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?Message>/.exec(body)?.[1];
        const stack = /<(?:[\w-]+:)?StackTrace\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?StackTrace>/.exec(body)?.[1];
        return [{ title: values.testName ?? values.testId ?? 'Unnamed TRX result',
          status: ['NotExecuted', 'Pending', 'NotRunnable'].includes(values.outcome) ? 'skipped' : 'failed',
          error: shortError([message && xmlText(message), stack && xmlText(stack)].filter(Boolean).join('\n') || values.outcome) }];
      });
  }
  const json = JSON.parse(raw);
  return (json.testResults ?? []).flatMap(suite => {
    const assertions = suite.assertionResults ?? [];
    const diagnostics = assertions.filter(item => item.status !== 'passed').map(item => ({
      title: item.fullName ?? [...(item.ancestorTitles ?? []), item.title].filter(Boolean).join(' › '),
      status: ['pending', 'skipped', 'todo', 'disabled'].includes(item.status) ? 'skipped' : 'failed',
      error: shortError((item.failureMessages ?? []).join('\n') || item.status),
    }));
    if (suite.message && !diagnostics.some(item => item.status === 'failed')) {
      diagnostics.push({ title: suite.name ?? 'Suite infrastructure error', status: 'failed', error: shortError(suite.message) });
    }
    return diagnostics;
  });
}

/** Write a report even when stages fail; copy only PNG evidence actually produced in this run. */
export async function writeSystemReport({ repoRoot, runDir, runId, startedAt, finishedAt, gitSha, stages, notes = [], browserCases = [] }) {
  repoRoot = path.resolve(repoRoot);
  runDir = path.resolve(runDir);
  const reportDirectory = path.join(repoRoot, 'docs/test-reports');
  const safeRunId = String(runId).replace(/[^a-zA-Z0-9._-]/g, '-').replace(/^\.+/, '').slice(0, 100);
  if (!safeRunId) throw new Error('Report runId is required');
  const assetsDirectory = path.join(reportDirectory, 'assets', `system-e2e-${safeRunId}`);
  const reportPath = path.join(reportDirectory, `SYSTEM_E2E_FE_BE_ADMIN_${dateInSaigon(finishedAt)}.md`);
  await mkdir(reportDirectory, { recursive: true });
  const relative = file => path.relative(reportDirectory, path.resolve(file)).replaceAll('\\', '/');
  const link = (label, file) => `[${cell(label)}](<${relative(file).replaceAll('>', '%3E')}>)`;
  const screenshotLinks = new Map();
  const screenshots = [];
  const evidenceErrors = [];
  const diagnostics = [];
  for (const stage of stages ?? []) {
    try {
      diagnostics.push(...(await stageDiagnostics(stage)).map(item => ({ ...item, stage: stage.name ?? stage.id })));
    } catch (error) {
      evidenceErrors.push(`${stage.name ?? stage.id}: không đọc được chi tiết kết quả ${stage.resultFile}: ${error.message}`);
    }
  }
  const browserStage = (stages ?? []).find(stage => stage.kind === 'playwright');
  if (browserStage?.status === 'passed' && (!browserCases.length || browserCases.length !== browserStage.counts?.total)) {
    evidenceErrors.push('Số ca browser chi tiết không khớp tổng Playwright; không xác nhận PASS từ stats riêng lẻ.');
  }
  for (const item of browserCases) {
    if (item.status !== 'skipped' && !(item.screenshots?.length)) {
      evidenceErrors.push(`${item.project} · ${item.title}: không có ảnh đính kèm; không tạo ảnh thay thế.`);
    }
    for (const attachment of item.screenshots ?? []) {
      const source = path.isAbsolute(attachment) ? attachment : path.resolve(runDir, attachment);
      if (screenshotLinks.has(source)) continue;
      try {
        const withinRun = path.relative(runDir, source);
        if (withinRun.startsWith('..') || path.isAbsolute(withinRun)) throw new Error('ảnh không thuộc thư mục lần chạy');
        const bytes = await readFile(source);
        if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('tệp không phải PNG');
        const hash = createHash('sha256').update(withinRun).digest('hex').slice(0, 12);
        const filename = `${String(item.project).replace(/[^\w-]/g, '-')}-${hash}.png`;
        const destination = path.join(assetsDirectory, filename);
        await mkdir(assetsDirectory, { recursive: true });
        await copyFile(source, destination);
        screenshotLinks.set(source, destination);
        screenshots.push(destination);
      } catch (error) {
        evidenceErrors.push(`${item.project} · ${item.title}: không chép được ${attachment}: ${error.message}`);
      }
    }
  }
  const summary = summarizeStages(stages);
  if (evidenceErrors.length || browserCases.some(item => item.status === 'failed') || diagnostics.some(item => item.status === 'failed')) summary.outcome = 'FAIL';
  const counts = summary.counts;
  const lines = [
    `# Báo cáo kiểm thử toàn hệ thống SmartMeal — ${dateInSaigon(finishedAt)}`,
    '', `**Kết quả: ${summary.outcome}** · Lần chạy: \`${cell(runId)}\` · Git: \`${cell(gitSha)}\``,
    '', `Bắt đầu: ${cell(startedAt)}. Kết thúc: ${cell(finishedAt)}. Ngày báo cáo theo Asia/Saigon.`,
    '', '## Phạm vi và môi trường', '',
    '- Backend: SmartMeal.Tests gồm kiểm thử HTTP/integration với PostgreSQL QA; đây không phải thao tác trình duyệt.',
    '- Frontend mobile: Jest gồm unit và live-service gọi API QA thật; các native adapters trong Jest vẫn có fixture/mock.',
    '- Admin: Vitest gồm unit/component và live API; phân biệt với browser E2E bên dưới.',
    '- Browser E2E: Admin Chromium; mobile web Chromium và WebKit ở kích thước điện thoại. **Không phải native iPhone E2E hay kiểm thử iPhone vật lý.**',
    '- QA dùng API 5001, Admin 3001, mobile web 8082 và database dùng một lần; không dùng database demo.',
    '- Không gọi dịch vụ bên ngoài thật: AI dùng demo/fixture, email không gửi qua SMTP, thanh toán dùng mock. Không xác nhận chất lượng AI, giao email hay giao dịch thật.',
    '- Camera, microphone, push native và tải ảnh đại diện native cần kiểm thử thiết bị riêng; không suy ra PASS từ mobile web.',
    '', '## Kết quả tổng hợp', '',
    '| Tổng ca | Đạt | Lỗi | Bỏ qua |', '| ---: | ---: | ---: | ---: |',
    `| ${counts.total} | ${counts.passed} | ${counts.failed} | ${counts.skipped} |`,
    '', 'Số lượng chỉ lấy từ kết quả máy đọc được. Bỏ qua không được tính là đạt; flaky được tính là lỗi. CLI lỗi, bước bị chặn, thiếu kết quả hoặc không thực thi ca nào đều làm lần chạy FAIL.',
    '', '| Bước | Loại | Trạng thái | Exit | Thời gian (s) | Tổng/Đạt/Lỗi/Bỏ qua | Chứng cứ |',
    '| --- | --- | --- | ---: | ---: | --- | --- |',
  ];
  for (const stage of stages ?? []) {
    const count = stage.counts;
    const files = [stage.logFile && link('Log', stage.logFile), stage.resultFile && link('Kết quả', stage.resultFile)].filter(Boolean).join(' · ');
    lines.push(`| ${cell(stage.name ?? stage.id)} | ${cell(stage.kind)} | ${cell(stage.status)} | ${stage.exitCode ?? '—'} | ${((stage.durationMs ?? 0) / 1000).toFixed(2)} | ${count ? `${count.total}/${count.passed}/${count.failed}/${count.skipped}` : '—'} | ${files || '—'} |`);
  }
  lines.push('', '## Chi tiết ca lỗi và bỏ qua — Backend, Jest, Vitest', '',
    'Tên ca và thông báo dưới đây được đọc từ TRX/JSON của chính lần chạy; thông báo dài được rút gọn, kết quả gốc giữ đầy đủ.', '',
    '| Bộ kiểm thử | Ca | Trạng thái | Thông báo |', '| --- | --- | --- | --- |');
  for (const item of diagnostics) lines.push(`| ${cell(item.stage)} | ${cell(item.title)} | ${item.status} | ${cell(item.error)} |`);
  if (!diagnostics.length) lines.push('| — | Không có chi tiết ca lỗi/bỏ qua thu thập được | — | Đối chiếu trạng thái từng bước phía trên; đây không phải xác nhận toàn bộ bộ kiểm thử đạt. |');
  lines.push('', '## Các ca browser E2E thực tế', '', '| Project | Ca kiểm thử | Kết quả | Giây | Ảnh thực tế |', '| --- | --- | --- | ---: | --- |');
  if (!browserCases.length) lines.push('| — | Chưa có kết quả browser E2E | Không xác nhận PASS | — | — |');
  for (const item of browserCases) {
    const images = (item.screenshots ?? []).map(source => screenshotLinks.get(path.isAbsolute(source) ? source : path.resolve(runDir, source)))
      .filter(Boolean).map((file, index) => link(`Ảnh ${index + 1}`, file)).join(' · ');
    lines.push(`| ${cell(item.project)} | ${cell(item.title)} | ${item.status} | ${((item.durationMs ?? 0) / 1000).toFixed(2)} | ${images || 'Không có ảnh'} |`);
  }
  lines.push('', '## Ảnh chụp minh chứng', '', 'Ảnh bên dưới được chép từ attachment PNG thực tế của lần chạy. Bảng ca phía trên liên kết toàn bộ ảnh, bao gồm ảnh của ca lỗi.');
  const representatives = new Map();
  const featureGroups = [
    ['dashboard', /dashboard/i],
    ['nutrition', /diary|recipe|water|công thức|nhật ký/i],
    ['profile-and-reports', /profile|revenue|engagement|user.*detail/i],
  ];
  for (const item of browserCases) {
    const feature = item.status !== 'passed' ? `failure:${item.title}`
      : featureGroups.find(([, pattern]) => pattern.test(item.title))?.[0];
    if (!feature) continue;
    const key = `${item.project}:${feature}`;
    if (representatives.has(key)) continue;
    const image = (item.screenshots ?? []).map(source => screenshotLinks.get(path.isAbsolute(source) ? source : path.resolve(runDir, source))).find(Boolean);
    if (image) representatives.set(key, { item, image });
  }
  // Preserve evidence even when a partial run never reached the main screens.
  for (const item of browserCases) {
    if ([...representatives.values()].some(entry => entry.item.project === item.project)) continue;
    const image = (item.screenshots ?? []).map(source => screenshotLinks.get(path.isAbsolute(source) ? source : path.resolve(runDir, source))).find(Boolean);
    if (image) representatives.set(`${item.project}:fallback`, { item, image });
  }
  for (const { item, image } of representatives.values()) {
    lines.push('', `### ${cell(item.project)} · ${item.status}`, '', cell(item.title), '', `![${cell(item.project)} ${item.status}](<${relative(image)}>)`);
  }
  if (!screenshots.length) lines.push('', '**Không có ảnh browser thực tế để hiển thị. Không tạo ảnh hoặc ghi nhận PASS thay thế.**');
  lines.push('', '## Lỗi, bước bị chặn và ca bỏ qua');
  let issues = 0;
  for (const stage of stages ?? []) {
    if (stage.status !== 'passed' || stage.exitCode !== 0 || stage.error || stage.counts?.failed > 0 || stage.counts?.skipped > 0) {
      issues++;
      lines.push('', `- **${cell(stage.name ?? stage.id)}**: ${cell(stage.status)}, exit ${stage.exitCode ?? 'không chạy'}. ${cell(stage.error || 'Xem log và kết quả của bước trong bảng; số ca bỏ qua không tính PASS.')}`);
    }
  }
  for (const item of browserCases.filter(item => item.status !== 'passed')) {
    issues++;
    lines.push('', `- **${cell(item.project)} · ${cell(item.title)}**: ${item.status}. ${cell((item.errors ?? []).join('\n') || 'Không có thông báo bổ sung trong JSON.')}`);
  }
  for (const error of evidenceErrors) { issues++; lines.push('', `- **Thiếu chứng cứ**: ${cell(error)}`); }
  if (!issues) lines.push('', 'Không có lỗi hoặc ca bỏ qua trong các kết quả đã thu thập. Phạm vi giới hạn nêu trên vẫn áp dụng.');
  lines.push('', '## Ghi chú lần chạy');
  for (const note of notes) lines.push('', `- ${cell(note)}`);
  if (!notes.length) lines.push('', 'Không có ghi chú bổ sung.');
  lines.push('', '## Cách chạy lại', '', 'Từ thư mục gốc dự án:', '', '```sh', 'npm run test:e2e', '```', '',
    'Cần Node.js 24.3+ và Docker Desktop đang hoạt động. Lệnh tự chuẩn bị QA, cài browser/dependencies khi cần, chạy các bộ kiểm thử, chụp ảnh và sinh báo cáo sau mỗi lần chạy. Lỗi trả exit code khác 0; logs và kết quả vẫn được giữ lại.', '',
    `- ${link('Toàn bộ artifacts của lần chạy (logs, JSON, TRX, traces và video nếu có)', runDir)}`,
    `- ${link('Báo cáo Playwright tương tác', path.join(runDir, 'playwright-report/index.html'))}`,
    '', 'Tên báo cáo theo ngày; lần chạy tiếp theo trong cùng ngày cập nhật báo cáo này. Artifacts và ảnh được phân biệt bằng run ID; báo cáo không cộng dồn kết quả từ lần chạy trước.', '');
  await writeFile(reportPath, lines.join('\n'), 'utf8');
  // Preserve this run's report too, even when the daily report is overwritten by a later run.
  await mkdir(runDir, { recursive: true });
  const archivedReport = lines.join('\n').replace(/\]\(<([^>]+)>\)/g, (_match, target) =>
    `](<${path.relative(runDir, path.resolve(reportDirectory, target)).replaceAll('\\', '/')}>)`);
  await writeFile(path.join(runDir, 'system-report.md'), archivedReport, 'utf8');
  return { reportPath, outcome: summary.outcome, counts, screenshots };
}
