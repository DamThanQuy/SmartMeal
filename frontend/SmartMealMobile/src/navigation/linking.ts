import { getStateFromPath, type LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { DEEP_LINK_PATHS, MAIN_STACK_ROUTES, ROOT_ROUTES } from '@/constants/routes';
import type { RootStackParamList } from './types';

const APP_SCHEME_PREFIX = 'smartmealmobile://';

/** Tiền tố URL của app: Expo Go cần exp://…/--/ (createURL); thiếu manifest (vd. trong test) thì dùng scheme. */
function appUrlPrefixes(): string[] {
  try {
    return Array.from(new Set([Linking.createURL('/'), APP_SCHEME_PREFIX]));
  } catch {
    return [APP_SCHEME_PREFIX];
  }
}

// Deep link của app (scheme "smartmealmobile" trong app.json; trên Expo Go là exp://…/--/):
// - shared/collections/:token — liên kết chia sẻ chỉ đọc (CollectionDetailScreen "Chia sẻ", BR-150→152);
// - collections/:collectionId — bộ sưu tập công khai theo id.
// Chỉ mở được khi đã đăng nhập vì các màn này nằm trong MainNavigator.
// - payment-result — PayOS chuyển về sau khi thanh toán: KHÔNG điều hướng (để nguyên màn đang chờ xác nhận, màn đó tự
//   hỏi trạng thái khi app quay lại); không bỏ qua thì React Navigation coi "payment-result" là tên màn và báo lỗi.
export function isPaymentReturnPath(path: string): boolean {
  return path.replace(/^\/+/, '').split(/[?#]/)[0] === DEEP_LINK_PATHS.PAYMENT_RETURN;
}

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: appUrlPrefixes(),
  getStateFromPath: (path, options) => (isPaymentReturnPath(path) ? undefined : getStateFromPath(path, options)),
  config: {
    screens: {
      [ROOT_ROUTES.MAIN]: {
        screens: {
          [MAIN_STACK_ROUTES.COLLECTION_DETAIL]: 'collections/:collectionId',
          [MAIN_STACK_ROUTES.SHARED_COLLECTION]: 'shared/collections/:token',
        },
      },
    },
  },
};
