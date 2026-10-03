import { ENDPOINTS, api } from '@/services/api';
import { saveSessionTokens } from '@/services/storage/secureStorage';
import type {
  AuthResponseDto,
  LoginRequestDto,
  RegisterRequestDto,
  UpdateProfileRequestDto,
  UserDto,
} from '../types/auth.api.types';
import { fromUserDto } from './auth.mapper';
import type { authMockService } from './authService.mock';

// Bản gọi backend thật (docs/fetch-api/part1 §5). Chỉ khai báo hàm đã nối API; OTP và quên mật
// khẩu BE chưa có → tự rơi về bản mock trong authService.ts.
export const authApiService: Partial<typeof authMockService> = {
  // POST /auth/login — token lưu ở SecureStore ngay tại đây (store/screen không giữ token). Sai
  // mật khẩu là 401 nhưng KHÔNG phải hết phiên (interceptors bỏ qua /auth/login).
  async login(payload) {
    const dto = await api.post<AuthResponseDto, LoginRequestDto>(ENDPOINTS.auth.login, {
      email: payload.email.trim(),
      password: payload.password,
    });
    await saveSessionTokens(dto);
    return { user: fromUserDto(dto.user) };
  },

  // POST /auth/register — BE trả token ngay (không có OTP) nên vào thẳng Health Profile.
  async register(payload) {
    const dto = await api.post<AuthResponseDto, RegisterRequestDto>(ENDPOINTS.auth.register, {
      email: payload.email.trim(),
      password: payload.password,
      fullName: payload.fullName.trim(),
    });
    await saveSessionTokens(dto);
    return { email: dto.user.email, user: fromUserDto(dto.user), requiresOtp: false };
  },

  // POST /auth/logout { refreshToken } — thu hồi phiên phía máy chủ (best effort: không cần access
  // token, BE luôn trả 200). Nhận refresh token từ người gọi vì token cục bộ đã bị xóa.
  async logout(refreshToken) {
    await api.post<boolean>(ENDPOINTS.auth.logout, { refreshToken }, { skipAuth: true });
  },

  // GET /auth/me — làm mới isPro/hasCompletedSurvey khi khôi phục phiên.
  async getMe() {
    return fromUserDto(await api.get<UserDto>(ENDPOINTS.auth.me));
  },

  // PUT /auth/profile { fullName } — trả user đã lưu (BE cắt khoảng trắng đầu/cuối).
  async updateProfile(payload) {
    const dto = await api.put<UserDto, UpdateProfileRequestDto>(ENDPOINTS.auth.profile, {
      fullName: payload.fullName.trim(),
    });
    return { fullName: dto.fullName };
  },
};
