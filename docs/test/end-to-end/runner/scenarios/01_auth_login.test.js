/**
 * scenarios/01_auth_login.test.js
 * E2E Scenario 01: Đăng nhập tài khoản Pro
 *
 * Yêu cầu:
 * - Đăng nhập tài khoản Pro: smartmealuser@gmail.com / Smartmeal@123
 * - Bật visual touches trên thiết bị Android
 * - Chờ màn hình LOGIN (tự động xử lý nếu đang ở Welcome)
 * - Nhập email, nhập mật khẩu, bấm Đăng nhập
 * - Chờ màn hình DASHBOARD
 * - Chụp ảnh từng bước (screenshot) đối chứng
 * - Xuất HTML report chi tiết
 */
'use strict';

const path = require('path');
const fs = require('fs');
const runner = require('../index');

const { adb, ui, screen, visual, reporter, config } = runner;

const CREDENTIALS = {
  email: 'smartmealuser@gmail.com',
  password: 'Smartmeal@123',
  type: 'Pro'
};

/**
 * Execute scenario 01_auth_login
 * @param {object} [options]
 * @returns {Promise<{ success: boolean, testName: string, steps: Array<object>, reportPath: string }>}
 */
async function run(options = {}) {
  const testName = '01_auth_login — Đăng nhập tài khoản Pro';
  const timestamp = Date.now();
  const artifactSubdir = path.join(config.artifactDir, '01_auth_login');
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

      // Chụp ảnh màn hình đối chứng
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
  console.log(`👤 Tài khoản: ${CREDENTIALS.email} (${CREDENTIALS.type})`);
  console.log('====================================================');

  try {
    // Step 1: Bật visual touches
    await recordStep('Bật visual touches trên Android', async () => {
      visual.enableVisualTouches(adb);
      adb.ensureScreenAwake();
      return 'Đã kích hoạt show_touches=1 và pointer_location=1';
    });

    // Step 2: Đảm bảo Reverse Port & Kiểm tra màn hình hiện tại
    let currentXml = '';
    const dumpPath = path.join(artifactSubdir, 'initial_dump.xml');
    await recordStep('Kiểm tra màn hình hiện tại & Kết nối', async () => {
      adb.reversePorts();
      currentXml = adb.dumpUi(dumpPath);

      // Nếu có React Native Dev Menu đang mở, đóng nó trước
      if (ui.findElement(currentXml, 'React Native Dev Menu')) {
        adb.keyevent(4);
        await adb.sleep(1000);
        currentXml = adb.dumpUi(dumpPath);
      }

      let detected = screen.getCurrentScreen(currentXml) || 'UNKNOWN';

      // Nếu đang ở Dashboard, Profile hoặc đã đăng nhập, thực hiện đăng xuất để test luồng Đăng nhập từ đầu
      if (detected === 'DASHBOARD' || detected === 'PROFILE' || ui.findElement(currentXml, 'Trang chủ') || ui.findElement(currentXml, 'Tổng quan dinh dưỡng') || ui.findElement(currentXml, 'Đăng xuất') || ui.findElement(currentXml, 'Gói Free') || ui.findElement(currentXml, 'Cá nhân')) {
        console.log('  ℹ Đang ở phiên đăng nhập cũ -> Đăng xuất để kiểm thử trọn vẹn luồng đăng nhập');
        // Bấm tab Cá nhân nếu chưa ở trang Cá nhân
        let btnLogout = ui.findElement(currentXml, /đăng xuất/i);
        if (!btnLogout) {
          const tabProfile = ui.findElement(currentXml, 'Cá nhân');
          if (tabProfile && tabProfile.x) {
            adb.tap(tabProfile.x, tabProfile.y);
            await adb.sleep(1200);
            currentXml = adb.dumpUi(dumpPath);
            btnLogout = ui.findElement(currentXml, /đăng xuất/i);
          }
        }

        // Nếu vẫn chưa thấy nút Đăng xuất, cuộn nhẹ
        if (!btnLogout) {
          adb.swipe(540, 1600, 540, 900, 300);
          await adb.sleep(1000);
          currentXml = adb.dumpUi(dumpPath);
          btnLogout = ui.findElement(currentXml, /đăng xuất/i);
        }

        if (btnLogout && btnLogout.x) {
          adb.tap(btnLogout.x, btnLogout.y);
          await adb.sleep(2000);
          currentXml = adb.dumpUi(dumpPath);
        }
        detected = screen.getCurrentScreen(currentXml) || 'UNKNOWN';
      }

      const isWelcome = detected === 'WELCOME' || ui.findElement(currentXml, 'Tôi đã có tài khoản') || ui.findElement(currentXml, 'Bắt đầu miễn phí');
      const isLogin = detected === 'LOGIN' || ui.findElement(currentXml, 'Chào mừng trở lại') || ui.findElement(currentXml, { text: 'Đăng nhập', clickable: true });

      return `Màn hình phát hiện: ${detected} (isWelcome=${!!isWelcome}, isLogin=${!!isLogin})`;
    });

    // Step 3: Nếu đang ở Welcome screen, bấm "Tôi đã có tài khoản"
    await recordStep('Chờ và chuyển tới màn hình LOGIN', async () => {
      currentXml = adb.dumpUi(dumpPath);
      const isLogin = ui.findElement(currentXml, 'Chào mừng trở lại') ||
                      ui.findElement(currentXml, 'ban@email.com') ||
                      ui.findElement(currentXml, { contentDesc: 'Đăng nhập', clickable: true });

      if (!isLogin) {
        // Tìm nút "Tôi đã có tài khoản"
        let btnAccount = ui.findElement(currentXml, 'Tôi đã có tài khoản');
        
        // Nếu chưa thấy hoặc nằm quá sát đáy (y > 2100 - dễ chạm nhầm phím Home hệ thống), cuộn lên
        if (!btnAccount || (btnAccount.y && btnAccount.y > 2100)) {
          adb.swipe(540, 1800, 540, 800, 300);
          await adb.sleep(1200);
          currentXml = adb.dumpUi(dumpPath);
          btnAccount = ui.findElement(currentXml, 'Tôi đã có tài khoản');
        }

        if (btnAccount && btnAccount.x && btnAccount.y) {
          console.log(`    Chạm nút "Tôi đã có tài khoản" tại (${btnAccount.x}, ${btnAccount.y})`);
          adb.tap(btnAccount.x, btnAccount.y);
          await adb.sleep(2000);
          currentXml = adb.dumpUi(dumpPath);
        }
      }

      // Xác nhận đang ở LOGIN screen
      const loginCheck = ui.findElement(currentXml, 'Chào mừng trở lại') ||
                         ui.findElement(currentXml, 'ban@email.com') ||
                         ui.findElement(currentXml, 'Nhập mật khẩu');
      if (!loginCheck) {
        console.warn('  ⚠️ Chưa thấy rõ text Login, nhưng sẽ tiếp tục tìm kiếm ô nhập liệu');
      }
      return 'Màn hình Login đã sẵn sàng để nhập thông tin';
    });

    // Step 4: Nhập Email
    await recordStep(`Nhập email: ${CREDENTIALS.email}`, async () => {
      currentXml = adb.dumpUi(dumpPath);
      // Tìm ô email theo text placeholder hoặc class EditText
      let emailInput = ui.findElement(currentXml, { text: 'ban@email.com' }) ||
                       ui.findElement(currentXml, { resourceId: /email/i }) ||
                       ui.findElement(currentXml, { className: 'android.widget.EditText' });

      if (!emailInput || !emailInput.x) {
        const allEditTexts = ui.findElements(currentXml, { className: 'android.widget.EditText' });
        if (allEditTexts.length > 0) {
          emailInput = allEditTexts[0];
        }
      }

      if (!emailInput || !emailInput.x) {
        throw new Error('Không tìm thấy trường nhập Email trên giao diện');
      }

      // Tap vào ô email
      adb.tap(emailInput.x, emailInput.y);
      await adb.sleep(500);

      // Xóa nội dung cũ nếu có và nhập email
      adb.clearInput(35);
      adb.typeText(CREDENTIALS.email);
      await adb.sleep(500);

      return `Đã điền email "${CREDENTIALS.email}" tại tọa độ (${emailInput.x}, ${emailInput.y})`;
    });

    // Step 5: Nhập Mật khẩu
    await recordStep('Nhập mật khẩu tài khoản Pro', async () => {
      currentXml = adb.dumpUi(dumpPath);
      // Tìm ô mật khẩu (thường là EditText thứ 2 hoặc text 'Nhập mật khẩu' hoặc password=true)
      let passInput = ui.findElement(currentXml, { text: 'Nhập mật khẩu' }) ||
                      ui.findElement(currentXml, { password: true }) ||
                      ui.findElement(currentXml, { resourceId: /password/i });

      if (!passInput || !passInput.x) {
        const allEditTexts = ui.findElements(currentXml, { className: 'android.widget.EditText' });
        if (allEditTexts.length > 1) {
          passInput = allEditTexts[1];
        }
      }

      if (!passInput || !passInput.x) {
        // Fallback: bấm Tab (keyevent 61) từ ô email
        adb.keyevent(61);
        await adb.sleep(500);
      } else {
        adb.tap(passInput.x, passInput.y);
        await adb.sleep(500);
      }

      adb.clearInput(30);
      adb.typeText(CREDENTIALS.password);
      await adb.sleep(500);

      // Ẩn bàn phím ảo nếu cần (BACK keyevent 4)
      adb.keyevent(4);
      await adb.sleep(500);

      return 'Đã điền mật khẩu thành công và đóng bàn phím ảo';
    });

    // Step 6: Bấm nút "Đăng nhập"
    await recordStep('Bấm nút "Đăng nhập"', async () => {
      currentXml = adb.dumpUi(dumpPath);
      // Tìm chính xác nút Đăng nhập theo contentDesc hoặc exact text để không bị nhầm với phụ đề
      const btnLogin = ui.findElement(currentXml, { contentDesc: 'Đăng nhập', clickable: true }) ||
                       ui.findElement(currentXml, { text: 'Đăng nhập', exact: true }) ||
                       ui.findElement(currentXml, { contentDesc: 'Đăng nhập' }) ||
                       ui.findElement(currentXml, { text: 'Đăng nhập', clickable: true });

      if (!btnLogin || !btnLogin.x) {
        throw new Error('Không tìm thấy nút "Đăng nhập" có thể click');
      }

      adb.tap(btnLogin.x, btnLogin.y);
      return `Đã chạm nút Đăng nhập tại (${btnLogin.x}, ${btnLogin.y})`;
    });

    // Step 7: Chờ màn hình DASHBOARD
    await recordStep('Chờ ứng dụng chuyển sang DASHBOARD', async () => {
      let isDashboard = false;
      const timeoutMs = 25000;
      const startPoll = Date.now();

      while (Date.now() - startPoll < timeoutMs) {
        await adb.sleep(1500);
        currentXml = adb.dumpUi(dumpPath);

        const currentScreen = screen.getCurrentScreen(currentXml);
        if (currentScreen === 'DASHBOARD') {
          isDashboard = true;
          break;
        }

        const dashboardElement = ui.findElement(currentXml, 'Tổng quan dinh dưỡng') ||
                                 ui.findElement(currentXml, 'Ghi bữa ăn') ||
                                 ui.findElement(currentXml, 'Trang chủ') ||
                                 ui.findElement(currentXml, /kcal/i);
        if (dashboardElement) {
          isDashboard = true;
          break;
        }

        // Kiểm tra nếu có popup lỗi đăng nhập
        const alertMsg = ui.findElement(currentXml, /sai mật khẩu|không chính xác|lỗi/i);
        if (alertMsg) {
          throw new Error(`Đăng nhập thất bại: ${alertMsg.text || alertMsg.contentDesc}`);
        }
      }

      if (!isDashboard) {
        throw new Error(`Hết thời gian chờ (${timeoutMs}ms) chuyển sang DASHBOARD`);
      }

      return 'Đã xác nhận hiển thị màn hình DASHBOARD chính thành công';
    });

    // Xuất HTML Report
    const reportPath = path.join(config.artifactDir, '01_auth_login_report.html');
    reporter.generateHtmlReport(testName, steps, reportPath);
    console.log(`\n📄 Báo cáo HTML đã xuất tại: ${reportPath}`);

    return {
      success: true,
      testName,
      steps,
      reportPath
    };
  } catch (err) {
    const reportPath = path.join(config.artifactDir, '01_auth_login_report.html');
    reporter.generateHtmlReport(testName, steps, reportPath);
    console.error(`\n💥 Kịch bản thất bại: ${err.message}`);
    console.log(`📄 Báo cáo HTML đã xuất tại: ${reportPath}`);
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
