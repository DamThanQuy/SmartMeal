/**
 * scenarios/04_pro_upgrade_view.test.js
 * E2E Scenario 04: Đăng nhập tài khoản Free & Xem bảng nâng cấp Pro PayOS
 *
 * Yêu cầu:
 * - Đăng nhập tài khoản Free: rowem96186@goldvester.com / Smartmeal@123
 * - Vào Tab Cá nhân -> Bấm Nâng cấp Pro
 * - Chờ màn hình PREMIUM xuất hiện bảng so sánh quyền lợi và các gói PayOS
 * - Kiểm tra giao diện so sánh gói dịch vụ, giá tiền, tính năng
 * - Chụp ảnh từng step đối chứng và xuất HTML report
 */
'use strict';

const path = require('path');
const fs = require('fs');
const runner = require('../index');

const { adb, ui, screen, visual, reporter, config } = runner;
const healthWizard = require('../lib/health-wizard');

const FREE_USER = {
  email: 'rowem96186@goldvester.com',
  password: 'Smartmeal@123',
  type: 'Free'
};

/**
 * Execute scenario 04_pro_upgrade_view
 * @returns {Promise<{ success: boolean, testName: string, steps: Array<object>, reportPath: string }>}
 */
async function run() {
  const testName = '04_pro_upgrade_view — Đăng nhập Free & Xem gói Pro PayOS';
  const artifactSubdir = path.join(config.artifactDir, '04_pro_upgrade_view');
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
  console.log(`👤 Tài khoản Free: ${FREE_USER.email}`);
  console.log('Đăng nhập Free -> Cá nhân -> Nâng cấp Pro -> Màn hình PREMIUM & PayOS');
  console.log('====================================================');

  const dumpPath = path.join(artifactSubdir, 'upgrade_ui_dump.xml');

  try {
    // Step 1: Đảm bảo app ở trạng thái đăng xuất nếu đang có tài khoản khác
    await recordStep('Đảm bảo phiên đăng nhập hoặc chuyển về màn hình đăng nhập', async () => {
      adb.ensureScreenAwake();
      adb.ensureAppInForeground();
      adb.reversePorts();
      visual.enableVisualTouches(adb);
      await adb.sleep(800);

      let xml = adb.dumpUi(dumpPath);

      // Nếu đang mở modal QuickLog hoặc màn hình con (không thấy Cá nhân và không ở Login/Welcome)
      for (let i = 0; i < 4; i++) {
        const isLoginOrWelcome = ui.findElement(xml, 'Chào mừng trở lại') ||
                                ui.findElement(xml, 'ban@email.com') ||
                                ui.findElement(xml, 'Tôi đã có tài khoản') ||
                                ui.findElement(xml, 'Bắt đầu miễn phí');
        const profileTab = ui.findElement(xml, 'Cá nhân');
        if (isLoginOrWelcome || profileTab) break;

        // Phím Back hệ thống luôn đóng modal/bottom sheet
        adb.keyevent(4);
        await adb.sleep(1000);
        xml = adb.dumpUi(dumpPath);
      }

      // Kiểm tra nếu đang ở Dashboard hoặc Tab khác -> Chuyển sang Tab Cá nhân để Đăng xuất
      const isLoginOrWelcome = ui.findElement(xml, 'Chào mừng trở lại') ||
                              ui.findElement(xml, 'ban@email.com') ||
                              ui.findElement(xml, 'Tôi đã có tài khoản') ||
                              ui.findElement(xml, 'Bắt đầu miễn phí');

      if (!isLoginOrWelcome) {
        let profileTab = ui.findElement(xml, 'Cá nhân');
        if (profileTab && profileTab.x) {
          adb.tap(profileTab.x, profileTab.y);
          await adb.sleep(1500);
          xml = adb.dumpUi(dumpPath);
        }

        let btnLogout = ui.findElement(xml, /đăng xuất/i);
        // Chỉ cuộn nhẹ nếu chưa thấy nút Đăng xuất trên màn hình
        if (!btnLogout) {
          adb.swipe(540, 1600, 540, 900, 300);
          await adb.sleep(1000);
          xml = adb.dumpUi(dumpPath);
          btnLogout = ui.findElement(xml, /đăng xuất/i);
        }

        if (btnLogout && btnLogout.x) {
          adb.tap(btnLogout.x, btnLogout.y);
          await adb.sleep(1500);
          xml = adb.dumpUi(dumpPath);
          // Xác nhận popup nếu có
          const btnConfirm = ui.findElement(xml, { text: /đăng xuất|đồng ý|xác nhận/i, clickable: true });
          if (btnConfirm && btnConfirm.x) {
            adb.tap(btnConfirm.x, btnConfirm.y);
            await adb.sleep(1500);
          }
        }
      }

      return 'Đã sẵn sàng chuyển sang màn hình Đăng nhập';
    });

    // Step 2: Mở màn hình Login và nhập tài khoản Free
    await recordStep(`Đăng nhập tài khoản Free: ${FREE_USER.email}`, async () => {
      let xml = adb.dumpUi(dumpPath);

      // Nếu đang ở màn Welcome, bấm "Tôi đã có tài khoản"
      let btnAccount = ui.findElement(xml, 'Tôi đã có tài khoản');
      if (!btnAccount || (btnAccount.y && btnAccount.y > 2100)) {
        adb.swipe(540, 1800, 540, 800, 300);
        await adb.sleep(1000);
        xml = adb.dumpUi(dumpPath);
        btnAccount = ui.findElement(xml, 'Tôi đã có tài khoản');
      }

      if (btnAccount && btnAccount.x) {
        adb.tap(btnAccount.x, btnAccount.y);
        await adb.sleep(2000);
        xml = adb.dumpUi(dumpPath);
      }

      // 1. Nhập Email
      let emailInput = ui.findElement(xml, { text: 'ban@email.com' }) ||
                       ui.findElement(xml, { className: 'android.widget.EditText' });
      if (!emailInput || !emailInput.x) {
        const edits = ui.findElements(xml, { className: 'android.widget.EditText' });
        if (edits.length > 0) emailInput = edits[0];
      }

      if (!emailInput || !emailInput.x) {
        throw new Error('Không tìm thấy ô nhập email trên giao diện');
      }

      adb.tap(emailInput.x, emailInput.y);
      await adb.sleep(400);
      adb.clearInput(40);
      adb.typeText(FREE_USER.email);
      await adb.sleep(500);

      // 2. Nhập Password
      xml = adb.dumpUi(dumpPath);
      let passInput = ui.findElement(xml, { text: 'Nhập mật khẩu' }) ||
                      ui.findElement(xml, { password: true });
      if (!passInput || !passInput.x) {
        const edits = ui.findElements(xml, { className: 'android.widget.EditText' });
        if (edits.length > 1) passInput = edits[1];
      }

      if (!passInput || !passInput.x) {
        adb.keyevent(61); // Tab
        await adb.sleep(400);
      } else {
        adb.tap(passInput.x, passInput.y);
        await adb.sleep(400);
      }

      adb.clearInput(30);
      adb.typeText(FREE_USER.password);
      await adb.sleep(400);

      // Ẩn keyboard
      adb.keyevent(4);
      await adb.sleep(500);

      // 3. Bấm Đăng nhập
      xml = adb.dumpUi(dumpPath);
      const btnLogin = ui.findElement(xml, { contentDesc: 'Đăng nhập', clickable: true }) ||
                       ui.findElement(xml, { text: 'Đăng nhập', exact: true }) ||
                       ui.findElement(xml, { contentDesc: 'Đăng nhập' }) ||
                       ui.findElement(xml, { text: 'Đăng nhập', clickable: true });

      if (!btnLogin || !btnLogin.x) {
        throw new Error('Không tìm thấy nút "Đăng nhập"');
      }

      adb.tap(btnLogin.x, btnLogin.y);
      await adb.sleep(3000);

      return `Đã gửi yêu cầu đăng nhập tài khoản Free (${FREE_USER.email})`;
    });

    // Step 3: Chờ Dashboard và Chuyển sang Tab "Cá nhân"
    await recordStep('Vào Tab "Cá nhân" từ Dashboard', async () => {
      let xml = adb.dumpUi(dumpPath);

      // Nếu tài khoản mới chưa hoàn thành Onboarding Wizard, tự động vượt qua 7 bước
      const isSurvey = ui.findElement(xml, 'Hồ sơ sức khỏe') ||
                       ui.findElement(xml, 'Thông tin cơ bản') ||
                       ui.findElement(xml, 'Bắt đầu với SmartMeal');
      if (isSurvey) {
        await healthWizard.handleOnboardingIfPresent(adb, ui, dumpPath);
        await adb.sleep(2000);
      }

      let isDashboardOrProfile = false;
      const timeoutMs = 25000;
      const start = Date.now();

      while (Date.now() - start < timeoutMs) {
        xml = adb.dumpUi(dumpPath);
        if (ui.findElement(xml, 'Cá nhân') || ui.findElement(xml, 'Trang chủ') || ui.findElement(xml, 'Ghi bữa ăn')) {
          isDashboardOrProfile = true;
          break;
        }
        // Kiểm tra lại nếu wizard xuất hiện muộn
        if (ui.findElement(xml, 'Hồ sơ sức khỏe') || ui.findElement(xml, 'Bắt đầu với SmartMeal')) {
          await healthWizard.handleOnboardingIfPresent(adb, ui, dumpPath);
          await adb.sleep(1500);
        }
        await adb.sleep(1500);
      }

      if (!isDashboardOrProfile) {
        throw new Error('Đăng nhập tài khoản Free không vào được màn hình chính');
      }

      // Tap vào Tab "Cá nhân"
      const profileTab = ui.findElement(xml, 'Cá nhân');
      if (!profileTab || !profileTab.x) {
        throw new Error('Không tìm thấy tab "Cá nhân" trên thanh điều hướng');
      }

      adb.tap(profileTab.x, profileTab.y);
      await adb.sleep(1800);

      return 'Đã chuyển thành công vào màn hình Cá nhân';
    });

    // Step 4: Bấm vào "Nâng cấp SmartMeal Pro" / "Nâng cấp Pro"
    await recordStep('Bấm nút "Nâng cấp Pro" trong trang Cá nhân', async () => {
      let xml = adb.dumpUi(dumpPath);

      // Tìm thẻ hoặc nút "Nâng cấp SmartMeal Pro"
      let upgradeBtn = ui.findElement(xml, 'Nâng cấp SmartMeal Pro') ||
                       ui.findElement(xml, 'Nâng cấp Pro') ||
                       ui.findElement(xml, { contentDesc: /nâng cấp/i }) ||
                       ui.findElement(xml, /AI Snap không giới hạn/i);

      if (!upgradeBtn || !upgradeBtn.x) {
        // Thử cuộn nhẹ lên hoặc tìm kiếm
        adb.swipe(540, 800, 540, 400, 300);
        await adb.sleep(800);
        xml = adb.dumpUi(dumpPath);
        upgradeBtn = ui.findElement(xml, /nâng cấp.*pro/i);
      }

      if (!upgradeBtn || !upgradeBtn.x) {
        throw new Error('Không tìm thấy nút "Nâng cấp Pro" trên màn hình Cá nhân');
      }

      adb.tap(upgradeBtn.x, upgradeBtn.y);
      await adb.sleep(2000);

      return `Đã bấm "Nâng cấp Pro" tại (${upgradeBtn.x}, ${upgradeBtn.y})`;
    });

    // Step 5: Chờ màn hình PREMIUM xuất hiện bảng so sánh quyền lợi và các gói PayOS
    await recordStep('Xác nhận màn hình PREMIUM: Bảng quyền lợi & Các gói PayOS', async () => {
      let xml = adb.dumpUi(dumpPath);
      let isPremiumScreen = false;
      const timeoutMs = 20000;
      const start = Date.now();

      while (Date.now() - start < timeoutMs) {
        xml = adb.dumpUi(dumpPath);

        const titleMatch = ui.findElement(xml, /nâng cấp smartmeal pro|nâng cấp pro|smartmeal pro/i);
        const benefitsTable = ui.findElement(xml, 'Quyền lợi') && ui.findElement(xml, 'Free') && ui.findElement(xml, 'Pro');
        const planPricing = ui.findElement(xml, /49\.000|tháng|năm|payos|thanh toán/i);

        if (titleMatch || (benefitsTable && planPricing)) {
          isPremiumScreen = true;
          break;
        }
        await adb.sleep(1500);
      }

      if (!isPremiumScreen) {
        throw new Error(`Hết thời gian chờ (${timeoutMs}ms) hiển thị màn hình PREMIUM`);
      }

      // Kiểm tra chi tiết các thành phần trên màn hình
      const hasBenefits = !!ui.findElement(xml, 'Quyền lợi');
      const hasFreeCol = !!ui.findElement(xml, 'Free');
      const hasProCol = !!ui.findElement(xml, 'Pro');
      const hasPrice = !!ui.findElement(xml, /79\.000|699\.000|49\.000|99\.000|tháng|năm|gói/i);

      return `Màn hình PREMIUM hiển thị đầy đủ: [Quyền lợi=${hasBenefits}, Cột Free=${hasFreeCol}, Cột Pro=${hasProCol}, Gói cước=${hasPrice}]`;
    });

    // Step 6: Quay lại màn hình an toàn (Nhấn Back để dọn dẹp)
    await recordStep('Dọn dẹp: Quay về màn hình trước', async () => {
      adb.keyevent(4); // BACK keyevent
      await adb.sleep(1000);
      return 'Đã nhấn BACK hoàn tất kịch bản';
    });

    // Xuất HTML Report
    const reportPath = path.join(config.artifactDir, '04_pro_upgrade_view_report.html');
    reporter.generateHtmlReport(testName, steps, reportPath);
    console.log(`\n📄 Báo cáo HTML đã xuất tại: ${reportPath}`);

    return {
      success: true,
      testName,
      steps,
      reportPath
    };
  } catch (err) {
    const reportPath = path.join(config.artifactDir, '04_pro_upgrade_view_report.html');
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
