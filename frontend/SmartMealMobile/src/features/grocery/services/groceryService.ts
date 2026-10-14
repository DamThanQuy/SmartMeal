import { selectService } from '@/services/api';
import { groceryApiService } from './groceryService.api';
import { groceryMockService } from './groceryService.mock';

// Hook/screen chỉ import `groceryService`; EXPO_PUBLIC_USE_MOCK_API quyết định dùng bản mock hay gọi
// backend thật (xem serviceSelector.ts).
export const groceryService = selectService('groceryService', groceryMockService, groceryApiService);

export type { ManualGroceryItemInput } from './groceryService.mock';
