/**
 * ThemeProvider — hồi quy cho commit 3bf9673 "không treo splash screen khi chờ font Inter tải xong":
 * children phải render ngay khi đọc xong theme mode, kể cả khi useFonts chưa xong (hoặc lỗi).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockUseFonts = jest.fn((): [boolean, Error | null] => [false, null]);
jest.mock('expo-font', () => ({ useFonts: () => mockUseFonts() }));

const mockSetColorScheme = jest.fn();
jest.mock('nativewind', () => {
  const actual = jest.requireActual('nativewind');
  return {
    ...actual,
    useColorScheme: () => ({
      colorScheme: 'light',
      setColorScheme: mockSetColorScheme,
    }),
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect } from 'react';
import { Text } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { STORAGE_KEYS } from '@/constants/storage';
import { darkColors, lightColors } from '@/theme/colors';
import {
  ThemeProvider,
  useTheme,
  type ThemeContextValue,
} from '@/theme/ThemeProvider';

// Giá trị context mới nhất mà Probe nhận được (ghi trong effect, không gán biến ngoài lúc render).
const seen: { theme?: ThemeContextValue } = {};
function Probe() {
  const theme = useTheme();
  useEffect(() => {
    seen.theme = theme;
  });
  return <Text>Nội dung app</Text>;
}

async function mount(onReady?: () => void): Promise<ReactTestRenderer> {
  let tree: ReactTestRenderer | undefined;
  await act(async () => {
    tree = renderer.create(
      <ThemeProvider onReady={onReady}>
        <Probe />
      </ThemeProvider>,
    );
  });
  return tree!;
}

const hasContent = (tree: ReactTestRenderer) =>
  tree.root.findAllByType(Text).some(t => t.props.children === 'Nội dung app');

beforeEach(async () => {
  seen.theme = undefined;
  mockUseFonts.mockReturnValue([false, null]);
  mockSetColorScheme.mockClear();
  await AsyncStorage.clear();
});

describe('ThemeProvider', () => {
  it('font Inter chưa tải xong vẫn render children và báo onReady đúng 1 lần (không treo splash)', async () => {
    const onReady = jest.fn();

    const tree = await mount(onReady);

    expect(hasContent(tree)).toBe(true);
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('font lỗi khi tải cũng không chặn render', async () => {
    mockUseFonts.mockReturnValue([false, new Error('font not found')]);

    const tree = await mount();

    expect(hasContent(tree)).toBe(true);
  });

  it('chưa đọc xong theme mode đã lưu thì chưa render (tránh chớp sáng/tối)', () => {
    let tree: ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>,
      );
    });

    expect(tree!.toJSON()).toBeNull();
  });

  it('khôi phục chế độ tối đã lưu và dùng bảng màu tối', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.THEME_MODE, 'dark');

    await mount();

    expect(seen.theme?.mode).toBe('dark');
    expect(seen.theme?.resolvedScheme).toBe('dark');
    expect(seen.theme?.colors).toBe(darkColors);
    expect(mockSetColorScheme).toHaveBeenLastCalledWith('dark');
  });

  it('giá trị lưu không hợp lệ → theo hệ thống (sáng)', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.THEME_MODE, 'tím');

    await mount();

    expect(seen.theme?.mode).toBe('system');
    expect(seen.theme?.colors).toBe(lightColors);
  });

  it('setMode đổi theme ngay và lưu lại cho lần mở app sau', async () => {
    await mount();

    await act(async () => {
      seen.theme!.setMode('dark');
    });

    expect(seen.theme?.resolvedScheme).toBe('dark');
    expect(await AsyncStorage.getItem(STORAGE_KEYS.THEME_MODE)).toBe('dark');
  });

  it('useTheme() ngoài ThemeProvider ném lỗi rõ ràng', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      act(() => {
        renderer.create(<Probe />);
      }),
    ).toThrow('useTheme() phải được gọi bên trong <ThemeProvider>.');
    spy.mockRestore();
  });
});
