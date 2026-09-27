import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AlertTriangle, ScanLine, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AppButton, AppCard, AppChip, AppIconButton, AppText } from '@/components/ui';
import { ALLERGY_OPTIONS } from '@/features/health';
import { CURRENT_USER_ALLERGY_IDS, todayIso, useAddMealLogEntries } from '@/features/nutrition';
import { MAIN_STACK_ROUTES, MAIN_TAB_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { MEAL_TYPE_TITLES } from '@/types/meal.types';
import { useTheme } from '@/theme/ThemeProvider';
import { useScanBarcode } from '../hooks/useScanner';
import { CameraPermissionDeniedError } from '../services/scannerService';
import { UNKNOWN_BARCODE_MOCK } from '../mocks/products.mock';
import type { ScannedProduct } from '../types/scanner.types';

type Props = NativeStackScreenProps<MainStackParamList, 'Barcode'>;
type ScanMode = 'barcode' | 'ocr';

// design/Barcode.dc.html (BR-120, BR-130, BR-140). Vision Camera/ML Kit thật chưa nối — nút
// "chạm để quét" gọi thẳng scannerService (CLAUDE.md mục 8).
export function BarcodeScreen({ navigation, route }: Props) {
  const { mealType } = route.params;
  const { colors } = useTheme();
  const [mode, setMode] = useState<ScanMode>('barcode');
  const [product, setProduct] = useState<ScannedProduct | null>(null);
  const scanBarcode = useScanBarcode();
  const addMealLogEntries = useAddMealLogEntries(todayIso());

  const handleScan = () => {
    if (mode === 'ocr') {
      navigation.navigate(MAIN_STACK_ROUTES.OCR_REVIEW, { mealType });
      return;
    }
    scanBarcode.mutate(undefined, {
      onSuccess: result => {
        if (result) {
          setProduct(result);
        } else {
          navigation.replace(MAIN_STACK_ROUTES.PRODUCT_NOT_FOUND, {
            barcode: UNKNOWN_BARCODE_MOCK,
            mealType,
          });
        }
      },
      onError: error => {
        if (error instanceof CameraPermissionDeniedError) {
          navigation.replace(MAIN_STACK_ROUTES.STATE_PERMISSION, { mealType, returnTo: 'Barcode' });
        }
      },
    });
  };

  const matchedAllergenIds = product
    ? product.allergenIds.filter(id => CURRENT_USER_ALLERGY_IDS.includes(id))
    : [];
  const matchedAllergenLabels = matchedAllergenIds
    .map(id => ALLERGY_OPTIONS.find(option => option.id === id)?.label ?? id)
    .join(', ');
  const hasSugarWarning =
    !!product?.sugarWarningThreshold &&
    (product.nutritionPer100g.sugarG ?? 0) >= product.sugarWarningThreshold;

  const handleAddToDiary = () => {
    if (!product) return;
    addMealLogEntries.mutate(
      {
        mealType,
        entries: [
          {
            foodName: product.name,
            servingLabel: '100 g',
            grams: 100,
            nutrition: product.nutritionPer100g,
            source: 'database',
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

  return (
    <View className="flex-1 bg-background">
      <View className="h-[330px] items-center justify-center gap-md bg-overlay px-md">
        <View className="absolute left-md top-[52px]">
          <AppIconButton
            accessibilityLabel="Đóng máy quét"
            icon={<X size={22} color={colors.onPrimary} />}
            className="bg-on-primary/15"
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.QUICK_LOG, { mealType })}
          />
        </View>
        <View className="mt-xl h-[130px] w-[240px] rounded-lg border-2 border-on-primary" />
        <AppText variant="body" className="text-on-primary">
          Đưa mã vạch vào khung
        </AppText>
        <View className="flex-row gap-xs">
          <AppChip label="Mã vạch" selected={mode === 'barcode'} onPress={() => setMode('barcode')} />
          <AppChip
            label="Nhãn dinh dưỡng (OCR)"
            selected={mode === 'ocr'}
            onPress={() => setMode('ocr')}
          />
        </View>
      </View>

      <ScrollView
        className="-mt-lg flex-1 rounded-t-sheet bg-background"
        contentContainerClassName="gap-md p-md"
        showsVerticalScrollIndicator={false}
      >
        {!product ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chạm để giả lập quét"
            onPress={handleScan}
            className="min-h-[120px] items-center justify-center gap-sm rounded-card border border-dashed border-border-strong"
          >
            <ScanLine size={28} color={colors.primary} />
            <AppText variant="bodyMedium" color="onPrimarySoft">
              {scanBarcode.isPending ? 'Đang quét…' : 'Chạm để giả lập quét'}
            </AppText>
          </Pressable>
        ) : (
          <>
            <View className="flex-row items-center gap-sm">
              <View className="h-[64px] w-[64px] items-center justify-center rounded-md bg-primary-soft" />
              <View className="flex-1 gap-xxs">
                <AppText variant="h3">{product.name}</AppText>
                <AppText variant="body" color="secondary">
                  {product.packageLabel}
                </AppText>
              </View>
            </View>

            {matchedAllergenIds.length > 0 ? (
              <View className="gap-sm rounded-card border border-error bg-surface p-md">
                <View className="flex-row items-center gap-sm">
                  <View className="h-[36px] w-[36px] items-center justify-center rounded-md bg-error-soft">
                    <AlertTriangle size={20} color={colors.error} />
                  </View>
                  <AppText variant="bodyMedium">{`Có thể chứa ${matchedAllergenLabels}`}</AppText>
                </View>
                <AppText variant="body" color="secondary">
                  Sản phẩm này có thành phần trùng với danh sách dị ứng bạn đã khai báo.
                </AppText>
              </View>
            ) : null}

            {hasSugarWarning ? (
              <View className="flex-row items-center gap-sm rounded-card border border-warning bg-surface p-md">
                <AlertTriangle size={20} color={colors.warning} />
                <View className="flex-1">
                  <AppText variant="bodyMedium">
                    {`Đường cao · ${product.nutritionPer100g.sugarG} g / 100 g`}
                  </AppText>
                  <AppText variant="caption" color="secondary">
                    Cảnh báo dinh dưỡng, không phải chẩn đoán y khoa
                  </AppText>
                </View>
              </View>
            ) : null}

            <AppCard className="gap-sm">
              <AppText variant="bodyMedium">Dinh dưỡng / 100 g</AppText>
              <View className="flex-row gap-xs">
                {[
                  { label: 'Calo', value: product.nutritionPer100g.calories, unit: '' },
                  { label: 'Protein', value: product.nutritionPer100g.proteinG, unit: 'g' },
                  { label: 'Carbs', value: product.nutritionPer100g.carbsG, unit: 'g' },
                  { label: 'Fat', value: product.nutritionPer100g.fatG, unit: 'g' },
                ].map(item => (
                  <View key={item.label} className="flex-1 gap-xxs rounded-md bg-background p-sm">
                    <AppText variant="caption" color="secondary">
                      {item.label}
                    </AppText>
                    <AppText variant="h3">
                      {item.value}
                      <AppText variant="caption" color="secondary">{` ${item.unit}`}</AppText>
                    </AppText>
                  </View>
                ))}
              </View>
            </AppCard>

            {addMealLogEntries.isError ? (
              <AppText variant="caption" color="error" className="text-center">
                {addMealLogEntries.error.message}
              </AppText>
            ) : null}

            <View className="flex-row gap-sm">
              <AppButton
                label="Quét lại"
                variant="outline"
                onPress={() => setProduct(null)}
              />
              <AppButton
                label="Thêm vào nhật ký"
                onPress={handleAddToDiary}
                loading={addMealLogEntries.isPending}
                className="flex-1"
              />
            </View>
            <AppText variant="caption" color="secondary" className="text-center">
              Không tìm thấy sản phẩm? Nhập thủ công hoặc quét nhãn OCR.
            </AppText>
          </>
        )}
      </ScrollView>
    </View>
  );
}
