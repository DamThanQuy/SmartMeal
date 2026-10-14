import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Camera, X } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AppBadge, AppButton, AppCard, AppChip, AppIconButton, AppInput, AppText } from '@/components/ui';
import { ALLERGY_OPTIONS } from '@/features/health';
import { todayIso, useAddMealLogEntries } from '@/features/nutrition';
import { useUserProfileStore } from '@/state/user/userProfileStore';
import { MAIN_STACK_ROUTES, MAIN_TAB_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { MEAL_TYPE_TITLES } from '@/types/meal.types';
import { useTheme } from '@/theme/ThemeProvider';
import { SafetyAlertList } from '../components/SafetyAlertList';
import { useScanBarcode } from '../hooks/useScanner';
import { CameraPermissionDeniedError } from '../services/scannerService';
import type { ScannedProduct } from '../types/scanner.types';

type Props = NativeStackScreenProps<MainStackParamList, 'Barcode'>;

/** EAN/UPC trên bao bì thực phẩm (8–14 chữ số). */
const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;
const BARCODE_PATTERN = /^\d{8,14}$/;

// design/Barcode.dc.html (BR-120, BR-130, BR-140). Quét bằng expo-camera (chạy trên Expo Go) hoặc nhập
// mã tay; mã được tra trong CSDL kèm cảnh báo theo hồ sơ — không có thì sang ProductNotFound (nhập tay
// hoặc quét nhãn). Không dùng mã/sản phẩm mặc định (review PR #9 S1).
export function BarcodeScreen({ navigation, route }: Props) {
  const { mealType } = route.params;
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [manualCode, setManualCode] = useState('');
  const [product, setProduct] = useState<ScannedProduct | null>(null);
  const scanningRef = useRef(false);
  const scanBarcode = useScanBarcode();
  const addMealLogEntries = useAddMealLogEntries(todayIso());
  const currentUserAllergyIds = useUserProfileStore(state => state.allergyIds);

  const lookup = (rawCode: string) => {
    const code = rawCode.trim();
    if (!BARCODE_PATTERN.test(code) || scanningRef.current) return;
    scanningRef.current = true;
    scanBarcode.mutate(code, {
      onSuccess: result => {
        if (result) {
          setProduct(result);
        } else {
          navigation.replace(MAIN_STACK_ROUTES.PRODUCT_NOT_FOUND, { barcode: code, mealType });
        }
      },
      onError: error => {
        if (error instanceof CameraPermissionDeniedError) {
          navigation.replace(MAIN_STACK_ROUTES.STATE_PERMISSION, { mealType, returnTo: 'Barcode' });
        }
      },
      onSettled: () => {
        scanningRef.current = false;
      },
    });
  };

  const handleScanned = ({ data }: BarcodeScanningResult) => {
    if (!product) lookup(data);
  };

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    if (!result.granted && !result.canAskAgain) {
      navigation.replace(MAIN_STACK_ROUTES.STATE_PERMISSION, { mealType, returnTo: 'Barcode' });
    }
  };

  const matchedAllergenLabels = product
    ? product.allergenIds
        .filter(id => currentUserAllergyIds.includes(id))
        .map(id => ALLERGY_OPTIONS.find(option => option.id === id)?.label ?? id)
    : [];

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
            logMethod: 'Barcode',
            ingredientId: product.id,
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
      <View className="h-[330px] items-center justify-center gap-md overflow-hidden bg-overlay px-md">
        {permission?.granted && !product ? (
          <CameraView
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
            onBarcodeScanned={scanBarcode.isPending ? undefined : handleScanned}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          />
        ) : null}
        <View className="absolute left-md top-[52px]">
          <AppIconButton
            accessibilityLabel="Đóng máy quét"
            icon={<X size={22} color={colors.onPrimary} />}
            className="bg-on-primary/15"
            onPress={() => navigation.navigate(MAIN_STACK_ROUTES.QUICK_LOG, { mealType })}
          />
        </View>
        <View className="mt-xl h-[130px] w-[240px] rounded-lg border-2 border-on-primary" />
        {permission?.granted ? (
          <AppText variant="body" className="text-on-primary">
            {scanBarcode.isPending ? 'Đang tra cứu…' : 'Đưa mã vạch vào khung'}
          </AppText>
        ) : (
          <AppButton label="Cho phép camera để quét" variant="secondary" onPress={() => void handleRequestPermission()} />
        )}
        <View className="flex-row gap-xs">
          <AppChip label="Mã vạch" selected onPress={() => {}} />
          <AppChip
            label="Nhãn dinh dưỡng (OCR)"
            onPress={() => navigation.replace(MAIN_STACK_ROUTES.OCR_CAMERA, { mealType })}
          />
        </View>
      </View>

      <ScrollView
        className="-mt-lg flex-1 rounded-t-sheet bg-background"
        contentContainerClassName="gap-md p-md"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!product ? (
          <View className="gap-sm">
            <View className="flex-row items-end gap-sm">
              <AppInput
                label="Hoặc nhập mã vạch"
                placeholder="VD: 8934563138165"
                keyboardType="number-pad"
                value={manualCode}
                onChangeText={setManualCode}
                className="flex-1"
              />
              <AppButton
                label="Tra cứu"
                onPress={() => lookup(manualCode)}
                disabled={!BARCODE_PATTERN.test(manualCode.trim())}
                loading={scanBarcode.isPending}
                className="h-[48px]"
              />
            </View>
            {scanBarcode.isError ? (
              <AppText variant="caption" color="error" accessibilityRole="alert">
                {scanBarcode.error.message}
              </AppText>
            ) : null}
          </View>
        ) : (
          <>
            <View className="flex-row items-center gap-sm">
              <View className="h-[64px] w-[64px] items-center justify-center rounded-md bg-primary-soft">
                <Camera size={24} color={colors.primary} />
              </View>
              <View className="flex-1 gap-xxs">
                <AppText variant="h3">{product.name}</AppText>
                <AppText variant="body" color="secondary">
                  {`${product.packageLabel} · ${product.barcode}`}
                </AppText>
                {!product.isVerified ? <AppBadge label="Chưa kiểm chứng" tone="warning" /> : null}
              </View>
            </View>

            {matchedAllergenLabels.length > 0 ? (
              <AppText variant="bodyMedium" color="error">
                {`Có thể chứa ${matchedAllergenLabels.join(', ')}`}
              </AppText>
            ) : null}
            <SafetyAlertList alerts={product.alerts} />

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
                onPress={() => {
                  setProduct(null);
                  setManualCode('');
                }}
              />
              <AppButton
                label="Thêm vào nhật ký"
                onPress={handleAddToDiary}
                loading={addMealLogEntries.isPending}
                className="flex-1"
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
