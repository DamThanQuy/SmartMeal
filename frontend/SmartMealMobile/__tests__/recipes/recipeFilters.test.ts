/**
 * recipeFilters (hàm thuần của recipeService): loại món theo dị ứng đã khai báo (BR-101/102), lọc khoảng
 * calo, so khớp nguyên liệu không dấu và xếp hạng theo tủ lạnh (BR-080).
 */
import {
  filterOutUserAllergens,
  foldText,
  matchesCalorieFilter,
  matchIngredientCount,
  rankByPantry,
} from '@/features/recipes/services/recipeFilters';
import type { Recipe } from '@/features/recipes/types/recipe.types';
import { useUserProfileStore } from '@/state/user/userProfileStore';

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r',
    name: 'Món',
    durationMinutes: 15,
    servings: 1,
    nutritionPerServing: { calories: 400, carbsG: 40, proteinG: 30, fatG: 10 },
    tags: [],
    mealTypes: [],
    ingredients: [],
    steps: [],
    allergenIds: [],
    healthWarnings: [],
    ...overrides,
  };
}

function ingredients(...names: string[]): Recipe['ingredients'] {
  return names.map(name => ({ name, amount: '100 g', allergenIds: [] }));
}

afterEach(() => {
  useUserProfileStore.setState({ allergyIds: [] });
});

describe('filterOutUserAllergens', () => {
  test('loại món chứa dị ứng đã khai báo và trả các dị ứng đã dùng để lọc', () => {
    useUserProfileStore.setState({ allergyIds: ['seafood', 'peanut'] });
    const salmon = recipe({ id: 'salmon', allergenIds: ['seafood'] });
    const satay = recipe({ id: 'satay', allergenIds: ['peanut', 'soy'] });
    const rice = recipe({ id: 'rice', allergenIds: ['gluten'] });

    const { allowed, excludedAllergenIds } = filterOutUserAllergens([
      salmon,
      satay,
      rice,
    ]);

    expect(allowed.map(r => r.id)).toEqual(['rice']);
    expect(excludedAllergenIds.sort()).toEqual(['peanut', 'seafood']);
  });

  test('chưa khai báo dị ứng → giữ nguyên danh sách, không báo dị ứng nào', () => {
    const list = [
      recipe({ id: 'a', allergenIds: ['egg'] }),
      recipe({ id: 'b' }),
    ];

    const { allowed, excludedAllergenIds } = filterOutUserAllergens(list);

    expect(allowed).toEqual(list);
    expect(excludedAllergenIds).toEqual([]);
  });

  test('mọi món đều chứa dị ứng → danh sách rỗng (không trả món chưa lọc)', () => {
    useUserProfileStore.setState({ allergyIds: ['egg'] });

    const { allowed } = filterOutUserAllergens([
      recipe({ allergenIds: ['egg'] }),
    ]);

    expect(allowed).toEqual([]);
  });
});

describe('matchesCalorieFilter', () => {
  test.each([
    ['under300', 299, true],
    ['under300', 300, false],
    ['300to500', 300, true],
    ['300to500', 500, true],
    ['300to500', 501, false],
    ['over500', 500, false],
    ['over500', 501, true],
  ] as const)('%s với %i kcal → %s', (filter, calories, expected) => {
    const item = recipe({
      nutritionPerServing: { calories, carbsG: 0, proteinG: 0, fatG: 0 },
    });

    expect(matchesCalorieFilter(item, filter)).toBe(expected);
  });

  test('không chọn khoảng calo → món nào cũng khớp', () => {
    expect(
      matchesCalorieFilter(
        recipe({
          nutritionPerServing: {
            calories: 1200,
            carbsG: 0,
            proteinG: 0,
            fatG: 0,
          },
        }),
        undefined,
      ),
    ).toBe(true);
  });
});

describe('foldText / matchIngredientCount', () => {
  test('bỏ dấu tiếng Việt, đ → d, chữ thường, cắt khoảng trắng', () => {
    expect(foldText('  Đậu Hũ Non ')).toBe('dau hu non');
    expect(foldText('Cà chua bi')).toBe('ca chua bi');
  });

  test('đếm nguyên liệu khớp theo cả hai chiều chứa nhau, bỏ qua tên rỗng', () => {
    const item = recipe({
      ingredients: ingredients('Cà chua bi', 'Ức gà phi lê', 'Sốt mè rang'),
    });

    expect(
      matchIngredientCount(item, ['ca chua', 'ỨC GÀ PHI LÊ TƯƠI', '   ']),
    ).toBe(2);
    expect(matchIngredientCount(item, ['thịt bò'])).toBe(0);
  });
});

describe('rankByPantry', () => {
  test('bỏ món không khớp nguyên liệu nào, xếp theo tỉ lệ nguyên liệu đang có giảm dần', () => {
    const half = recipe({
      id: 'half',
      ingredients: ingredients('Trứng gà', 'Cà chua'),
    });
    const full = recipe({ id: 'full', ingredients: ingredients('Trứng gà') });
    const third = recipe({
      id: 'third',
      ingredients: ingredients('Trứng gà', 'Thịt bò', 'Hành tây'),
    });
    const none = recipe({ id: 'none', ingredients: ingredients('Cá hồi') });

    const ranked = rankByPantry([third, none, half, full], ['trứng']);

    expect(ranked.map(m => m.recipe.id)).toEqual(['full', 'half', 'third']);
    expect(ranked[1]).toMatchObject({ matchedCount: 1, totalIngredients: 2 });
  });
});
