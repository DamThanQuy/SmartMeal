import { API_CONFIG } from '@/config/api';
import { ENDPOINTS, api } from '@/services/api';
import { saveSessionTokens } from '@/services/storage/secureStorage';
import type {
  AuthResponseDto,
  ChangePasswordRequestDto,
  DeleteAccountRequestDto,
  ForgotPasswordRequestDto,
  LoginRequestDto,
  GoogleAuthRequestDto,
  OtpPurposeDto,
  RegisterRequestDto,
  ResendOtpRequestDto,
  ResetPasswordRequestDto,
  UpdateProfileRequestDto,
  UserDto,
  VerifyOtpRequestDto,
  VerifyOtpResponseDto,
} from '../types/auth.api.types';
import type {
  AuthUser,
  ChangePasswordPayload,
  DeleteAccountConfirmation,
  ForgotPasswordPayload,
  LoginPayload,
  LoginResult,
  OtpPurpose,
  RegisterPayload,
  RegisterResult,
  ResendOtpPayload,
  ResetPasswordPayload,
  UpdateProfilePayload,
  UploadAvatarPayload,
  VerifyOtpPayload,
  VerifyOtpResult,
} from '../types/auth.types';
import { fromUserDto } from './auth.mapper';

// Mục đích OTP của FE → slug của BE.
const OTP_PURPOSE: Record<OtpPurpose, OtpPurposeDto> = {
  register: 'verify-email',
  'reset-password': 'reset-password',
};

// Gọi backend thật (docs/fetch-api/part1 §5).
export const authApiService = {
  // POST /auth/login — token lưu ở SecureStore ngay tại đây (store/screen không giữ token). Sai
  // mật khẩu là 401 nhưng KHÔNG phải hết phiên (interceptors bỏ qua /auth/login).
  async login(payload: LoginPayload): Promise<LoginResult> {
    const dto = await api.post<AuthResponseDto, LoginRequestDto>(ENDPOINTS.auth.login, {
      email: payload.email.trim(),
      password: payload.password,
    });
    await saveSessionTokens(dto);
    return { user: fromUserDto(dto.user) };
  },

  async loginWithGoogle(payload: GoogleAuthRequestDto): Promise<LoginResult> {
    const dto = await api.post<AuthResponseDto, GoogleAuthRequestDto>(ENDPOINTS.auth.google, payload);
    await saveSessionTokens(dto);
    return { user: fromUserDto(dto.user) };
  },

  // POST /auth/register — BE trả token ngay. Khi server gửi được email (đã cấu hình SMTP) thì kèm
  // requiresEmailVerification: màn Register chuyển sang nhập mã OTP rồi mới tới Health Profile.
  async register(payload: RegisterPayload): Promise<RegisterResult> {
    const dto = await api.post<AuthResponseDto, RegisterRequestDto>(ENDPOINTS.auth.register, {
      email: payload.email.trim(),
      password: payload.password,
      fullName: payload.fullName.trim(),
    });
    await saveSessionTokens(dto);
    return {
      email: dto.user.email,
      user: fromUserDto(dto.user),
      requiresOtp: dto.requiresEmailVerification === true,
    };
  },

  // POST /auth/logout { refreshToken } — thu hồi phiên phía máy chủ (best effort: không cần access
  // token, BE luôn trả 200). Nhận refresh token từ người gọi vì token cục bộ đã bị xóa.
  async logout(refreshToken: string): Promise<void> {
    await api.post<boolean>(ENDPOINTS.auth.logout, { refreshToken }, { skipAuth: true });
  },

  // POST /auth/forgot-password { email } — BE luôn trả 200 dù email có đăng ký hay không (không lộ
  // tài khoản nào tồn tại), nên màn hình không được nói "email chưa đăng ký".
  async requestPasswordReset(payload: ForgotPasswordPayload): Promise<void> {
    await api.post<boolean, ForgotPasswordRequestDto>(ENDPOINTS.auth.forgotPassword, {
      email: payload.email.trim(),
    });
  },

  // POST /auth/resend-otp — có thời gian chờ giữa hai lần gửi (BE trả 429 kèm số giây còn lại).
  async resendOtp(payload: ResendOtpPayload): Promise<void> {
    await api.post<boolean, ResendOtpRequestDto>(ENDPOINTS.auth.resendOtp, {
      email: payload.email.trim(),
      purpose: OTP_PURPOSE[payload.purpose],
    });
  },

  // POST /auth/verify-otp — mã đúng với mục đích reset-password trả resetToken dùng một lần.
  async verifyOtp(payload: VerifyOtpPayload): Promise<VerifyOtpResult> {
    const dto = await api.post<VerifyOtpResponseDto, VerifyOtpRequestDto>(ENDPOINTS.auth.verifyOtp, {
      email: payload.email.trim(),
      code: payload.code,
      purpose: OTP_PURPOSE[payload.purpose],
    });
    return { resetToken: dto.resetToken ?? undefined };
  },

  // POST /auth/reset-password — đặt mật khẩu mới; BE thu hồi mọi phiên đang đăng nhập của tài khoản.
  async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    await api.post<boolean, ResetPasswordRequestDto>(ENDPOINTS.auth.resetPassword, {
      email: payload.email.trim(),
      resetToken: payload.resetToken,
      newPassword: payload.newPassword,
    });
  },

  // POST /auth/change-password — BE thu hồi mọi phiên cũ (kể cả thiết bị khác) và trả cặp token mới
  // cho phiên hiện tại, nên lưu ngay token mới để không bị đăng xuất. Sai mật khẩu hiện tại → 400.
  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    const dto = await api.post<AuthResponseDto, ChangePasswordRequestDto>(ENDPOINTS.auth.changePassword, {
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
    });
    await saveSessionTokens(dto);
  },

  // POST /auth/avatar (multipart, trường "file", jpg/png/webp ≤ 2 MB) — trả người dùng với avatarUrl mới.
  async uploadAvatar(payload: UploadAvatarPayload): Promise<{ avatarUrl: string | null }> {
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
  async deleteMyData(): Promise<void> {
    await api.delete<{ deleted: Record<string, number> }>(ENDPOINTS.me.data);
  },

  // DELETE /auth/account — xóa vĩnh viễn tài khoản và dữ liệu (BR-271). Sai mật khẩu → 400 (không phải 401,
  // không làm hết phiên); sai nhiều lần → 423 khóa tạm thời. Lịch sử thanh toán được BE giữ ẩn danh.
  async deleteAccount(confirmation: DeleteAccountConfirmation): Promise<void> {
    await api.delete<boolean>(ENDPOINTS.auth.account, {
      data: {
        password: confirmation.password,
        confirmEmail: confirmation.confirmEmail?.trim(),
      } satisfies DeleteAccountRequestDto,
    });
  },

  // GET /auth/me — làm mới isPro/hasCompletedSurvey khi khôi phục phiên.
  async getMe(): Promise<AuthUser> {
    return fromUserDto(await api.get<UserDto>(ENDPOINTS.auth.me));
  },

  // PUT /auth/profile { fullName } — trả user đã lưu (BE cắt khoảng trắng đầu/cuối).
  async updateProfile(payload: UpdateProfilePayload): Promise<{ fullName: string }> {
    const dto = await api.put<UserDto, UpdateProfileRequestDto>(ENDPOINTS.auth.profile, {
      fullName: payload.fullName.trim(),
    });
    return { fullName: dto.fullName };
  },
};
