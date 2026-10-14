import { registerUserDataReset } from '@/state/resetUserData';
import type { FoodItem, NewFoodInput } from '../types/nutrition.types';

// BR-121 — CreateFoodScreen (Đợt 10): món do user tự nhập, gắn nhãn "Do bạn nhập", không bịa dữ
// liệu thay Backend. Chỉ dùng cho bản mock của nutritionService (in-memory, tách khỏi catalog "đã
// xác minh" để reset độc lập); bản API lưu món này trên server qua POST /foods.
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
