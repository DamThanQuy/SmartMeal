// Không dùng `preset: 'jest-expo'` (string) vì cần override `transform` mà Jest KHÔNG deep-merge
// transform giữa preset và config này — require preset trực tiếp rồi extend cho chắc giữ đủ
// transform/mock gốc của jest-expo (asset transformer, moduleNameMapper cho @expo/vector-icons...).
const jestExpoPreset = require('jest-expo/jest-preset');

module.exports = {
  ...jestExpoPreset,
  moduleNameMapper: {
    ...jestExpoPreset.moduleNameMapper,
    '\\.css$': '<rootDir>/__mocks__/styleMock.js',
  },
  transform: {
    ...jestExpoPreset.transform,
    // lucide-react-native phân phối .mjs (ESM) — preset gốc chỉ transform .js/.ts/.tsx.
    '^.+\\.mjs$': jestExpoPreset.transform['\\.[jt]sx?$'],
  },
  // jest-expo mặc định chỉ bỏ qua transform cho package bắt đầu bằng "react-native"/"expo"/
  // "@react-navigation"... (xem node_modules/jest-expo/jest-preset.js) — nativewind và
  // lucide-react-native ship ESM chưa transpile nên phải thêm vào đây.
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|nativewind|react-native-css-interop|lucide-react-native))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
};
