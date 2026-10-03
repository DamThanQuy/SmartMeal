import { API_CONFIG } from '@/config/api';
import { ENDPOINTS, api } from '@/services/api';
import { saveSessionTokens } from '@/services/storage/secureStorage';
import type {
  AuthResponseDto,
  ForgotPasswordRequestDto,
  GoogleLoginRequestDto,
  LoginRequestDto,
  OtpPurposeDto,
  RegisterRequestDto,
  ResendOtpRequestDto,
  ResetPasswordRequestDto,
  UpdateProfileRequestDto,
  UserDto,
  VerifyOtpRequestDto,
  VerifyOtpResponseDto,
} from '../types/auth.api.types';
import type { OtpPurpose } from '../types/auth.types';
import { fromUserDto } from './auth.mapper';
import type { authMockService } from './authService.mock';

// Mục đích OTP của FE → slug của BE.
const OTP_PURPOSE: Record<OtpPurpose, OtpPurposeDto> = {
  register: 'verify-email',
  'reset-password': 'reset-password',
};

// Bản gọi backend thật (docs/fetch-api/part1 §5). Hàm nào chưa khai báo ở đây tự rơi về bản mock
// trong authService.ts.
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

  // POST /auth/google { idToken } — máy chủ xác minh ID token với Google rồi tạo/liên kết tài khoản.
  // 503 khi máy chủ chưa cấu hình Google; 401 khi token sai/hết hạn; 409 khi email đã gắn Google khác.
  async loginWithGoogle(payload) {
    const dto = await api.post<AuthResponseDto, GoogleLoginRequestDto>(ENDPOINTS.auth.google, {
      idToken: payload.idToken,
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

  // POST /auth/forgot-password { email } — BE luôn trả 200 dù email có đăng ký hay không (không lộ
  // tài khoản nào tồn tại), nên màn hình không được nói "email chưa đăng ký".
  async requestPasswordReset(payload) {
    await api.post<boolean, ForgotPasswordRequestDto>(ENDPOINTS.auth.forgotPassword, {
      email: payload.email.trim(),
    });
  },

  // POST /auth/resend-otp — có thời gian chờ giữa hai lần gửi (BE trả 429 kèm số giây còn lại).
  async resendOtp(payload) {
    await api.post<boolean, ResendOtpRequestDto>(ENDPOINTS.auth.resendOtp, {
      email: payload.email.trim(),
      purpose: OTP_PURPOSE[payload.purpose],
    });
  },

  // POST /auth/verify-otp — mã đúng với mục đích reset-password trả resetToken dùng một lần.
  async verifyOtp(payload) {
    const dto = await api.post<VerifyOtpResponseDto, VerifyOtpRequestDto>(ENDPOINTS.auth.verifyOtp, {
      email: payload.email.trim(),
      code: payload.code,
      purpose: OTP_PURPOSE[payload.purpose],
    });
    return { resetToken: dto.resetToken ?? undefined };
  },

  // POST /auth/reset-password — đặt mật khẩu mới; BE thu hồi mọi phiên đang đăng nhập của tài khoản.
  async resetPassword(payload) {
    await api.post<boolean, ResetPasswordRequestDto>(ENDPOINTS.auth.resetPassword, {
      email: payload.email.trim(),
      resetToken: payload.resetToken,
      newPassword: payload.newPassword,
    });
  },

  // POST /auth/avatar (multipart, trường "file", jpg/png/webp ≤ 2 MB) — trả người dùng với avatarUrl mới.
  async uploadAvatar(payload) {
    const form = new FormData();
    // React Native gửi tệp cục bộ bằng object { uri, name, type } thay cho Blob.
    form.append('file', {
      uri: payload.uri,
      name: payload.fileName,
      type: payload.mimeType,
    } as unknown as Blob);
    const dto = await api.post<UserDto, FormData>(ENDPOINTS.auth.avatar, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: API_CONFIG.uploadTimeout,
    });
    return { avatarUrl: dto.avatarUrl };
  },

  // DELETE /me/data — xóa dữ liệu cá nhân phía máy chủ (BR-271): nhật ký, nước, hồ sơ sức khỏe, thực đơn,
  // đi chợ, yêu thích, món tự nhập, XP/huy hiệu... Giữ tài khoản và lịch sử thanh toán.
  async deleteMyData() {
    await api.delete<{ deleted: Record<string, number> }>(ENDPOINTS.me.data);
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
