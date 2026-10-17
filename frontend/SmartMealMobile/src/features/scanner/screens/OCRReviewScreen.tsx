import { haptic } from '@/utils/haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AlertTriangle, Info } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { ErrorState, InlineBanner, LoadingState, ScreenContainer, ScreenHeader } from '@/components/common';
import { AppBadge, AppButton, AppCard, AppInput, AppText } from '@/components/ui';
import { todayIso, useAddMealLogEntries } from '@/features/nutrition';
import { MAIN_STACK_ROUTES, MAIN_TAB_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { MEAL_TYPE_TITLES } from '@/types/meal.types';
import { useTheme } from '@/theme/ThemeProvider';
import { SafetyAlertList } from '../components/SafetyAlertList';
import { useAnalyzeOcrLabel } from '../hooks/useScanner';
import { ocrFieldsToNutrition, type OcrNutritionField, type OcrReviewResult } from '../types/scanner.types';

type Props = NativeStackScreenProps<MainStackParamList, 'OCRReview'>;

// design/OCRReview.dc.html (BR-130). Kết quả AI đọc từ ảnh nhãn người dùng chụp — trường nhãn không
// ghi để trống và gắn "Không rõ"; bắt buộc người dùng kiểm tra/sửa trước khi lưu (BR-054/130).
export function OCRReviewScreen({ navigation, route }: Props) {
  const { mealType, imageUri } = route.params;
  const { colors } = useTheme();
  const analyzeOcrLabel = useAnalyzeOcrLabel();
  const addMealLogEntries = useAddMealLogEntries(todayIso());

  const [productName, setProductName] = useState('');
  const [fields, setFields] = useState<OcrNutritionField[] | null>(null);
  const [result, setResult] = useState<OcrReviewResult | null>(null);

  const analyze = () =>
    analyzeOcrLabel.mutate(imageUri, {
      onSuccess: scanned => {
        haptic.success();
        setResult(scanned);
        setProductName(scanned.productName);
        setFields(scanned.fields);
      },
    });

  useEffect(() => {
    analyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUri]);

  const updateField = (label: string, value: string) => {
    setFields(current =>
      current
        ? current.map(field => (field.label === label ? { ...field, value, isUncertain: false } : field))
        : current,
    );
  };

  const handleSave = () => {
    if (!fields) return;
    const servingField = fields.find(field => field.label === 'Khẩu phần');
    const grams = Number(servingField?.value) || 100;
    addMealLogEntries.mutate(
      {
        mealType,
        entries: [
          {
            foodName: productName || 'Sản phẩm quét nhãn',
            servingLabel: `${servingField?.value ?? grams} ${servingField?.unit ?? 'g'}`,
            grams,
            nutrition: ocrFieldsToNutrition(fields),
            source: 'manual',
            logMethod: 'Ocr',
          },
        ],
      },
      {
        onSuccess: () => {
          navigation.navigate(MAIN_STACK_ROUTES.MAIN_TABS, {
            screen: MAIN_TAB_ROUTES.DIARY,
            params: { toast: `Đã ghi 1 món vào ${MEAL_TYPE_TITLES[mealType]}` },
          });
        },
      },
    );
  };

  if (analyzeOcrLabel.isError) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Kiểm tra nhãn" onBack={() => navigation.goBack()} />
        <ErrorState
          description={analyzeOcrLabel.error.message}
          onRetry={analyze}
          secondaryActionLabel="Chụp lại"
          onSecondaryAction={() => navigation.replace(MAIN_STACK_ROUTES.OCR_CAMERA, { mealType })}
        />
      </ScreenContainer>
    );
  }

  if (analyzeOcrLabel.isPending || !fields || !result) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Kiểm tra nhãn" onBack={() => navigation.goBack()} />
        <LoadingState lines={7} />
      </ScreenContainer>
    );
  }

  const missingRequired = fields.some(field => (field.label === 'Khẩu phần' || field.label === 'Calo') && !Number(field.value));

  return (
    <ScreenContainer>
      <ScreenHeader title="Kiểm tra nhãn" onBack={() => navigation.goBack()} />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="gap-lg py-xs">
        <View>
          <Image
            source={{ uri: imageUri }}
            accessibilityLabel="Ảnh nhãn dinh dưỡng đã chụp"
            resizeMode="cover"
            className="h-[150px] w-full rounded-lg bg-primary-soft"
          />
          <AppBadge
            label="Đọc từ nhãn · hãy kiểm tra"
            tone="info"
            className="absolute left-sm top-sm bg-surface"
          />
        </View>

        {result.isDemo ? (
          <InlineBanner
            icon={<Info size={20} color={colors.warning} />}
            title="Dữ liệu mẫu"
            description="Máy chủ chưa bật AI nên đây là kết quả mẫu, không phải đọc từ ảnh của bạn."
          />
        ) : null}

        <SafetyAlertList alerts={result.alerts} />

        <AppInput label="Tên sản phẩm" value={productName} onChangeText={setProductName} />

        {result.detectedIngredients.length > 0 ? (
          <AppText variant="caption" color="secondary">
            {`Thành phần đọc được: ${result.detectedIngredients.join(', ')}`}
          </AppText>
        ) : null}

        <AppCard className="gap-0">
          <AppText variant="h3" className="pb-sm">
            Giá trị dinh dưỡng
          </AppText>
          {fields.map(field => (
            <View
              key={field.label}
              className="flex-row items-center gap-sm border-t border-border py-xs"
            >
              <View className="flex-1 gap-xxs">
                <AppText variant="body">{field.label}</AppText>
                {field.isUncertain ? (
                  <View className="flex-row items-center gap-xxs">
                    <AlertTriangle size={12} color={colors.warning} />
                    <AppText variant="caption" className="font-sans-semibold text-warning-text">
                      Không rõ · kiểm tra lại
                    </AppText>
                  </View>
                ) : null}
              </View>
              <AppInput
                value={field.value}
                onChangeText={value => updateField(field.label, value)}
                keyboardType="numeric"
                className={`w-[100px] text-right ${field.isUncertain ? 'border-warning bg-warning-soft' : ''}`}
                rightAdornment={
                  <AppText variant="body" color="secondary">
                    {field.unit}
                  </AppText>
                }
              />
            </View>
          ))}
        </AppCard>

        {missingRequired ? (
          <AppText variant="caption" color="secondary">
            Nhập khẩu phần (g) và calo trước khi lưu.
          </AppText>
        ) : null}

        {addMealLogEntries.isError ? (
          <AppText variant="caption" color="error" className="text-center">
            {addMealLogEntries.error.message}
          </AppText>
        ) : null}
      </ScrollView>

      <View className="flex-row gap-sm py-md">
        <AppButton
          label="Chụp lại"
          variant="outline"
          onPress={() => navigation.replace(MAIN_STACK_ROUTES.OCR_CAMERA, { mealType })}
        />
        <AppButton
          label="Lưu & thêm vào nhật ký"
          onPress={handleSave}
          disabled={missingRequired}
          loading={addMealLogEntries.isPending}
          className="flex-1"
        />
      </View>
    </ScreenContainer>
  );
}
