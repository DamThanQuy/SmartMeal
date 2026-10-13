import { create } from 'zustand';
import { registerUserDataReset } from '@/state/resetUserData';

// "Server" giả lập cho yêu thích/bộ sưu tập — CHỈ recipeService.mock.ts đọc/ghi store này (chế độ
// EXPO_PUBLIC_USE_MOCK_API). Screen/hook luôn đi qua recipeService + TanStack Query, không đọc thẳng
// store, nên chuyển sang API thật không phải sửa màn hình.
export interface MockCollection {
  id: string;
  name: string;
  isPublic: boolean;
  recipeIds: string[];
}

interface FavoritesState {
  favoriteIds: string[];
  collections: MockCollection[];
}

let collectionIdCounter = 0;
export function nextMockCollectionId(): string {
  collectionIdCounter += 1;
  return `collection-${Date.now()}-${collectionIdCounter}`;
}

// design/Discovery.dc.html, Favorites.dc.html — seed 2 món đã yêu thích sẵn để minh hoạ cả 2
// trạng thái tim (đã lưu / chưa lưu) ngay khi vào màn. recipeIds của 3 bộ sưu tập mẫu chia từ
// RECIPE_DATABASE_MOCK (8 món) — design gốc ghi 8/12/5 món chỉ là số minh hoạ tĩnh.
const INITIAL_FAVORITES_STATE: FavoritesState = {
  favoriteIds: ['ga-ap-chao-rau-cu', 'salad-uc-ga'],
  collections: [
    { id: 'breakfast-fast', name: 'Bữa sáng nhanh', isPublic: false, recipeIds: ['yen-mach-chuoi', 'salad-trung'] },
    {
      id: 'weight-loss',
      name: 'Món giảm cân',
      isPublic: false,
      recipeIds: ['salad-uc-ga', 'dau-hu-sot-ca-chua', 'bo-xao-bong-cai'],
    },
    {
      id: 'weekend',
      name: 'Món cuối tuần',
      isPublic: false,
      recipeIds: ['ga-ap-chao-rau-cu', 'sup-bi-do-kem-tuoi', 'trung-xao-ca-chua'],
    },
  ],
};

export const useFavoritesStore = create<FavoritesState>()(() => ({ ...INITIAL_FAVORITES_STATE }));

// BR-271 — DeleteDataScreen: yêu thích/bộ sưu tập về lại seed khởi tạo (xem src/state/resetUserData.ts).
registerUserDataReset('favorites', () => useFavoritesStore.setState(INITIAL_FAVORITES_STATE));
