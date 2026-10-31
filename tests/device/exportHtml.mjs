import fs from 'node:fs';
import path from 'node:path';

/**
 * Xuất báo cáo kiểm thử E2E sang định dạng HTML tương tác cao cấp (Standalone Dashboard)
 * @param {Object} options
 * @param {string} options.reportPath - Đường dẫn file .html xuất ra
 * @param {string} options.deviceModel - Model thiết bị
 * @param {string} options.androidVer - Phiên bản Android
 * @param {string} options.deviceId - Serial thiết bị
 * @param {string} options.resolution - Độ phân giải màn hình
 * @param {string} options.timestamp - Thời gian chạy kiểm thử
 * @param {Array} options.results - Mảng kết quả các bước kiểm thử
 */
export function exportTestReportToHtml({
  reportPath,
  deviceModel = 'Android Device',
  androidVer = 'Unknown',
  deviceId = '',
  resolution = '1216x2688',
  timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
  results = []
}) {
  const totalTests = results.length;
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = totalTests - passCount;
  const passRate = totalTests > 0 ? Math.round((passCount / totalTests) * 100) : 0;

  const getFeatureGroup = (id) => {
    const num = parseInt(id.replace(/\D/g, ''), 10);
    if (num <= 7) return 'Trang chủ & Thao tác nhanh';
    if (num <= 9) return 'Thực đơn tuần & Đi chợ';
    if (num <= 12) return 'Khám phá & Gợi ý công thức';
    if (num <= 14) return 'Nhật ký dinh dưỡng & Tiến độ';
    if (num <= 20) return 'Hồ sơ cá nhân & Sức khỏe';
    return 'Chu kỳ hoàn tất điều hướng';
  };

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartMeal - Báo cáo kiểm thử E2E (${passCount}/${totalTests} PASS)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #0d9488;
      --primary-dark: #0f766e;
      --primary-light: #ccfbf1;
      --success: #16a34a;
      --success-bg: #dcfce7;
      --danger: #e11d48;
      --danger-bg: #ffe4e6;
      --bg: #0b1120;
      --surface: #131d33;
      --surface-border: #1e293b;
      --card-bg: #18223a;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 32px 24px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    /* Header */
    .header {
      background: linear-gradient(135deg, rgba(13, 148, 136, 0.25) 0%, rgba(15, 23, 42, 0.9) 100%);
      border: 1px solid rgba(13, 148, 136, 0.4);
      border-radius: 20px;
      padding: 32px;
      margin-bottom: 28px;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
      position: relative;
      overflow: hidden;
    }
    .header::after {
      content: '';
      position: absolute;
      top: -50%;
      right: -10%;
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(13, 148, 136, 0.15) 0%, transparent 70%);
      pointer-events: none;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(13, 148, 136, 0.2);
      border: 1px solid var(--primary);
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
      color: #5eead4;
      margin-bottom: 14px;
    }
    h1 {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
      background: linear-gradient(to right, #ffffff, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .meta-line {
      color: var(--text-muted);
      font-size: 14px;
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      align-items: center;
    }
    .meta-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .action-links {
      margin-top: 18px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .btn-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--surface);
      border: 1px solid var(--surface-border);
      color: #38bdf8;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-link:hover {
      background: rgba(56, 189, 248, 0.15);
      border-color: #38bdf8;
      transform: translateY(-1px);
    }
    /* Metrics Cards */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 18px;
      margin-bottom: 28px;
    }
    .metric-card {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: 16px;
      padding: 22px;
      position: relative;
      overflow: hidden;
    }
    .metric-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
    }
    .metric-card.total::before { background: #38bdf8; }
    .metric-card.pass::before { background: var(--success); }
    .metric-card.fail::before { background: var(--danger); }
    .metric-card.rate::before { background: var(--primary); }
    .metric-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .metric-value {
      font-size: 32px;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
      color: #fff;
    }
    .metric-sub {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .metric-value.pass { color: #4ade80; }
    .metric-value.fail { color: #fb7185; }
    .metric-value.rate { color: #2dd4bf; }
    /* Toolbar / Filters */
    .toolbar {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: 14px;
      padding: 16px 20px;
      margin-bottom: 24px;
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      align-items: center;
      justify-content: space-between;
    }
    .filter-chips {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .chip {
      background: var(--card-bg);
      border: 1px solid var(--surface-border);
      color: var(--text-muted);
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .chip:hover {
      color: #fff;
      border-color: #475569;
    }
    .chip.active {
      background: var(--primary);
      border-color: var(--primary);
      color: #fff;
    }
    .search-box {
      flex: 1;
      min-width: 260px;
      max-width: 400px;
      position: relative;
    }
    .search-input {
      width: 100%;
      background: var(--card-bg);
      border: 1px solid var(--surface-border);
      color: #fff;
      padding: 8px 14px 8px 36px;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
    }
    .search-input:focus {
      border-color: var(--primary);
    }
    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 14px;
    }
    /* Test Cases Grid */
    .test-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 20px;
    }
    .test-card {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
    }
    .test-card:hover {
      transform: translateY(-3px);
      border-color: rgba(13, 148, 136, 0.6);
      box-shadow: 0 12px 28px -10px rgba(0, 0, 0, 0.6);
    }
    .card-thumb-wrap {
      width: 100%;
      height: 220px;
      background: #000;
      position: relative;
      cursor: pointer;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card-thumb {
      max-height: 100%;
      max-width: 100%;
      object-fit: contain;
      transition: transform 0.3s;
    }
    .card-thumb-wrap:hover .card-thumb {
      transform: scale(1.04);
    }
    .thumb-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      gap: 6px;
    }
    .card-thumb-wrap:hover .thumb-overlay {
      opacity: 1;
    }
    .card-body {
      padding: 18px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .test-id {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 700;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .status-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 999px;
      letter-spacing: 0.05em;
    }
    .status-badge.pass {
      background: rgba(34, 197, 94, 0.15);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    .status-badge.fail {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .group-tag {
      font-size: 11px;
      font-weight: 600;
      color: #2dd4bf;
      margin-bottom: 4px;
    }
    .test-name {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #fff;
    }
    .test-desc {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.45;
      flex: 1;
    }
    /* Lightbox Modal */
    .lightbox {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .lightbox.active {
      display: flex;
    }
    .lightbox-content {
      max-width: 90vw;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    }
    .lightbox-img {
      max-height: 82vh;
      max-width: 90vw;
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9);
      border: 1px solid #334155;
    }
    .lightbox-caption {
      margin-top: 12px;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      text-align: center;
    }
    .lightbox-close {
      position: absolute;
      top: -40px;
      right: 0;
      background: none;
      border: none;
      color: #fff;
      font-size: 28px;
      cursor: pointer;
    }
    /* Footer */
    .footer {
      margin-top: 48px;
      text-align: center;
      color: var(--text-muted);
      font-size: 13px;
      border-top: 1px solid var(--surface-border);
      padding-top: 24px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="header">
      <div class="brand">🥗 SMARTMEAL AUTOMATION QA</div>
      <h1>Báo cáo kiểm thử tự động End-to-End (Device UI E2E)</h1>
      <div class="meta-line">
        <span class="meta-tag">📱 <strong>Thiết bị:</strong> ${deviceModel} (Android ${androidVer})</span>
        <span class="meta-tag">🆔 <strong>Serial:</strong> <code>${deviceId}</code></span>
        <span class="meta-tag">📐 <strong>Màn hình:</strong> ${resolution}</span>
        <span class="meta-tag">⏰ <strong>Thời gian:</strong> ${timestamp}</span>
      </div>
      <div class="action-links">
        <a class="btn-link" href="./DEVICE_E2E_REPORT.xlsx" download>📊 Tải file Excel (.xlsx)</a>
        <a class="btn-link" href="./DEVICE_E2E_REPORT.md">📝 Xem bản Markdown (.md)</a>
        <a class="btn-link" href="https://github.com/DamThanQuy/SmartMeal" target="_blank">🌐 GitHub Repository</a>
      </div>
    </header>

    <!-- Metrics Cards -->
    <div class="metrics-grid">
      <div class="metric-card total">
        <div class="metric-title">Tổng ca kiểm thử</div>
        <div class="metric-value">${totalTests}</div>
        <div class="metric-sub">Bao phủ toàn bộ tính năng</div>
      </div>
      <div class="metric-card pass">
        <div class="metric-title">Ca kiểm thử Đạt</div>
        <div class="metric-value pass">${passCount}</div>
        <div class="metric-sub">Tỉ lệ đạt: ${passRate}%</div>
      </div>
      <div class="metric-card fail">
        <div class="metric-title">Ca kiểm thử Lỗi</div>
        <div class="metric-value fail">${failCount}</div>
        <div class="metric-sub">${failCount === 0 ? 'Hoàn hảo 0 lỗi' : 'Cần xử lý'}</div>
      </div>
      <div class="metric-card rate">
        <div class="metric-title">Đánh giá chung</div>
        <div class="metric-value rate">${failCount === 0 ? '100% PASS' : 'CÓ LỖI'}</div>
        <div class="metric-sub">Sẵn sàng nghiệm thu</div>
      </div>
    </div>

    <!-- Toolbar / Filters -->
    <div class="toolbar">
      <div class="filter-chips">
        <button class="chip active" onclick="filterStatus('all')">Tất cả (${totalTests})</button>
        <button class="chip" onclick="filterStatus('PASS')">Đạt (${passCount})</button>
        <button class="chip" onclick="filterStatus('FAIL')">Lỗi (${failCount})</button>
      </div>
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input class="search-input" type="text" id="searchInput" placeholder="Tìm kiếm tính năng, mã test..." oninput="searchCards()">
      </div>
    </div>

    <!-- Test Cases Grid -->
    <div class="test-grid" id="testGrid">
      ${results.map(r => `
      <div class="test-card" data-status="${r.status}" data-text="${r.id} ${r.name} ${r.description} ${getFeatureGroup(r.id)}">
        <div class="card-thumb-wrap" onclick="openLightbox('./device-e2e/${r.file}', '${r.id}: ${r.name}')">
          <img class="card-thumb" src="./device-e2e/${r.file}" alt="${r.name}" loading="lazy">
          <div class="thumb-overlay">🔍 Phóng to ảnh chụp</div>
        </div>
        <div class="card-body">
          <div class="card-top">
            <span class="test-id">${r.id}</span>
            <span class="status-badge ${r.status.toLowerCase()}">${r.status}</span>
          </div>
          <div class="group-tag">${getFeatureGroup(r.id)}</div>
          <div class="test-name">${r.name}</div>
          <div class="test-desc">${r.description}</div>
        </div>
      </div>
      `).join('')}
    </div>

    <!-- Footer -->
    <footer class="footer">
      <p>Báo cáo tự động sinh bởi <strong>SmartMeal E2E Automation Runner</strong> &bull; React Native 0.88 & Expo SDK 58 &bull; ASP.NET Core .NET 9</p>
      <p style="margin-top: 6px; font-size: 12px; color: #64748b;">Dữ liệu kiểm thử thực thi trên thiết bị thật REDMAGIC 10 Pro qua ADB Reverse Port Forwarding.</p>
    </footer>
  </div>

  <!-- Lightbox Modal -->
  <div class="lightbox" id="lightbox" onclick="closeLightbox(event)">
    <div class="lightbox-content">
      <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
      <img class="lightbox-img" id="lightboxImg" src="" alt="Screenshot">
      <div class="lightbox-caption" id="lightboxCaption"></div>
    </div>
  </div>

  <script>
    let currentFilter = 'all';

    function filterStatus(status) {
      currentFilter = status;
      document.querySelectorAll('.filter-chips .chip').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(status.toLowerCase()) || (status === 'all' && btn.textContent.includes('Tất cả')));
      });
      applyFilters();
    }

    function searchCards() {
      applyFilters();
    }

    function applyFilters() {
      const query = document.getElementById('searchInput').value.toLowerCase().trim();
      const cards = document.querySelectorAll('.test-card');

      cards.forEach(card => {
        const matchesStatus = currentFilter === 'all' || card.dataset.status === currentFilter;
        const matchesSearch = !query || card.dataset.text.toLowerCase().includes(query);
        card.style.display = (matchesStatus && matchesSearch) ? 'flex' : 'none';
      });
    }

    function openLightbox(src, caption) {
      document.getElementById('lightboxImg').src = src;
      document.getElementById('lightboxCaption').textContent = caption;
      document.getElementById('lightbox').classList.add('active');
    }

    function closeLightbox(e) {
      if (!e || e.target.id === 'lightbox' || e.target.classList.contains('lightbox-close')) {
        document.getElementById('lightbox').classList.remove('active');
      }
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
    });
  </script>
</body>
</html>`;

  // Ghi file HTML
  const outputDir = path.dirname(reportPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, html, 'utf-8');
  return reportPath;
}
