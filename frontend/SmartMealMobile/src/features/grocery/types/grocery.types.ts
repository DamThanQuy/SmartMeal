// BR-170→BR-174 — Smart Grocery List: sinh từ Meal Plan, cộng dồn nguyên liệu trùng, phân loại,
// check-off Pending/Purchased, ước tính chi phí.

export type GroceryItemStatus = 'pending' | 'purchased';

export interface GroceryItem {
  /** Khoá ổn định = tên nguyên liệu chuẩn hoá — giữ nguyên qua các lần tính lại danh sách để
   * không mất trạng thái Pending/Purchased đã đánh dấu (BR-173) khi Meal Plan đổi. */
  id: string;
  name: string;
  /** Nhãn khối lượng đã cộng dồn, vd. "500 g", "2 cây" (BR-171). */
  amountLabel: string;
  category: string;
  status: GroceryItemStatus;
  /** ≥ 2 khi nguyên liệu này được gộp từ nhiều món trong thực đơn — design "Gộp từ 2 món". */
  mergedFromRecipeCount: number;
  estimatedCostVnd: number;
}

export interface GroceryCategoryGroup {
  category: string;
  items: GroceryItem[];
}

export interface GroceryList {
  weekStartIso: string;
  groups: GroceryCategoryGroup[];
  totalItems: number;
  purchasedItems: number;
  /** BR-174 — chỉ mang tính ước tính, không phải giá thị trường thật. */
  estimatedTotalCostVnd: number;
}
