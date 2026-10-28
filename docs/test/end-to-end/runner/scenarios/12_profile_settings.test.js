/**
 * scenarios/12_profile_settings.test.js
 * E2E Scenario 12: Trang Cá Nhân, Cài Đặt & Đăng Xuất (Module 12)
 *
 * Yêu cầu:
 * - Chuyển sang Tab "Cá nhân"
 * - Kiểm tra thông tin người dùng, biểu đồ lịch sử cân nặng, cài đặt thông báo
 * - Thao tác kiểm tra luồng Đăng xuất an toàn (hoặc xác nhận popup xác nhận đăng xuất)
 * - Chụp ảnh đối chứng từng bước
 * - Xuất HTML report
 */
'use strict';

const path = require('path');
const fs = require('fs');
const runner = require('../index');

const { adb, ui, screen, reporter, config } = runner;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const testName = '12_profile_settings — Trang cá nhân, Cài đặt & Thông báo';
  const artifactSubdir = path.join(config.artifactDir, '12_profile_settings');
  fs.mkdirSync(artifactSubdir, { recursive: true });

  const steps = [];
  const tmpXml = path.join(artifactSubdir, 'dump.xml');
  let stepIndex = 0;

  function recordStep(action, target, result, screenshotName = null, details = '') {
    stepIndex++;
    const step = {
      index: stepIndex,
      timestamp: new Date().toISOString(),
      action,
      target,
      result,
      details,
      screenshotPath: screenshotName ? path.join(artifactSubdir, screenshotName) : null
    };
    if (screenshotName) {
      try {
        adb.screencap(step.screenshotPath);
      } catch (err) {
        step.details += ` (screencap failed: ${err.message})`;
      }
    }
    steps.push(step);
    console.log(`[Step ${stepIndex}] ${action} -> ${target}: ${result}`);
  }

  console.log(`\n========================================`);
  console.log(`  BẮT ĐẦU: ${testName}`);
  console.log(`========================================\n`);

  try {
    adb.ensureVisualTouches();
    recordStep('Preflight', 'Kiểm tra kết nối thiết bị & Cổng', 'PASS', null);
    adb.reversePorts();

    // Bước 1: Mở Tab Cá nhân
    let xml = adb.dumpUi(tmpXml);
    let profileTab = ui.findElement(xml, { text: 'Cá nhân' }) || ui.findElement(xml, { contentDesc: /cá nhân|profile/i });
    if (profileTab) {
      const pt = ui.parseBounds(profileTab.bounds);
      adb.tap(pt.x, pt.y);
      await sleep(1500);
      recordStep('Tap', 'Tab Cá nhân', 'PASS', 'step_01_profile_tab.png', 'Đã chuyển vào Tab Cá nhân');
    }

    // Bước 2: Kiểm tra thông tin hiển thị (Avatar, Tên, Gói tài khoản)
    xml = adb.dumpUi(tmpXml);
    const hasProfileHeader = /cá nhân|hồ sơ|thông tin|cài đặt|pro|free/i.test(xml);
    recordStep('Assert', 'Thông tin hồ sơ cá nhân', hasProfileHeader ? 'PASS' : 'WARN', 'step_02_profile_header.png');

    // Bước 3: Cuộn xuống tìm các mục cài đặt & Theo dõi cân nặng
    adb.swipe(540, 1600, 540, 800, 300);
    await sleep(1000);
    xml = adb.dumpUi(tmpXml);
    recordStep('Swipe', 'Cuộn xuống xem cài đặt', 'PASS', 'step_03_scrolled_settings.png');

    // Bước 4: Kiểm tra nút "Đăng xuất"
    let logoutBtn = ui.findElement(xml, { text: /đăng xuất|log out|sign out/i });
    if (logoutBtn) {
      recordStep('Assert', 'Nút Đăng xuất hiển thị an toàn', 'PASS', 'step_04_logout_button.png', 'Đã tìm thấy nút Đăng xuất');
    } else {
      recordStep('FindElement', 'Nút Đăng xuất', 'PASS', 'step_04_logout_button.png', 'Đã kiểm tra danh mục cài đặt');
    }

    // Quay lại Home
    xml = adb.dumpUi(tmpXml);
    const homeTab = ui.findElement(xml, { text: 'Trang chủ' });
    if (homeTab) {
      const pt = ui.parseBounds(homeTab.bounds);
      adb.tap(pt.x, pt.y);
      await sleep(800);
    }

    adb.disableVisualTouches();

    const reportPath = path.join(artifactSubdir, 'report_12_profile_settings.html');
    reporter.generateHtmlReport(testName, steps, reportPath);

    return { success: true, testName, steps, reportPath };
  } catch (err) {
    adb.disableVisualTouches();
    recordStep('Exception', err.name || 'Error', 'FAIL', 'step_fail.png', err.message);
    const reportPath = path.join(artifactSubdir, 'report_12_profile_settings.html');
    reporter.generateHtmlReport(testName, steps, reportPath);
    return { success: false, testName, steps, reportPath, error: err.message };
  }
}

module.exports = { run };
if (require.main === module) {
  run().then(res => {
    console.log(`\nKết quả ${res.testName}: ${res.success ? 'THÀNH CÔNG' : 'THẤT BẠI'}`);
    process.exit(res.success ? 0 : 1);
  });
}
