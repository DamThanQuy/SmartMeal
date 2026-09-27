import { create } from 'zustand';
import type { RecipeCollection } from '../types/recipe.types';

// "Favorites/Collections thao tác trên state mock cục bộ" (docs/ui-mock-prompts.md Phase 5) —
// chỉ feature recipes dùng nên đặt local theo .claude/rules/architecture.md, không đẩy lên
// src/state global.
interface FavoritesState {
  favoriteIds: string[];
  collections: RecipeCollection[];
  toggleFavorite: (recipeId: string) => void;
  isFavorite: (recipeId: string) => boolean;
}

// design/Discovery.dc.html, Favorites.dc.html — seed 2 món đã yêu thích sẵn để minh hoạ cả 2
// trạng thái tim (đã lưu / chưa lưu) ngay khi vào màn.
export const useFavoritesStore = create<FavoritesState>()((set, get) => ({
  favoriteIds: ['ga-ap-chao-rau-cu', 'salad-uc-ga'],
  // Số lượng món ở đây là dữ liệu tĩnh minh hoạ (chưa có 8/12/5 món thật cho từng bộ sưu tập
  // trong mock database) — tap vào collection card điều hướng sang Discovery như đúng href
  // trong design/Favorites.dc.html, chưa lọc theo đúng collection (TODO khi có DB công thức lớn hơn).
  collections: [
    { id: 'breakfast-fast', name: 'Bữa sáng nhanh', recipeCount: 8 },
    { id: 'weight-loss', name: 'Món giảm cân', recipeCount: 12 },
    { id: 'weekend', name: 'Món cuối tuần', recipeCount: 5 },
  ],
  toggleFavorite: recipeId =>
    set(state => ({
      favoriteIds: state.favoriteIds.includes(recipeId)
        ? state.favoriteIds.filter(id => id !== recipeId)
        : [...state.favoriteIds, recipeId],
    })),
  isFavorite: recipeId => get().favoriteIds.includes(recipeId),
}));
