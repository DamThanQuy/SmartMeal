import { registerUserDataReset } from '@/state/resetUserData';
import type { FoodItem, NewFoodInput } from '../types/nutrition.types';

// BR-121 — CreateFoodScreen (Đợt 10): món do user tự nhập, gắn nhãn "Do bạn nhập", không bịa dữ
// liệu thay Backend. Backend chưa có endpoint tạo món (P1-BE-08) nên danh sách này chỉ nằm ở máy
// (in-memory) — dùng chung cho bản mock lẫn bản API của nutritionService, tách khỏi catalog "đã
// xác minh" để reset độc lập.
let userCreatedFoods: FoodItem[] = [];
let userFoodIdCounter = 0;

export function listUserCreatedFoods(): FoodItem[] {
  return userCreatedFoods;
}

export function findUserCreatedFood(foodId: string): FoodItem | undefined {
  return userCreatedFoods.find(food => food.id === foodId);
}

export function addUserCreatedFood(input: NewFoodInput): FoodItem {
  userFoodIdCounter += 1;
  const food: FoodItem = {
    id: `user-food-${Date.now()}-${userFoodIdCounter}`,
    name: input.name,
    verified: false,
    isUserCreated: true,
    servingOptions: [{ id: 'default', label: `${input.amount} ${input.unit}`, grams: input.amount }],
    defaultServingId: 'default',
    nutritionPerServing: input.nutrition,
  };
  userCreatedFoods = [food, ...userCreatedFoods];
  return food;
}

// BR-271 — xóa món do user tự nhập (CreateFoodScreen, Đợt 10).
registerUserDataReset('userCreatedFoods', () => {
  userCreatedFoods = [];
});
