/**
 * lib/screen-detector.js
 * Identifies the current SmartMeal screen from a UI Automator XML dump.
 * Uses keyword/signature-based matching without any external dependencies.
 */
'use strict';

const { findElement } = require('./ui-inspector');

/**
 * Screen signatures. Keys correspond to SCREEN_* constants below.
 * Each signature is an array of match criteria. A screen is detected when
 * ALL required criteria are found (AND logic), or any one of a group (OR).
 *
 * Format:
 *   { required: [...], any: [...] }
 *   - required: every item must match
 *   - any: at least one item must match
 */
const SCREEN_SIGNATURES = {
  /**
   * WELCOME screen: splash or onboarding welcome with login button.
   */
  WELCOME: {
    required: [],
    any: [
      { text: 'Tôi đã có tài khoản' },
      { text: 'Bắt đầu miễn phí' },
      { text: 'Khám phá công thức không cần đăng nhập' }
    ]
  },

  /**
   * LOGIN screen: the initial email/password entry screen.
   */
  LOGIN: {
    required: [],
    any: [
      { text: 'Chào mừng trở lại' },
      { text: 'Đăng nhập', clickable: true },
      { text: 'Login', clickable: true },
      { text: 'ban@email.com' },
      { text: 'Nhập mật khẩu' },
      { resourceId: /email|password|sign.in/i },
      { contentDesc: /đăng nhập|login/i }
    ]
  },

  /**
   * DASHBOARD: the main home screen with calorie ring/summary.
   */
  DASHBOARD: {
    required: [],
    any: [
      { text: 'Tổng quan dinh dưỡng' },
      { text: 'Ghi bữa ăn' },
      { text: /kcal hôm nay|calories today|còn lại/i },
      { contentDesc: /trang chủ|home|dashboard/i },
      { resourceId: /dashboard|home_screen|calorie.ring/i },
      { text: /bữa sáng|bữa trưa|bữa tối|breakfast|lunch|dinner/i }
    ]
  },

  /**
   * DIARY: nutrition diary / food log screen.
   */
  DIARY: {
    required: [],
    any: [
      { text: /nhật ký dinh dưỡng|nhật ký/i },
      { text: /calo theo bữa/i },
      { contentDesc: /nhật ký dinh dưỡng|nhật ký|diary/i },
      { resourceId: /diary|food.log|nutrient.log/i }
    ]
  },

  /**
   * PLANNER: meal planner / calendar screen.
   */
  PLANNER: {
    required: [],
    any: [
      { text: /thực đơn/i },
      { text: /kế hoạch tuần|thực đơn tuần|thứ 2|thứ 3/i },
      { contentDesc: /thực đơn|planner/i }
    ]
  },

  /**
   * DISCOVER: recipes and food discovery screen.
   */
  DISCOVER: {
    required: [],
    any: [
      { text: /khám phá công thức|khám phá|bộ sưu tập/i },
      { contentDesc: /khám phá|discover/i }
    ]
  },

  /**
   * PROFILE: user profile and settings screen.
   */
  PROFILE: {
    required: [],
    any: [
      { text: /chi tiết sức khỏe|hồ sơ sức khỏe|cài đặt/i },
      { text: /nâng cấp smartmeal pro/i },
      { contentDesc: /cá nhân|profile/i }
    ]
  },

  /**
   * FOOD_SEARCH: the food/dish search screen.
   */
  FOOD_SEARCH: {
    required: [],
    any: [
      { text: /tìm món ăn|tìm kiếm món ăn|search food|tìm thức ăn/i },
      { text: /gợi ý cho bạn/i },
      { contentDesc: /search food|food search/i },
      { resourceId: /food.search|search.bar|search.food/i }
    ]
  },

  /**
   * PREMIUM: the premium upgrade prompt screen.
   */
  PREMIUM: {
    required: [],
    any: [
      { text: /nâng cấp smartmeal pro|nâng cấp pro|smartmeal pro|quyền lợi/i },
      { text: /ăn thông minh hơn với ai/i },
      { contentDesc: /premium|upgrade/i },
      { resourceId: /premium|upgrade|pro.plan/i }
    ]
  },

  /**
   * SUBSCRIPTION: the subscription / payment screen (PayOS / VietQR).
   */
  SUBSCRIPTION: {
    required: [],
    any: [
      { text: /thanh toán|payment|vietqr|payos|đăng ký gói/i },
      { contentDesc: /subscription|payment|vietqr/i },
      { resourceId: /subscription|payment|payos|vietqr/i }
    ]
  },

  /**
   * HEALTH_PROFILE: onboarding wizard or health detail
   */
  HEALTH_PROFILE: {
    required: [],
    any: [
      { text: /hồ sơ sức khỏe|ngày sinh|chiều cao|cân nặng|chỉ số sinh học|bmi|tdee/i },
      { contentDesc: /hồ sơ sức khỏe|health profile/i }
    ]
  },

  /**
   * AI_CAMERA: AI food recognition screen
   */
  AI_CAMERA: {
    required: [],
    any: [
      { text: /chụp ảnh món ăn|ai camera|nhận diện món|chụp đĩa ăn/i },
      { contentDesc: /chụp ảnh|ai camera|camera/i }
    ]
  },

  /**
   * VOICE_LOG: voice input screen
   */
  VOICE_LOG: {
    required: [],
    any: [
      { text: /ghi âm bữa ăn|nói món bạn đã ăn|bắt đầu nói|nhập bằng giọng nói/i },
      { contentDesc: /ghi âm|voice log|mic/i }
    ]
  },

  /**
   * BARCODE: barcode scanner
   */
  BARCODE: {
    required: [],
    any: [
      { text: /quét mã vạch|hướng camera vào mã vạch|barcode/i },
      { contentDesc: /quét mã vạch|barcode scanner/i }
    ]
  },

  /**
   * FRIDGE: fridge scanner
   */
  FRIDGE: {
    required: [],
    any: [
      { text: /quét tủ lạnh|nguyên liệu có sẵn|chụp tủ lạnh/i },
      { contentDesc: /quét tủ lạnh|fridge scanner/i }
    ]
  },

  /**
   * RECIPE_DETAIL: recipe detail & cooking mode
   */
  RECIPE_DETAIL: {
    required: [],
    any: [
      { text: /nguyên liệu|cách làm|bước nấu|hướng dẫn nấu|nấu ăn từng bước/i },
      { contentDesc: /công thức|recipe detail/i }
    ]
  },

  /**
   * GROCERY: grocery shopping list
   */
  GROCERY: {
    required: [],
    any: [
      { text: /danh sách đi chợ|đi chợ|cần mua|đã mua|tổng hợp nguyên liệu/i },
      { contentDesc: /danh sách đi chợ|grocery/i }
    ]
  },

  /**
   * GAMIFICATION_PET: virtual pet / Bé Mầm
   */
  GAMIFICATION_PET: {
    required: [],
    any: [
      { text: /bé mầm|linh vật|chuỗi ngày|uống nước|\+250ml|điểm kinh nghiệm|thử thách/i },
      { contentDesc: /bé mầm|thú cưng|pet|gamification/i }
    ]
  },

  /**
   * WEIGHT_HISTORY: weight tracking
   */
  WEIGHT_HISTORY: {
    required: [],
    any: [
      { text: /theo dõi cân nặng|lịch sử cân nặng|biểu đồ cân nặng/i },
      { contentDesc: /lịch sử cân nặng|weight history/i }
    ]
  }
};

/**
 * Detect which screen is currently visible from a uiautomator XML string.
 * @param {string} xmlString - raw XML from adb shell uiautomator dump
 * @returns {string|null} one of the SCREEN_* keys, or null if unknown
 */
function getCurrentScreen(xmlString) {
  if (!xmlString || typeof xmlString !== 'string') return null;

  for (const [screenName, sig] of Object.entries(SCREEN_SIGNATURES)) {
    // Check required criteria (ALL must match)
    const requiredMet = sig.required.every(criteria => !!findElement(xmlString, criteria));
    if (!requiredMet) continue;

    // Check any criteria (at least ONE must match)
    if (sig.any.length === 0) {
      // If only required criteria exist and all passed, we have a match
      return screenName;
    }
    const anyMet = sig.any.some(criteria => !!findElement(xmlString, criteria));
    if (anyMet) return screenName;
  }

  return null;
}

/**
 * Poll the device at regular intervals until a given screen is detected or timeout is reached.
 * @param {object} driver - adb-driver module (must expose dumpUi(xmlPath))
 * @param {string} expectedScreen - one of the SCREEN_SIGNATURES keys
 * @param {number} [timeoutMs=20000]
 * @param {number} [pollMs=1000]
 * @param {string} [xmlPath] - temp path to write the XML dump; defaults to OS tmp
 * @returns {Promise<boolean>} resolves true if detected, false on timeout
 */
function waitForScreen(driver, expectedScreen, timeoutMs = 20000, pollMs = 1000, xmlPath) {
  const tmpPath = xmlPath || require('path').join(require('os').tmpdir(), 'e2e_ui_dump.xml');

  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;

    const poll = () => {
      try {
        const xmlContent = driver.dumpUi(tmpPath);
        const current = getCurrentScreen(xmlContent);
        if (current === expectedScreen) {
          return resolve(true);
        }
      } catch (_err) {
        // Transient ADB failure; keep polling
      }

      if (Date.now() >= deadline) {
        return resolve(false);
      }

      setTimeout(poll, pollMs);
    };

    poll();
  });
}

module.exports = {
  SCREEN_SIGNATURES,
  SCREENS: Object.keys(SCREEN_SIGNATURES),
  getCurrentScreen,
  waitForScreen
};
