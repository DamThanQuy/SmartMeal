import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { nutritionService, type FoodSearchFilter } from '../services/nutritionService';
import type { NewFoodInput } from '../types/nutrition.types';

export function useFoodSearch(query: string, filter: FoodSearchFilter) {
  return useQuery({
    queryKey: ['foods', 'search', query, filter],
    queryFn: () => nutritionService.searchFoods(query, filter),
  });
}

export function useFoodDetail(foodId: string) {
  return useQuery({
    queryKey: ['foods', 'detail', foodId],
    queryFn: () => nutritionService.getFoodById(foodId),
  });
}

// BR-121 — CreateFoodScreen (Đợt 10): lưu món tự nhập, sau đó FoodSearch filter="mine" phải
// thấy ngay món vừa tạo.
export function useCreateFood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewFoodInput) => nutritionService.createFood(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['foods', 'search'] });
    },
  });
}
