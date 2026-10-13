// DTO của backend cho /grocery/* (docs/SmartMeal_API_Contract.md) — chỉ service và mapper import.

export interface GroceryItemDto {
  id: string;
  ingredientName: string;
  amount: number;
  unit: string;
  /** Chuỗi tự do: món sinh từ thực đơn dùng nhóm của BE ("Rau củ & Trái cây"…), món tự thêm giữ nhóm FE gửi lên. */
  category: string;
  estimatedPriceVnd: number;
  isChecked: boolean;
  recipeTitle: string | null;
  mergedFromRecipeCount: number;
  isManual: boolean;
}

export interface GroceryCategoryDto {
  categoryName: string;
  items: GroceryItemDto[];
}

export interface GroceryTripDto {
  id: string;
  periodStart: string | null;
  periodEnd: string | null;
  purchasedItems: number;
  pendingItemsKept: number;
  estimatedCostVnd: number;
  actualCostVnd: number | null;
  completedAt: string;
}

export interface GrocerySummaryDto {
  totalItems: number;
  checkedItems: number;
  totalEstimatedCostVnd: number;
  categories: GroceryCategoryDto[];
  periodStart: string | null;
  periodEnd: string | null;
  generatedAt: string | null;
  lastTrip: GroceryTripDto | null;
}

export interface GenerateGroceryRequestDto {
  startDate: string;
  endDate: string;
  /** true = thay phần sinh từ thực đơn (giữ món tự thêm). */
  clearExisting: boolean;
}

export interface AddCustomGroceryItemDto {
  ingredientName: string;
  amount: number;
  unit: string;
  category: string;
  estimatedPriceVnd?: number;
}

export interface ToggleGroceryItemRequestDto {
  isChecked: boolean;
}

export interface CompleteGroceryRequestDto {
  actualCostVnd?: number;
  keepPending: boolean;
  nextStartDate?: string;
}
