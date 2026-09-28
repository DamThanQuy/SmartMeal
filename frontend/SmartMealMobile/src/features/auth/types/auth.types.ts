/** Khớp shape user tối thiểu cần cho phiên đăng nhập (BR-014). */
export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResult {
  user: AuthUser;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
}

export interface RegisterResult {
  email: string;
}

export interface VerifyOtpPayload {
  email: string;
  code: string;
}

export interface ForgotPasswordPayload {
  email: string;
}
