/**
 * aiService.api (docs/fetch-api/part1 §12): hạn mức, AI Snap (multipart), Voice Log (văn bản + file ghi âm) và
 * thông báo rõ khi thiếu ảnh/văn bản — không bao giờ trả kết quả giả. `api` được mock.
 */
import { API_CONFIG } from '@/config/api';

function loadService() {
  const apiMock = { get: jest.fn(), post: jest.fn() };

  jest.resetModules();
  jest.doMock('@/services/api', () => ({
    api: apiMock,
    ENDPOINTS: jest.requireActual('@/services/api/endpoints').ENDPOINTS,
    isApiError: jest.requireActual('@/services/api/errors').isApiError,
  }));

  const module =
    require('@/features/ai/services/aiService.api') as typeof import('@/features/ai/services/aiService.api');
  const errors =
    require('@/features/ai/services/ai.errors') as typeof import('@/features/ai/services/ai.errors');
  const { ApiError } =
    jest.requireActual('@/services/api/errors') as typeof import('@/services/api/errors');

  return { ...module, service: module.aiApiService, apiMock, ApiError, ...errors };
}

describe('getQuota', () => {
  test('GET /ai/quota → hạn mức Free', async () => {
    const { service, apiMock } = loadService();
    apiMock.get.mockResolvedValue({
      isUnlimited: false,
      limit: 5,
      used: 1,
      remaining: 4,
      resetsAt: '2026-10-03T00:00:00Z',
    });

    await expect(service.getQuota?.()).resolves.toMatchObject({
      isUnlimited: false,
      limit: 5,
      used: 1,
      remaining: 4,
    });
    expect(apiMock.get).toHaveBeenCalledWith('/ai/quota');
  });

  test('Pro → không giới hạn', async () => {
    const { service, apiMock } = loadService();
    apiMock.get.mockResolvedValue({
      isUnlimited: true,
      limit: null,
      used: 12,
      remaining: null,
      resetsAt: '2026-10-03T00:00:00Z',
    });

    await expect(service.getQuota?.()).resolves.toMatchObject({ isUnlimited: true, limit: null });
  });
});

describe('analyzeMealPhoto', () => {
  const SNAP = {
    dishName: 'Cơm gà',
    estimatedGrams: 320,
    confidenceScore: 0.9,
    calories: 540,
    carbs: 62,
    protein: 29,
    fat: 18,
    detectedIngredients: [],
    allergyWarnings: ['Có thể chứa đậu phộng'],
    healthTips: null,
    isDemo: false,
  };

  test('POST /ai/snap-and-track multipart với trường "image" và timeout dài cho Gemini', async () => {
    const { service, apiMock } = loadService();
    apiMock.post.mockResolvedValue(SNAP);

    const result = await service.analyzeMealPhoto?.('lunch', 'file:///photo.jpg');

    expect(apiMock.post).toHaveBeenCalledTimes(1);
    const [url, body, config] = apiMock.post.mock.calls[0] as [string, FormData, { timeout: number }];
    expect(url).toBe('/ai/snap-and-track');
    expect(body).toBeInstanceOf(FormData);
    expect(config.timeout).toBe(API_CONFIG.aiTimeout);
    expect(result).toMatchObject({
      mealType: 'lunch',
      allergyWarnings: ['Có thể chứa đậu phộng'],
      items: [{ name: 'Cơm gà', grams: 320 }],
    });
  });

  test('không có ảnh → báo rõ, không gọi API và không trả kết quả giả', async () => {
    const { service, apiMock, NO_IMAGE_MESSAGE } = loadService();

    await expect(service.analyzeMealPhoto?.('lunch', undefined)).rejects.toThrow(NO_IMAGE_MESSAGE);
    expect(apiMock.post).not.toHaveBeenCalled();
  });

  test('hết lượt miễn phí (429) → lỗi RATE_LIMITED nhận ra được để mở màn "Hết lượt AI"', async () => {
    const { service, apiMock, ApiError, isAiQuotaExceededError } = loadService();
    const error = new ApiError('Bạn đã dùng hết 5 lượt AI miễn phí hôm nay.', 'RATE_LIMITED', 429);
    apiMock.post.mockRejectedValue(error);

    const caught = await service.analyzeMealPhoto?.('lunch', 'file:///photo.jpg').catch(e => e);

    expect(caught).toBe(error);
    expect(isAiQuotaExceededError(caught)).toBe(true);
    expect(isAiQuotaExceededError(new Error('x'))).toBe(false);
    expect(isAiQuotaExceededError(new ApiError('lỗi', 'SERVER', 500))).toBe(false);
  });

  test('AI chưa cấu hình/đang lỗi (503) → ném lỗi của BE kèm thông báo tiếng Việt', async () => {
    const { service, apiMock, ApiError } = loadService();
    const error = new ApiError('Dịch vụ AI chưa được cấu hình.', 'UNAVAILABLE', 503);
    apiMock.post.mockRejectedValue(error);

    await expect(service.analyzeMealPhoto?.('lunch', 'file:///photo.jpg')).rejects.toBe(error);
  });
});

describe('transcribeVoice', () => {
  test('POST /ai/voice-log với văn bản đã cắt khoảng trắng và timeout dài', async () => {
    const { service, apiMock } = loadService();
    apiMock.post.mockResolvedValue({
      mealType: 'Lunch',
      extractedItems: [
        {
          foodName: 'Phở',
          portionDescription: '1 tô',
          portionGrams: 500,
          calories: 400,
          carbs: 50,
          protein: 25,
          fat: 8,
        },
      ],
      totalCalories: 400,
      totalCarbs: 50,
      totalProtein: 25,
      totalFat: 8,
      isDemo: false,
    });

    const result = await service.transcribeVoice?.('lunch', '  Trưa nay tôi ăn phở  ');

    expect(apiMock.post).toHaveBeenCalledWith(
      '/ai/voice-log',
      { transcript: 'Trưa nay tôi ăn phở' },
      { timeout: API_CONFIG.aiTimeout },
    );
    expect(result).toMatchObject({
      mealType: 'lunch',
      transcript: 'Trưa nay tôi ăn phở',
      items: [{ name: 'Phở', grams: 500 }],
    });
  });

  test('không có văn bản (chưa có nhận dạng giọng nói) → báo chưa hỗ trợ, không trả kết quả giả', async () => {
    const { service, apiMock, VOICE_UNSUPPORTED_MESSAGE } = loadService();

    await expect(service.transcribeVoice?.('lunch', undefined)).rejects.toThrow(VOICE_UNSUPPORTED_MESSAGE);
    await expect(service.transcribeVoice?.('lunch', '   ')).rejects.toThrow(VOICE_UNSUPPORTED_MESSAGE);
    expect(apiMock.post).not.toHaveBeenCalled();
  });
});

/** Theo dõi phần multipart `audio` mà service gắn vào FormData (object { uri, name, type } của React Native). */
function spyAudioPart() {
  const append = jest.spyOn(FormData.prototype, 'append');
  let captured: unknown;
  return {
    part: () => captured,
    // mockRestore() xóa luôn lịch sử gọi nên chụp lại phần `audio` trước.
    restore: () => {
      captured = append.mock.calls.find(([field]) => field === 'audio')?.[1];
      append.mockRestore();
    },
  };
}

describe('transcribeVoiceAudio', () => {
  test('POST /ai/voice-log/audio multipart; câu hiển thị lấy từ bản chép lời của server', async () => {
    const { service, apiMock } = loadService();
    apiMock.post.mockResolvedValue({
      mealType: 'Breakfast',
      transcript: ' Sáng nay tôi ăn bánh mì ',
      extractedItems: [
        { foodName: 'Bánh mì', portionDescription: '1 ổ', portionGrams: 120, calories: 300, carbs: 50, protein: 10, fat: 6 },
      ],
      totalCalories: 300,
      totalCarbs: 50,
      totalProtein: 10,
      totalFat: 6,
      isDemo: false,
    });

    const audio = spyAudioPart();
    const result = await service.transcribeVoiceAudio?.('breakfast', 'file:///cache/voice-1.wav');
    audio.restore();

    const [url, form, config] = apiMock.post.mock.calls[0] as [string, FormData, { timeout: number }];
    expect(url).toBe('/ai/voice-log/audio');
    expect(form).toBeInstanceOf(FormData);
    expect(audio.part()).toMatchObject({ uri: 'file:///cache/voice-1.wav', name: 'voice.wav', type: 'audio/wav' });
    expect(config).toEqual({ timeout: API_CONFIG.aiTimeout });
    expect(result).toMatchObject({
      mealType: 'breakfast',
      transcript: 'Sáng nay tôi ăn bánh mì',
      items: [{ name: 'Bánh mì', grams: 120 }],
    });
  });

  test('server không nghe ra món (voice_unrecognized) → AiRecognitionFailedError, lỗi khác ném nguyên', async () => {
    const { service, apiMock, ApiError, AiRecognitionFailedError } = loadService();
    apiMock.post.mockRejectedValueOnce(new ApiError('Chưa nghe ra món ăn nào', 'BUSINESS', 400, ['voice_unrecognized']));
    await expect(service.transcribeVoiceAudio?.('lunch', 'file:///voice.m4a')).rejects.toBeInstanceOf(
      AiRecognitionFailedError,
    );

    apiMock.post.mockRejectedValueOnce(new ApiError('Hết lượt', 'RATE_LIMITED', 429));
    await expect(service.transcribeVoiceAudio?.('lunch', 'file:///voice.m4a')).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
  });

  test('không có file ghi âm → báo rõ, không gọi server', async () => {
    const { service, apiMock, NO_AUDIO_MESSAGE } = loadService();

    await expect(service.transcribeVoiceAudio?.('lunch', undefined)).rejects.toThrow(NO_AUDIO_MESSAGE);
    expect(apiMock.post).not.toHaveBeenCalled();
  });
});

describe('transcribeVoiceDraft', () => {
  test('POST /ai/voice-log/transcribe với file WAV đang ghi, trả câu đã chép (bỏ khoảng trắng thừa)', async () => {
    const { service, apiMock } = loadService();
    apiMock.post.mockResolvedValue({ transcript: '  trưa nay tôi ăn một tô phở ', isDemo: false });

    const audio = spyAudioPart();
    const text = await service.transcribeVoiceDraft?.('file:///cache/voice-live.wav');
    audio.restore();

    const [url, form, config] = apiMock.post.mock.calls[0] as [string, FormData, { timeout: number }];
    expect(url).toBe('/ai/voice-log/transcribe');
    expect(form).toBeInstanceOf(FormData);
    expect(audio.part()).toMatchObject({ name: 'voice.wav', type: 'audio/wav' });
    expect(config).toEqual({ timeout: API_CONFIG.aiTimeout });
    expect(text).toBe('trưa nay tôi ăn một tô phở');
  });

  test('lỗi của server (hết lượt, gửi quá dày) ném nguyên để hook ngừng phụ đề', async () => {
    const { service, apiMock, ApiError } = loadService();
    apiMock.post.mockRejectedValueOnce(new ApiError('Quá nhiều yêu cầu', 'RATE_LIMITED', 429));

    await expect(service.transcribeVoiceDraft?.('file:///cache/voice-live.wav')).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
  });
});

describe('recordUsage', () => {
  test('bản thật không tự trừ lượt (server đếm khi AI thành công)', async () => {
    const { service, apiMock } = loadService();

    await expect(service.recordUsage?.()).resolves.toBeUndefined();
    expect(apiMock.post).not.toHaveBeenCalled();
    expect(apiMock.get).not.toHaveBeenCalled();
  });
});
