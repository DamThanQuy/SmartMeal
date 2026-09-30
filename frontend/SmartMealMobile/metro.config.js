const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/**
 * Metro configuration
 * https://docs.expo.dev/guides/customizing-metro/
 *
 * Phải dùng `expo/metro-config` (không phải `@react-native/metro-config`)
 * để Metro xử lý được file .css và các asset khi chạy trên web.
 */
const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, {
  input: './global.css',
});
