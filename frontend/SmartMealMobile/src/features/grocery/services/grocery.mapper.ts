import type { GroceryItemDto, GrocerySummaryDto, GroceryTripDto } from '../types/grocery.api.types';
import type { GroceryCategoryGroup, GroceryItem, GroceryList, GroceryTrip } from '../types/grocery.types';
import { categorizeIngredient, GROCERY_CATEGORY_ORDER, type GroceryCategory } from '../utils/groceryAggregation';

// Giữ 6 nhóm của thiết kế (BR-172, design/Grocery.dc.html). BE lưu `category` là chuỗi tự do và tự sinh
// theo bộ tên riêng → quy đổi khi đọc; nhóm gộp/lạ thì phân loại lại theo tên nguyên liệu.
const BE_CATEGORY: Record<string, GroceryCategory> = {
  'Rau củ & Trái cây': 'Rau củ',
  'Thịt & Thủy hải sản': 'Thịt cá',
  'Sữa & Trứng': 'Sữa',
};

function isFeCategory(value: string): value is GroceryCategory {
  return (GROCERY_CATEGORY_ORDER as readonly string[]).includes(value);
}

export function toFeCategory(category: string, ingredientName: string): GroceryCategory {
  if (isFeCategory(category)) return category;
  return BE_CATEGORY[category] ?? categorizeIngredient(ingredientName);
}

export function formatGroceryAmount(amount: number, unit: string): string {
  const rounded = Number.isInteger(amount) ? amount : Math.round(amount * 10) / 10;
  return `${rounded} ${unit}`.trim();
}

export function fromGroceryItemDto(dto: GroceryItemDto): GroceryItem {
  return {
    id: dto.id,
    name: dto.ingredientName,
    amountLabel: formatGroceryAmount(dto.amount, dto.unit),
    category: toFeCategory(dto.category, dto.ingredientName),
    status: dto.isChecked ? 'purchased' : 'pending',
    mergedFromRecipeCount: dto.mergedFromRecipeCount,
    estimatedCostVnd: Number(dto.estimatedPriceVnd),
    isManual: dto.isManual,
  };
}

function fromTripDto(dto: GroceryTripDto): GroceryTrip {
  return {
    completedAtIso: dto.completedAt,
    purchasedItems: dto.purchasedItems,
    pendingItemsKept: dto.pendingItemsKept,
    estimatedCostVnd: Number(dto.estimatedCostVnd),
    actualCostVnd: dto.actualCostVnd === null ? undefined : Number(dto.actualCostVnd),
  };
}

/** Nhóm lại theo 6 nhóm FE (một nhóm BE có thể tách ra nhiều nhóm FE) và sắp theo thứ tự của thiết kế. */
export function fromGrocerySummaryDto(weekStartIso: string, dto: GrocerySummaryDto): GroceryList {
  const items = dto.categories.flatMap(category => category.items.map(fromGroceryItemDto));
  const groups: GroceryCategoryGroup[] = GROCERY_CATEGORY_ORDER.map(category => ({
    category,
    items: items.filter(item => item.category === category),
  })).filter(group => group.items.length > 0);

  return {
    weekStartIso,
    periodStartIso: dto.periodStart,
    periodEndIso: dto.periodEnd,
    generatedAtIso: dto.generatedAt,
    groups,
    totalItems: dto.totalItems,
    purchasedItems: dto.checkedItems,
    estimatedTotalCostVnd: Number(dto.totalEstimatedCostVnd),
    lastTrip: dto.lastTrip ? fromTripDto(dto.lastTrip) : null,
  };
}
