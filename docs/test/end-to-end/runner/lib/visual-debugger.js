/**
 * lib/visual-debugger.js
 * Toggles Android system visual feedback flags (touch dots and pointer coordinates)
 * so screen recordings and scrcpy sessions clearly show where test automation clicks.
 */
'use strict';

/**
 * Enable visual touch points and pointer coordinate overlay on the Android device.
 * @param {object} driver - adb-driver module exposing execAdb
 */
function enableVisualTouches(driver) {
  driver.execAdb(['shell', 'settings', 'put', 'system', 'show_touches', '1']);
  driver.execAdb(['shell', 'settings', 'put', 'system', 'pointer_location', '1']);
}

/**
 * Disable visual touch points and pointer coordinate overlay.
 * @param {object} driver - adb-driver module exposing execAdb
 */
function disableVisualTouches(driver) {
  driver.execAdb(['shell', 'settings', 'put', 'system', 'show_touches', '0']);
  driver.execAdb(['shell', 'settings', 'put', 'system', 'pointer_location', '0']);
}

/**
 * Get current visual touches and pointer location status.
 * @param {object} driver
 * @returns {{ showTouches: boolean, pointerLocation: boolean }}
 */
function getVisualTouchesStatus(driver) {
  let showTouches = false;
  let pointerLocation = false;
  try {
    const st = driver.execAdb(['shell', 'settings', 'get', 'system', 'show_touches']);
    showTouches = st.trim() === '1';
  } catch (_e) {}
  try {
    const pl = driver.execAdb(['shell', 'settings', 'get', 'system', 'pointer_location']);
    pointerLocation = pl.trim() === '1';
  } catch (_e) {}

  return { showTouches, pointerLocation };
}

module.exports = {
  enableVisualTouches,
  disableVisualTouches,
  getVisualTouchesStatus
};
