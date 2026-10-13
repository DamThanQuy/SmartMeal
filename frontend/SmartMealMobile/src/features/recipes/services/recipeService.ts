import { selectService } from '@/services/api';
import { recipeApiService } from './recipeService.api';
import { recipeMockService } from './recipeService.mock';

// Hook/screen chỉ import `recipeService`; EXPO_PUBLIC_USE_MOCK_API quyết định dùng bản mock hay gọi
// backend thật (xem serviceSelector.ts). Bật mock thì KHÔNG phát sinh request nào tới backend.
export const recipeService = selectService('recipeService', recipeMockService, recipeApiService);

export { filterOutUserAllergens } from './recipeFilters';
