import type { FoodItem, PickedFood } from '../types/nutrition.types';

/** Món chọn từ FoodSearch → dòng thêm vào danh sách AI Snap, theo khẩu phần mặc định của món. */
export function pickedFoodFromItem(food: FoodItem, now: number = Date.now()): PickedFood {
  const serving =
    food.servingOptions.find(option => option.id === food.defaultServingId) ?? food.servingOptions[0];
  return {
    key: `${food.id}-${now}`,
    foodId: food.id,
    foodName: food.name,
    servingLabel: serving?.label ?? '',
    grams: serving?.grams ?? 0,
    nutrition: food.nutritionPerServing,
  };
}
