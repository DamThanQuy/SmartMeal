import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { openSession } from '../services/sessionService';
import type { LoginPayload, SessionOpenResult } from '../types/auth.types';

export function useLogin() {
  return useMutation({
    // Đăng nhập xong nạp luôn hồ sơ sức khỏe (nếu có) để màn Main không bao giờ thấy store rỗng;
    // kết quả cho screen biết đi thẳng vào Main hay phải làm Health Profile trước.
    mutationFn: async (payload: LoginPayload): Promise<SessionOpenResult> => {
      const { user } = await authService.login(payload);
      return openSession(user);
    },
  });
}
