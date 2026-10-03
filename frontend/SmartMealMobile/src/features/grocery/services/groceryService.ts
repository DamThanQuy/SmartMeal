import { addDays, format } from 'date-fns';
import { shiftWeek } from '@/features/meal-planner';
import { request } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';
import type {
  GroceryItem,
  GroceryItemStatus,
  GroceryList,
} from '../types/grocery.types';

export interface ManualGroceryItemInput {
  name: string;
  quantity: number;
  unit: string;
  category: string;
}

interface GroceryItemApiDto {
  id: string;
  ingredientName: string;
  amount: number;
  unit: string;
  category: string;
  estimatedPriceVnd: number;
  isChecked: boolean;
}

interface GrocerySummaryApiDto {
  totalItems: number;
  checkedItems: number;
  totalEstimatedCostVnd: number;
  categories: Array<{
    categoryName: string;
    items: GroceryItemApiDto[];
  }>;
}

function mapCategory(category: string): string {
  const categories: Record<string, string> = {
    'Rau củ & Trái cây': 'Rau củ',
    'Thịt & Thủy hải sản': 'Thịt cá',
    'Sữa & Trứng': 'Sữa',
  };
  return categories[category] ?? category;
}

function formatAmount(amount: number, unit: string): string {
  const value = Number.isInteger(amount) ? String(amount) : String(amount).replace(/\.0+$/, '');
  return `${value} ${unit}`;
}

function mapItem(item: GroceryItemApiDto): GroceryItem {
  return {
    id: item.id,
    name: item.ingredientName,
    amountLabel: formatAmount(item.amount, item.unit),
    category: mapCategory(item.category),
    status: item.isChecked ? 'purchased' : 'pending',
    mergedFromRecipeCount: 1,
    estimatedCostVnd: Number(item.estimatedPriceVnd),
  };
}

function mapSummary(weekStartIso: string, summary: GrocerySummaryApiDto): GroceryList {
  const groups = summary.categories
    .map(category => ({
      category: mapCategory(category.categoryName),
      items: category.items.map(mapItem),
    }))
    .filter(group => group.items.length > 0);

  return {
    weekStartIso,
    groups,
    totalItems: summary.totalItems,
    purchasedItems: summary.checkedItems,
    estimatedTotalCostVnd: Number(summary.totalEstimatedCostVnd),
  };
}

function weekEndIso(weekStartIso: string): string {
  return format(addDays(new Date(weekStartIso), 6), 'yyyy-MM-dd');
}

function flattenItems(list: GroceryList): GroceryItem[] {
  return list.groups.flatMap(group => group.items);
}

export const groceryService = {
  async getGroceryList(weekStartIso: string): Promise<GroceryList> {
    const response = await request<GrocerySummaryApiDto>({
      method: 'GET',
      url: ENDPOINTS.grocery.list,
    });
    return mapSummary(weekStartIso, response);
  },

  async toggleItemStatus(
    weekStartIso: string,
    itemId: string,
    nextStatus?: GroceryItemStatus,
  ): Promise<void> {
    const list = nextStatus ? undefined : await this.getGroceryList(weekStartIso);
    const currentItem = list ? flattenItems(list).find(item => item.id === itemId) : undefined;
    const isChecked = nextStatus ? nextStatus === 'purchased' : currentItem?.status !== 'purchased';
    await request<GroceryItemApiDto>({
      method: 'PATCH',
      url: ENDPOINTS.grocery.check(itemId),
      data: { isChecked },
    });
  },

  async markAllPurchased(weekStartIso: string): Promise<void> {
    const list = await this.getGroceryList(weekStartIso);
    await Promise.all(
      flattenItems(list)
        .filter(item => item.status !== 'purchased')
        .map(item => this.toggleItemStatus(weekStartIso, item.id, 'purchased')),
    );
  },

  async addManualItem(weekStartIso: string, input: ManualGroceryItemInput): Promise<GroceryItem> {
    const response = await request<GroceryItemApiDto>({
      method: 'POST',
      url: ENDPOINTS.grocery.items,
      data: {
        ingredientName: input.name,
        amount: input.quantity,
        unit: input.unit,
        category: input.category,
      },
    });
    return mapItem(response);
  },

  async carryOverPendingItems(weekStartIso: string): Promise<void> {
    await request<boolean>({ method: 'DELETE', url: ENDPOINTS.grocery.clearChecked });
    const nextWeek = shiftWeek(weekStartIso, 1);
    await request<GrocerySummaryApiDto>({
      method: 'POST',
      url: ENDPOINTS.grocery.generateFromPlan,
      data: {
        startDate: nextWeek,
        endDate: weekEndIso(nextWeek),
        clearExisting: false,
      },
    });
  },
};
