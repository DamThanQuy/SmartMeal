import { create } from 'zustand';
import { registerUserDataReset } from '@/state/resetUserData';
import type { RecipeCollection } from '../types/recipe.types';

// "Favorites/Collections thao tác trên state mock cục bộ" (docs/ui-mock-prompts.md Phase 5) —
// chỉ feature recipes dùng nên đặt local theo .claude/rules/architecture.md, không đẩy lên
// src/state global.
interface FavoritesState {
  favoriteIds: string[];
  collections: RecipeCollection[];
  toggleFavorite: (recipeId: string) => void;
  isFavorite: (recipeId: string) => boolean;
  /** CreateCollectionScreen (Đợt 12, BR-150) — trả về id bộ sưu tập mới để điều hướng thẳng
   * sang CollectionDetail. */
  createCollection: (name: string) => string;
  /** CollectionDetailScreen "Đổi tên" (BR-152, chỉ chủ sở hữu — mock chỉ có 1 user nên luôn hợp lệ). */
  renameCollection: (collectionId: string, name: string) => void;
  deleteCollection: (collectionId: string) => void;
  removeRecipeFromCollection: (collectionId: string, recipeId: string) => void;
}

let collectionIdCounter = 0;
function nextCollectionId(): string {
  collectionIdCounter += 1;
  return `collection-${Date.now()}-${collectionIdCounter}`;
}

// design/Discovery.dc.html, Favorites.dc.html — seed 2 món đã yêu thích sẵn để minh hoạ cả 2
// trạng thái tim (đã lưu / chưa lưu) ngay khi vào màn. recipeIds của 3 bộ sưu tập mẫu chia từ
// RECIPE_DATABASE_MOCK (8 món) — design gốc ghi 8/12/5 món chỉ là số minh hoạ tĩnh, không khớp
// dữ liệu thật (chỉ có 8 công thức trong mock DB), nên chọn phân bổ hợp lý thay vì giữ số cũ.
const INITIAL_FAVORITES_STATE: Pick<FavoritesState, 'favoriteIds' | 'collections'> = {
  favoriteIds: ['ga-ap-chao-rau-cu', 'salad-uc-ga'],
  collections: [
    { id: 'breakfast-fast', name: 'Bữa sáng nhanh', recipeIds: ['yen-mach-chuoi', 'salad-trung'] },
    {
      id: 'weight-loss',
      name: 'Món giảm cân',
      recipeIds: ['salad-uc-ga', 'dau-hu-sot-ca-chua', 'bo-xao-bong-cai'],
    },
    {
      id: 'weekend',
      name: 'Món cuối tuần',
      recipeIds: ['ga-ap-chao-rau-cu', 'sup-bi-do-kem-tuoi', 'trung-xao-ca-chua'],
    },
  ],
};

export const useFavoritesStore = create<FavoritesState>()((set, get) => ({
  ...INITIAL_FAVORITES_STATE,
  toggleFavorite: recipeId =>
    set(state => ({
      favoriteIds: state.favoriteIds.includes(recipeId)
        ? state.favoriteIds.filter(id => id !== recipeId)
        : [...state.favoriteIds, recipeId],
    })),
  isFavorite: recipeId => get().favoriteIds.includes(recipeId),

  createCollection: name => {
    const id = nextCollectionId();
    set(state => ({ collections: [{ id, name, recipeIds: [] }, ...state.collections] }));
    return id;
  },
  renameCollection: (collectionId, name) =>
    set(state => ({
      collections: state.collections.map(collection =>
        collection.id === collectionId ? { ...collection, name } : collection,
      ),
    })),
  deleteCollection: collectionId =>
    set(state => ({
      collections: state.collections.filter(collection => collection.id !== collectionId),
    })),
  removeRecipeFromCollection: (collectionId, recipeId) =>
    set(state => ({
      collections: state.collections.map(collection =>
        collection.id === collectionId
          ? { ...collection, recipeIds: collection.recipeIds.filter(id => id !== recipeId) }
          : collection,
      ),
    })),
}));

// BR-271 — DeleteDataScreen: yêu thích/bộ sưu tập về lại seed khởi tạo (xem src/state/resetUserData.ts).
registerUserDataReset('favorites', () => useFavoritesStore.setState(INITIAL_FAVORITES_STATE));
