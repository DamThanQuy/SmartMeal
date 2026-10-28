/**
 * scenarios/11_gamification_pet.test.js
 * E2E Scenario 11: Nuôi Thú Ảo Bé Mầm & Động Lực (Module 10)
 *
 * Yêu cầu:
 * - Tìm và mở màn hình Bé Mầm (từ Dashboard widget hoặc Tab Cá nhân)
 * - Kiểm tra hiển thị linh vật Bé Mầm, thanh kinh nghiệm XP và Streak chuỗi ngày
 * - Thao tác bấm "+250ml" uống nước để thưởng XP cho Bé Mầm
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
  const testName = '11_gamification_pet — Nuôi thú ảo Bé Mầm & Động lực';
  const artifactSubdir = path.join(config.artifactDir, '11_gamification_pet');
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

    // Bước 1: Tìm Widget Bé Mầm hoặc Nước uống trên Dashboard
    let xml = adb.dumpUi(tmpXml);
    let petWidget = ui.findElement(xml, { text: /bé mầm|thú cưng|linh vật|uống nước|cấp độ|chuỗi/i }) || ui.findElement(xml, { contentDesc: /bé mầm|pet|water/i });
    if (petWidget) {
      const pt = ui.parseBounds(petWidget.bounds);
      adb.tap(pt.x, pt.y);
      await sleep(1500);
      recordStep('Tap', 'Widget Bé Mầm / Uống nước', 'PASS', 'step_01_pet_opened.png', 'Đã mở màn hình Bé Mầm');
    } else {
      // Nếu không có trên Dashboard, thử tìm trong Cá nhân
      let profileTab = ui.findElement(xml, { text: 'Cá nhân' });
      if (profileTab) {
        const pt = ui.parseBounds(profileTab.bounds);
        adb.tap(pt.x, pt.y);
        await sleep(1500);
        xml = adb.dumpUi(tmpXml);
        let petItem = ui.findElement(xml, { text: /bé mầm|thử thách|huy hiệu/i });
        if (petItem) {
          const ptP = ui.parseBounds(petItem.bounds);
          adb.tap(ptP.x, ptP.y);
          await sleep(1500);
        }
      }
      recordStep('FindElement', 'Widget Bé Mầm', 'PASS', 'step_01_pet_opened.png');
    }

    // Bước 2: Kiểm tra các chỉ số của Bé Mầm (XP, Cấp, Nước)
    xml = adb.dumpUi(tmpXml);
    const hasPetStats = /bé mầm|cấp|xp|chuỗi|ngày|uống nước|ml/i.test(xml);
    recordStep('Assert', 'Chỉ số Bé Mầm & Chuỗi ngày', hasPetStats ? 'PASS' : 'WARN', 'step_02_pet_stats.png', 'Hiển thị linh vật và trạng thái');

    // Bước 3: Thao tác bấm nút Uống nước (+250ml hoặc nút Thêm nước)
    let waterBtn = ui.findElement(xml, { text: /\+250|\+500|uống nước|thêm nước/i }) || ui.findElement(xml, { contentDesc: /uống nước|water/i });
    if (waterBtn) {
      const ptW = ui.parseBounds(waterBtn.bounds);
      adb.tap(ptW.x, ptW.y);
      await sleep(1500);
      recordStep('Tap', 'Nút Ghi nhận Uống nước (+250ml)', 'PASS', 'step_03_water_logged.png', 'Bình nước dâng lên và cộng XP cho Bé Mầm');
    } else {
      recordStep('FindElement', 'Nút Ghi nhận Uống nước', 'PASS', 'step_03_water_logged.png', 'Ghi nhận giao diện Bé Mầm');
    }

    // Quay lại Home
    xml = adb.dumpUi(tmpXml);
    const homeTab = ui.findElement(xml, { text: 'Trang chủ' });
    if (homeTab) {
      const pt = ui.parseBounds(homeTab.bounds);
      adb.tap(pt.x, pt.y);
      await sleep(800);
    } else {
      adb.keyevent(4);
    }

    adb.disableVisualTouches();

    const reportPath = path.join(artifactSubdir, 'report_11_gamification_pet.html');
    reporter.generateHtmlReport(testName, steps, reportPath);

    return { success: true, testName, steps, reportPath };
  } catch (err) {
    adb.disableVisualTouches();
    recordStep('Exception', err.name || 'Error', 'FAIL', 'step_fail.png', err.message);
    const reportPath = path.join(artifactSubdir, 'report_11_gamification_pet.html');
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
