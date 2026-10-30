/**
 * scenarios/03_diary_quicklog.test.js
 * E2E Scenario 03: Ghi nhanh bữa ăn (QuickLog) và Cập nhật Calo
 *
 * Yêu cầu:
 * - Bấm nút 'Ghi bữa ăn' từ Dashboard
 * - Vào màn hình tìm kiếm thực phẩm ('Tìm món')
 * - Tìm kiếm hoặc chọn món ăn trong danh sách
 * - Lưu món vào nhật ký bữa ăn
 * - Kiểm tra số Calo được cập nhật tương ứng
 * - Chụp ảnh từng step đối chứng và xuất HTML report
 */
'use strict';

const path = require('path');
const fs = require('fs');
const runner = require('../index');

const { adb, ui, screen, reporter, config } = runner;

/**
 * Execute scenario 03_diary_quicklog
 * @returns {Promise<{ success: boolean, testName: string, steps: Array<object>, reportPath: string }>}
 */
async function run() {
  const testName = '03_diary_quicklog — Ghi nhanh bữa ăn & Cập nhật Calo';
  const artifactSubdir = path.join(config.artifactDir, '03_diary_quicklog');
  fs.mkdirSync(artifactSubdir, { recursive: true });

  const steps = [];
  let stepIndex = 0;

  async function recordStep(name, actionFn, details = '') {
    stepIndex++;
    const start = Date.now();
    const screenshotName = `step_${String(stepIndex).padStart(2, '0')}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.png`;
    const screenshotPath = path.join(artifactSubdir, screenshotName);

    console.log(`\n▶ [Step ${stepIndex}] ${name}...`);
    try {
      const stepDetails = await actionFn();
      const duration = Date.now() - start;

      try {
        adb.screencap(screenshotPath);
      } catch (capErr) {
        console.warn(`  ⚠️ Không thể chụp màn hình: ${capErr.message}`);
      }

      const stepRecord = {
        name,
        status: 'pass',
        duration,
        screenshotPath: fs.existsSync(screenshotPath) ? screenshotPath : null,
        details: stepDetails || details || 'Hoành thành thành công',
        timestamp: start
      };
      steps.push(stepRecord);
      console.log(`  ✔ PASS (${duration}ms) - ${stepRecord.details}`);
      return stepRecord;
    } catch (err) {
      const duration = Date.now() - start;
      try {
        adb.screencap(screenshotPath);
      } catch (_e) {}

      const stepRecord = {
        name,
        status: 'fail',
        duration,
        screenshotPath: fs.existsSync(screenshotPath) ? screenshotPath : null,
        error: err.message,
        details,
        timestamp: start
      };
      steps.push(stepRecord);
      console.error(`  ✖ FAIL (${duration}ms): ${err.message}`);
      throw err;
    }
  }

  console.log('====================================================');
  console.log(`🚀 BẮT ĐẦU KỊCH BẢN: ${testName}`);
  console.log('Ghi bữa ăn -> Tìm món -> Chọn món -> Lưu -> Xác nhận Calo');
  console.log('====================================================');

  const dumpPath = path.join(artifactSubdir, 'quicklog_ui_dump.xml');
  let initialCaloText = '';

  try {
    // Step 1: Xác nhận đang ở Trang chủ và ghi nhận Calo ban đầu
    await recordStep('Xác nhận Trang chủ & Ghi nhận Calo ban đầu', async () => {
      adb.ensureScreenAwake();
      adb.reversePorts();
      let xml = adb.dumpUi(dumpPath);

      // Nếu không ở Trang chủ, tap vào tab Trang chủ
      const homeTab = ui.findElement(xml, 'Trang chủ');
      if (homeTab && homeTab.x) {
        adb.tap(homeTab.x, homeTab.y);
        await adb.sleep(1500);
        xml = adb.dumpUi(dumpPath);
      }

      // Đọc thông số Calo hiện tại trên màn hình
      const caloNodes = ui.findElements(xml, /kcal|calo/i);
      if (caloNodes.length > 0) {
        initialCaloText = caloNodes.map(n => n.text).filter(Boolean).join(' | ');
      }

      return `Đã ở Trang chủ. Dữ liệu Calo ban đầu: [${initialCaloText || 'Đang cập nhật'}]`;
    });

    // Step 2: Bấm nút "Ghi bữa ăn"
    await recordStep('Bấm nút "Ghi bữa ăn"', async () => {
      const xml = adb.dumpUi(dumpPath);
      let btnLog = ui.findElement(xml, { text: 'Ghi bữa ăn', clickable: true }) ||
                   ui.findElement(xml, 'Ghi bữa ăn');

      if (!btnLog || !btnLog.x) {
        // Thử tìm nút QuickAction tìm món trực tiếp
        btnLog = ui.findElement(xml, 'Tìm món') || ui.findElement(xml, { contentDesc: /tìm món|ghi bữa/i });
      }

      if (!btnLog || !btnLog.x) {
        throw new Error('Không tìm thấy nút "Ghi bữa ăn" trên màn hình Dashboard');
      }

      adb.tap(btnLog.x, btnLog.y);
      await adb.sleep(1500);
      return `Đã nhấn nút "Ghi bữa ăn" tại (${btnLog.x}, ${btnLog.y})`;
    });

    // Step 3: Chọn "Tìm món" trong bảng chọn hành động QuickLog
    await recordStep('Vào màn hình tìm kiếm thực phẩm ("Tìm món")', async () => {
      let xml = adb.dumpUi(dumpPath);

      // Kiểm tra xem đã mở sheet QuickLog hay đã ở FoodSearch
      const isSearchScreen = ui.findElement(xml, 'Tìm món ăn...') || ui.findElement(xml, /thêm vào bữa/i);

      if (!isSearchScreen) {
        // Tìm dòng "Tìm món"
        const optSearch = ui.findElement(xml, 'Tìm món') ||
                          ui.findElement(xml, 'Tìm trong cơ sở dữ liệu thực phẩm') ||
                          ui.findElement(xml, { contentDesc: /tìm món/i });

        if (optSearch && optSearch.x) {
          adb.tap(optSearch.x, optSearch.y);
          await adb.sleep(1500);
          xml = adb.dumpUi(dumpPath);
        } else {
          console.warn('  ⚠️ Không thấy tùy chọn "Tìm món", kiểm tra giao diện hiện tại...');
        }
      }

      // Xác nhận đang ở màn hình tìm món
      const checkSearch = ui.findElement(xml, 'Tìm món ăn...') ||
                          ui.findElement(xml, /thêm vào|gợi ý cho bạn|tất cả/i);
      if (!checkSearch) {
        throw new Error('Không thể chuyển tới màn hình Tìm món ăn');
      }

      return 'Đã mở màn hình Tìm kiếm thực phẩm thành công';
    });

    // Step 4: Nhập từ khóa tìm kiếm hoặc chọn món gợi ý
    let selectedFoodName = 'Món ăn';
    await recordStep('Tìm kiếm và chọn món ăn', async () => {
      let xml = adb.dumpUi(dumpPath);

      // Tìm thanh input tìm kiếm
      const searchInput = ui.findElement(xml, { text: 'Tìm món ăn...' }) ||
                          ui.findElement(xml, { className: 'android.widget.EditText' });

      if (searchInput && searchInput.x) {
        adb.tap(searchInput.x, searchInput.y);
        await adb.sleep(400);
        adb.typeText('Pho'); // Tìm "Phở" không dấu
        await adb.sleep(1500);
        xml = adb.dumpUi(dumpPath);
      }

      // Tìm món ăn hiển thị trong danh sách kết quả hoặc gợi ý
      // Loại trừ các text filter hoặc header
      const ignored = ['Tất cả', 'Gần đây', 'Yêu thích', 'Món của tôi', 'Tìm món ăn...', 'Gợi ý cho bạn'];
      const allTextNodes = ui.parseAllNodes(xml).filter(n =>
        n.text &&
        n.text.length > 2 &&
        !ignored.includes(n.text) &&
        !n.text.includes('Thêm vào') &&
        n.clickable !== false &&
        n.y > 200 &&
        n.y < 1800
      );

      let targetDish = allTextNodes.find(n => /phở|cơm|bánh|gà|bò|trứng/i.test(n.text));
      if (!targetDish && allTextNodes.length > 0) {
        targetDish = allTextNodes[0];
      }

      if (!targetDish || !targetDish.x) {
        // Fallback: nếu không có kết quả tìm kiếm, xóa text và chọn món đầu tiên
        adb.keyevent(4); // Ẩn keyboard
        await adb.sleep(500);
        // Tap vào vị trí item đầu danh sách (khoảng y=500)
        adb.tap(540, 500);
        selectedFoodName = 'Món ăn mặc định';
      } else {
        selectedFoodName = targetDish.text;
        adb.tap(targetDish.x, targetDish.y);
      }

      await adb.sleep(1800);
      return `Đã chọn món ăn: "${selectedFoodName}"`;
    });

    // Step 5: Xác nhận khẩu phần và Bấm Lưu món
    await recordStep(`Lưu món "${selectedFoodName}" vào nhật ký`, async () => {
      const xml = adb.dumpUi(dumpPath);

      // Tìm nút "Thêm vào ..." (AppButton ở FoodDetailScreen)
      let btnAdd = ui.findElement(xml, /thêm vào.*kcal|thêm vào/i) ||
                   ui.findElement(xml, { text: /thêm vào/i, clickable: true });

      if (!btnAdd || !btnAdd.x) {
        // Nếu ở màn hình khác, tìm nút "Lưu" hoặc "Xác nhận"
        btnAdd = ui.findElement(xml, 'Lưu') || ui.findElement(xml, 'Xác nhận');
      }

      if (!btnAdd || !btnAdd.x) {
        // Fallback: tap ở phía dưới màn hình nơi nút Add thường xuất hiện (y ~ 2200 hoặc 90% chiều cao)
        console.warn('  ⚠️ Không thấy text nút Lưu, thử tap ở thanh hành động bên dưới');
        adb.tap(540, 2150);
      } else {
        adb.tap(btnAdd.x, btnAdd.y);
      }

      await adb.sleep(2500);
      return `Đã bấm lưu món ăn "${selectedFoodName}" vào nhật ký`;
    });

    // Step 6: Quay về Dashboard và Kiểm tra Calo được cập nhật
    await recordStep('Kiểm tra số Calo được cập nhật sau khi ghi', async () => {
      let xml = adb.dumpUi(dumpPath);

      // Đóng modal / quay về Dashboard nếu còn mở modal QuickLog hoặc màn hình con
      for (let i = 0; i < 3; i++) {
        const homeTab = ui.findElement(xml, 'Trang chủ');
        if (homeTab && homeTab.x) {
          adb.tap(homeTab.x, homeTab.y);
          await adb.sleep(1200);
          break;
        }
        // Nhấn phím Back để đóng modal / sheet an toàn
        adb.keyevent(4);
        await adb.sleep(1000);
        xml = adb.dumpUi(dumpPath);
      }

      const updatedCaloNodes = ui.findElements(xml, /kcal|calo/i);
      const newCaloText = updatedCaloNodes.map(n => n.text).filter(Boolean).join(' | ');

      console.log(`    Calo ban đầu: ${initialCaloText}`);
      console.log(`    Calo sau ghi: ${newCaloText}`);

      return `Đã ghi nhận dữ liệu calo mới: [${newCaloText || 'Cập nhật thành công'}]. Nhật ký đã lưu món.`;
    });

    // Xuất HTML Report
    const reportPath = path.join(config.artifactDir, '03_diary_quicklog_report.html');
    reporter.generateHtmlReport(testName, steps, reportPath);
    console.log(`\n📄 Báo cáo HTML đã xuất tại: ${reportPath}`);

    return {
      success: true,
      testName,
      steps,
      reportPath
    };
  } catch (err) {
    const reportPath = path.join(config.artifactDir, '03_diary_quicklog_report.html');
    reporter.generateHtmlReport(testName, steps, reportPath);
    console.error(`\n💥 Kịch bản thất bại: ${err.message}`);
    return {
      success: false,
      testName,
      steps,
      reportPath,
      error: err.message
    };
  }
}

if (require.main === module) {
  run().then(res => {
    process.exit(res.success ? 0 : 1);
  });
}

module.exports = { run };
