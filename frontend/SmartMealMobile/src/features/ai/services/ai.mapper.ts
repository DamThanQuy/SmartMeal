import { format } from 'date-fns';
import type { MealType } from '@/types/meal.types';
import { parseApiDateTime } from '@/utils/date';
import type {
  AiQuotaDto,
  SnapAndTrackResponseDto,
  VoiceLogResponseDto,
} from '../types/ai.api.types';
import type {
  AIAnalysisResult,
  AIRecognizedItem,
  AiQuota,
  AIUncertainResolution,
  VoiceLogResult,
} from '../types/ai.types';

// Hàm thuần quy đổi DTO /ai/* → type FE (docs/fetch-api/part1 §12). Không gọi API, không đọc
// store — để test bằng fixture JSON.

/** Độ tin cậy dưới ngưỡng này thì phải hỏi lại người dùng tên món + khẩu phần (BR-072). */
export const UNCERTAIN_CONFIDENCE_THRESHOLD = 0.6;

/** Ba cỡ khẩu phần so với ước tính của AI khi cần người dùng chọn lại (BR-072). */
const PORTION_SCALES = [
  { id: 'small', label: 'Nhỏ', scale: 0.75 },
  { id: 'medium', label: 'Vừa', scale: 1 },
  { id: 'large', label: 'Lớn', scale: 1.4 },
] as const;

export function fromQuotaDto(dto: AiQuotaDto): AiQuota {
  const parsed = parseApiDateTime(dto.resetsAt);
  return {
    isUnlimited: dto.isUnlimited,
    limit: dto.limit,
    used: dto.used,
    remaining: dto.remaining,
    resetsAtIso: Number.isNaN(parsed.getTime()) ? dto.resetsAt : parsed.toISOString(),
  };
}

/**
 * Giờ làm mới hạn mức theo giờ máy ("00:00"). BE đổi ngày theo múi giờ cấu hình (mặc định UTC+7 =
 * 00:00 giờ Việt Nam) và trả thời điểm đó ở dạng UTC, nên phải quy về giờ máy để hiển thị.
 */
export function formatQuotaResetTime(quota: Pick<AiQuota, 'resetsAtIso'>): string {
  const resetsAt = parseApiDateTime(quota.resetsAtIso);
  return Number.isNaN(resetsAt.getTime()) ? '' : format(resetsAt, 'HH:mm');
}

/**
 * BE chỉ trả MỘT món (tên AI đoán + khối lượng + dinh dưỡng của cả đĩa) mà không có danh sách
 * ứng viên. Khi độ tin cậy thấp, dựng lựa chọn từ chính số liệu đó: tên AI đoán (kèm độ chắc chắn),
 * cho nhập tên khác và chọn cỡ khẩu phần — dinh dưỡng trên mỗi gram giữ nguyên theo BE, không bịa số.
 */
function buildUncertainResolution(dto: SnapAndTrackResponseDto, grams: number): AIUncertainResolution {
  return {
    candidates: [
      {
        id: 'ai-guess',
        name: dto.dishName,
        confidencePercent: Math.round(dto.confidenceScore * 100),
      },
    ],
    portionOptions: PORTION_SCALES.map(({ id, label, scale }) => ({
      id,
      label,
      grams: Math.round(grams * scale),
    })),
    nutritionPerGram: {
      calories: dto.calories / grams,
      proteinG: dto.protein / grams,
      carbsG: dto.carbs / grams,
      fatG: dto.fat / grams,
    },
  };
}

export function fromSnapResponse(mealType: MealType, dto: SnapAndTrackResponseDto): AIAnalysisResult {
  const grams = Math.max(Math.round(dto.estimatedGrams), 1);
  const isUncertain = dto.confidenceScore < UNCERTAIN_CONFIDENCE_THRESHOLD;
  const item: AIRecognizedItem = {
    id: 'snap-1',
    name: dto.dishName,
    servingLabel: `${grams} g`,
    grams,
    nutrition: {
      calories: Math.round(dto.calories),
      proteinG: Math.round(dto.protein),
      carbsG: Math.round(dto.carbs),
      fatG: Math.round(dto.fat),
    },
    isUncertain: isUncertain || undefined,
    uncertainResolution: isUncertain ? buildUncertainResolution(dto, grams) : undefined,
  };

  return {
    mealType,
    items: [item],
    allergyWarnings: dto.allergyWarnings,
    healthTips: dto.healthTips ?? undefined,
    detectedIngredients: dto.detectedIngredients,
    isDemo: dto.isDemo || undefined,
  };
}

/**
 * Bữa lấy từ lựa chọn của người dùng (`mealType`), không phải từ bữa AI đoán. Mỗi món giữ đúng khối
 * lượng/dinh dưỡng BE ước tính; không có câu hỏi khẩu phần vì BE không trả lựa chọn khẩu phần.
 */
export function fromVoiceResponse(
  mealType: MealType,
  transcript: string,
  dto: VoiceLogResponseDto,
): VoiceLogResult {
  return {
    mealType,
    transcript,
    items: dto.extractedItems.map((item, index) => ({
      id: `voice-${index}`,
      name: item.foodName,
      servingLabel: item.portionDescription,
      grams: item.portionGrams,
      nutrition: {
        calories: Math.round(item.calories),
        proteinG: Math.round(item.protein),
        carbsG: Math.round(item.carbs),
        fatG: Math.round(item.fat),
      },
    })),
    isDemo: dto.isDemo || undefined,
  };
}
