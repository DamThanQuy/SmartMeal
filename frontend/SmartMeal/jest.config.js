module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '\\.css$': '<rootDir>/__mocks__/styleMock.js',
  },
  setupFiles: ['react-native-gesture-handler/jestSetup'],
  // NativeWind/react-native-css-interop + React Navigation/gesture-handler/reanimated/
  // lucide-react-native đều ship ESM chưa transpile trong node_modules — cần cho Babel
  // transform thay vì bị transformIgnorePatterns mặc định của RN preset bỏ qua.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|nativewind|react-native-css-interop|@react-navigation|react-native-screens|react-native-gesture-handler|react-native-svg|lucide-react-native)/)',
  ],
  // Preset gốc (@react-native/jest-preset) chỉ transform .js/.ts/.tsx — lucide-react-native
  // phân phối .mjs (ESM) nên cần thêm pattern .mjs, kèm lại asset transformer gốc của preset
  // (khai báo transform ở đây sẽ ghi đè toàn bộ transform của preset, không merge).
  transform: {
    '^.+\\.(js|jsx|mjs|ts|tsx)$': 'babel-jest',
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$': require.resolve(
      '@react-native/jest-preset/jest/assetFileTransformer.js',
    ),
  },
};
