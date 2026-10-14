import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Clock, Plus, Sparkles } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { EmptyState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppBadge, AppButton, AppCard, AppText } from '@/components/ui';
import {
  MacroStatGrid,
  nutritionPerGram as toNutritionPerGram,
  scaleNutritionByGrams,
  sumNutrition,
  todayIso,
  useAddMealLogEntries,
  type NutritionInfo,
} from '@/features/nutrition';
import { MEAL_TYPE_TITLES } from '@/types/meal.types';
import { MAIN_STACK_ROUTES, MAIN_TAB_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { AiAllergyWarnings, AiDemoNotice } from '../components/AiResultNotices';
import { AiResultItemRow } from '../components/AiResultItemRow';
import { AiUncertainItemCard, CUSTOM_CANDIDATE_ID } from '../components/AiUncertainItemCard';
import type { AIRecognizedItem } from '../types/ai.types';

type Props = NativeStackScreenProps<MainStackParamList, 'AISnapResult'>;

interface UncertainSelection {
  candidateId: string | null;
  customName: string;
  portionId: string | null;
}

interface ResolvedEntry {
  foodName: string;
  servingLabel: string;
  grams: number;
  nutrition: NutritionInfo;
}

function isSelectionResolved(selection: UncertainSelection | undefined): boolean {
  if (!selection || !selection.portionId) return false;
  if (selection.candidateId === CUSTOM_CANDIDATE_ID) return selection.customName.trim().length > 0;
  return Boolean(selection.candidateId);
}

// design/AISnap.dc.html + AISnapUncertain.dc.html (BR-054, BR-061, BR-062, BR-072, BR-250).
// AISnapUncertain KHÔNG phải route riêng — chỉ là trạng thái của màn này khi kết quả AI có món
// độ tin cậy thấp (isUncertain + uncertainResolution): món đó "chưa được ghi" cho tới khi user
// chọn đúng tên + khẩu phần, nút Confirm disable tới lúc đó (BR-072).
export function AISnapResultScreen({ navigation, route }: Props) {
  const { mealType, result } = route.params;
  const { colors } = useTheme();
  const [items, setItems] = useState<AIRecognizedItem[]>(result.items);
  const [uncertainSelections, setUncertainSelections] = useState<Record<string, UncertainSelection>>({});
  const addMealLogEntries = useAddMealLogEntries(todayIso());
  const mealTitle = MEAL_TYPE_TITLES[mealType];

  const certainItems = items.filter(item => !item.isUncertain);
  const uncertainItems = items.filter(item => item.isUncertain && item.uncertainResolution);
  const allUncertainResolved = uncertainItems.every(item =>
    isSelectionResolved(uncertainSelections[item.id]),
  );

  const resolveUncertainEntry = (item: AIRecognizedItem): ResolvedEntry | null => {
    const selection = uncertainSelections[item.id];
    const resolution = item.uncertainResolution;
    if (!resolution || !isSelectionResolved(selection)) return null;
    const portion = resolution.portionOptions.find(option => option.id === selection?.portionId);
    if (!portion) return null;
    const foodName =
      selection?.candidateId === CUSTOM_CANDIDATE_ID
        ? selection.customName.trim()
        : (resolution.candidates.find(candidate => candidate.id === selection?.candidateId)?.name ??
          item.name);
    return {
      foodName,
      servingLabel: portion.label,
      grams: portion.grams,
      nutrition: scaleNutritionByGrams(resolution.nutritionPerGram, portion.grams),
    };
  };

  const updateItemGrams = (itemId: string, grams: number) => {
    setItems(current =>
      current.map(item => {
        if (item.id !== itemId) return item;
        const perGram = toNutritionPerGram(item.nutrition, item.grams);
        return { ...item, grams, nutrition: scaleNutritionByGrams(perGram, grams) };
      }),
    );
  };

  const removeItem = (itemId: string) => {
    setItems(current => current.filter(item => item.id !== itemId));
  };

  const setUncertainSelection = (itemId: string, patch: Partial<UncertainSelection>) => {
    setUncertainSelections(current => ({
      ...current,
      [itemId]: {
        candidateId: current[itemId]?.candidateId ?? null,
        customName: current[itemId]?.customName ?? '',
        portionId: current[itemId]?.portionId ?? null,
        ...patch,
      },
    }));
  };

  const handleConfirm = () => {
    if (!allUncertainResolved) return;
    const resolvedUncertainEntries = uncertainItems
      .map(resolveUncertainEntry)
      .filter((entry): entry is ResolvedEntry => entry !== null);

    addMealLogEntries.mutate(
      {
        mealType,
        entries: [
          ...certainItems.map(item => ({
            foodName: item.name,
            servingLabel: item.servingLabel,
            grams: item.grams,
            nutrition: item.nutrition,
            source: 'ai' as const,
            aiConfirmed: true,
          })),
          ...resolvedUncertainEntries.map(entry => ({
            ...entry,
            source: 'ai' as const,
            aiConfirmed: true,
          })),
        ],
      },
      {
        onSuccess: () => {
          const totalLogged = certainItems.length + resolvedUncertainEntries.length;
          navigation.navigate(MAIN_STACK_ROUTES.MAIN_TABS, {
            screen: MAIN_TAB_ROUTES.DIARY,
            params: { toast: `Đã ghi ${totalLogged} món vào ${mealTitle}` },
          });
        },
      },
    );
  };

  const resolvedUncertainEntries = allUncertainResolved
    ? uncertainItems.map(resolveUncertainEntry).filter((entry): entry is ResolvedEntry => entry !== null)
    : [];
  const total = sumNutrition([
    ...certainItems.map(item => item.nutrition),
    ...resolvedUncertainEntries.map(entry => entry.nutrition),
  ]);

  return (
    <ScreenContainer>
      <ScreenHeader title="Kết quả nhận diện" onBack={() => navigation.goBack()} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-lg py-xs"
      >
        <View>
          <View className="h-[210px] items-center justify-center gap-xxs rounded-lg bg-primary-soft">
            <AppText variant="caption" className="text-on-primary-soft">
              Ảnh bữa ăn của bạn
            </AppText>
          </View>
          <AppBadge
            label="Ước tính từ hình ảnh"
            tone="info"
            icon={<Sparkles size={14} color={colors.infoText} />}
            className="absolute left-sm top-sm bg-surface"
          />
        </View>

        {result.isDemo ? <AiDemoNotice /> : null}
        <AiAllergyWarnings warnings={result.allergyWarnings ?? []} />

        {allUncertainResolved ? (
          <AppCard className="gap-sm">
            <View className="flex-row items-end justify-between">
              <View>
                <AppText variant="caption" color="secondary">
                  {`Tổng ước tính · ${mealTitle}`}
                </AppText>
                <AppText variant="display">{`≈ ${total.calories} kcal`}</AppText>
              </View>
              <AppBadge
                label={mealTitle}
                icon={<Clock size={14} color={colors.onPrimarySoft} />}
              />
            </View>
            <MacroStatGrid
              proteinG={total.proteinG}
              carbsG={total.carbsG}
              fatG={total.fatG}
              estimated
            />
          </AppCard>
        ) : null}

        {uncertainItems.map(item => (
          <AiUncertainItemCard
            key={item.id}
            item={item}
            selectedCandidateId={uncertainSelections[item.id]?.candidateId ?? null}
            customName={uncertainSelections[item.id]?.customName ?? ''}
            selectedPortionId={uncertainSelections[item.id]?.portionId ?? null}
            onSelectCandidate={candidateId => setUncertainSelection(item.id, { candidateId })}
            onChangeCustomName={customName => setUncertainSelection(item.id, { customName })}
            onSelectPortion={portionId => setUncertainSelection(item.id, { portionId })}
          />
        ))}

        <AppCard className="gap-0">
          <AppText variant="h3" className="pb-sm">
            {`Món nhận diện được (${certainItems.length})`}
          </AppText>
          {certainItems.length === 0 ? (
            <EmptyState title="Chưa còn món nào" description="Bạn đã xóa hết món nhận diện được." />
          ) : (
            certainItems.map(item => (
              <AiResultItemRow
                key={item.id}
                item={item}
                onChangeGrams={grams => updateItemGrams(item.id, grams)}
                onDelete={() => removeItem(item.id)}
              />
            ))
          )}
          <View className="border-t border-border pt-xs">
            {/* TODO: chưa nối luồng thêm món bị AI bỏ sót vào danh sách đang review (Đợt sau). */}
            <View className="min-h-[44px] flex-row items-center gap-xxs opacity-40">
              <AppText variant="bodyMedium" color="onPrimarySoft">
                Thêm món AI bỏ sót
              </AppText>
              <Plus size={16} color={colors.onPrimarySoft} />
            </View>
          </View>
        </AppCard>

        <AppText variant="caption" color="secondary" className="text-center">
          Kết quả AI có thể sai. Hãy kiểm tra trước khi lưu vào nhật ký.
        </AppText>

        {addMealLogEntries.isError ? (
          <AppText variant="caption" color="error" className="text-center">
            {addMealLogEntries.error.message}
          </AppText>
        ) : null}
      </ScrollView>

      <View className="gap-xxs py-md">
        <AppButton
          label="Xác nhận & ghi nhật ký"
          onPress={handleConfirm}
          loading={addMealLogEntries.isPending}
          disabled={items.length === 0 || !allUncertainResolved}
        />
        {!allUncertainResolved ? (
          <AppText variant="caption" color="secondary" className="text-center">
            Trả lời câu hỏi ở trên để tiếp tục.
          </AppText>
        ) : null}
      </View>
    </ScreenContainer>
  );
}
