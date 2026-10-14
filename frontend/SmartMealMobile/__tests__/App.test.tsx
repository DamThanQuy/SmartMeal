/**
 * Smoke test: <App /> phải mount được (không throw) trên stack Expo + React Navigation mới.
 * Không test sâu navigation/theme/QueryClient — chỉ đảm bảo cây component render an toàn
 * (splash screen, hydrate AsyncStorage, ThemeProvider, NavigationContainer đều không crash).
 */
import 'react-native-gesture-handler/jestSetup';

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// expo-av nạp module native `ExponentAV` ngay khi import (VoiceLogScreen) mà môi trường Jest không có.
// Smoke test chỉ cần cây component mount được, không ghi âm thật.
jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: false, status: 'denied' })),
    getPermissionsAsync: jest.fn(() => Promise.resolve({ granted: false, status: 'denied' })),
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    Sound: { createAsync: jest.fn() },
    Recording: jest.fn(),
    RecordingOptionsPresets: { HIGH_QUALITY: {} },
  },
}));

// NativeWind.setColorScheme() cần config darkMode/CSS do Metro biên dịch lúc build — không có
// trong môi trường Jest (không chạy qua Metro) nên throw. Không thuộc phạm vi smoke test (không
// test sâu theme) → giữ nguyên `vars` thật, chỉ mock useColorScheme để tránh throw khi mount.
jest.mock('nativewind', () => {
  const actual = jest.requireActual('nativewind');
  return {
    ...actual,
    useColorScheme: () => ({
      colorScheme: 'light',
      setColorScheme: jest.fn(),
      toggleColorScheme: jest.fn(),
    }),
  };
});

jest.mock('react-native-safe-area-context', () => {
  // File mock của package này dùng `export default {...}` — sau khi Babel transpile về CJS,
  // require() trả về { default: {...} } nên phải unwrap, nếu không import theo tên
  // (`{ SafeAreaProvider }`) sẽ ra undefined.
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default ?? mock;
});

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders <App /> without throwing', async () => {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<App />);
  });
});
