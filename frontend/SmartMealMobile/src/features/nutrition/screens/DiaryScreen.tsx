import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { BarChart3, Calendar, ChevronLeft, ChevronRight, Clock, Plus, WifiOff } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, TouchableOpacity, View } from 'react-native';
import { ErrorState, InlineBanner, LoadingState, ScreenContainer, SuccessToast } from '@/components/common';
import { AppBadge, AppButton, AppCard, AppIconButton, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES } from '@/constants/routes';
import type { MainStackParamList, MainTabParamList } from '@/navigation/types';
import { useAppStore } from '@/state/app/appStore';
import { MEAL_TYPES, type MealType } from '@/types/meal.types';
import { useTheme } from '@/theme/ThemeProvider';
import { DiaryMealSection } from '../components/DiaryMealSection';
import { useDiaryDay } from '../hooks/useDiary';
import { todayIso } from '../services/nutritionService';
import { useOfflineSyncStore } from '../state/offlineSyncStore';

type Props = BottomTabScreenProps<MainTabParamList, 'Diary'>;

const WEEKDAY_SHORT_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

// design/Diary.dc.html (BR-050→BR-054). Tab "Nhật ký" — navigate() ở đây escape sang
// MainStackParamList (QuickLog/EditMealLog/ProgressChart nằm ngoài MainTabParamList).
export function DiaryScreen({ route }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  // Theo dõi giá trị route.params.toast đã xử lý — cho phép "điều chỉnh state khi prop đổi"
  // ngay trong lúc render (React khuyến nghị cách này thay vì gọi setState đồng bộ trong
  // effect — react-hooks/set-state-in-effect).
  const [handledToastParam, setHandledToastParam] = useState<string | undefined>(undefined);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const incomingToast = route.params?.toast;
  if (incomingToast && incomingToast !== handledToastParam) {
    setHandledToastParam(incomingToast);
    setToastMessage(incomingToast);
  }

  const dateIso = format(selectedDate, 'yyyy-MM-dd');
  const isToday = dateIso === todayIso();
  const { data: diary, isLoading, isError, error, refetch } = useDiaryDay(dateIso);
  const isOffline = useAppStore(state => state.isOfflineDevOverride);
  const pendingSync = useOfflineSyncStore(state => state.pending);
  const pendingSyncIds = new Set(pendingSync.map(entry => entry.id));

  useEffect(() => {
    if (!toastMessage) return;
    navigation.setParams({ toast: undefined });
    toastTimer.current = setTimeout(() => setToastMessage(null), 2600);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [toastMessage, navigation]);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  const goToQuickLog = (mealType?: MealType) =>
    navigation.navigate(MAIN_STACK_ROUTES.QUICK_LOG, { mealType });

  return (
    <ScreenContainer>
      <View className="flex-row items-center gap-sm py-xs">
        <AppText variant="h1" className="flex-1">
          Nhật ký
        </AppText>
        <AppIconButton
          accessibilityLabel="Biểu đồ tiến độ"
          variant="elevated"
          shape="square"
          icon={<BarChart3 size={22} color={colors.textPrimary} />}
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.PROGRESS_CHART)}
        />
        <AppIconButton
          accessibilityLabel="Ghi bữa ăn"
          shape="circle"
          icon={<Plus size={22} color={colors.onPrimary} />}
          className="bg-primary"
          onPress={() => goToQuickLog()}
        />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="gap-lg pb-xxxl">
        <View className="gap-sm">
          <View className="flex-row items-center justify-between">
            <AppIconButton
              accessibilityLabel="Tuần trước"
              icon={<ChevronLeft size={22} color={colors.textPrimary} />}
              onPress={() => setSelectedDate(current => addDays(current, -7))}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chọn ngày"
              onPress={() => {
                setPickerMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
                setDatePickerVisible(true);
              }}
              className="flex-row items-center gap-xs min-h-[44px] px-sm justify-center"
            >
              <Calendar size={16} color={colors.primary} />
              <AppText variant="bodyMedium">
                {isToday ? `Hôm nay, ${format(selectedDate, 'dd/MM')}` : format(selectedDate, 'dd/MM/yyyy')}
              </AppText>
            </Pressable>
            <AppIconButton
              accessibilityLabel="Tuần sau"
              icon={<ChevronRight size={22} color={colors.textPrimary} />}
              onPress={() => setSelectedDate(current => addDays(current, 7))}
            />
          </View>
          <View className="flex-row justify-between">
            {weekDays.map(day => {
              const selected = isSameDay(day, selectedDate);
              return (
                <Pressable
                  key={day.toISOString()}
                  accessibilityRole="button"
                  accessibilityLabel={format(day, 'dd/MM')}
                  accessibilityState={{ selected }}
                  onPress={() => setSelectedDate(day)}
                  className={`min-h-[56px] flex-1 items-center gap-xxs rounded-md py-xs ${
                    selected ? 'bg-primary' : 'bg-transparent'
                  }`}
                >
                  <AppText variant="caption" color={selected ? 'onPrimary' : 'primary'}>
                    {WEEKDAY_SHORT_LABELS[day.getDay()]}
                  </AppText>
                  <AppText variant="bodyMedium" color={selected ? 'onPrimary' : 'primary'}>
                    {format(day, 'd')}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {isOffline ? (
          <InlineBanner
            tone="neutral"
            icon={<WifiOff size={20} color={colors.warningText} />}
            title="Bạn đang offline"
            description="Vẫn xem và ghi được. Thay đổi sẽ tự đồng bộ khi có mạng."
            className="border-warning"
          />
        ) : null}

        {isLoading ? (
          <LoadingState lines={6} />
        ) : isError ? (
          <ErrorState description={error.message} onRetry={refetch} />
        ) : diary ? (
          <>
            <AppCard className="gap-sm">
              <View className="flex-row items-baseline justify-between">
                <AppText variant="body" color="secondary">
                  Đã nạp
                </AppText>
                <AppText variant="body" color="secondary">
                  <AppText variant="h2">
                    {Object.values(diary.entriesByMeal)
                      .flat()
                      .reduce((sum, entry) => sum + entry.nutrition.calories, 0)
                      .toLocaleString('vi-VN')}
                  </AppText>
                  {` / ${(diary.calorieTarget + diary.activityCalories).toLocaleString('vi-VN')} kcal`}
                </AppText>
              </View>
              <DiaryOverviewBar diary={diary} />
            </AppCard>

            {MEAL_TYPES.map(mealType => (
              <DiaryMealSection
                key={mealType}
                mealType={mealType}
                entries={diary.entriesByMeal[mealType]}
                onAdd={() => goToQuickLog(mealType)}
                onEditEntry={logId => navigation.navigate(MAIN_STACK_ROUTES.EDIT_MEAL_LOG, { logId })}
                pendingSyncIds={pendingSyncIds}
              />
            ))}

            {isOffline && pendingSync.length > 0 ? (
              <AppCard className="gap-xs">
                <View className="flex-row items-center justify-between pb-xxs">
                  <AppText variant="h3">{`Chờ đồng bộ (${pendingSync.length})`}</AppText>
                  <AppBadge
                    label="Cần kết nối mạng"
                    tone="warning"
                    icon={<WifiOff size={12} color={colors.warningText} />}
                  />
                </View>
                {pendingSync.map(entry => (
                  <View
                    key={entry.id}
                    className="flex-row items-center gap-sm border-t border-border py-xs"
                  >
                    <Clock size={18} color={colors.textSecondary} />
                    <AppText variant="body" className="flex-1">
                      {entry.label}
                    </AppText>
                    <AppText variant="caption" color="secondary">
                      {entry.timeLabel}
                    </AppText>
                  </View>
                ))}
                <AppButton label="Đồng bộ ngay" variant="secondary" disabled className="mt-xs" />
                <AppText variant="caption" color="secondary">
                  Mỗi thao tác chỉ được gửi một lần khi có mạng, nên sẽ không tạo bản ghi trùng.
                </AppText>
              </AppCard>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {toastMessage ? <SuccessToast message={toastMessage} /> : null}

      {/* Date Picker Modal */}
      <Modal
        visible={datePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          className="flex-1 bg-black/40 items-center justify-center px-lg"
          onPress={() => setDatePickerVisible(false)}
        >
          <TouchableOpacity activeOpacity={1}>
            <View className="bg-surface rounded-card p-lg gap-md" style={{ minWidth: 320 }}>
              {/* Month navigator */}
              <View className="flex-row items-center justify-between">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Tháng trước"
                  hitSlop={8}
                  onPress={() => setPickerMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                  className="min-h-[44px] min-w-[44px] items-center justify-center"
                >
                  <ChevronLeft size={22} color={colors.textPrimary} />
                </Pressable>
                <AppText variant="bodyMedium">
                  {format(pickerMonth, 'MM/yyyy')}
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Tháng sau"
                  hitSlop={8}
                  onPress={() => setPickerMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                  className="min-h-[44px] min-w-[44px] items-center justify-center"
                >
                  <ChevronRight size={22} color={colors.textPrimary} />
                </Pressable>
              </View>

              {/* Day-of-week header */}
              <View className="flex-row justify-between">
                {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
                  <View key={d} className="flex-1 items-center">
                    <AppText variant="caption" color="secondary">{d}</AppText>
                  </View>
                ))}
              </View>

              {/* Day grid */}
              <PickerDayGrid
                pickerMonth={pickerMonth}
                selectedDate={selectedDate}
                onSelect={date => {
                  setSelectedDate(date);
                  setDatePickerVisible(false);
                }}
                colors={colors}
              />

              {/* Shortcut buttons */}
              <View className="flex-row gap-sm">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Hôm nay"
                  onPress={() => {
                    setSelectedDate(new Date());
                    setDatePickerVisible(false);
                  }}
                  className="flex-1 h-[40px] items-center justify-center rounded-md bg-primary"
                >
                  <AppText variant="bodyMedium" color="onPrimary">Hôm nay</AppText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Đóng"
                  onPress={() => setDatePickerVisible(false)}
                  className="flex-1 h-[40px] items-center justify-center rounded-md border border-border"
                >
                  <AppText variant="bodyMedium">Đóng</AppText>
                </Pressable>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScreenContainer>
  );
}

// ─── Date picker grid helper ───────────────────────────────────────────────
interface PickerDayGridProps {
  pickerMonth: Date;
  selectedDate: Date;
  onSelect: (date: Date) => void;
  colors: ReturnType<typeof import('@/theme/ThemeProvider').useTheme>['colors'];
}

function PickerDayGrid({ pickerMonth, selectedDate, onSelect, colors }: PickerDayGridProps) {
  const year = pickerMonth.getFullYear();
  const month = pickerMonth.getMonth();
  // First day of month (0=Sun,...6=Sat), shift to Sun-first grid
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full rows of 7
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View className="gap-xxs">
      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} className="flex-row justify-between">
          {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
            if (!day) return <View key={col} className="flex-1" />;
            const date = new Date(year, month, day);
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date());
            return (
              <Pressable
                key={col}
                accessibilityRole="button"
                accessibilityLabel={format(date, 'dd/MM/yyyy')}
                onPress={() => onSelect(date)}
                className={`flex-1 h-[38px] items-center justify-center rounded-full mx-xxs ${
                  isSelected ? 'bg-primary' : 'bg-transparent'
                }`}
              >
                <AppText
                  variant="body"
                  color={isSelected ? 'onPrimary' : isToday ? 'primary' : undefined}
                  style={isToday && !isSelected ? { fontWeight: '700' } : undefined}
                >
                  {String(day)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

interface DiaryOverviewBarProps {
  diary: NonNullable<ReturnType<typeof useDiaryDay>['data']>;
}

function DiaryOverviewBar({ diary }: DiaryOverviewBarProps) {
  const allEntries = Object.values(diary.entriesByMeal).flat();
  const consumed = {
    calories: allEntries.reduce((sum, entry) => sum + entry.nutrition.calories, 0),
    proteinG: allEntries.reduce((sum, entry) => sum + entry.nutrition.proteinG, 0),
    carbsG: allEntries.reduce((sum, entry) => sum + entry.nutrition.carbsG, 0),
    fatG: allEntries.reduce((sum, entry) => sum + entry.nutrition.fatG, 0),
  };
  const target = diary.calorieTarget + diary.activityCalories;
  const percent = target > 0 ? Math.min(consumed.calories / target, 1) : 0;

  return (
    <>
      <View className="h-[8px] overflow-hidden rounded-pill bg-primary-soft">
        <View className="h-[8px] rounded-pill bg-primary" style={{ width: `${percent * 100}%` }} />
      </View>
      <View className="flex-row justify-between">
        <AppText variant="caption" color="secondary">{`P ${consumed.proteinG}/${diary.macroTargets.proteinG}g`}</AppText>
        <AppText variant="caption" color="secondary">{`C ${consumed.carbsG}/${diary.macroTargets.carbsG}g`}</AppText>
        <AppText variant="caption" color="secondary">{`F ${consumed.fatG}/${diary.macroTargets.fatG}g`}</AppText>
      </View>
    </>
  );
}
