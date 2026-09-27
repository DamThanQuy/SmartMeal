import { useQuery } from '@tanstack/react-query';
import { nutritionService, type FoodSearchFilter } from '../services/nutritionService';

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
