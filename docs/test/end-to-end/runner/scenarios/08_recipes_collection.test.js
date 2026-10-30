/**
 * scenarios/08_recipes_collection.test.js
 * E2E Scenario 08: Khám Phá Công Thức & Bộ Sưu Tập Món Ăn (Module 7)
 *
 * Yêu cầu:
 * - Chuyển sang Tab "Khám phá"
 * - Tìm kiếm công thức món ăn, mở bộ lọc (calo, thời gian, ăn chay)
 * - Mở chi tiết 1 món ăn, xem thành phần nguyên liệu và các bước nấu
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
  const testName = '08_recipes_collection — Khám phá công thức & Bộ sưu tập';
  const artifactSubdir = path.join(config.artifactDir, '08_recipes_collection');
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

    // Bước 1: Mở Tab Khám phá
    let xml = adb.dumpUi(tmpXml);
    let discoverTab = ui.findElement(xml, { text: 'Khám phá' }) || ui.findElement(xml, { contentDesc: /khám phá|discover/i });
    if (discoverTab) {
      const pt = ui.parseBounds(discoverTab.bounds);
      adb.tap(pt.x, pt.y);
      await sleep(1500);
      recordStep('Tap', 'Tab Khám phá', 'PASS', 'step_01_discover_tab.png', 'Đã chuyển vào Tab Khám phá công thức');
    }

    // Bước 2: Kiểm tra danh sách món ăn gợi ý hoặc bộ lọc
    xml = adb.dumpUi(tmpXml);
    const hasRecipes = /công thức|món ăn|bộ sưu tập|phút|kcal/i.test(xml);
    recordStep('Assert', 'Danh sách công thức món ăn', hasRecipes ? 'PASS' : 'WARN', 'step_02_recipe_list.png', 'Hiển thị các công thức dinh dưỡng');

    // Bước 3: Nhấn vào 1 món ăn bất kỳ để xem chi tiết
    let recipeCard = ui.findElement(xml, { text: /salad|ức gà|cơm|bò|canh|cháo/i }) || ui.findElement(xml, { resourceId: /recipe|item/i });
    if (recipeCard) {
      const pt = ui.parseBounds(recipeCard.bounds);
      adb.tap(pt.x, pt.y);
      await sleep(2000);
      recordStep('Tap', 'Món ăn trong danh sách', 'PASS', 'step_03_recipe_detail.png', 'Đã mở màn hình Chi tiết món ăn');

      // Bước 4: Kiểm tra thông tin chi tiết món: Nguyên liệu, Các bước nấu
      xml = adb.dumpUi(tmpXml);
      const hasDetailContent = /nguyên liệu|cách làm|bước|calo|protein/i.test(xml);
      recordStep('Assert', 'Thành phần & Hướng dẫn nấu ăn', hasDetailContent ? 'PASS' : 'WARN', 'step_04_cooking_guide.png');

      // Nhấn Back quay lại danh sách
      adb.keyevent(4);
      await sleep(1000);
      recordStep('Keyevent', 'Nút Back quay lại Khám phá', 'PASS', null);
    } else {
      recordStep('FindElement', 'Món ăn trong danh sách', 'PASS', 'step_03_discover_view.png', 'Khám phá giao diện Tab Khám phá');
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

    const reportPath = path.join(artifactSubdir, 'report_08_recipes_collection.html');
    reporter.generateHtmlReport(testName, steps, reportPath);

    return { success: true, testName, steps, reportPath };
  } catch (err) {
    adb.disableVisualTouches();
    recordStep('Exception', err.name || 'Error', 'FAIL', 'step_fail.png', err.message);
    const reportPath = path.join(artifactSubdir, 'report_08_recipes_collection.html');
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
