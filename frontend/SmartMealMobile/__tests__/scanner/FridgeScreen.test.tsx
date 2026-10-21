import React from 'react';
import { Text, TextInput } from 'react-native';
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AppInput } from '@/components/ui/AppInput';
import { FridgeScreen } from '@/features/scanner/screens/FridgeScreen';
import type { FridgeScanResult } from '@/features/scanner/types/scanner.types';
import type { RecipeMatch } from '@/features/recipes/types/recipe.types';

// Keep the real inputs, buttons, ingredient rows and error state. Only replace the
// native screen shell, decorative icons and the asynchronous service boundaries.
jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default ?? mock;
});

jest.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({ colors: jest.requireActual('@/theme/colors').lightColors }),
}));

jest.mock('lucide-react-native', () => new Proxy({}, {
  get: (_target, property) => property === '__esModule' ? true : () => null,
}));

jest.mock('@/features/scanner/hooks/useScanner', () => ({
  useScanFridge: () => ({
    mutate: mockScan,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

jest.mock('@/features/recipes', () => ({
  useFridgeRecipes: (names: string[], enabled: boolean) => mockRecipes(names, enabled),
  RecipeCard: () => null,
}));

interface RecipeQueryState {
  data: RecipeMatch[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: typeof mockRefetch;
}

interface ScanCallbacks {
  onSuccess: (result: FridgeScanResult) => void;
}

const mockRefetch = jest.fn().mockResolvedValue({ data: [] });
const mockScan = jest.fn<void, [string[], ScanCallbacks]>((_images, callbacks) => {
  callbacks.onSuccess(mockScanResult);
});
const mockRecipes = jest.fn<RecipeQueryState, [string[], boolean]>(() => mockRecipeState);
let mockScanResult: FridgeScanResult;
let mockRecipeState: RecipeQueryState;
let tree: ReactTestRenderer | undefined;

const ADD_INPUT = 'Tên nguyên liệu muốn thêm';
const CONFIRM = 'Xác nhận & gợi ý món';

beforeEach(() => {
  jest.clearAllMocks();
  mockScanResult = {
    isDemo: false,
    ingredients: [
      { id: 'tomato', name: 'Cà chua', quantityLabel: '2 quả', status: 'uncertain' },
      { id: 'egg', name: 'Trứng gà', quantityLabel: '3 quả', status: 'uncertain' },
    ],
  };
  mockRecipeState = {
    data: [],
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: mockRefetch,
  };
});

afterEach(async () => {
  await act(async () => {
    tree?.unmount();
  });
  tree = undefined;
});

function root(): ReactTestInstance {
  if (!tree) throw new Error('FridgeScreen has not been rendered');
  return tree.root;
}

async function renderScreen(): Promise<void> {
  type Props = React.ComponentProps<typeof FridgeScreen>;
  // The navigation shell is not exercised by these ingredient-editing flows.
  const navigation = {
    goBack: jest.fn(),
    replace: jest.fn(),
    navigate: jest.fn(),
  } as unknown as Props['navigation'];
  await act(async () => {
    tree = renderer.create(
      <FridgeScreen
        route={{ key: 'fridge-test', name: 'Fridge', params: { imageUris: ['file:///fridge.jpg'] } }}
        navigation={navigation}
      />,
    );
  });
}

function control(label: string, role = 'button'): ReactTestInstance {
  // NativeWind wraps Pressable, so use its public accessibility contract instead
  // of depending on the identity of the styled component.
  const found = root().findAll(node =>
    node.props.accessibilityLabel === label && node.props.accessibilityRole === role &&
    typeof node.props.onPress === 'function',
  )[0];
  if (!found) throw new Error(`Cannot find ${role}: ${label}`);
  return found;
}

function input(label = ADD_INPUT): ReactTestInstance {
  const found = root().findAllByType(TextInput).find(node => node.props.accessibilityLabel === label);
  if (!found) throw new Error(`Cannot find input: ${label}`);
  return found;
}

async function press(label: string, role = 'button'): Promise<void> {
  const button = control(label, role);
  expect(button.props.disabled).not.toBe(true);
  await act(async () => {
    await button.props.onPress();
  });
}

async function typeName(value: string, label = ADD_INPUT): Promise<void> {
  await act(async () => {
    input(label).props.onChangeText(value);
  });
}

function expectSelection(names: string[], enabled: boolean): void {
  expect(mockRecipes).toHaveBeenLastCalledWith(names, enabled);
}

function hasText(text: string): boolean {
  return root().findAllByType(Text).some(node => node.props.children === text);
}

function checkboxNames(): string[] {
  return Array.from(new Set(root().findAll(node => node.props.accessibilityRole === 'checkbox')
    .map(node => node.props.accessibilityLabel as string))).sort();
}

describe('FridgeScreen ingredient review', () => {
  test('AI ingredients require selection and an explicit confirmation before requesting recipes', async () => {
    await renderScreen();

    expect(mockScan).toHaveBeenCalledWith(['file:///fridge.jpg'], expect.any(Object));
    expect(control('Cà chua', 'checkbox').props.accessibilityState.checked).toBe(false);
    expect(control('Trứng gà', 'checkbox').props.accessibilityState.checked).toBe(false);
    expect(control(CONFIRM).props.disabled).toBe(true);
    expectSelection([], false);

    await press('Cà chua', 'checkbox');

    expectSelection(['Cà chua'], false);
    expect(control(CONFIRM).props.disabled).toBe(false);
    await press(CONFIRM);
    expectSelection(['Cà chua'], true);
  });

  test('selecting all remains an explicit review step before recipe suggestions', async () => {
    await renderScreen();

    await press('Xác nhận tất cả');

    expect(control('Cà chua', 'checkbox').props.accessibilityState.checked).toBe(true);
    expect(control('Trứng gà', 'checkbox').props.accessibilityState.checked).toBe(true);
    expectSelection(['Cà chua', 'Trứng gà'], false);
    await press(CONFIRM);
    expectSelection(['Cà chua', 'Trứng gà'], true);
  });

  test('adding a trimmed name confirms only the manually entered ingredient and clears the input', async () => {
    await renderScreen();

    await typeName('  Hành lá  ');
    await press('Thêm');

    expect(control('Hành lá', 'checkbox').props.accessibilityState.checked).toBe(true);
    expect(control('Cà chua', 'checkbox').props.accessibilityState.checked).toBe(false);
    expect(control('Trứng gà', 'checkbox').props.accessibilityState.checked).toBe(false);
    expect(input().props.value).toBe('');
    expectSelection(['Hành lá'], false);
    await press(CONFIRM);
    expectSelection(['Hành lá'], true);
  });

  test('manual entry also makes the empty scan usable', async () => {
    mockScanResult.ingredients = [];
    await renderScreen();

    await typeName('Đậu hũ');
    await press('Thêm');
    await press(CONFIRM);

    expectSelection(['Đậu hũ'], true);
  });

  test('editing does not toggle selection, and saving the corrected name invalidates old suggestions', async () => {
    await renderScreen();
    await press('Cà chua', 'checkbox');
    await press(CONFIRM);
    expect(hasText('Món nấu được')).toBe(true);

    await press('Sửa Cà chua');

    expectSelection(['Cà chua'], true);
    const editLabel = 'Tên mới cho Cà chua';
    expect(input(editLabel).props.value).toBe('Cà chua');
    await typeName('  Cà rốt  ', editLabel);
    await press('Lưu');

    expect(control('Cà rốt', 'checkbox').props.accessibilityState.checked).toBe(true);
    expect(control('Trứng gà', 'checkbox').props.accessibilityState.checked).toBe(false);
    expectSelection(['Cà rốt'], false);
    expect(hasText('Món nấu được')).toBe(false);
    await press(CONFIRM);
    expectSelection(['Cà rốt'], true);
  });

  test('a duplicate edit stays open and preserves the original ingredients', async () => {
    await renderScreen();
    await press('Sửa Cà chua');
    const editLabel = 'Tên mới cho Cà chua';
    await typeName('  TRỨNG GÀ  ', editLabel);
    await press('Lưu');

    const editor = root().findAllByType(AppInput).find(node => node.props.accessibilityLabel === editLabel);
    expect(editor?.props.error).toBeTruthy();
    expect(input(editLabel).props.value.trim()).toBe('TRỨNG GÀ');
    expectSelection([], false);
    expect(checkboxNames()).toEqual(['Cà chua', 'Trứng gà']);
  });

  test('removing the selected ingredient clears suggestions and disables confirmation', async () => {
    await renderScreen();
    await press('Cà chua', 'checkbox');
    await press(CONFIRM);

    await press('Xóa Cà chua');

    expectSelection([], false);
    expect(control(CONFIRM).props.disabled).toBe(true);
    expect(hasText('Món nấu được')).toBe(false);
    expect(checkboxNames()).toEqual(['Trứng gà']);
  });

  test('a failed recipe request shows an actionable error and retries the request', async () => {
    mockRecipeState = {
      ...mockRecipeState,
      data: undefined,
      isError: true,
      error: new Error('Không thể tải gợi ý món. Vui lòng thử lại.'),
    };
    await renderScreen();
    await press('Cà chua', 'checkbox');
    await press(CONFIRM);

    expect(root().findAllByProps({ accessibilityRole: 'alert' }).length).toBeGreaterThan(0);
    expect(hasText('Chưa tìm được món phù hợp')).toBe(false);
    await press('Thử lại');
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
