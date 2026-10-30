#!/usr/bin/env node
/**
 * D:/STUDY/KY8/PRM/SmartMeal/docs/test/end-to-end/runner/run.js
 * CLI Test Runner for SmartMeal End-to-End Automation Suite
 *
 * Cú pháp:
 *   node run.js [01 | 02 | 03 | 04 | --all]
 *   node run.js --scenario 01_auth_login
 *
 * Tính năng:
 * - Kiểm tra kết nối ADB devices trước khi chạy
 * - Tự động thiết lập ADB Reverse Ports (8081 Metro, 5000 API, 5432 Postgres)
 * - Tự động đánh thức và mở khóa màn hình thiết bị
 * - Điều hướng và thực thi đúng kịch bản được chọn
 * - Tổng kết kết quả trực quan (Console table + Master report)
 */
'use strict';

const path = require('path');
const fs = require('fs');
const runner = require('./index');

const { adb, reporter, config } = runner;

const SCENARIOS = {
  '01': {
    file: '01_auth_login.test.js',
    name: '01_auth_login',
    title: 'Đăng nhập tài khoản Pro (smartmealuser@gmail.com)'
  },
  '02': {
    file: '02_tabs_navigation.test.js',
    name: '02_tabs_navigation',
    title: 'Điều hướng 5 Tab chính (Thực đơn -> Khám phá -> Nhật ký -> Cá nhân -> Trang chủ)'
  },
  '03': {
    file: '03_diary_quicklog.test.js',
    name: '03_diary_quicklog',
    title: 'Ghi nhanh bữa ăn (QuickLog) & Cập nhật Calo'
  },
  '04': {
    file: '04_pro_upgrade_view.test.js',
    name: '04_pro_upgrade_view',
    title: 'Đăng nhập tài khoản Free & Xem bảng nâng cấp Pro PayOS'
  },
  '05': {
    file: '05_health_profile.test.js',
    name: '05_health_profile',
    title: 'Hồ sơ sức khỏe & Chỉ số sinh học (BMI, TDEE, Calo mục tiêu)'
  },
  '06': {
    file: '06_ai_features.test.js',
    name: '06_ai_features',
    title: 'Nhận diện thông minh bằng AI (AI Camera & Voice Log)'
  },
  '07': {
    file: '07_scanner_fridge.test.js',
    name: '07_scanner_fridge',
    title: 'Quét mã vạch Barcode & Quét tủ lạnh thông minh (Fridge Scanner)'
  },
  '08': {
    file: '08_recipes_collection.test.js',
    name: '08_recipes_collection',
    title: 'Khám phá công thức nấu ăn, bộ lọc & Chi tiết món ăn'
  },
  '09': {
    file: '09_meal_planner.test.js',
    name: '09_meal_planner',
    title: 'Lập kế hoạch thực đơn tuần 7 ngày & AI Auto-generate'
  },
  '10': {
    file: '10_grocery_list.test.js',
    name: '10_grocery_list',
    title: 'Danh sách đi chợ thông minh (Cộng dồn nguyên liệu & Strikethrough)'
  },
  '11': {
    file: '11_gamification_pet.test.js',
    name: '11_gamification_pet',
    title: 'Nuôi thú ảo Bé Mầm, ghi nhận uống nước & Streak chuỗi ngày'
  },
  '12': {
    file: '12_profile_settings.test.js',
    name: '12_profile_settings',
    title: 'Trang cá nhân, Cài đặt thông báo & Đăng xuất an toàn'
  }
};

function printBanner() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║               SMARTMEAL E2E TEST RUNNER AUTOMATION                 ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
}

function printUsage() {
  printBanner();
  console.log(`
Cách sử dụng:
  node run.js [tùy chọn]

Tùy chọn kịch bản:
  01, 1              Kịch bản 01: Đăng nhập tài khoản Pro
  02, 2              Kịch bản 02: Điều hướng 5 Tab chính
  03, 3              Kịch bản 03: Ghi nhanh bữa ăn (QuickLog) & Calo
  04, 4              Kịch bản 04: Đăng nhập Free & Xem gói Pro PayOS
  05, 5              Kịch bản 05: Hồ sơ sức khỏe & Chỉ số sinh học
  06, 6              Kịch bản 06: Nhận diện AI Camera & Voice Log
  07, 7              Kịch bản 07: Quét mã vạch Barcode & Tủ lạnh thông minh
  08, 8              Kịch bản 08: Khám phá công thức nấu ăn & Chi tiết món
  09, 9              Kịch bản 09: Lập kế hoạch thực đơn tuần 7 ngày
  10, 10             Kịch bản 10: Danh sách đi chợ thông minh
  11, 11             Kịch bản 11: Nuôi thú ảo Bé Mầm & Uống nước
  12, 12             Kịch bản 12: Trang cá nhân, Cài đặt & Đăng xuất
  --core             Chạy 4 kịch bản nền tảng cốt lõi (01 -> 04)
  --all, all, -a     Chạy toàn bộ 12 kịch bản theo thứ tự

Ví dụ:
  node run.js 01
  node run.js 05
  node run.js --core
  node run.js --all
`);
}

/**
 * Preflight check: kiểm tra thiết bị ADB và thiết lập reverse ports
 */
function preflightCheck() {
  console.log('\n🔍 [1/3] Kiểm tra kết nối thiết bị Android qua ADB...');
  let devices = [];
  try {
    devices = adb.getDevices();
  } catch (err) {
    console.error(`❌ Lỗi gọi lệnh adb: ${err.message}`);
    console.error(`Vui lòng kiểm tra đường dẫn ADB tại config.js (${config.adbPath})`);
    process.exit(2);
  }

  if (devices.length === 0) {
    console.error('❌ KHÔNG TÌM THẤY THIẾT BỊ NÀO ĐƯỢC KẾT NỐI QUA ADB!');
    console.error('👉 Vui lòng cắm cáp USB và bật "USB Debugging" trên điện thoại Android.');
    console.error('👉 Kiểm tra lại bằng lệnh: adb devices');
    process.exit(2);
  }

  const readyDevice = devices.find(d => d.state === 'device') || devices[0];
  console.log(`✅ Đã nhận diện thiết bị: [${readyDevice.serial}] (Trạng thái: ${readyDevice.state})`);

  console.log('\n🔓 [2/3] Đánh thức màn hình và sẵn sàng thiết bị...');
  try {
    adb.ensureScreenAwake();
    console.log('✅ Thiết bị đã được đánh thức.');
  } catch (err) {
    console.warn(`⚠️ Không thể đánh thức thiết bị: ${err.message}`);
  }

  console.log('\n🔄 [3/3] Thiết lập tự động ADB Reverse Port Forwarding...');
  try {
    adb.reversePorts();
    console.log('✅ Đã reverse thành công:');
    console.log('   - tcp:8081 (Metro Bundler)');
    console.log('   - tcp:5000 (Backend .NET API)');
    console.log('   - tcp:5432 (PostgreSQL Local DB)');
  } catch (err) {
    console.warn(`⚠️ Cảnh báo khi reverse ports: ${err.message}`);
  }
}

/**
 * Phân tích danh sách kịch bản từ tham số dòng lệnh
 * @param {string[]} args
 * @returns {Array<string>} Danh sách key kịch bản ['01', '02', ...]
 */
function resolveScenarios(args) {
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  if (args.includes('--core') || args.includes('core')) {
    return ['01', '02', '03', '04'];
  }

  if (args.includes('--all') || args.includes('all') || args.includes('-a')) {
    return ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  }

  const keys = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--scenario' && args[i + 1]) {
      const val = args[++i];
      const matchedKey = Object.keys(SCENARIOS).find(k =>
        val === k || val === `0${k}` || val === SCENARIOS[k].name || val === SCENARIOS[k].file
      );
      if (matchedKey) keys.push(matchedKey);
    } else {
      const clean = arg.replace(/^0+/, '');
      const padded = clean.padStart(2, '0');
      if (SCENARIOS[padded]) {
        keys.push(padded);
      } else {
        const byName = Object.keys(SCENARIOS).find(k =>
          arg === SCENARIOS[k].name || arg.includes(k)
        );
        if (byName) keys.push(byName);
      }
    }
  }

  return [...new Set(keys)];
}

async function main() {
  const args = process.argv.slice(2);
  const targetKeys = resolveScenarios(args);

  if (targetKeys.length === 0) {
    console.error('❌ Không xác định được kịch bản cần chạy!');
    printUsage();
    process.exit(2);
  }

  printBanner();
  preflightCheck();

  console.log('\n====================================================================');
  console.log(`📋 KỊCH BẢN ĐÃ CHỌN (${targetKeys.length}):`);
  targetKeys.forEach((key, idx) => {
    console.log(`   ${idx + 1}. [${key}] ${SCENARIOS[key].title}`);
  });
  console.log('====================================================================\n');

  const overallResults = [];
  const startTime = Date.now();

  for (const key of targetKeys) {
    const scInfo = SCENARIOS[key];
    const scriptPath = path.join(__dirname, 'scenarios', scInfo.file);

    if (!fs.existsSync(scriptPath)) {
      console.error(`❌ Không tìm thấy file kịch bản: ${scriptPath}`);
      overallResults.push({
        key,
        name: scInfo.name,
        success: false,
        error: 'File kịch bản không tồn tại',
        duration: 0
      });
      continue;
    }

    const scenarioModule = require(scriptPath);
    const scStart = Date.now();

    try {
      const result = await scenarioModule.run();
      const scDuration = Date.now() - scStart;
      overallResults.push({
        key,
        name: scInfo.name,
        success: result.success !== false,
        reportPath: result.reportPath,
        duration: scDuration,
        error: result.error
      });
    } catch (err) {
      const scDuration = Date.now() - scStart;
      overallResults.push({
        key,
        name: scInfo.name,
        success: false,
        duration: scDuration,
        error: err.message
      });
    }
  }

  const totalDuration = Date.now() - startTime;
  const passedCount = overallResults.filter(r => r.success).length;
  const failedCount = overallResults.length - passedCount;

  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                       TỔNG KẾT KIỂM THỬ E2E                        ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log(`Tổng số kịch bản : ${overallResults.length}`);
  console.log(`Thành công (PASS): ${passedCount} ✅`);
  console.log(`Thất bại   (FAIL): ${failedCount} ❌`);
  console.log(`Tổng thời gian   : ${(totalDuration / 1000).toFixed(2)}s`);
  console.log('────────────────────────────────────────────────────────────────────');

  overallResults.forEach((res, i) => {
    const icon = res.success ? '✅ PASS' : '❌ FAIL';
    const durStr = `${(res.duration / 1000).toFixed(2)}s`;
    console.log(`${i + 1}. [${res.key}] ${res.name.padEnd(24)} | ${icon} | ${durStr}`);
    if (res.reportPath) {
      console.log(`   └─ Report: ${res.reportPath}`);
    }
    if (res.error) {
      console.log(`   └─ Lỗi: ${res.error}`);
    }
  });

  // Tạo Báo cáo HTML Master nếu chạy nhiều kịch bản
  if (overallResults.length > 1) {
    const masterReportPath = path.join(config.artifactDir, 'master_e2e_summary.html');
    const masterSteps = overallResults.map(r => ({
      name: `Kịch bản [${r.key}] ${r.name}`,
      status: r.success ? 'pass' : 'fail',
      duration: r.duration,
      details: r.reportPath ? `Chi tiết kịch bản: ${path.basename(r.reportPath)}` : (r.error || ''),
      error: r.error
    }));
    reporter.generateHtmlReport('Tổng Hợp Toàn Bộ Kịch Bản E2E SmartMeal', masterSteps, masterReportPath);
    console.log(`\n📊 Báo cáo HTML Tổng hợp Master: ${masterReportPath}`);
  }

  console.log('\n====================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Lỗi nghiêm trọng trong runner:', err);
    process.exit(1);
  });
}

module.exports = { main };
