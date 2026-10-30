/**
 * D:/STUDY/KY8/PRM/SmartMeal/docs/test/end-to-end/runner/index.js
 * Unified export of all SmartMeal E2E runner modules.
 */
'use strict';

const config = require('./config');
const adbDriver = require('./lib/adb-driver');
const uiInspector = require('./lib/ui-inspector');
const screenDetector = require('./lib/screen-detector');
const visualDebugger = require('./lib/visual-debugger');
const reporter = require('./lib/reporter');

module.exports = {
  config,
  adb: adbDriver,
  driver: adbDriver,
  ui: uiInspector,
  screen: screenDetector,
  visual: visualDebugger,
  reporter
};
