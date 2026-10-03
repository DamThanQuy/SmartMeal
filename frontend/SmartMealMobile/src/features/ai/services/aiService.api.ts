import { API_CONFIG } from '@/config/api';
import { ENDPOINTS, api } from '@/services/api';
import type {
  AiQuotaDto,
  SnapAndTrackResponseDto,
  VoiceLogRequestDto,
  VoiceLogResponseDto,
} from '../types/ai.api.types';
import { fromQuotaDto, fromSnapResponse, fromVoiceResponse } from './ai.mapper';
import type { aiMockService } from './aiService.mock';

// Bản gọi backend thật (docs/fetch-api/part1 §12). Mọi /ai/* cần đăng nhập; Free có hạn mức lượt/ngày
// (BE trả 429 khi hết), Pro không giới hạn. BE chỉ ghi nhận lượt khi AI trả kết quả THÀNH CÔNG.

export const NO_IMAGE_MESSAGE = 'Chưa có ảnh để phân tích. Hãy chụp hoặc chọn lại ảnh món ăn.';
export const VOICE_UNSUPPORTED_MESSAGE =
  'Nhận dạng giọng nói chưa được hỗ trợ trên bản này. Bạn có thể ghi món thủ công hoặc chụp ảnh món ăn.';

export const aiApiService: Partial<typeof aiMockService> = {
  // GET /ai/quota — Free: limit/used/remaining; Pro: isUnlimited.
  async getQuota() {
    return fromQuotaDto(await api.get<AiQuotaDto>(ENDPOINTS.ai.quota));
  },

  // BE đếm lượt khi AI thành công, FE không tự trừ.
  async recordUsage() {},

  // POST /ai/snap-and-track (multipart, trường `image`; JPG/PNG/WebP tối đa 5 MB). Gemini có thể mất
  // 5–20 giây nên dùng timeout dài. Không có ảnh thì không có gì để gửi (không trả kết quả giả).
  async analyzeMealPhoto(mealType, imageUri) {
    if (!imageUri) throw new Error(NO_IMAGE_MESSAGE);

    const form = new FormData();
    form.append('image', { uri: imageUri, name: 'meal.jpg', type: 'image/jpeg' } as unknown as Blob);
    const dto = await api.post<SnapAndTrackResponseDto, FormData>(ENDPOINTS.ai.snapAndTrack, form, {
      timeout: API_CONFIG.aiTimeout,
    });
    return fromSnapResponse(mealType, dto);
  },

  // POST /ai/voice-log nhận VĂN BẢN đã nhận dạng giọng nói (BE không có endpoint nhận file âm thanh).
  // Chưa có nhận dạng giọng nói trên máy (cần Dev Client) nên không có văn bản → báo rõ thay vì trả
  // kết quả giả như thể AI đã nghe người dùng nói.
  async transcribeVoice(mealType, transcript) {
    const text = transcript?.trim();
    if (!text) throw new Error(VOICE_UNSUPPORTED_MESSAGE);

    const dto = await api.post<VoiceLogResponseDto, VoiceLogRequestDto>(
      ENDPOINTS.ai.voiceLog,
      { transcript: text },
      { timeout: API_CONFIG.aiTimeout },
    );
    return fromVoiceResponse(mealType, text, dto);
  },
};
