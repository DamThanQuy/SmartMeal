import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import type { MealType } from '@/types/meal.types';
import { remindersService } from '../services/remindersService';
import type { OtherReminderId } from '../types/profile.types';

const REMINDERS_QUERY_KEY = ['reminders'] as const;

export function useReminders() {
  const query = useQuery({
    queryKey: REMINDERS_QUERY_KEY,
    queryFn: () => remindersService.getReminders(),
  });
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
