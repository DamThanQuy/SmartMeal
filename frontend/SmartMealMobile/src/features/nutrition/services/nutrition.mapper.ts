import { format } from 'date-fns';
import { fromApiMealType, toApiMealType, type MealType } from '@/types/meal.types';
import { parseApiDateTime, parseDateIso } from '@/utils/date';
import type {
  CreateFoodRequestDto,
  DailyDiarySummaryDto,
  DiaryItemDto,
  DiaryItemInputDto,
  FoodItemDto,
  FoodServingDto,
  LogMealBatchRequestDto,
  UpdateDiaryItemRequestDto,
  WeeklyProgressDto,
} from '../types/nutrition.api.types';
import type {
  DiaryDaySummary,
  FoodItem,
  FoodLogSource,
  FoodServingOption,
  MealLogEntry,
  MealLogMethod,
  NewFoodInput,
  NewMealLogInput,
  NutritionInfo,
  WeeklyProgressSummary,
} from '../types/nutrition.types';
import { calculateCalorieBudget, nutritionPerGram } from '../utils/nutritionMath';

// Hàm thuần quy đổi DTO backend ↔ type FE cho nhật ký dinh dưỡng và thực phẩm (docs/fetch-api/
// part1 §7). Không gọi API, không đọc store — để test bằng fixture JSON.

const WEEKDAY_SHORT_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const DEFAULT_UNIT = 'g';

/** Khẩu phần mặc định khi thực phẩm chưa có khẩu phần nào (BE luôn có ít nhất "100 g"). */
const FALLBACK_SERVING: FoodServingDto = { id: 'g-100', label: '100 g', grams: 100 };

/** Khối lượng tối thiểu (g) quy ước cho một khẩu phần tính bằng "phần" (xem toCreateFoodRequest). */
const PORTION_GRAMS = 100;

// Giới hạn của BE với số liệu trên 100 g (POST /foods): 900 kcal, 100 g mỗi chất, 40.000 mg natri.
const MAX_KCAL_PER_GRAM = 9;
const MAX_SODIUM_MG_PER_GRAM = 400;

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

function round1(value: number): number {
  return Math.round(value * 10) / 10;
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
export function toDiaryItemInput(input: NewMealLogInput, unit: string = DEFAULT_UNIT): DiaryItemInputDto {
  return {
    foodName: input.foodName,
    ingredientId: input.ingredientId,
    recipeId: input.recipeId,
    servingSize: input.grams,
    unit,
    calories: input.nutrition.calories,
    proteinGrams: input.nutrition.proteinG,
    carbsGrams: input.nutrition.carbsG,
    fatGrams: input.nutrition.fatG,
    logMethod: input.logMethod ?? (input.source === 'ai' ? 'AiImage' : 'Manual'),
  };
}

/** Cả bữa → một request (POST /nutritiondiary/log/batch): hoặc lưu hết, hoặc không món nào. */
export function toLogMealBatchRequest(
  dateIso: string,
  mealType: MealType,
  inputs: readonly NewMealLogInput[],
): LogMealBatchRequestDto {
  return {
    logDate: dateIso,
    mealType: toApiMealType(mealType),
    items: inputs.map(input => toDiaryItemInput(input)),
  };
}

/**
 * Sửa một món (PUT /nutritiondiary/items/{id}). BE chỉ đổi các trường có mặt nên chỉ đổi bữa thì
 * không cần gửi gì khác; đổi khối lượng thì gửi kèm dinh dưỡng đã tính lại (BR-053).
 */
export function toUpdateDiaryItemRequest(update: {
  mealType?: MealType;
  grams?: number;
  nutrition?: NutritionInfo;
}): UpdateDiaryItemRequestDto {
  return {
    mealType: update.mealType ? toApiMealType(update.mealType) : undefined,
    servingSize: update.grams,
    calories: update.nutrition?.calories,
    proteinGrams: update.nutrition?.proteinG,
    carbsGrams: update.nutrition?.carbsG,
    fatGrams: update.nutrition?.fatG,
  };
}

/** DateTime của BE → ISO UTC chuẩn; chuỗi hỏng → undefined thay vì làm hỏng cả nhật ký. */
function toIsoDateTime(value: string): string | undefined {
  const date = parseApiDateTime(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/**
 * `loggedAt` lấy từ `createdAt` BE lưu (thời điểm ghi món). Bữa lấy từ nhóm chứa món (daily) hoặc từ
 * chính DTO (kết quả ghi/sửa).
 */
export function fromDiaryItemDto(
  dto: DiaryItemDto,
  mealType: MealType = fromApiMealType(dto.mealType),
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
    loggedAt: toIsoDateTime(dto.createdAt),
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
 * tính vào trung bình hay "ngày đạt mục tiêu". Macro trung bình tính trên các ngày đã ghi và so với
 * mục tiêu macro của hồ sơ.
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
  // Cùng một tiêu chí "đã ghi" (sau khi làm tròn) cho calo lẫn macro để các trung bình không lệch nhau.
  const loggedPoints = dto.days.filter(point => Math.round(point.calories) > 0);
  const loggedDays = days.filter(day => day.calories > 0);
  const totalLogged = loggedDays.reduce((sum, day) => sum + day.calories, 0);
  const first = days[0];
  const last = days[days.length - 1];

  const average = (pick: (point: (typeof loggedPoints)[number]) => number): number =>
    loggedPoints.length > 0
      ? Math.round(loggedPoints.reduce((sum, point) => sum + pick(point), 0) / loggedPoints.length)
      : 0;
  const reference = dto.days[0];

  return {
    rangeLabel:
      first && last
        ? `${format(parseDateIso(first.date), 'dd/MM')}–${format(parseDateIso(last.date), 'dd/MM')}`
        : '',
    calorieTarget,
    days,
    averageCalories: loggedDays.length > 0 ? Math.round(totalLogged / loggedDays.length) : 0,
    daysOnTarget: loggedDays.filter(day => day.calories <= calorieTarget).length,
    averageMacros:
      loggedPoints.length > 0 && reference
        ? [
            {
              label: 'Protein',
              consumedG: average(point => point.proteinGrams),
              targetG: Math.round(reference.targetProteinGrams),
            },
            {
              label: 'Carbs',
              consumedG: average(point => point.carbsGrams),
              targetG: Math.round(reference.targetCarbsGrams),
            },
            {
              label: 'Fat',
              consumedG: average(point => point.fatGrams),
              targetG: Math.round(reference.targetFatGrams),
            },
          ]
        : [],
  };
}

/** "1 tô" + 500 g → "1 tô (500 g)"; nhãn đã là khối lượng ("100 g", "30 ml") giữ nguyên. */
function servingOptionFromDto(serving: FoodServingDto): FoodServingOption {
  const isAmountLabel = /^\d+([.,]\d+)?\s*(g|ml)$/i.test(serving.label.trim());
  return {
    id: serving.id,
    label: isAmountLabel ? serving.label : `${serving.label} (${formatAmount(serving.grams)} g)`,
    grams: serving.grams,
  };
}

/**
 * Dinh dưỡng của khẩu phần mặc định (BE trả theo 100 g, nhân theo khối lượng khẩu phần).
 * `resolveAllergySlug` đổi id dị ứng của BE sang slug FE (danh mục /meta theo code) — truyền vào để
 * mapper không phụ thuộc feature khác. Món chưa được kiểm chứng (`isVerified` false: món mẫu, món
 * tự nhập) không được gắn nhãn "đã xác minh" (BR-120/121).
 */
export function fromFoodDto(
  dto: FoodItemDto,
  resolveAllergySlug: (allergyId: number) => string | undefined,
): FoodItem {
  const servings = dto.servings.length > 0 ? dto.servings : [FALLBACK_SERVING];
  const defaultServing = servings.find(s => s.id === dto.defaultServingId) ?? servings[0];
  const scale = defaultServing.grams / 100;
  const allergenIds = Array.from(
    new Set(
      dto.allergyIds.map(resolveAllergySlug).filter((slug): slug is string => slug !== undefined),
    ),
  );

  return {
    id: dto.id,
    name: dto.name,
    verified: dto.isVerified,
    isUserCreated: dto.isUserCreated || undefined,
    isFavorite: dto.isFavorite,
    servingOptions: servings.map(servingOptionFromDto),
    defaultServingId: defaultServing.id,
    nutritionPerServing: {
      calories: Math.round(dto.caloriesPer100g * scale),
      proteinG: round1(dto.proteinPer100g * scale),
      carbsG: round1(dto.carbsPer100g * scale),
      fatG: round1(dto.fatPer100g * scale),
      sugarG: round1(dto.sugarPer100g * scale),
      sodiumMg: Math.round(dto.sodiumMgPer100g * scale),
      fiberG: round1(dto.fiberPer100g * scale),
    },
    allergenIds: allergenIds.length > 0 ? allergenIds : undefined,
  };
}

/**
 * Khối lượng (g) mà số liệu người dùng nhập ứng với. g/ml: đúng số đã nhập (1 ml ≈ 1 g, BE chỉ biết
 * gam). "phần": người dùng không có khối lượng thật, nên chọn khối lượng nhỏ nhất ≥ 100 g/phần mà
 * số liệu trên 100 g vẫn qua giới hạn của BE — một phần cơm gà 650 kcal, 130 g chất đa lượng sẽ bị
 * từ chối nếu cố định 100 g (tổng carbs+fat+protein trên 100 g không được vượt 100 g).
 */
function servingWeightGrams(input: NewFoodInput): number {
  if (input.unit !== 'phần') return input.amount;

  const { nutrition } = input;
  const needed = Math.max(
    nutrition.proteinG + nutrition.carbsG + nutrition.fatG,
    nutrition.calories / MAX_KCAL_PER_GRAM,
    nutrition.fiberG ?? 0,
    nutrition.sugarG ?? 0,
    (nutrition.sodiumMg ?? 0) / MAX_SODIUM_MG_PER_GRAM,
  );
  return Math.max(PORTION_GRAMS * input.amount, Math.ceil(needed));
}

/** Làm tròn 4 chữ số để không mang nhiễu dấu phẩy động (2.4600000000000004) lên server. */
function roundPrecise(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/**
 * Món tự nhập → POST /foods. Form nhập dinh dưỡng cho CẢ khẩu phần (`amount` + đơn vị) nên quy về
 * trên 100 g; khẩu phần duy nhất của món chính là phần đã nhập, để ghi nó vào nhật ký đúng bằng số
 * người dùng gõ. Không tự bịa số liệu nào ngoài những gì người dùng nhập (BR-121).
 */
export function toCreateFoodRequest(input: NewFoodInput): CreateFoodRequestDto {
  const weight = servingWeightGrams(input);
  const per100 = (value: number | undefined): number => roundPrecise(((value ?? 0) * 100) / weight);

  return {
    name: input.name.trim(),
    caloriesPer100g: per100(input.nutrition.calories),
    proteinPer100g: per100(input.nutrition.proteinG),
    carbsPer100g: per100(input.nutrition.carbsG),
    fatPer100g: per100(input.nutrition.fatG),
    fiberPer100g: per100(input.nutrition.fiberG),
    sugarPer100g: per100(input.nutrition.sugarG),
    sodiumMgPer100g: per100(input.nutrition.sodiumMg),
    servings: [
      { label: `${formatAmount(input.amount)} ${input.unit}`, grams: weight, isDefault: true },
    ],
  };
}
