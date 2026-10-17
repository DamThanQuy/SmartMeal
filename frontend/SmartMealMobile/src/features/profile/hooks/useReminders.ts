import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import type { MealType } from '@/types/meal.types';
import { remindersService } from '../services/remindersService';
import type { OtherReminderId, RemindersSettings } from '../types/profile.types';

const REMINDERS_QUERY_KEY = ['reminders'] as const;

/** Chỉ đọc cài đặt nhắc nhở (không lên lịch lại khi quay về app) — cho dòng tóm tắt ở Cá nhân/Cài đặt. */
export function useRemindersSettings() {
  return useQuery({
    queryKey: REMINDERS_QUERY_KEY,
    queryFn: () => remindersService.getReminders(),
  });
}

/** "Bữa ăn, uống nước" theo nhắc nhở đang bật; chưa đọc được thì không hiện gì. */
export function summarizeReminders(settings: RemindersSettings | undefined): string | undefined {
  if (!settings) return undefined;
  const parts = [
    settings.meals.some(meal => meal.enabled) ? 'bữa ăn' : null,
    settings.water.enabled ? 'uống nước' : null,
  ].filter((part): part is string => part !== null);
  if (parts.length === 0) return 'Đang tắt';
  const summary = parts.join(', ');
  return summary.charAt(0).toUpperCase() + summary.slice(1);
}

export function useReminders() {
  const query = useRemindersSettings();
  const { refetch } = query;

  // Quay lại từ "Mở cài đặt" (vừa bật/tắt quyền thông báo): đọc lại quyền và lên lịch lại.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      void remindersService
        .resyncSchedule()
        .catch(() => {})
        .finally(() => void refetch());
    });
    return () => subscription.remove();
  }, [refetch]);

  return query;
}

function useInvalidateReminders() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: REMINDERS_QUERY_KEY });
}

export function useToggleMealReminder() {
  const invalidate = useInvalidateReminders();
  return useMutation({
    mutationFn: (mealType: MealType) => remindersService.toggleMealReminder(mealType),
    onSuccess: invalidate,
  });
}

export function useToggleWaterReminder() {
  const invalidate = useInvalidateReminders();
  return useMutation({
    mutationFn: () => remindersService.toggleWaterReminder(),
    onSuccess: invalidate,
  });
}

export function useToggleOtherReminder() {
  const invalidate = useInvalidateReminders();
  return useMutation({
    mutationFn: (id: OtherReminderId) => remindersService.toggleOtherReminder(id),
    onSuccess: invalidate,
  });
}
