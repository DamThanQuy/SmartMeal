import { addDays, format } from 'date-fns';
import { getMockDelayMs, wait } from '@/config/mock';
import { mealPlannerService, shiftWeek, type DayMealPlan } from '@/features/meal-planner';
import { recipeService } from '@/features/recipes';
import { getCurrentMockScenario } from '@/state/app/appStore';
import { registerUserDataReset } from '@/state/resetUserData';
import { MEAL_TYPES } from '@/types/meal.types';
import type {
  CompleteShoppingInput,
  CompleteShoppingResult,
  GroceryItem,
  GroceryItemStatus,
  GroceryList,
  GroceryTrip,
} from '../types/grocery.types';
import {
  categorizeIngredient,
  estimateItemCostVnd,
  formatAmountLabel,
  GROCERY_CATEGORY_ORDER,
  manualQuantityToParsedAmount,
  parseIngredientAmount,
  type GroceryCategory,
  type ParsedAmount,
} from '../utils/groceryAggregation';

export interface ManualGroceryItemInput {
  name: string;
  quantity: number;
  unit: string;
  category: GroceryCategory;
  /** Ước tính theo bảng giá trung bình (BR-174); bỏ trống = chưa có giá. */
  estimatedPriceVnd?: number;
}

interface CarriedOverIngredient {
  name: string;
  category: string;
  parsed: ParsedAmount | null;
}

interface AggregatedIngredient {
  name: string;
  category: string;
  parsed: ParsedAmount | null;
  mergedFromRecipeCount: number;
}

// Bản giả lập (EXPO_PUBLIC_USE_MOCK_API) — sinh danh sách trực tiếp từ thực đơn (mealPlannerService
// bản mock) và công thức (recipeService bản mock), in-memory store mô phỏng backend.

async function simulate(errorMessage: string): Promise<'success' | 'empty'> {
  const scenario = getCurrentMockScenario();
  await wait(getMockDelayMs(scenario));
  if (scenario === 'error') throw new Error(errorMessage);
  return scenario === 'empty' ? 'empty' : 'success';
}

// BR-171 — khoá gộp theo tên chuẩn hoá + loại đơn vị (g/ml/piece:đơn vị gốc) để "200g + 300g
// thịt gà = 500g" nhưng không gộp sai giữa "1 quả" và "1 củ" của 2 nguyên liệu khác đơn vị.
function aggregationKey(name: string, parsed: ParsedAmount | null): string {
  const normalizedName = name.trim().toLowerCase();
  if (!parsed) return `${normalizedName}::text`;
  if (parsed.unitKind === 'piece') return `${normalizedName}::piece:${parsed.unitLabel}`;
  return `${normalizedName}::${parsed.unitKind}`;
}

function addToAggregate(aggregated: Map<string, AggregatedIngredient>, name: string, category: string, parsed: ParsedAmount | null) {
  const key = aggregationKey(name, parsed);
  const existing = aggregated.get(key);
  if (existing) {
    if (existing.parsed && parsed) {
      existing.parsed = { ...existing.parsed, quantity: existing.parsed.quantity + parsed.quantity };
    }
    existing.mergedFromRecipeCount += 1;
  } else {
    aggregated.set(key, { name, category, parsed, mergedFromRecipeCount: 1 });
  }
}

async function aggregateIngredients(daysMeals: DayMealPlan[]): Promise<Map<string, AggregatedIngredient>> {
  const aggregated = new Map<string, AggregatedIngredient>();
  for (const dayMeals of daysMeals) {
    for (const mealType of MEAL_TYPES) {
      const slot = dayMeals[mealType];
      const recipe = slot ? await recipeService.getRecipeById(slot.recipeId) : undefined;
      recipe?.ingredients.forEach(ingredient =>
        addToAggregate(aggregated, ingredient.name, categorizeIngredient(ingredient.name), parseIngredientAmount(ingredient.amount)),
      );
    }
  }
  return aggregated;
}

const statusByWeek = new Map<string, Map<string, GroceryItemStatus>>();
// design/GroceryAdd.dc.html — nguyên liệu tự thêm, tách khỏi danh sách sinh từ thực đơn.
const manualItemsByWeek = new Map<string, GroceryItem[]>();
// design/GroceryDone.dc.html "Giữ lại N món chưa mua" — khoá theo tuần SẼ NHẬN, cộng dồn bằng đúng
// logic gộp khi tuần đó được build.
const carriedOverByWeek = new Map<string, CarriedOverIngredient[]>();
const tripsByWeek = new Map<string, GroceryTrip>();
// "Xóa món đã mua" — id các món sinh từ thực đơn đã dọn khỏi danh sách tuần (tạo lại thì hiện lại).
const clearedIdsByWeek = new Map<string, Set<string>>();
let manualItemIdCounter = 0;

function getStatusMap(weekStartIso: string): Map<string, GroceryItemStatus> {
  const existing = statusByWeek.get(weekStartIso);
  if (existing) return existing;
  const created = new Map<string, GroceryItemStatus>();
  statusByWeek.set(weekStartIso, created);
  return created;
}

function emptyList(weekStartIso: string): GroceryList {
  return {
    weekStartIso,
    periodStartIso: null,
    periodEndIso: null,
    generatedAtIso: null,
    groups: [],
    totalItems: 0,
    purchasedItems: 0,
    estimatedTotalCostVnd: 0,
    lastTrip: tripsByWeek.get(weekStartIso) ?? null,
  };
}

async function buildGroceryList(weekStartIso: string): Promise<GroceryList> {
  const plan = await mealPlannerService.getWeekPlan(weekStartIso);
  const aggregated = await aggregateIngredients(plan.days.map(day => day.meals));
  (carriedOverByWeek.get(weekStartIso) ?? []).forEach(entry =>
    addToAggregate(aggregated, entry.name, entry.category, entry.parsed),
  );

  const statusMap = getStatusMap(weekStartIso);
  const aggregatedItems: GroceryItem[] = Array.from(aggregated.entries()).map(([id, entry]) => ({
    id,
    name: entry.name,
    amountLabel: entry.parsed ? formatAmountLabel(entry.parsed.quantity, entry.parsed.unitKind, entry.parsed.unitLabel) : 'Vừa đủ',
    category: entry.category,
    status: statusMap.get(id) ?? 'pending',
    mergedFromRecipeCount: entry.mergedFromRecipeCount,
    estimatedCostVnd: estimateItemCostVnd(entry.name, entry.parsed),
    isManual: false,
  }));
  const manualItems = (manualItemsByWeek.get(weekStartIso) ?? []).map(item => ({
    ...item,
    status: statusMap.get(item.id) ?? item.status,
  }));
  const cleared = clearedIdsByWeek.get(weekStartIso);
  const items = [...aggregatedItems, ...manualItems].filter(item => !cleared?.has(item.id));

  const hasPlan = aggregatedItems.length > 0;
  return {
    ...emptyList(weekStartIso),
    periodStartIso: hasPlan ? weekStartIso : null,
    periodEndIso: hasPlan ? format(addDays(new Date(weekStartIso), 6), 'yyyy-MM-dd') : null,
    groups: GROCERY_CATEGORY_ORDER.map(category => ({
      category,
      items: items.filter(item => item.category === category),
    })).filter(group => group.items.length > 0),
    totalItems: items.length,
    purchasedItems: items.filter(item => item.status === 'purchased').length,
    estimatedTotalCostVnd: items.reduce((sum, item) => sum + item.estimatedCostVnd, 0),
  };
}

export const groceryMockService = {
  // BR-170/171/172 — sinh danh sách từ thực đơn hiện tại, cộng dồn + phân loại.
  async getGroceryList(weekStartIso: string): Promise<GroceryList> {
    if ((await simulate('Không thể tải danh sách đi chợ, vui lòng thử lại.')) === 'empty') return emptyList(weekStartIso);
    return buildGroceryList(weekStartIso);
  },

  /** Bản mock luôn tính "trực tiếp" từ thực đơn nên tạo lại = đọc lại. */
  async regenerateFromPlan(weekStartIso: string): Promise<GroceryList> {
    await simulate('Không tạo lại được danh sách, vui lòng thử lại.');
    // Món đã dọn hiện lại như món mới (chưa mua), giống BE sinh lại dòng từ thực đơn.
    const statusMap = getStatusMap(weekStartIso);
    clearedIdsByWeek.get(weekStartIso)?.forEach(id => statusMap.delete(id));
    clearedIdsByWeek.delete(weekStartIso);
    return buildGroceryList(weekStartIso);
  },

  // BR-173 — check-off Pending/Purchased theo trạng thái đích.
  async toggleItemStatus(weekStartIso: string, itemId: string, nextStatus: GroceryItemStatus): Promise<void> {
    await simulate('Không thể cập nhật, vui lòng thử lại.');
    getStatusMap(weekStartIso).set(itemId, nextStatus);
  },

  async markAllPurchased(weekStartIso: string): Promise<void> {
    await simulate('Không thể cập nhật, vui lòng thử lại.');
    const list = await buildGroceryList(weekStartIso);
    const statusMap = getStatusMap(weekStartIso);
    list.groups.forEach(group => group.items.forEach(item => statusMap.set(item.id, 'purchased')));
  },

  // design/GroceryAdd.dc.html — thêm nguyên liệu thủ công (BR-172 vẫn phân loại theo nhóm chọn).
  async addManualItem(weekStartIso: string, input: ManualGroceryItemInput): Promise<GroceryItem> {
    await simulate('Không thể thêm nguyên liệu, vui lòng thử lại.');
    manualItemIdCounter += 1;
    const parsed = manualQuantityToParsedAmount(input.quantity, input.unit);
    const item: GroceryItem = {
      id: `manual-${Date.now()}-${manualItemIdCounter}`,
      name: input.name,
      amountLabel: formatAmountLabel(parsed.quantity, parsed.unitKind, parsed.unitLabel),
      category: input.category,
      status: 'pending',
      mergedFromRecipeCount: 0,
      estimatedCostVnd: input.estimatedPriceVnd ?? estimateItemCostVnd(input.name, parsed),
      isManual: true,
    };
    manualItemsByWeek.set(weekStartIso, [...(manualItemsByWeek.get(weekStartIso) ?? []), item]);
    return item;
  },

  async deleteItem(itemId: string): Promise<void> {
    await simulate('Không xóa được, vui lòng thử lại.');
    manualItemsByWeek.forEach((items, week) => manualItemsByWeek.set(week, items.filter(item => item.id !== itemId)));
  },

  // Bỏ các món đã mua khỏi danh sách tuần (không ghi lại chuyến đi chợ).
  async clearPurchased(weekStartIso: string): Promise<void> {
    await simulate('Không xóa được món đã mua, vui lòng thử lại.');
    const list = await buildGroceryList(weekStartIso);
    const purchasedIds = list.groups.flatMap(group => group.items).filter(item => item.status === 'purchased').map(item => item.id);
    const cleared = clearedIdsByWeek.get(weekStartIso) ?? new Set<string>();
    purchasedIds.forEach(id => cleared.add(id));
    clearedIdsByWeek.set(weekStartIso, cleared);
    manualItemsByWeek.set(weekStartIso, (manualItemsByWeek.get(weekStartIso) ?? []).filter(item => !cleared.has(item.id)));
  },

  // design/GroceryDone.dc.html — ghi lại lần mua (chi phí thực tế), bỏ món đã mua, giữ món chưa mua
  // cho tuần sau (cộng dồn bằng đúng logic gộp BR-171) hoặc bỏ hẳn.
  async completeShopping(weekStartIso: string, input: CompleteShoppingInput): Promise<CompleteShoppingResult> {
    await simulate('Không hoàn tất được, vui lòng thử lại.');
    const list = await buildGroceryList(weekStartIso);
    const items = list.groups.flatMap(group => group.items);
    const purchased = input.markAllPurchased ? items : items.filter(item => item.status === 'purchased');
    const pending = input.markAllPurchased ? [] : items.filter(item => item.status === 'pending');
    const nextWeek = shiftWeek(weekStartIso, 1);

    if (input.keepPending && pending.length > 0) {
      carriedOverByWeek.set(nextWeek, [
        ...(carriedOverByWeek.get(nextWeek) ?? []),
        ...pending.map(item => ({ name: item.name, category: item.category, parsed: parseIngredientAmount(item.amountLabel) })),
      ]);
    }
    tripsByWeek.set(nextWeek, {
      completedAtIso: new Date().toISOString(),
      purchasedItems: purchased.length,
      pendingItemsKept: input.keepPending ? pending.length : 0,
      estimatedCostVnd: purchased.reduce((sum, item) => sum + item.estimatedCostVnd, 0),
      actualCostVnd: input.actualCostVnd,
    });
    // Danh sách tuần này coi như đã xong: đánh dấu hết và bỏ món tự thêm.
    const statusMap = getStatusMap(weekStartIso);
    items.forEach(item => statusMap.set(item.id, 'purchased'));
    manualItemsByWeek.delete(weekStartIso);

    return {
      list: await buildGroceryList(nextWeek),
      note: input.keepPending ? `Đã giữ lại ${pending.length} món chưa mua cho tuần sau.` : 'Đã làm trống danh sách.',
    };
  },
};

// BR-271 — DeleteDataScreen: xóa trạng thái đã mua, món tự thêm, carry-over và lịch sử đi chợ.
registerUserDataReset('grocery', () => {
  statusByWeek.clear();
  manualItemsByWeek.clear();
  carriedOverByWeek.clear();
  tripsByWeek.clear();
  clearedIdsByWeek.clear();
});
