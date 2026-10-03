import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { nutritionService } from '../services/nutritionService';
import type { FoodSearchFilter, NewFoodInput } from '../types/nutrition.types';

const SEARCH_DEBOUNCE_MS = 300;

export function useFoodSearch(query: string, filter: FoodSearchFilter) {
  // Chờ người dùng ngừng gõ rồi mới gọi tìm kiếm (mỗi lần gõ là 1 request lên backend).
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  return useQuery({
    queryKey: ['foods', 'search', debouncedQuery, filter],
    queryFn: () => nutritionService.searchFoods(debouncedQuery, filter),
    // Đang gõ tiếp thì giữ kết quả cũ thay vì nhấp nháy Loading; đổi bộ lọc thì không giữ (khác
    // danh sách hoàn toàn).
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[3] === filter ? previousData : undefined,
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
