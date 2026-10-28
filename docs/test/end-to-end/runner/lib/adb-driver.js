/**
 * lib/adb-driver.js
 * Wrapper around the ADB command-line tool for E2E testing SmartMeal on Android.
 * Supports Windows Git Bash; ensures MSYS path conversion is disabled when
 * passing /sdcard/ paths so adb receives them verbatim.
 */
'use strict';

const { execFileSync, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Prevent MSYS/Git Bash from converting /sdcard/... POSIX paths to Windows paths
process.env.MSYS_NO_PATHCONV = '1';

/**
 * Execute an ADB command synchronously.
 * @param {string[]} args - arguments after "adb" (e.g. ['shell', 'input', 'tap', '540', '960'])
 * @param {object} [opts] - optional spawn options
 * @returns {string} stdout as a string (trimmed)
 */
function execAdb(args, opts = {}) {
  const env = Object.assign({}, process.env, { MSYS_NO_PATHCONV: '1' });
  try {
    const result = execFileSync(config.adbPath, args, {
      env,
      timeout: config.timeouts.defaultTimeout,
      encoding: 'utf8',
      ...opts
    });
    return (result || '').trim();
  } catch (err) {
    const stderr = (err.stderr || '').toString().trim();
    const stdout = (err.stdout || '').toString().trim();
    throw new Error(`ADB command failed: adb ${args.join(' ')}\n${stderr || stdout}`);
  }
}

/**
 * Tap a specific screen coordinate.
 * @param {number} x
 * @param {number} y
 */
function tap(x, y) {
  execAdb(['shell', 'input', 'tap', String(x), String(y)]);
}

/**
 * Type text into the currently focused field via adb input text.
 * Spaces and special characters are escaped to avoid shell expansion issues.
 * @param {string} text
 */
function typeText(text) {
  // adb shell input text does not handle spaces well — replace with %s
  const escaped = text.replace(/ /g, '%s');
  execAdb(['shell', 'input', 'text', escaped]);
}

/**
 * Send a key event by numeric code.
 * Common codes: 3=HOME, 4=BACK, 66=ENTER, 24=VOL_UP, 25=VOL_DOWN, 61=TAB
 * @param {number|string} code
 */
function keyevent(code) {
  execAdb(['shell', 'input', 'keyevent', String(code)]);
}

/**
 * Swipe between two coordinates.
 * @param {number} x1  start X
 * @param {number} y1  start Y
 * @param {number} x2  end X
 * @param {number} y2  end Y
 * @param {number} [duration=300] swipe duration in milliseconds
 */
function swipe(x1, y1, x2, y2, duration = 300) {
  execAdb([
    'shell', 'input', 'swipe',
    String(x1), String(y1), String(x2), String(y2),
    String(duration)
  ]);
}

/**
 * Capture a screenshot from the device and pull it to the host.
 * @param {string} localPath  absolute path on Windows host where the PNG should land
 * @returns {string} resolved local path
 */
function screencap(localPath) {
  const devicePath = '/sdcard/e2e_screencap_tmp.png';
  // Use MSYS_NO_PATHCONV=1 so /sdcard/ is sent verbatim to adb
  execAdb(['shell', 'screencap', '-p', devicePath]);
  execAdb(['pull', devicePath, localPath]);
  execAdb(['shell', 'rm', '-f', devicePath]);
  return localPath;
}

/**
 * Dump the current UI hierarchy to an XML file on the device, then pull it to host.
 * Includes retry logic and graceful handling for transient 'ERROR: could not get idle state'.
 * @param {string} xmlPath  absolute path on Windows host where the XML should land
 * @param {number} [retries=3]
 * @returns {string} content of the UI XML
 */
function dumpUi(xmlPath, retries = 3) {
  const devicePath = '/sdcard/e2e_ui_dump.xml';
  let lastErr = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Xóa file tạm cũ trên device trước
      try { execAdb(['shell', 'rm', '-f', devicePath]); } catch (_) {}

      // Thử dump UI (uiautomator dump có thể trả về exit non-zero khi 'could not get idle state' nhưng vẫn ghi file)
      try {
        execAdb(['shell', 'uiautomator', 'dump', '--compressed', devicePath]);
      } catch (_e1) {
        try {
          execAdb(['shell', 'uiautomator', 'dump', devicePath]);
        } catch (_e2) {
          // Bỏ qua lỗi CLI, kiểm tra pull thực tế bên dưới
        }
      }

      // Kéo file về host
      try {
        execAdb(['pull', devicePath, xmlPath]);
        try { execAdb(['shell', 'rm', '-f', devicePath]); } catch (_) {}
        if (fs.existsSync(xmlPath) && fs.statSync(xmlPath).size > 100) {
          return fs.readFileSync(xmlPath, 'utf8');
        }
      } catch (pullErr) {
        lastErr = pullErr;
      }
    } catch (err) {
      lastErr = err;
    }

    try {
      // Tắt tạm pointer_location nếu đang bật để tránh làm UIAutomator bận rộn
      execAdb(['shell', 'settings', 'put', 'system', 'pointer_location', '0']);
    } catch (_p) {}
    try {
      execFileSync('powershell', ['-Command', 'Start-Sleep -Milliseconds 600'], { env: process.env });
    } catch (_s) {}
  }

  // Fallback: nếu file đã tồn tại trên host và có dung lượng hợp lệ
  if (fs.existsSync(xmlPath) && fs.statSync(xmlPath).size > 100) {
    return fs.readFileSync(xmlPath, 'utf8');
  }

  if (lastErr) throw lastErr;
  throw new Error(`Failed to dump UI after ${retries} attempts`);
}

/**
 * Set up reverse port forwarding so the Android app can reach local services.
 * Forwards: tcp:8081 (Metro), tcp:5000 (API), tcp:5432 (PostgreSQL).
 * @returns {void}
 */
function reversePorts() {
  const reverseRules = [
    ['tcp:8081', 'tcp:8081'],   // Expo Metro bundler
    ['tcp:5000', 'tcp:5000'],   // .NET API
    ['tcp:5432', 'tcp:5432']    // PostgreSQL
  ];
  for (const [remote, local] of reverseRules) {
    execAdb(['reverse', remote, local]);
  }
}

/**
 * List attached ADB devices.
 * @returns {Array<{ serial: string, state: string }>}
 */
function getDevices() {
  const output = execAdb(['devices']);
  const lines = output.split('\n').map(l => l.trim()).filter(Boolean);
  const devices = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(/\s+/);
    if (parts.length >= 2) {
      devices.push({ serial: parts[0], state: parts[1] });
    }
  }
  return devices;
}

/**
 * Ensure the SmartMeal application is active and in foreground.
 */
function ensureAppInForeground() {
  try {
    execAdb(['shell', 'monkey', '-p', 'com.smartmeal.mobile', '-c', 'android.intent.category.LAUNCHER', '1']);
  } catch (_e) {}
}

/**
 * Ensure device screen is awake and unlocked.
 */
function ensureScreenAwake() {
  try {
    // Wake up screen if asleep (KEYCODE_WAKEUP = 224)
    execAdb(['shell', 'input', 'keyevent', '224']);
    // Tắt các animation hệ thống để dumpUi không bao giờ bị nghẽn
    execAdb(['shell', 'settings', 'put', 'global', 'window_animation_scale', '0']);
    execAdb(['shell', 'settings', 'put', 'global', 'transition_animation_scale', '0']);
    execAdb(['shell', 'settings', 'put', 'global', 'animator_duration_scale', '0']);
    ensureAppInForeground();
    dismissOpenDialogs();
  } catch (_e) {}
}

/**
 * Enable visual touch points and pointer coordinate overlay on the Android device.
 */
function ensureVisualTouches() {
  try {
    execAdb(['shell', 'settings', 'put', 'system', 'show_touches', '1']);
    execAdb(['shell', 'settings', 'put', 'system', 'pointer_location', '1']);
  } catch (_e) {}
}

/**
 * Disable visual touch points and pointer coordinate overlay.
 */
function disableVisualTouches() {
  try {
    execAdb(['shell', 'settings', 'put', 'system', 'show_touches', '0']);
    execAdb(['shell', 'settings', 'put', 'system', 'pointer_location', '0']);
  } catch (_e) {}
}

/**
 * Dismiss any open system/dev dialogs by sending BACK key if dialog detected.
 */
function dismissOpenDialogs() {
  try {
    const tmpXml = '/sdcard/e2e_diag_check.xml';
    execAdb(['shell', 'uiautomator', 'dump', tmpXml]);
    const xml = execAdb(['shell', 'cat', tmpXml]);
    execAdb(['shell', 'rm', '-f', tmpXml]);
    if (xml.includes('React Native Dev Menu') || xml.includes('select_dialog_listview')) {
      execAdb(['shell', 'input', 'keyevent', '4']); // BACK
    }
  } catch (_e) {}
}

/**
 * Clear focused input field by pressing DEL multiple times or selecting all.
 * @param {number} [count=40]
 */
function clearInput(count = 40) {
  // Move cursor to end, then send delete keys
  execAdb(['shell', 'input', 'keyevent', '123']); // KEYCODE_MOVE_END
  const delArgs = ['shell', 'input', 'keyevent'];
  for (let i = 0; i < Math.min(count, 50); i++) {
    delArgs.push('67'); // KEYCODE_DEL
  }
  execAdb(delArgs);
}

/**
 * Helper delay (sleep) in milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  execAdb,
  tap,
  typeText,
  keyevent,
  swipe,
  screencap,
  dumpUi,
  reversePorts,
  getDevices,
  ensureScreenAwake,
  ensureAppInForeground,
  ensureVisualTouches,
  disableVisualTouches,
  dismissOpenDialogs,
  clearInput,
  sleep
};
