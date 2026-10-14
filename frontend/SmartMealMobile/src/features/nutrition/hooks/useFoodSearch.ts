import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { nutritionService } from '../services/nutritionService';
import type { FoodItem, FoodSearchFilter, NewFoodInput } from '../types/nutrition.types';

const SEARCH_DEBOUNCE_MS = 300;

const foodDetailQueryKey = (foodId: string) => ['foods', 'detail', foodId] as const;

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
    queryKey: foodDetailQueryKey(foodId),
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

// Nút tim ở FoodDetail: đổi ngay trạng thái trên chi tiết món đang mở (theo kết quả BE trả về) và
// làm mới các danh sách tìm món để tab "Yêu thích" khớp.
export function useSetFoodFavorite(foodId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isFavorite: boolean) => nutritionService.setFoodFavorite(foodId, isFavorite),
    onSuccess: isFavorite => {
      queryClient.setQueryData<FoodItem | undefined>(foodDetailQueryKey(foodId), food =>
        food ? { ...food, isFavorite } : food,
      );
      void queryClient.invalidateQueries({ queryKey: ['foods', 'search'] });
    },
  });
}
