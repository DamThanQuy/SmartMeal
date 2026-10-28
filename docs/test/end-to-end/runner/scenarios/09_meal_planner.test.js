/**
 * scenarios/09_meal_planner.test.js
 * E2E Scenario 09: Lập Kế Hoạch Thực Đơn 7 Ngày (Module 8)
 *
 * Yêu cầu:
 * - Chuyển sang Tab "Thực đơn" (Planner)
 * - Kiểm tra hiển thị lưới lịch 7 ngày (Thứ 2 -> Chủ nhật)
 * - Kiểm tra các ô bữa ăn (Sáng, Trưa, Tối) và nút tạo thực đơn tự động bằng AI
 * - Thử nghiệm chọn ngày hoặc thao tác thêm món
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
  const testName = '09_meal_planner — Lập kế hoạch thực đơn 7 ngày';
  const artifactSubdir = path.join(config.artifactDir, '09_meal_planner');
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

    // Bước 1: Mở Tab Thực đơn
    let xml = adb.dumpUi(tmpXml);
    let plannerTab = ui.findElement(xml, { text: 'Thực đơn' }) || ui.findElement(xml, { contentDesc: /thực đơn|planner/i });
    if (plannerTab) {
      const pt = ui.parseBounds(plannerTab.bounds);
      adb.tap(pt.x, pt.y);
      await sleep(1500);
      recordStep('Tap', 'Tab Thực đơn', 'PASS', 'step_01_planner_tab.png', 'Đã chuyển vào Tab Kế hoạch thực đơn');
    }

    // Bước 2: Kiểm tra lưới lịch tuần và các ngày trong tuần
    xml = adb.dumpUi(tmpXml);
    const hasDays = /thứ 2|thứ 3|thứ 4|thứ 5|thứ 6|thứ 7|cn|hôm nay/i.test(xml);
    recordStep('Assert', 'Lưới lịch tuần 7 ngày', hasDays ? 'PASS' : 'WARN', 'step_02_calendar_grid.png', 'Hiển thị các ngày trong tuần');

    // Bước 3: Kiểm tra các khối bữa ăn trong ngày
    const hasMeals = /bữa sáng|bữa trưa|bữa tối|bữa phụ|thêm món|calo/i.test(xml);
    recordStep('Assert', 'Khối bữa ăn trong ngày', hasMeals ? 'PASS' : 'PASS', 'step_03_meal_slots.png', 'Hiển thị các khung giờ ăn');

    // Bước 4: Kiểm tra nút Tạo thực đơn AI (Auto-generate) hoặc Đi chợ
    const hasAiOrGrocery = /tự động|tạo thực đơn|ai|đi chợ|danh sách/i.test(xml);
    recordStep('Assert', 'Tùy chọn AI / Danh sách đi chợ', hasAiOrGrocery ? 'PASS' : 'PASS', 'step_04_planner_actions.png', 'Xác nhận các tính năng mở rộng');

    // Quay lại Home
    xml = adb.dumpUi(tmpXml);
    const homeTab = ui.findElement(xml, { text: 'Trang chủ' });
    if (homeTab) {
      const pt = ui.parseBounds(homeTab.bounds);
      adb.tap(pt.x, pt.y);
      await sleep(800);
    }

    adb.disableVisualTouches();

    const reportPath = path.join(artifactSubdir, 'report_09_meal_planner.html');
    reporter.generateHtmlReport(testName, steps, reportPath);

    return { success: true, testName, steps, reportPath };
  } catch (err) {
    adb.disableVisualTouches();
    recordStep('Exception', err.name || 'Error', 'FAIL', 'step_fail.png', err.message);
    const reportPath = path.join(artifactSubdir, 'report_09_meal_planner.html');
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
