import { create } from 'zustand';

// BR-233 — Free user bị giới hạn số lượt dùng AI/ngày. Số lượt đã dùng/còn lại là dữ liệu của server
// (GET /ai/quota — xem useAiQuota); hằng số này chỉ là mức hiển thị lúc chưa đọc được hạn mức.
export const DAILY_AI_QUOTA_LIMIT = 5;

interface AiQuotaState {
  /** VoicePermissionScreen (Đợt 10, BR-252) — đã được cấp quyền micro (expo-audio) trong phiên này,
   * để QuickLog/Dashboard mở thẳng màn ghi âm. Không phải dữ liệu người dùng nên không đăng ký
   * resetUserData (giống lý do appStore/authStore không đăng ký). */
  micPermissionGranted: boolean;
  grantMicPermission: () => void;
}

export const useAiQuotaStore = create<AiQuotaState>()(set => ({
  micPermissionGranted: false,
  grantMicPermission: () => set({ micPermissionGranted: true }),
}));
