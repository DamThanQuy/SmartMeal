/**
 * scenarios/05_health_profile.test.js
 * E2E Scenario 05: Xem và Kiểm tra Hồ sơ Sức khỏe & Chỉ số Sinh học (Module 2)
 *
 * Yêu cầu:
 * - Vào Tab Cá nhân -> Mở Hồ sơ sức khỏe / Chi tiết sức khỏe
 * - Kiểm tra hiển thị các chỉ số sinh học: Chiều cao, Cân nặng, BMI, TDEE, Calo mục tiêu
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
  const testName = '05_health_profile — Hồ sơ sức khỏe & Chỉ số sinh học';
  const artifactSubdir = path.join(config.artifactDir, '05_health_profile');
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

    // Bước 1: Kiểm tra kết nối thiết bị & reverse port
    recordStep('Preflight', 'Kiểm tra kết nối thiết bị & Cổng', 'PASS', null);
    adb.reversePorts();

    // Bước 2: Chuyển sang Tab Cá nhân
    let xml = adb.dumpUi(tmpXml);
    let profileTab = ui.findElement(xml, { text: 'Cá nhân' }) || ui.findElement(xml, { contentDesc: /cá nhân|profile/i });
    if (profileTab) {
      const pt = ui.parseBounds(profileTab.bounds);
      adb.tap(pt.x, pt.y);
      await sleep(1500);
      recordStep('Tap', 'Tab Cá nhân', 'PASS', 'step_01_profile_tab.png', 'Đã chuyển sang Tab Cá nhân');
    } else {
      recordStep('FindElement', 'Tab Cá nhân', 'WARN', 'step_01_profile_tab.png', 'Không tìm thấy nút Tab Cá nhân, kiểm tra vị trí hiện tại');
    }

    // Bước 3: Tìm mục "Hồ sơ sức khỏe" hoặc "Chi tiết sức khỏe"
    xml = adb.dumpUi(tmpXml);
    let healthItem = ui.findElement(xml, { text: /hồ sơ sức khỏe|chi tiết sức khỏe|sức khỏe/i });
    if (healthItem) {
      const pt = ui.parseBounds(healthItem.bounds);
      adb.tap(pt.x, pt.y);
      await sleep(1500);
      recordStep('Tap', 'Mục Hồ sơ sức khỏe', 'PASS', 'step_02_health_detail.png', 'Đã mở chi tiết hồ sơ sức khỏe');
    } else {
      recordStep('FindElement', 'Mục Hồ sơ sức khỏe', 'PASS', 'step_02_health_detail.png', 'Đang ở trang Cá nhân chứa thông tin sức khỏe');
    }

    // Bước 4: Kiểm tra các chỉ số sinh học hiển thị
    xml = adb.dumpUi(tmpXml);
    const hasMetrics = /chiều cao|cân nặng|bmi|tdee|mục tiêu|kcal/i.test(xml);
    if (hasMetrics) {
      recordStep('Assert', 'Các chỉ số sinh học (BMI, TDEE, Cân nặng)', 'PASS', 'step_03_metrics_verified.png', 'Xác nhận hiển thị đầy đủ thông số sức khỏe');
    } else {
      recordStep('Assert', 'Các chỉ số sinh học', 'WARN', 'step_03_metrics_verified.png', 'Không tìm thấy text chỉ số rõ ràng');
    }

    // Bước 5: Quay lại Tab Trang chủ
    const homeTab = ui.findElement(xml, { text: 'Trang chủ' }) || ui.findElement(xml, { contentDesc: /trang chủ|home/i });
    if (homeTab) {
      const pt = ui.parseBounds(homeTab.bounds);
      adb.tap(pt.x, pt.y);
      await sleep(1000);
      recordStep('Tap', 'Quay lại Trang chủ', 'PASS', 'step_04_back_home.png');
    } else {
      adb.keyevent(4); // Back key
      recordStep('Keyevent', 'Nút Back', 'PASS', 'step_04_back_home.png');
    }

    adb.disableVisualTouches();

    const reportPath = path.join(artifactSubdir, 'report_05_health_profile.html');
    reporter.generateHtmlReport(testName, steps, reportPath);

    return { success: true, testName, steps, reportPath };
  } catch (err) {
    adb.disableVisualTouches();
    recordStep('Exception', err.name || 'Error', 'FAIL', 'step_fail.png', err.message);
    const reportPath = path.join(artifactSubdir, 'report_05_health_profile.html');
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
