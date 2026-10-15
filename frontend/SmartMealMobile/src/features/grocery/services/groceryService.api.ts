import { addDays, format } from 'date-fns';
import { shiftWeek } from '@/features/meal-planner';
import { api, ENDPOINTS, isApiError } from '@/services/api';
import type {
  AddCustomGroceryItemDto,
  CompleteGroceryRequestDto,
  GenerateGroceryRequestDto,
  GroceryItemDto,
  GrocerySummaryDto,
  ToggleGroceryItemRequestDto,
} from '../types/grocery.api.types';
import type { CompleteShoppingInput, GroceryItemStatus, GroceryList } from '../types/grocery.types';
import { fromGroceryItemDto, fromGrocerySummaryDto } from './grocery.mapper';
import type { groceryMockService, ManualGroceryItemInput } from './groceryService.mock';

// Bản gọi backend thật cho /grocery/* (docs/SmartMeal_API_Contract.md). BE giữ MỘT danh sách cho mỗi
// người dùng kèm khoảng ngày thực đơn của lần tạo gần nhất (periodStart/End); không tự cập nhật khi
// thực đơn đổi — màn hình nhắc tạo lại (docs/fetch-api/part2 §3.2).

function weekEndIso(weekStartIso: string): string {
  return format(addDays(new Date(weekStartIso), 6), 'yyyy-MM-dd');
}

async function fetchList(weekStartIso: string): Promise<GroceryList> {
  return fromGrocerySummaryDto(weekStartIso, await api.get<GrocerySummaryDto>(ENDPOINTS.grocery.list));
}

async function generate(weekStartIso: string): Promise<GroceryList> {
  const dto = await api.post<GrocerySummaryDto, GenerateGroceryRequestDto>(ENDPOINTS.grocery.generateFromPlan, {
    startDate: weekStartIso,
    endDate: weekEndIso(weekStartIso),
    clearExisting: true,
  });
  return fromGrocerySummaryDto(weekStartIso, dto);
}

export const groceryApiService: Partial<typeof groceryMockService> = {
  // GET /grocery — danh sách còn trống thì tự tạo một lần từ thực đơn tuần đang xem (tuần chưa có thực
  // đơn: BE trả 400 → giữ danh sách trống để màn hiện EmptyState "Đi tới Thực đơn").
  async getGroceryList(weekStartIso: string) {
    const list = await fetchList(weekStartIso);
    if (list.totalItems > 0 || list.periodStartIso) return list;
    try {
      return await generate(weekStartIso);
    } catch (error) {
      if (isApiError(error) && error.code === 'BUSINESS') return list;
      throw error;
    }
  },

  // "Tạo lại theo thực đơn" — thay phần sinh từ thực đơn, giữ món tự thêm (BE: clearExisting chỉ xóa món sinh ra).
  async regenerateFromPlan(weekStartIso: string) {
    return generate(weekStartIso);
  },

  // BR-173 — PATCH /grocery/items/{id}/check với trạng thái đích (không toggle mù).
  async toggleItemStatus(_weekStartIso: string, itemId: string, nextStatus: GroceryItemStatus) {
    await api.patch<GroceryItemDto, ToggleGroceryItemRequestDto>(ENDPOINTS.grocery.check(itemId), {
      isChecked: nextStatus === 'purchased',
    });
  },

  async markAllPurchased() {
    await api.patch<GrocerySummaryDto, ToggleGroceryItemRequestDto>(ENDPOINTS.grocery.checkAll, { isChecked: true });
  },

  async addManualItem(_weekStartIso: string, input: ManualGroceryItemInput) {
    return fromGroceryItemDto(
      await api.post<GroceryItemDto, AddCustomGroceryItemDto>(ENDPOINTS.grocery.items, {
        ingredientName: input.name.trim(),
        amount: input.quantity,
        unit: input.unit,
        category: input.category,
        estimatedPriceVnd: input.estimatedPriceVnd,
      }),
    );
  },

  async deleteItem(itemId: string) {
    await api.delete<boolean>(ENDPOINTS.grocery.item(itemId));
  },

  // DELETE /grocery/clear-checked — bỏ các món đã mua khỏi danh sách (không lưu chuyến đi chợ như
  // "Hoàn tất mua sắm"; món chưa mua và món tự thêm chưa mua giữ nguyên).
  async clearPurchased() {
    await api.delete<boolean>(ENDPOINTS.grocery.clearChecked);
  },

  // "Hoàn tất mua sắm" — một request: lưu chi phí thực tế, bỏ món đã mua, giữ/bỏ món chưa mua và (khi
  // giữ) cộng luôn thực đơn tuần sau, trong một transaction phía server.
  async completeShopping(weekStartIso: string, input: CompleteShoppingInput) {
    if (input.markAllPurchased) {
      await api.patch<GrocerySummaryDto, ToggleGroceryItemRequestDto>(ENDPOINTS.grocery.checkAll, { isChecked: true });
    }
    const nextWeek = shiftWeek(weekStartIso, 1);
    const { data, message } = await api.postWithMessage<GrocerySummaryDto, CompleteGroceryRequestDto>(
      ENDPOINTS.grocery.complete,
      {
        actualCostVnd: input.actualCostVnd,
        keepPending: input.keepPending,
        nextStartDate: input.keepPending ? nextWeek : undefined,
      },
    );
    return { list: fromGrocerySummaryDto(nextWeek, data), note: message || undefined };
  },
};
