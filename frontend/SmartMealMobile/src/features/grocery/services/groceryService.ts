import { mealPlannerService, shiftWeek } from '@/features/meal-planner';
import type { DayMealPlan } from '@/features/meal-planner';
import { RECIPE_DATABASE_MOCK, type Recipe } from '@/features/recipes';
import { getMockDelayMs, wait } from '@/config/mock';
import { getCurrentMockScenario } from '@/state/app/appStore';
import { registerUserDataReset } from '@/state/resetUserData';
import { MEAL_TYPES } from '@/types/meal.types';
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
import type { GroceryItem, GroceryItemStatus, GroceryList } from '../types/grocery.types';

export interface ManualGroceryItemInput {
  name: string;
  quantity: number;
  unit: string;
  category: GroceryCategory;
}

interface CarriedOverIngredient {
  name: string;
  category: string;
  parsed: ParsedAmount | null;
}

// TODO: replace mock with real API — sinh danh sách trực tiếp từ mealPlannerService.getWeekPlan
// (BR-170/171) theo đúng pattern nutritionService (in-memory store mô phỏng Backend).

function findRecipe(recipeId: string): Recipe | undefined {
  return RECIPE_DATABASE_MOCK.find(recipe => recipe.id === recipeId);
}

interface AggregatedIngredient {
  name: string;
  category: string;
  parsed: ParsedAmount | null;
  mergedFromRecipeCount: number;
}

// BR-171 — khoá gộp theo tên chuẩn hoá + loại đơn vị (g/ml/piece:đơn vị gốc) để "200g + 300g
// thịt gà = 500g" nhưng không gộp sai giữa "1 quả" và "1 củ" của 2 nguyên liệu khác đơn vị.
function aggregationKey(name: string, parsed: ParsedAmount | null): string {
  const normalizedName = name.trim().toLowerCase();
  if (!parsed) return `${normalizedName}::text`;
  if (parsed.unitKind === 'piece') return `${normalizedName}::piece:${parsed.unitLabel}`;
  return `${normalizedName}::${parsed.unitKind}`;
}

function aggregateIngredients(daysMeals: DayMealPlan[]): Map<string, AggregatedIngredient> {
  const aggregated = new Map<string, AggregatedIngredient>();

  daysMeals.forEach(dayMeals => {
    MEAL_TYPES.forEach(mealType => {
      const slot = dayMeals[mealType];
      if (!slot) return;
      const recipe = findRecipe(slot.recipeId);
      if (!recipe) return;

      recipe.ingredients.forEach(ingredient => {
        const parsed = parseIngredientAmount(ingredient.amount);
        const key = aggregationKey(ingredient.name, parsed);
        const existing = aggregated.get(key);
        if (existing) {
          if (existing.parsed && parsed) {
            existing.parsed = {
              ...existing.parsed,
              quantity: existing.parsed.quantity + parsed.quantity,
            };
          }
          existing.mergedFromRecipeCount += 1;
        } else {
          aggregated.set(key, {
            name: ingredient.name,
            category: categorizeIngredient(ingredient.name),
            parsed,
            mergedFromRecipeCount: 1,
          });
        }
      });
    });
  });

  return aggregated;
}

const statusByWeek = new Map<string, Map<string, GroceryItemStatus>>();
// design/GroceryAdd.dc.html — nguyên liệu user tự thêm, tách khỏi danh sách sinh từ Meal Plan để
// không bị tính lại/mất khi thực đơn đổi (BR-271: xóa riêng qua registerUserDataReset bên dưới).
const manualItemsByWeek = new Map<string, GroceryItem[]>();
let manualItemIdCounter = 0;
// design/GroceryDone.dc.html "Giữ lại N món chưa mua" — nguyên liệu carry-over, khoá theo tuần
// SẼ NHẬN (weekStartIso đích), cộng dồn vào đúng logic gộp hiện có khi tuần đó được build
// (buildGroceryList bên dưới) thay vì hiển thị như 1 nguồn riêng — BR-171, BR-271 (không âm thầm
// làm mất dữ liệu: "Không giữ" thì đơn giản không gọi carryOverPendingItems).
const carriedOverByWeek = new Map<string, CarriedOverIngredient[]>();

function getStatusMap(weekStartIso: string): Map<string, GroceryItemStatus> {
  const existing = statusByWeek.get(weekStartIso);
  if (existing) return existing;
  const created = new Map<string, GroceryItemStatus>();
  statusByWeek.set(weekStartIso, created);
  return created;
}

async function buildGroceryList(weekStartIso: string): Promise<GroceryList> {
  const plan = await mealPlannerService.getWeekPlan(weekStartIso);
  const aggregated = aggregateIngredients(plan.days.map(day => day.meals));

  // BR-171 — GroceryDone "Giữ lại N món chưa mua": cộng nguyên liệu carry-over từ tuần trước vào
  // đúng logic gộp hiện có (aggregationKey), không phải nguồn hiển thị riêng.
  (carriedOverByWeek.get(weekStartIso) ?? []).forEach(entry => {
    const key = aggregationKey(entry.name, entry.parsed);
    const existing = aggregated.get(key);
    if (existing) {
      if (existing.parsed && entry.parsed) {
        existing.parsed = { ...existing.parsed, quantity: existing.parsed.quantity + entry.parsed.quantity };
      }
      existing.mergedFromRecipeCount += 1;
    } else {
      aggregated.set(key, {
        name: entry.name,
        category: entry.category,
        parsed: entry.parsed,
        mergedFromRecipeCount: 1,
      });
    }
  });

  const statusMap = getStatusMap(weekStartIso);

  const aggregatedItems: GroceryItem[] = Array.from(aggregated.entries()).map(([aggKey, entry]) => {
    // BR-171: dùng aggregationKey (name + unitKind) làm id thay vì chỉ tên thuần để tránh
    // duplicate key khi 1 nguyên liệu xuất hiện với đơn vị khác nhau (VD: "xà lách::piece:nắm"
    // và "xà lách::piece:quả" là 2 item khác nhau nhưng cùng tên).
    const id = aggKey;
    const amountLabel = entry.parsed
      ? formatAmountLabel(entry.parsed.quantity, entry.parsed.unitKind, entry.parsed.unitLabel)
      : 'Vừa đủ';
    return {
      id,
      name: entry.name,
      amountLabel,
      category: entry.category,
      status: statusMap.get(id) ?? 'pending',
      mergedFromRecipeCount: entry.mergedFromRecipeCount,
      estimatedCostVnd: estimateItemCostVnd(entry.name, entry.parsed),
    };
  });
  const manualItems = (manualItemsByWeek.get(weekStartIso) ?? []).map(item => ({
    ...item,
    status: statusMap.get(item.id) ?? item.status,
  }));
  const items = [...aggregatedItems, ...manualItems];

  const groups = GROCERY_CATEGORY_ORDER.map(category => ({
    category,
    items: items.filter(item => item.category === category),
  })).filter(group => group.items.length > 0);

  return {
    weekStartIso,
    groups,
    totalItems: items.length,
    purchasedItems: items.filter(item => item.status === 'purchased').length,
    estimatedTotalCostVnd: items.reduce((sum, item) => sum + item.estimatedCostVnd, 0),
  };
}

export const groceryService = {
  // BR-170/171/172 — sinh danh sách từ Meal Plan hiện tại, cộng dồn + phân loại. Scenario
  // 'error'/'empty' của grocery override cả khi mealPlannerService thành công, để Dev screen
  // đổi scenario xem đúng trạng thái của riêng màn Grocery.
  async getGroceryList(weekStartIso: string): Promise<GroceryList> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể tải danh sách đi chợ, vui lòng thử lại.');
    }
    if (scenario === 'empty') {
      return { weekStartIso, groups: [], totalItems: 0, purchasedItems: 0, estimatedTotalCostVnd: 0 };
    }

    return buildGroceryList(weekStartIso);
  },

  // BR-173 — check-off Pending/Purchased.
  async toggleItemStatus(weekStartIso: string, itemId: string): Promise<void> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể cập nhật, vui lòng thử lại.');
    }

    const statusMap = getStatusMap(weekStartIso);
    const current = statusMap.get(itemId) ?? 'pending';
    statusMap.set(itemId, current === 'pending' ? 'purchased' : 'pending');
  },

  // "Hoàn tất mua sắm" (design/Grocery.dc.html) — đánh dấu mọi nguyên liệu còn lại là Purchased.
  async markAllPurchased(weekStartIso: string): Promise<void> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể cập nhật, vui lòng thử lại.');
    }

    const list = await buildGroceryList(weekStartIso);
    const statusMap = getStatusMap(weekStartIso);
    list.groups.forEach(group => {
      group.items.forEach(item => statusMap.set(item.id, 'purchased'));
    });
  },

  // design/GroceryAdd.dc.html — thêm nguyên liệu thủ công (BR-172 vẫn phân loại theo nhóm chọn).
  async addManualItem(weekStartIso: string, input: ManualGroceryItemInput): Promise<GroceryItem> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể thêm nguyên liệu, vui lòng thử lại.');
    }

    manualItemIdCounter += 1;
    const parsed = manualQuantityToParsedAmount(input.quantity, input.unit);
    const item: GroceryItem = {
      id: `manual-${Date.now()}-${manualItemIdCounter}`,
      name: input.name,
      amountLabel: formatAmountLabel(parsed.quantity, parsed.unitKind, parsed.unitLabel),
      category: input.category,
      status: 'pending',
      mergedFromRecipeCount: 0,
      estimatedCostVnd: estimateItemCostVnd(input.name, parsed),
    };
    const current = manualItemsByWeek.get(weekStartIso) ?? [];
    manualItemsByWeek.set(weekStartIso, [...current, item]);
    return item;
  },

  // design/GroceryDone.dc.html "Giữ lại N món chưa mua" (BR-171, BR-271) — chuyển các món còn
  // Pending (đã gồm cả nguyên liệu từ Meal Plan + tự thêm + carry-over trước đó) sang tuần kế
  // tiếp, cộng dồn bằng đúng logic gộp hiện có khi tuần đó được build. KHÔNG xoá gì ở tuần hiện
  // tại — chỉ user chọn "Đánh dấu tất cả đã mua" (không gọi hàm này) mới coi là không giữ.
  async carryOverPendingItems(weekStartIso: string): Promise<void> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể chuyển nguyên liệu sang tuần sau, vui lòng thử lại.');
    }

    const currentList = await buildGroceryList(weekStartIso);
    const pendingItems = currentList.groups
      .flatMap(group => group.items)
      .filter(item => item.status === 'pending');
    if (pendingItems.length === 0) return;

    const nextWeekStartIso = shiftWeek(weekStartIso, 1);
    const carryEntries: CarriedOverIngredient[] = pendingItems.map(item => ({
      name: item.name,
      category: item.category,
      parsed: parseIngredientAmount(item.amountLabel),
    }));
    const existing = carriedOverByWeek.get(nextWeekStartIso) ?? [];
    carriedOverByWeek.set(nextWeekStartIso, [...existing, ...carryEntries]);
  },
};

// BR-271 — DeleteDataScreen: xóa trạng thái đã mua + nguyên liệu tự thêm + carry-over của danh
// sách đi chợ (xem src/state/resetUserData.ts).
registerUserDataReset('grocery', () => {
  statusByWeek.clear();
  manualItemsByWeek.clear();
  carriedOverByWeek.clear();
});
