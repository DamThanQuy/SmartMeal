import type { NavigatorScreenParams } from '@react-navigation/native';
import {
  MAIN_STACK_ROUTES,
  MAIN_TAB_ROUTES,
  PLANNER_STACK_ROUTES,
  ROOT_ROUTES,
} from '@/constants/routes';
import { currentWeekStartIso } from '@/features/meal-planner';
import { navigationRef } from '@/navigation/navigationRef';
import type { MainStackParamList } from '@/navigation/types';
import type { NotificationIcon } from '../types/profile.types';

const KNOWN_ICONS: Record<NotificationIcon, true> = {
  quickLog: true,
  pet: true,
  water: true,
  grocery: true,
  challenge: true,
  badge: true,
  premium: true,
  general: true,
};

/** Kiểm tra giá trị đọc lại từ `data` của thông báo hệ thống. */
export function isNotificationIcon(value: unknown): value is NotificationIcon {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(KNOWN_ICONS, value)
  );
}

/** Màn liên quan của một thông báo theo nhóm; null khi nhóm không có màn riêng. */
export function notificationTarget(
  icon: NotificationIcon,
): NavigatorScreenParams<MainStackParamList> | null {
  switch (icon) {
    case 'quickLog':
      return { screen: MAIN_STACK_ROUTES.QUICK_LOG, params: {} };
    case 'pet':
      return { screen: MAIN_STACK_ROUTES.PET };
    case 'challenge':
      return { screen: MAIN_STACK_ROUTES.CHALLENGES };
    case 'badge':
      return { screen: MAIN_STACK_ROUTES.BADGES };
    case 'premium':
      return { screen: MAIN_STACK_ROUTES.SUBSCRIPTION };
    case 'water':
      return { screen: MAIN_STACK_ROUTES.WATER_LOG };
    case 'grocery':
      // Grocery là route lồng trong Stack của tab Thực đơn (PlannerStackNavigator.tsx).
      return {
        screen: MAIN_STACK_ROUTES.MAIN_TABS,
        params: {
          screen: MAIN_TAB_ROUTES.PLANNER,
          params: {
            screen: PLANNER_STACK_ROUTES.GROCERY,
            params: { weekStartIso: currentWeekStartIso() },
          },
        },
      };
    case 'general':
      return null;
  }
}

/**
 * Mở màn liên quan của thông báo từ bất kỳ đâu (màn Thông báo, banner trong app, thông báo hệ thống) — đi qua
 * navigationRef vì banner và thông báo hệ thống nằm ngoài Stack của Main. Trả false khi không mở được.
 */
export function openNotificationTarget(icon: NotificationIcon): boolean {
  const target = notificationTarget(icon);
  if (!target || !navigationRef.isReady()) return false;
  navigationRef.navigate(ROOT_ROUTES.MAIN, target);
  return true;
}

/** Mở danh sách thông báo (bấm banner gộp nhiều thông báo). */
export function openNotificationsScreen(): void {
  if (navigationRef.isReady())
    navigationRef.navigate(ROOT_ROUTES.MAIN, {
      screen: MAIN_STACK_ROUTES.NOTIFICATIONS,
    });
}
