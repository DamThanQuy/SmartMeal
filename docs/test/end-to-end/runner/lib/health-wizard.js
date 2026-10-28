const fs = require('fs');

/**
 * Tự động hoàn thành Wizard khảo sát sức khỏe (7 bước) nếu ứng dụng đang ở màn hình Onboarding
 */
async function handleOnboardingIfPresent(adb, ui, dumpPath) {
  let xml = adb.dumpUi(dumpPath);
  let stepCount = 0;

  // Lặp kiểm tra xem có đang ở bất kỳ bước nào của Onboarding 7 bước hoặc Result Screen
  while (stepCount < 10) {
    xml = adb.dumpUi(dumpPath);
    stepCount++;

    // 1. Result screen: "Bắt đầu với SmartMeal"
    const btnStart = ui.findElement(xml, 'Bắt đầu với SmartMeal');
    if (btnStart && btnStart.x) {
      adb.tap(btnStart.x, btnStart.y);
      await adb.sleep(2000);
      return true;
    }

    // Kiểm tra nếu là các bước "Hồ sơ sức khỏe"
    const isSurvey = ui.findElement(xml, 'Hồ sơ sức khỏe') ||
                     ui.findElement(xml, /thông tin cơ bản|cơ thể của bạn|mục tiêu của bạn|mức độ vận động|dị ứng|bệnh lý|chế độ ăn/i);

    if (!isSurvey) {
      // Đã thoát khỏi Onboarding
      break;
    }

    // Bước 1: DOB + Giới tính
    if (ui.findElement(xml, 'Thông tin cơ bản') || ui.findElement(xml, '1/7')) {
      adb.tap(127, 893);
      adb.typeText('15');
      adb.tap(330, 893);
      adb.typeText('08');
      adb.tap(557, 893);
      adb.typeText('2000');
      adb.keyevent(4); // hide keyboard
      await adb.sleep(300);
      adb.tap(540, 1229); // Nam
      await adb.sleep(300);
      adb.tap(797, 2148); // Tiếp tục
      await adb.sleep(1500);
      continue;
    }

    // Bước 2: Chiều cao + Cân nặng
    if (ui.findElement(xml, 'Cơ thể của bạn') || ui.findElement(xml, '2/7')) {
      adb.tap(540, 893);
      for (let i = 0; i < 5; i++) adb.keyevent(67);
      adb.typeText('175');
      adb.tap(540, 1169);
      for (let i = 0; i < 5; i++) adb.keyevent(67);
      adb.typeText('70');
      adb.keyevent(4); // hide keyboard
      await adb.sleep(300);
      adb.tap(797, 2148); // Tiếp tục
      await adb.sleep(1500);
      continue;
    }

    // Bước 3: Mục tiêu
    if (ui.findElement(xml, 'Mục tiêu của bạn là gì?') || ui.findElement(xml, '3/7')) {
      adb.tap(540, 1124); // Giữ cân
      await adb.sleep(300);
      adb.tap(540, 1739); // Cân nặng mục tiêu
      for (let i = 0; i < 5; i++) adb.keyevent(67);
      adb.typeText('70');
      adb.keyevent(4);
      await adb.sleep(300);
      adb.tap(797, 2148); // Tiếp tục
      await adb.sleep(1500);
      continue;
    }

    // Bước 4: Mức độ vận động
    if (ui.findElement(xml, 'Mức độ vận động') || ui.findElement(xml, '4/7')) {
      adb.tap(540, 1364); // Vừa phải
      await adb.sleep(300);
      adb.tap(797, 2148); // Tiếp tục
      await adb.sleep(1500);
      continue;
    }

    // Bước 5: Dị ứng
    if (ui.findElement(xml, 'Bạn có dị ứng thực phẩm nào?') || ui.findElement(xml, '5/7')) {
      adb.tap(540, 1637); // Tôi không có dị ứng
      await adb.sleep(300);
      adb.tap(797, 2148); // Tiếp tục
      await adb.sleep(1500);
      continue;
    }

    // Bước 6: Bệnh lý
    if (ui.findElement(xml, 'Bạn có bệnh lý nào cần lưu ý?') || ui.findElement(xml, '6/7')) {
      adb.tap(540, 1205); // Tôi không có bệnh lý
      await adb.sleep(300);
      adb.tap(797, 2148); // Tiếp tục
      await adb.sleep(1500);
      continue;
    }

    // Bước 7: Chế độ ăn
    if (ui.findElement(xml, 'Bạn theo chế độ ăn nào?') || ui.findElement(xml, '7/7')) {
      adb.tap(540, 1109); // Không theo chế độ đặc biệt
      await adb.sleep(300);
      adb.tap(797, 2148); // Xem kết quả
      await adb.sleep(2000);
      continue;
    }

    // Nếu có nút Tiếp tục hoặc Xem kết quả chưa xử lý
    const btnNext = ui.findElement(xml, 'Tiếp tục') || ui.findElement(xml, 'Xem kết quả');
    if (btnNext && btnNext.x) {
      adb.tap(btnNext.x, btnNext.y);
      await adb.sleep(1500);
      continue;
    }

    break;
  }

  return false;
}

module.exports = {
  handleOnboardingIfPresent
};
