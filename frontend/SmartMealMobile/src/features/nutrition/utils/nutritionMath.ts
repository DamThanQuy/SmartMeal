import type { NutritionInfo } from '../types/nutrition.types';

const EMPTY_NUTRITION: NutritionInfo = {
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  sugarG: 0,
  sodiumMg: 0,
  fiberG: 0,
};

/** BR-053 — dùng để tính lại dinh dưỡng khi user sửa khối lượng (EditMealLog, FoodDetail). */
export function nutritionPerGram(total: NutritionInfo, grams: number): NutritionInfo {
  if (grams <= 0) return EMPTY_NUTRITION;
  return {
    calories: total.calories / grams,
    proteinG: total.proteinG / grams,
    carbsG: total.carbsG / grams,
    fatG: total.fatG / grams,
    sugarG: (total.sugarG ?? 0) / grams,
    sodiumMg: (total.sodiumMg ?? 0) / grams,
    fiberG: (total.fiberG ?? 0) / grams,
  };
}

export function scaleNutritionByGrams(perGram: NutritionInfo, grams: number): NutritionInfo {
  return {
    calories: Math.round(perGram.calories * grams),
    proteinG: Math.round(perGram.proteinG * grams),
    carbsG: Math.round(perGram.carbsG * grams),
    fatG: Math.round(perGram.fatG * grams),
    sugarG: Math.round((perGram.sugarG ?? 0) * grams),
    sodiumMg: Math.round((perGram.sodiumMg ?? 0) * grams),
    fiberG: Math.round((perGram.fiberG ?? 0) * grams),
  };
}

export function sumNutrition(items: NutritionInfo[]): NutritionInfo {
  return items.reduce<NutritionInfo>(
    (total, item) => ({
      calories: total.calories + item.calories,
      proteinG: total.proteinG + item.proteinG,
      carbsG: total.carbsG + item.carbsG,
      fatG: total.fatG + item.fatG,
      sugarG: (total.sugarG ?? 0) + (item.sugarG ?? 0),
      sodiumMg: (total.sodiumMg ?? 0) + (item.sodiumMg ?? 0),
      fiberG: (total.fiberG ?? 0) + (item.fiberG ?? 0),
    }),
    { ...EMPTY_NUTRITION },
  );
}
