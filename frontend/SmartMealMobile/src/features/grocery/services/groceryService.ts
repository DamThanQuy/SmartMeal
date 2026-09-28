import { mealPlannerService } from '@/features/meal-planner';
import type { DayMealPlan } from '@/features/meal-planner';
import { RECIPE_DATABASE_MOCK, type Recipe } from '@/features/recipes';
import { getMockDelayMs, wait } from '@/config/mock';
import { getCurrentMockScenario } from '@/state/app/appStore';
import { MEAL_TYPES } from '@/types/meal.types';
import {
  categorizeIngredient,
  estimateItemCostVnd,
  formatAmountLabel,
  GROCERY_CATEGORY_ORDER,
  parseIngredientAmount,
  type ParsedAmount,
} from '../utils/groceryAggregation';
import type { GroceryItem, GroceryItemStatus, GroceryList } from '../types/grocery.types';

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
  const statusMap = getStatusMap(weekStartIso);

  const items: GroceryItem[] = Array.from(aggregated.values()).map(entry => {
    const id = entry.name.trim().toLowerCase();
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
};
