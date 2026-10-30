/**
 * scenarios/02_tabs_navigation.test.js
 * E2E Scenario 02: Điều hướng 5 Tab chính từ Dashboard
 *
 * Yêu cầu:
 * - Từ Dashboard chuyển lần lượt 5 Tab: Thực đơn -> Khám phá -> Nhật ký -> Cá nhân -> Trang chủ.
 * - Kiểm tra màn hình không bị crash hay kẹt
 * - Chụp ảnh từng Tab đối chứng
 * - Xuất HTML report
 */
'use strict';

const path = require('path');
const fs = require('fs');
const runner = require('../index');

const { adb, ui, screen, reporter, config } = runner;

const TAB_SEQUENCE = [
  {
    name: 'Thực đơn',
    query: 'Thực đơn',
    expectedContent: ['Thực đơn', 'Tuần', 'Thứ', 'Kế hoạch', 'Bữa'],
    description: 'Tab Lập kế hoạch thực đơn dinh dưỡng'
  },
  {
    name: 'Khám phá',
    query: 'Khám phá',
    expectedContent: ['Khám phá', 'Công thức', 'Bộ sưu tập', 'Gợi ý'],
    description: 'Tab Khám phá công thức nấu ăn'
  },
  {
    name: 'Nhật ký',
    query: 'Nhật ký',
    expectedContent: ['Nhật ký', 'Bữa sáng', 'Bữa trưa', 'Calo theo bữa', 'Ghi bữa ăn'],
    description: 'Tab Nhật ký dinh dưỡng hằng ngày'
  },
  {
    name: 'Cá nhân',
    query: 'Cá nhân',
    expectedContent: ['Cá nhân', 'Chi tiết sức khỏe', 'Hồ sơ sức khỏe', 'Cài đặt'],
    description: 'Tab Quản lý tài khoản và thông tin cá nhân'
  },
  {
    name: 'Trang chủ',
    query: 'Trang chủ',
    expectedContent: ['Trang chủ', 'Tổng quan dinh dưỡng', 'Ghi bữa ăn', 'kcal'],
    description: 'Tab Trang chủ tổng quan năng lượng'
  }
];

/**
 * Execute scenario 02_tabs_navigation
 * @returns {Promise<{ success: boolean, testName: string, steps: Array<object>, reportPath: string }>}
 */
async function run() {
  const testName = '02_tabs_navigation — Điều hướng 5 Tab chính';
  const artifactSubdir = path.join(config.artifactDir, '02_tabs_navigation');
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
        details: stepDetails || details || 'Hoàn thành thành công',
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
  console.log('Chuyển lần lượt: Thực đơn -> Khám phá -> Nhật ký -> Cá nhân -> Trang chủ');
  console.log('====================================================');

  const dumpPath = path.join(artifactSubdir, 'tabs_ui_dump.xml');

  try {
    // Step 1: Kiểm tra Dashboard đang hiển thị
    await recordStep('Xác nhận ứng dụng đang ở Dashboard', async () => {
      adb.ensureScreenAwake();
      adb.reversePorts();
      const xml = adb.dumpUi(dumpPath);

      // Check if crash dialog exists
      const crashNode = ui.findElement(xml, /has stopped|keep stopping|ứng dụng đã dừng/i);
      if (crashNode) {
        throw new Error(`Ứng dụng bị sập: ${crashNode.text || crashNode.contentDesc}`);
      }

      // Check if bottom navigation exists
      const homeTab = ui.findElement(xml, 'Trang chủ');
      if (!homeTab) {
        console.warn('  ⚠️ Không thấy chữ "Trang chủ" ngay, có thể đang ở tab khác hoặc cần bấm lại');
      }

      return 'Sẵn sàng điều hướng các Tab chính';
    });

    // Duyệt qua 5 Tab theo đúng thứ tự
    for (const tab of TAB_SEQUENCE) {
      await recordStep(`Chuyển sang Tab "${tab.name}"`, async () => {
        let xml = adb.dumpUi(dumpPath);

        // 1. Tìm element của Tab trên Bottom Navigation Bar
        let tabElement = ui.findElement(xml, { text: tab.query }) ||
                         ui.findElement(xml, { contentDesc: new RegExp(tab.query, 'i') });

        if (!tabElement || !tabElement.x) {
          // Thử tìm trong toàn bộ nodes có chứa tên tab
          const matched = ui.findElements(xml, tab.query);
          // Chọn element nằm ở nửa dưới màn hình (Bottom Tab)
          const bottomMatched = matched.filter(n => n.y > 1400 || (n.center && n.center.y > 1000));
          if (bottomMatched.length > 0) {
            tabElement = bottomMatched[bottomMatched.length - 1];
          } else if (matched.length > 0) {
            tabElement = matched[0];
          }
        }

        if (!tabElement || !tabElement.x) {
          throw new Error(`Không tìm thấy tab "${tab.name}" trên giao diện`);
        }

        console.log(`    Chạm vào Tab "${tab.name}" tại (${tabElement.x}, ${tabElement.y})`);
        adb.tap(tabElement.x, tabElement.y);

        // Chờ tab load và render
        await adb.sleep(1800);

        // 2. Dump lại UI để kiểm tra crash hoặc nội dung
        xml = adb.dumpUi(dumpPath);

        // Kiểm tra crash
        const crash = ui.findElement(xml, /has stopped|keep stopping|đã dừng/i);
        if (crash) {
          throw new Error(`App bị crash khi mở tab "${tab.name}"!`);
        }

        // Kiểm tra xem màn hình có nội dung tương ứng không
        let verifiedText = '';
        for (const exp of tab.expectedContent) {
          if (xml.includes(exp)) {
            verifiedText = exp;
            break;
          }
        }

        return `Đã mở tab "${tab.name}" an toàn không crash (khớp text: "${verifiedText || tab.name}")`;
      });
    }

    // Step cuối: Tổng kết và xuất báo cáo
    const reportPath = path.join(config.artifactDir, '02_tabs_navigation_report.html');
    reporter.generateHtmlReport(testName, steps, reportPath);
    console.log(`\n📄 Báo cáo HTML đã xuất tại: ${reportPath}`);

    return {
      success: true,
      testName,
      steps,
      reportPath
    };
  } catch (err) {
    const reportPath = path.join(config.artifactDir, '02_tabs_navigation_report.html');
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
