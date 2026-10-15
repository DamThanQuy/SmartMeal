// BR-170→BR-174 — Smart Grocery List: sinh từ Meal Plan, cộng dồn nguyên liệu trùng, phân loại,
// check-off Pending/Purchased, ước tính chi phí.

import type { GroceryCategory } from '../utils/groceryAggregation';

export type GroceryItemStatus = 'pending' | 'purchased';

export interface GroceryItem {
  id: string;
  name: string;
  /** Nhãn khối lượng đã cộng dồn, vd. "500 g", "2 cây" (BR-171). */
  amountLabel: string;
  category: string;
  status: GroceryItemStatus;
  /** ≥ 2 khi nguyên liệu này được gộp từ nhiều bữa trong thực đơn — design "Gộp từ 2 món". */
  mergedFromRecipeCount: number;
  estimatedCostVnd: number;
  /** Người dùng tự thêm (không sinh từ thực đơn) — không bị xóa khi tạo lại danh sách. */
  isManual: boolean;
}

export interface GroceryCategoryGroup {
  category: string;
  items: GroceryItem[];
}

/** Một lần "Hoàn tất mua sắm" đã lưu trên server (BR-174 — chi phí thực tế). */
export interface GroceryTrip {
  completedAtIso: string;
  purchasedItems: number;
  pendingItemsKept: number;
  estimatedCostVnd: number;
  actualCostVnd?: number;
}

export interface GroceryList {
  /** Tuần đang xem (Thứ Hai, yyyy-MM-dd). */
  weekStartIso: string;
  /** Khoảng ngày thực đơn mà danh sách hiện tại được tạo từ (null khi chưa tạo từ thực đơn). */
  periodStartIso: string | null;
  periodEndIso: string | null;
  /** Thời điểm tạo danh sách từ thực đơn gần nhất (ISO, UTC). */
  generatedAtIso: string | null;
  groups: GroceryCategoryGroup[];
  totalItems: number;
  purchasedItems: number;
  /** BR-174 — chỉ mang tính ước tính, không phải giá thị trường thật. */
  estimatedTotalCostVnd: number;
  lastTrip: GroceryTrip | null;
}

export interface CompleteShoppingInput {
  /** true = "Đánh dấu tất cả đã mua" trước khi hoàn tất. */
  markAllPurchased: boolean;
  /** Giữ các món chưa mua (cộng vào danh sách tuần sau). */
  keepPending: boolean;
  actualCostVnd?: number;
}

export interface CompleteShoppingResult {
  list: GroceryList;
  /** Câu tóm tắt của server, vd. "Đã giữ lại 3 món chưa mua. Kỳ tiếp theo chưa có thực đơn." */
  note?: string;
}

/** Món người dùng tự thêm vào danh sách đi chợ (GroceryAdd). */
export interface ManualGroceryItemInput {
  name: string;
  quantity: number;
  unit: string;
  category: GroceryCategory;
  /** Ước tính theo bảng giá trung bình (BR-174); bỏ trống = chưa có giá. */
  estimatedPriceVnd?: number;
}
