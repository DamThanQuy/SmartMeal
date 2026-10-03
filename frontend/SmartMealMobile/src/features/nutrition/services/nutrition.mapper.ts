import { format } from 'date-fns';
import { fromApiMealType, toApiMealType, type MealType } from '@/types/meal.types';
import { parseDateIso } from '@/utils/date';
import type {
  DailyDiarySummaryDto,
  DiaryItemDto,
  FoodItemDto,
  LogMealRequestDto,
  WeeklyProgressDto,
} from '../types/nutrition.api.types';
import type {
  DiaryDaySummary,
  FoodItem,
  FoodLogSource,
  MealLogEntry,
  MealLogMethod,
  NewMealLogInput,
  NutritionInfo,
  WeeklyProgressSummary,
} from '../types/nutrition.types';
import { calculateCalorieBudget, nutritionPerGram } from '../utils/nutritionMath';

// Hàm thuần quy đổi DTO backend ↔ type FE cho nhật ký dinh dưỡng và thực phẩm (docs/fetch-api/
// part1 §7). Không gọi API, không đọc store — để test bằng fixture JSON.

const WEEKDAY_SHORT_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const DEFAULT_UNIT = 'g';

function roundNutrition(raw: NutritionInfo): NutritionInfo {
  return {
    calories: Math.round(raw.calories),
    proteinG: Math.round(raw.proteinG),
    carbsG: Math.round(raw.carbsG),
    fatG: Math.round(raw.fatG),
  };
}

function formatAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : String(Math.round(amount * 100) / 100);
}

/** `Barcode` → món từ cơ sở dữ liệu; `AiImage`/`Voice` → AI (đã xác nhận trước khi lưu, BR-054). */
export function logMethodToSource(logMethod: string): {
  source: FoodLogSource;
  aiConfirmed: boolean;
} {
  const normalized = logMethod.trim().toLowerCase();
  if (normalized === 'aiimage' || normalized === 'voice') {
    return { source: 'ai', aiConfirmed: true };
  }
  if (normalized === 'barcode') return { source: 'database', aiConfirmed: false };
  return { source: 'manual', aiConfirmed: false };
}

/** Ngược lại của logMethodToSource — dùng khi ghi lại 1 bản ghi đã có (sửa món). */
export function sourceToLogMethod(source: FoodLogSource): MealLogMethod {
  if (source === 'ai') return 'AiImage';
  if (source === 'database') return 'Barcode';
  return 'Manual';
}

/**
 * Luôn gửi `unit: 'g'` và `servingSize = grams` để grams/nutritionPerGram không mất khi đọc lại
 * (BR-053); nhãn đẹp kiểu "1 tô (500 g)" hiển thị thành "500 g" sau khi tải lại vì BE không lưu
 * nhãn (§7.1). `unit` chỉ khác 'g' khi ghi lại bản ghi do nơi khác tạo.
 */
export function toLogMealRequest(
  dateIso: string,
  mealType: MealType,
  input: NewMealLogInput,
  unit: string = DEFAULT_UNIT,
): LogMealRequestDto {
  return {
    logDate: dateIso,
    mealType: toApiMealType(mealType),
    foodName: input.foodName,
    servingSize: input.grams,
    unit,
    calories: input.nutrition.calories,
    proteinGrams: input.nutrition.proteinG,
    carbsGrams: input.nutrition.carbsG,
    fatGrams: input.nutrition.fatG,
    logMethod: input.logMethod ?? (input.source === 'ai' ? 'AiImage' : 'Manual'),
  };
}

/**
 * `loggedAt` chỉ có với bản ghi vừa tạo (thời điểm gọi API): BE không lưu/không trả giờ ghi nên
 * bản ghi tải về để trống (P1-BE-05).
 */
export function fromDiaryItemDto(
  dto: DiaryItemDto,
  mealType: MealType,
  loggedAt?: string,
): MealLogEntry {
  const amount = dto.servingSize > 0 ? dto.servingSize : 1;
  const unit = dto.unit.trim() || DEFAULT_UNIT;
  const raw: NutritionInfo = {
    calories: dto.calories,
    proteinG: dto.proteinGrams,
    carbsG: dto.carbsGrams,
    fatG: dto.fatGrams,
  };
  const { source, aiConfirmed } = logMethodToSource(dto.logMethod);

  return {
    id: dto.id,
    mealType,
    foodName: dto.foodName,
    servingLabel: `${formatAmount(amount)} ${unit}`,
    grams: amount,
    unit: unit === DEFAULT_UNIT ? undefined : unit,
    nutrition: roundNutrition(raw),
    // Tính từ số thực của BE (chưa làm tròn) để sửa khối lượng không bị lệch với món nhỏ.
    nutritionPerGram: nutritionPerGram(raw, amount),
    source,
    aiConfirmed,
    loggedAt,
  };
}

export interface DiaryDayOptions {
  /** Calo vận động hôm đó từ health-sync (0 khi chưa đồng bộ hoặc lỗi). */
  activityCaloriesBurned: number;
  /** Công tắc "Cộng calo vận động vào ngân sách" (BR-040→042). */
  includeActivityCalories: boolean;
}

export function fromDailyDiaryDto(
  dto: DailyDiarySummaryDto,
  options: DiaryDayOptions,
): DiaryDaySummary {
  const entriesByMeal: Record<MealType, MealLogEntry[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
  dto.meals.forEach(group => {
    const mealType = fromApiMealType(group.mealType);
    entriesByMeal[mealType].push(...group.items.map(item => fromDiaryItemDto(item, mealType)));
  });

  const calorieTarget = Math.round(dto.targetCalories);
  // Đúng 1 hàm cộng calo vận động vào ngân sách (dùng chung với CalorieBudgetScreen).
  const { activityCalories } = calculateCalorieBudget({
    calorieTarget,
    activityCaloriesBurned: options.activityCaloriesBurned,
    includeActivityCalories: options.includeActivityCalories,
  });

  return {
    date: dto.date,
    calorieTarget,
    activityCalories: Math.round(activityCalories),
    entriesByMeal,
    macroTargets: {
      proteinG: Math.round(dto.targetProtein),
      carbsG: Math.round(dto.targetCarbs),
      fatG: Math.round(dto.targetFat),
    },
  };
}

/**
 * `dayOfWeek` của BE là tiếng Anh nên nhãn thứ tính từ `date`. Ngày chưa ghi gì (0 kcal) không
 * tính vào trung bình hay "ngày đạt mục tiêu". `averageMacros` rỗng vì BE chưa trả macro theo
 * ngày (P1-BE-07).
 */
export function fromWeeklyProgressDto(
  dto: WeeklyProgressDto,
  todayDateIso: string,
): WeeklyProgressSummary {
  const days = dto.days.map(point => ({
    date: point.date,
    label: WEEKDAY_SHORT_LABELS[parseDateIso(point.date).getDay()],
    calories: Math.round(point.calories),
    isToday: point.date === todayDateIso ? true : undefined,
  }));

  const calorieTarget = Math.round(dto.days[0]?.targetCalories ?? 0);
  const loggedDays = days.filter(day => day.calories > 0);
  const totalLogged = loggedDays.reduce((sum, day) => sum + day.calories, 0);
  const first = days[0];
  const last = days[days.length - 1];

  return {
    rangeLabel:
      first && last
        ? `${format(parseDateIso(first.date), 'dd/MM')}–${format(parseDateIso(last.date), 'dd/MM')}`
        : '',
    calorieTarget,
    days,
    averageCalories: loggedDays.length > 0 ? Math.round(totalLogged / loggedDays.length) : 0,
    daysOnTarget: loggedDays.filter(day => day.calories <= calorieTarget).length,
    averageMacros: [],
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Dinh dưỡng ứng với 100 g (khẩu phần mặc định). `resolveAllergySlug` đổi id dị ứng của BE sang
 * slug FE (features/health metaMapping) — truyền vào để mapper không phụ thuộc feature khác.
 */
export function fromFoodDto(
  dto: FoodItemDto,
  resolveAllergySlug: (allergyId: number) => string | undefined,
): FoodItem {
  const allergenSlug = dto.allergyId === null ? undefined : resolveAllergySlug(dto.allergyId);

  return {
    id: dto.id,
    name: dto.name,
    // Dữ liệu chuẩn của hệ thống.
    verified: true,
    servingOptions: [{ id: 'g-100', label: '100 g', grams: 100 }],
    defaultServingId: 'g-100',
    nutritionPerServing: {
      calories: Math.round(dto.caloriesPer100g),
      proteinG: round1(dto.proteinPer100g),
      carbsG: round1(dto.carbsPer100g),
      fatG: round1(dto.fatPer100g),
      sugarG: round1(dto.sugarPer100g),
      sodiumMg: Math.round(dto.sodiumMgPer100g),
      fiberG: round1(dto.fiberPer100g),
    },
    allergenIds: allergenSlug ? [allergenSlug] : undefined,
  };
}
