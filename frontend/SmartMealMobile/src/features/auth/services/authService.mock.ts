import { getCurrentMockScenario } from '@/state/app/appStore';
import { getMockDelayMs, wait } from '@/config/mock';
import type {
  AuthUser,
  ForgotPasswordPayload,
  GoogleLoginPayload,
  LoginPayload,
  LoginResult,
  RegisterPayload,
  RegisterResult,
  ResendOtpPayload,
  ResetPasswordPayload,
  UpdateProfilePayload,
  UploadAvatarPayload,
  VerifyOtpPayload,
  VerifyOtpResult,
} from '../types/auth.types';

// Bản giả lập (EXPO_PUBLIC_USE_MOCK_API=true, hoặc hàm BE chưa hỗ trợ — OTP, quên mật khẩu) — bản
// gọi API thật nằm ở authService.api.ts, authService.ts chọn giữa hai bản.
// TODO: replace mock with real API (src/services/api/client.ts + endpoints.ts khi nối backend thật)

function buildMockUser(fullName: string, email: string, hasCompletedSurvey: boolean): AuthUser {
  if (email.toLowerCase() === 'smartmealuser@gmail.com') {
    return {
      id: 'usr_smartmeal_default_01',
      fullName: 'SmartMeal User',
      email: 'smartmealuser@gmail.com',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
      isPro: true,
      role: 'User',
      hasCompletedSurvey: true,
    };
  }
  return {
    id: 'mock-user-1',
    fullName,
    email,
    avatarUrl: null,
    isPro: false,
    role: 'User',
    hasCompletedSurvey,
  };
}

export const authMockService = {
  // BR-013 — Đăng nhập: nhánh mock KHÔNG kiểm tra thật (CLAUDE.md mục 8), chỉ mô phỏng
  // Loading/Error qua MOCK_SCENARIO để test đủ trạng thái UI.
  async login(payload: LoginPayload): Promise<LoginResult> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Email hoặc mật khẩu không đúng.');
    }
    const fullName = payload.email.split('@')[0] || 'Người dùng SmartMeal';
    return { user: buildMockUser(fullName, payload.email, true) };
  },

  // Đăng nhập Google: mock không kiểm tra token, giống đăng nhập thường.
  async loginWithGoogle(_payload: GoogleLoginPayload): Promise<LoginResult> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Đăng nhập Google không thành công, vui lòng thử lại.');
    }
    return { user: buildMockUser('Người dùng Google', 'google.user@gmail.com', true) };
  },

  // BR-010, BR-011 — Đăng ký Email/Password. Scenario 'error' mô phỏng đúng trạng thái
  // "Email đã được đăng ký" hiển thị trong design/Register.dc.html.
  async register(payload: RegisterPayload): Promise<RegisterResult> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Email này đã được đăng ký. Đăng nhập?');
    }
    return {
      email: payload.email,
      user: buildMockUser(payload.fullName, payload.email, false),
      requiresOtp: true,
    };
  },

  // Mock không có phiên phía máy chủ để thu hồi.
  async logout(_refreshToken: string): Promise<void> {},

  // Chỉ dùng khi khôi phục phiên lúc khởi động — chế độ mock không có phiên để khôi phục
  // (sessionService.bootstrapSession bỏ qua bước này).
  async getMe(): Promise<AuthUser> {
    throw new Error('Chế độ mock không có phiên đăng nhập để khôi phục.');
  },

  // EditProfileScreen — đổi họ tên. Mock chỉ mô phỏng Loading/Error; họ tên mới do hook ghi vào
  // authStore.
  async updateProfile(payload: UpdateProfilePayload): Promise<{ fullName: string }> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể cập nhật hồ sơ, vui lòng thử lại.');
    }
    return { fullName: payload.fullName };
  },

  // Mock không có kho ảnh: dùng luôn đường dẫn cục bộ để màn hình thấy ảnh vừa chọn.
  async uploadAvatar(payload: UploadAvatarPayload): Promise<{ avatarUrl: string | null }> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể tải ảnh lên, vui lòng thử lại.');
    }
    return { avatarUrl: payload.uri };
  },

  // Mock không có dữ liệu phía máy chủ; DeleteDataScreen vẫn tự xóa dữ liệu cục bộ (resetUserData).
  async deleteMyData(): Promise<void> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể xóa dữ liệu, vui lòng thử lại.');
    }
  },

  async verifyOtp(_payload: VerifyOtpPayload): Promise<VerifyOtpResult> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Mã xác thực không đúng hoặc đã hết hạn.');
    }
    return { resetToken: 'mock-reset-token' };
  },

  // Đặt mật khẩu mới sau khi xác thực OTP — mock không đổi mật khẩu thật.
  async resetPassword(_payload: ResetPasswordPayload): Promise<void> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể đặt lại mật khẩu, vui lòng thử lại.');
    }
  },

  async resendOtp(_payload: ResendOtpPayload): Promise<void> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Không thể gửi lại mã, vui lòng thử lại sau.');
    }
  },

  // Quên mật khẩu — không thuộc BR đã đánh số, làm theo design/ForgotPassword.dc.html.
  async requestPasswordReset(_payload: ForgotPasswordPayload): Promise<void> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Email này chưa được đăng ký tại SmartMeal.');
    }
  },
};
