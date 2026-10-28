/**
 * E2E Test Runner Configuration for SmartMeal
 * Independent Node.js configuration without external heavy dependencies.
 */
const path = require('path');

const config = {
  // Executable paths on Windows host
  adbPath: "C:\\Users\\QUYDAM\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe",
  scrcpyPath: "C:\\Users\\QUYDAM\\AppData\\Local\\Programs\\scrcpy\\scrcpy.exe",

  // Local ports forwarded to Android device
  ports: {
    metro: 8081,
    api: 5000,
    postgres: 5432
  },

  // Default timeouts and delays (in milliseconds)
  timeouts: {
    defaultTimeout: 15000,
    shortTimeout: 5000,
    screenWaitTimeout: 20000,
    pollInterval: 1000,
    actionDelay: 800,
    longActionDelay: 2000
  },

  // Directory for artifacts (screenshots, XML dumps, HTML reports)
  artifactDir: path.resolve(__dirname, 'artifacts'),

  // Package / app configuration
  app: {
    expoPackage: 'host.exp.exponent',
    smartMealAppId: 'com.smartmeal.mobile',
    apiBaseUrl: 'http://localhost:5000/api'
  }
};

module.exports = config;
