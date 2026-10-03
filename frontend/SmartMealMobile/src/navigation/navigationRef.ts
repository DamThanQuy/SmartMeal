import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/**
 * Điều hướng từ ngoài React tree — vd. hết phiên đăng nhập (401) phải mở màn "Phiên hết hạn"
 * (sessionService.handleSessionExpired). Gắn vào `<NavigationContainer ref={navigationRef}>` ở
 * App.tsx; kiểm tra `isReady()` trước khi gọi.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
