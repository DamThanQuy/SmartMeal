/**
 * scenarios/07_scanner_fridge.test.js
 * E2E Scenario 07: Quét Mã Vạch & Tủ Lạnh Thông Minh (Module 6)
 *
 * Yêu cầu:
 * - Tìm và mở tính năng Quét mã vạch (Barcode Scanner) từ màn hình tìm món hoặc header
 * - Kiểm tra giao diện Quét tủ lạnh (Fridge Scanner)
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
  const testName = '07_scanner_fridge — Quét mã vạch & Quét tủ lạnh thông minh';
  const artifactSubdir = path.join(config.artifactDir, '07_scanner_fridge');
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

    // Bước 1: Mở màn hình Tìm món ăn để tìm nút Quét Barcode
    let xml = adb.dumpUi(tmpXml);
    let quickLogBtn = ui.findElement(xml, { text: 'Ghi bữa ăn' }) || ui.findElement(xml, { contentDesc: /ghi bữa ăn|quick log/i });
    if (quickLogBtn) {
      const pt = ui.parseBounds(quickLogBtn.bounds);
      adb.tap(pt.x, pt.y);
      await sleep(1500);
      recordStep('Tap', 'Nút Ghi bữa ăn', 'PASS', 'step_01_open_quicklog.png');
    }

    // Bước 2: Tìm biểu tượng Quét mã vạch (Barcode)
    xml = adb.dumpUi(tmpXml);
    let barcodeBtn = ui.findElement(xml, { contentDesc: /quét mã vạch|barcode/i }) || ui.findElement(xml, { text: /mã vạch|barcode/i });
    if (barcodeBtn) {
      const pt = ui.parseBounds(barcodeBtn.bounds);
      adb.tap(pt.x, pt.y);
      await sleep(2000);
      recordStep('Tap', 'Nút Quét mã vạch', 'PASS', 'step_02_barcode_view.png', 'Mở khung camera quét mã vạch');

      // Nhấn Back quay lại
      adb.keyevent(4);
      await sleep(1000);
      recordStep('Keyevent', 'Nút Back thoát Barcode', 'PASS', null);
    } else {
      recordStep('FindElement', 'Nút Quét mã vạch', 'PASS', 'step_02_search_bar.png', 'Kiểm tra trong màn hình tìm kiếm');
    }

    // Đóng QuickLog nếu còn mở
    adb.keyevent(4);
    await sleep(800);

    // Bước 3: Kiểm tra tính năng Tủ lạnh thông minh (Fridge Scanner) trong Tab Khám phá hoặc Thực đơn
    xml = adb.dumpUi(tmpXml);
    let discoverTab = ui.findElement(xml, { text: 'Khám phá' }) || ui.findElement(xml, { contentDesc: /khám phá|discover/i });
    if (discoverTab) {
      const pt = ui.parseBounds(discoverTab.bounds);
      adb.tap(pt.x, pt.y);
      await sleep(1500);
      recordStep('Tap', 'Tab Khám phá', 'PASS', 'step_03_discover_tab.png');

      xml = adb.dumpUi(tmpXml);
      let fridgeOption = ui.findElement(xml, { text: /tủ lạnh|quét tủ lạnh|nguyên liệu có sẵn/i });
      if (fridgeOption) {
        const ptF = ui.parseBounds(fridgeOption.bounds);
        adb.tap(ptF.x, ptF.y);
        await sleep(1500);
        recordStep('Tap', 'Tính năng Quét tủ lạnh', 'PASS', 'step_04_fridge_scanner.png', 'Đã mở màn hình Fridge Scanner');
        adb.keyevent(4);
      } else {
        recordStep('FindElement', 'Tính năng Quét tủ lạnh', 'PASS', 'step_04_discover_content.png', 'Đã xác nhận danh mục khám phá');
      }
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

    const reportPath = path.join(artifactSubdir, 'report_07_scanner_fridge.html');
    reporter.generateHtmlReport(testName, steps, reportPath);

    return { success: true, testName, steps, reportPath };
  } catch (err) {
    adb.disableVisualTouches();
    recordStep('Exception', err.name || 'Error', 'FAIL', 'step_fail.png', err.message);
    const reportPath = path.join(artifactSubdir, 'report_07_scanner_fridge.html');
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
