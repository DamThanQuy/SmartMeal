import { getCurrentMockScenario } from '@/state/app/appStore';
import { getMockDelayMs, wait } from '@/config/mock';
import type {
  ForgotPasswordPayload,
  LoginPayload,
  LoginResult,
  RegisterPayload,
  RegisterResult,
  VerifyOtpPayload,
} from '../types/auth.types';

// TODO: replace mock with real API (src/services/api/client.ts + endpoints.ts khi nối backend thật)

function mockUserFromEmail(email: string) {
  return {
    id: 'mock-user-1',
    fullName: email.split('@')[0] || 'Người dùng SmartMeal',
    email,
  };
}

export const authService = {
  // BR-013 — Đăng nhập: nhánh mock KHÔNG kiểm tra thật (CLAUDE.md mục 8), chỉ mô phỏng
  // Loading/Error qua MOCK_SCENARIO để test đủ trạng thái UI.
  async login(payload: LoginPayload): Promise<LoginResult> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Email hoặc mật khẩu không đúng.');
    }
    return { user: mockUserFromEmail(payload.email) };
  },

  // BR-010, BR-011 — Đăng ký Email/Password. Scenario 'error' mô phỏng đúng trạng thái
  // "Email đã được đăng ký" hiển thị trong design/Register.dc.html.
  async register(payload: RegisterPayload): Promise<RegisterResult> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Email này đã được đăng ký. Đăng nhập?');
    }
    return { email: payload.email };
  },

  async verifyOtp(_payload: VerifyOtpPayload): Promise<void> {
    const scenario = getCurrentMockScenario();
    await wait(getMockDelayMs(scenario));
    if (scenario === 'error') {
      throw new Error('Mã xác thực không đúng hoặc đã hết hạn.');
    }
  },

  async resendOtp(_email: string): Promise<void> {
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
