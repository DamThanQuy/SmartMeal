import { API_CONFIG } from '@/config/api';
import { ENDPOINTS, api, isApiError } from '@/services/api';
import type { MealType } from '@/types/meal.types';
import type {
  AiQuotaDto,
  SnapAndTrackResponseDto,
  VoiceLogRequestDto,
  VoiceLogResponseDto,
  VoiceTranscriptDto,
} from '../types/ai.api.types';
import type { AIAnalysisResult, AiQuota, VoiceLogResult } from '../types/ai.types';
import { AiRecognitionFailedError } from './ai.errors';
import { fromQuotaDto, fromSnapResponse, fromVoiceResponse } from './ai.mapper';

// Bản gọi backend thật (docs/fetch-api/part1 §12). Mọi /ai/* cần đăng nhập; Free có hạn mức lượt/ngày
// (BE trả 429 khi hết), Pro không giới hạn. BE chỉ ghi nhận lượt khi AI trả kết quả THÀNH CÔNG.

export const NO_IMAGE_MESSAGE = 'Chưa có ảnh để phân tích. Hãy chụp hoặc chọn lại ảnh món ăn.';
export const VOICE_UNSUPPORTED_MESSAGE =
  'Nhận dạng giọng nói chưa được hỗ trợ trên bản này. Bạn có thể ghi món thủ công hoặc chụp ảnh món ăn.';
export const NO_AUDIO_MESSAGE = 'Chưa thu được đoạn ghi âm nào. Hãy thử nói lại hoặc gõ bữa ăn của bạn.';

/** Mã BE khi đoạn ghi âm không nghe ra món nào — không trừ lượt, chuyển sang màn "AI chưa nhận diện được". */
const VOICE_UNRECOGNIZED = 'voice_unrecognized';

/** Phần multipart `audio` cho file ghi âm trên máy: WAV (ghi từ PCM, xem useVoiceRecorder) hoặc M4A. */
function audioFormPart(audioUri: string) {
  const isWav = audioUri.toLowerCase().endsWith('.wav');
  return {
    uri: audioUri,
    name: isWav ? 'voice.wav' : 'voice.m4a',
    type: isWav ? 'audio/wav' : 'audio/mp4',
  } as unknown as Blob;
}

export const aiApiService = {
  // GET /ai/quota — Free: limit/used/remaining; Pro: isUnlimited.
  async getQuota(): Promise<AiQuota> {
    return fromQuotaDto(await api.get<AiQuotaDto>(ENDPOINTS.ai.quota));
  },

  // BE đếm lượt khi AI thành công, FE không tự trừ.
  async recordUsage(): Promise<void> {},

  // POST /ai/snap-and-track (multipart, trường `image`; JPG/PNG/WebP tối đa 5 MB). Gemini có thể mất
  // 5–20 giây nên dùng timeout dài. Không có ảnh thì không có gì để gửi (không trả kết quả giả).
  async analyzeMealPhoto(mealType: MealType, imageUri?: string): Promise<AIAnalysisResult> {
    if (!imageUri) throw new Error(NO_IMAGE_MESSAGE);

    const form = new FormData();
    form.append('image', { uri: imageUri, name: 'meal.jpg', type: 'image/jpeg' } as unknown as Blob);
    const dto = await api.post<SnapAndTrackResponseDto, FormData>(ENDPOINTS.ai.snapAndTrack, form, {
      timeout: API_CONFIG.aiTimeout,
    });
    return fromSnapResponse(mealType, dto);
  },

  // POST /ai/voice-log nhận VĂN BẢN người dùng gõ (VoicePermission "Hoặc gõ bữa ăn của bạn"). Không có
  // văn bản thì báo rõ thay vì trả kết quả giả như thể AI đã nghe người dùng nói.
  async transcribeVoice(mealType: MealType, transcript?: string): Promise<VoiceLogResult> {
    const text = transcript?.trim();
    if (!text) throw new Error(VOICE_UNSUPPORTED_MESSAGE);

    const dto = await api.post<VoiceLogResponseDto, VoiceLogRequestDto>(
      ENDPOINTS.ai.voiceLog,
      { transcript: text },
      { timeout: API_CONFIG.aiTimeout },
    );
    return fromVoiceResponse(mealType, text, dto);
  },

  // POST /ai/voice-log/audio (multipart, trường `audio`; app ghi WAV). AI vừa chép lời vừa bóc món;
  // câu hiển thị lấy từ bản chép lời của server. Không nghe ra món nào → 400 voice_unrecognized.
  async transcribeVoiceAudio(mealType: MealType, audioUri?: string): Promise<VoiceLogResult> {
    if (!audioUri) throw new Error(NO_AUDIO_MESSAGE);

    const form = new FormData();
    form.append('audio', audioFormPart(audioUri));
    try {
      const dto = await api.post<VoiceLogResponseDto, FormData>(ENDPOINTS.ai.voiceLogAudio, form, {
        timeout: API_CONFIG.aiTimeout,
      });
      return fromVoiceResponse(mealType, '', dto);
    } catch (error) {
      if (isApiError(error) && error.details.includes(VOICE_UNRECOGNIZED)) {
        throw new AiRecognitionFailedError(error.message);
      }
      throw error;
    }
  },

  // POST /ai/voice-log/transcribe — phụ đề tạm hiện dưới micro trong lúc người dùng còn đang nói: gửi lại
  // cả đoạn đã ghi tới thời điểm đó, BE chỉ chép lời (không bóc món, không trừ lượt).
  async transcribeVoiceDraft(audioUri: string): Promise<string> {
    const form = new FormData();
    form.append('audio', audioFormPart(audioUri));
    const dto = await api.post<VoiceTranscriptDto, FormData>(ENDPOINTS.ai.voiceLogTranscribe, form, {
      timeout: API_CONFIG.aiTimeout,
    });
    return dto.transcript.trim();
  },
};
