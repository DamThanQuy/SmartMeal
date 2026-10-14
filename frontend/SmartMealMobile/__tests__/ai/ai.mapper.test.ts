/**
 * ai.mapper (docs/fetch-api/part1 §12): quy đổi DTO /ai/* → type FE. Fixture khớp DTO C# (JSON
 * camelCase).
 */
import { format } from 'date-fns';
import {
  UNCERTAIN_CONFIDENCE_THRESHOLD,
  formatQuotaResetTime,
  fromQuotaDto,
  fromSnapResponse,
  fromVoiceResponse,
} from '@/features/ai/services/ai.mapper';
import type {
  AiQuotaDto,
  SnapAndTrackResponseDto,
  VoiceLogResponseDto,
} from '@/features/ai/types/ai.api.types';

function snap(overrides: Partial<SnapAndTrackResponseDto> = {}): SnapAndTrackResponseDto {
  return {
    dishName: 'Cơm gà',
    estimatedGrams: 320.4,
    confidenceScore: 0.82,
    calories: 540.6,
    carbs: 62.4,
    protein: 28.5,
    fat: 18.2,
    detectedIngredients: ['cơm', 'gà'],
    allergyWarnings: [],
    healthTips: null,
    isDemo: false,
    ...overrides,
  };
}

describe('fromSnapResponse', () => {
  test('độ tin cậy cao: một món đã chắc chắn, số liệu làm tròn, nhãn theo gram', () => {
    const result = fromSnapResponse('lunch', snap());

    expect(result.mealType).toBe('lunch');
    expect(result.items).toEqual([
      {
        id: 'snap-1',
        name: 'Cơm gà',
        servingLabel: '320 g',
        grams: 320,
        nutrition: { calories: 541, proteinG: 29, carbsG: 62, fatG: 18 },
        isUncertain: undefined,
        uncertainResolution: undefined,
      },
    ]);
    expect(result.detectedIngredients).toEqual(['cơm', 'gà']);
    expect(result.healthTips).toBeUndefined();
    expect(result.isDemo).toBeUndefined();
  });

  test('cảnh báo dị ứng, lời khuyên và cờ dữ liệu mẫu được giữ lại', () => {
    const result = fromSnapResponse(
      'dinner',
      snap({
        allergyWarnings: ['Có thể chứa hải sản — trùng dị ứng bạn đã khai báo'],
        healthTips: 'Nên thêm rau xanh.',
        isDemo: true,
      }),
    );

    expect(result.allergyWarnings).toEqual(['Có thể chứa hải sản — trùng dị ứng bạn đã khai báo']);
    expect(result.healthTips).toBe('Nên thêm rau xanh.');
    expect(result.isDemo).toBe(true);
  });

  test('độ tin cậy thấp (BR-072): món bị đánh dấu chưa chắc, kèm lựa chọn tên + 3 cỡ khẩu phần dựng từ số liệu của BE', () => {
    const [item] = fromSnapResponse('lunch', snap({ confidenceScore: 0.45, estimatedGrams: 400 })).items;

    expect(item.isUncertain).toBe(true);
    expect(item.uncertainResolution?.candidates).toEqual([
      { id: 'ai-guess', name: 'Cơm gà', confidencePercent: 45 },
    ]);
    expect(item.uncertainResolution?.portionOptions).toEqual([
      { id: 'small', label: 'Nhỏ', grams: 300 },
      { id: 'medium', label: 'Vừa', grams: 400 },
      { id: 'large', label: 'Lớn', grams: 560 },
    ]);
    // Dinh dưỡng trên mỗi gram giữ nguyên theo ước tính của BE (540.6 kcal / 400 g), không bịa số.
    expect(item.uncertainResolution?.nutritionPerGram.calories).toBeCloseTo(540.6 / 400, 10);
    expect(item.uncertainResolution?.nutritionPerGram.proteinG).toBeCloseTo(28.5 / 400, 10);
  });

  test('đúng ngưỡng 0,6 thì coi là đã chắc chắn', () => {
    const [item] = fromSnapResponse(
      'lunch',
      snap({ confidenceScore: UNCERTAIN_CONFIDENCE_THRESHOLD }),
    ).items;

    expect(item.isUncertain).toBeUndefined();
    expect(item.uncertainResolution).toBeUndefined();
  });

  test('khối lượng ước tính bằng 0 không gây chia cho 0', () => {
    const [item] = fromSnapResponse('lunch', snap({ estimatedGrams: 0, confidenceScore: 0.3 })).items;

    expect(item.grams).toBe(1);
    expect(Number.isFinite(item.uncertainResolution?.nutritionPerGram.calories)).toBe(true);
  });
});

describe('fromVoiceResponse', () => {
  const dto: VoiceLogResponseDto = {
    mealType: 'Breakfast',
    extractedItems: [
      {
        foodName: 'Bún bò',
        portionDescription: '1 tô',
        portionGrams: 450,
        calories: 420.4,
        carbs: 46.2,
        protein: 22.6,
        fat: 14.2,
      },
      {
        foodName: 'Nước cam',
        portionDescription: '1 ly',
        portionGrams: 250,
        calories: 110,
        carbs: 26,
        protein: 1,
        fat: 0,
      },
    ],
    totalCalories: 530.4,
    totalCarbs: 72.2,
    totalProtein: 23.6,
    totalFat: 14.2,
    isDemo: true,
  };

  test('các món theo thứ tự BE, bữa theo lựa chọn của người dùng, văn bản gốc được giữ', () => {
    const result = fromVoiceResponse('dinner', 'Tối nay tôi ăn bún bò', dto);

    expect(result.mealType).toBe('dinner');
    expect(result.transcript).toBe('Tối nay tôi ăn bún bò');
    expect(result.items.map(item => [item.id, item.name, item.servingLabel, item.grams])).toEqual([
      ['voice-0', 'Bún bò', '1 tô', 450],
      ['voice-1', 'Nước cam', '1 ly', 250],
    ]);
    expect(result.items[0].nutrition).toEqual({ calories: 420, proteinG: 23, carbsG: 46, fatG: 14 });
    expect(result.isDemo).toBe(true);
    // BE không trả lựa chọn khẩu phần nên không có câu hỏi khẩu phần.
    expect(result.portionQuestion).toBeUndefined();
  });

  test('không phải dữ liệu mẫu → không có cờ isDemo', () => {
    expect(fromVoiceResponse('lunch', 'x', { ...dto, isDemo: false }).isDemo).toBeUndefined();
  });
});

describe('quota', () => {
  const dto = (overrides: Partial<AiQuotaDto> = {}): AiQuotaDto => ({
    isUnlimited: false,
    limit: 5,
    used: 2,
    remaining: 3,
    resetsAt: '2026-10-03T00:00:00Z',
    ...overrides,
  });

  test('Free: số lượt dùng/còn lại, thời điểm làm mới ở dạng ISO UTC', () => {
    expect(fromQuotaDto(dto())).toEqual({
      isUnlimited: false,
      limit: 5,
      used: 2,
      remaining: 3,
      resetsAtIso: '2026-10-03T00:00:00.000Z',
    });
  });

  test('Pro: không giới hạn, limit/remaining là null', () => {
    expect(fromQuotaDto(dto({ isUnlimited: true, limit: null, remaining: null }))).toMatchObject({
      isUnlimited: true,
      limit: null,
      remaining: null,
    });
  });

  test('giờ làm mới (BE trả ở dạng UTC) hiển thị theo giờ máy', () => {
    const resetsAtIso = '2026-10-03T00:00:00.000Z';

    expect(formatQuotaResetTime({ resetsAtIso })).toBe(format(new Date(resetsAtIso), 'HH:mm'));
    expect(formatQuotaResetTime({ resetsAtIso: 'khong-phai-ngay' })).toBe('');
  });
});
