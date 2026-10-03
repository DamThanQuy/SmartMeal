/**
 * Quy đổi MealType FE (lowercase) ↔ BE (PascalCase) — docs/fetch-api/part1 §3.6, §4.10.
 */
import {
  fromApiMealType,
  MEAL_TYPES,
  toApiMealType,
  type ApiMealType,
} from '@/types/meal.types';

describe('toApiMealType', () => {
  test('PascalCase đúng giá trị backend', () => {
    expect(toApiMealType('breakfast')).toBe('Breakfast');
    expect(toApiMealType('lunch')).toBe('Lunch');
    expect(toApiMealType('dinner')).toBe('Dinner');
    expect(toApiMealType('snack')).toBe('Snack');
  });
});

describe('fromApiMealType', () => {
  test('không phân biệt hoa/thường', () => {
    expect(fromApiMealType('Breakfast')).toBe('breakfast');
    expect(fromApiMealType('LUNCH')).toBe('lunch');
    expect(fromApiMealType(' dinner ')).toBe('dinner');
  });

  test('giá trị lạ rơi về snack', () => {
    expect(fromApiMealType('Brunch')).toBe('snack');
    expect(fromApiMealType('')).toBe('snack');
  });

  test('khứ hồi với mọi MealType', () => {
    const apiValues: ApiMealType[] = MEAL_TYPES.map(toApiMealType);
    expect(apiValues.map(fromApiMealType)).toEqual(MEAL_TYPES);
  });
});
