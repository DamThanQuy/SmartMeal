import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronRight, FileText, Search, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppButton, AppIconButton, AppText } from '@/components/ui';
import { MAIN_STACK_ROUTES, MAIN_TAB_ROUTES } from '@/constants/routes';
import type { MainStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<MainStackParamList, 'ProductNotFound'>;

interface ActionRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onPress: () => void;
}

function ActionRow({ icon, title, description, onPress }: ActionRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      className="min-h-[64px] flex-row items-center gap-md rounded-lg bg-background p-sm"
    >
      <View className="h-[48px] w-[48px] items-center justify-center rounded-lg bg-primary-soft">
        {icon}
      </View>
      <View className="flex-1 gap-xxs">
        <AppText variant="bodyMedium">{title}</AppText>
        <AppText variant="body" color="secondary">
          {description}
        </AppText>
      </View>
      <ChevronRight size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

// design/ProductNotFound.dc.html (BR-120). "Nhập thủ công" chưa có màn tạo món tự do (xem TODO
// FoodSearch.dc.html Đợt 3) nên trỏ tạm sang FoodSearch.
export function ProductNotFoundScreen({ navigation, route }: Props) {
  const { barcode, mealType } = route.params;
  const { colors } = useTheme();

  return (
    <View className="flex-1 bg-background">
      <View className="h-[200px] items-start bg-overlay px-md pt-[52px]">
        <AppIconButton
          accessibilityLabel="Đóng"
          icon={<X size={22} color={colors.onPrimary} />}
          className="bg-on-primary/15"
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.QUICK_LOG, { mealType })}
        />
      </View>
      <View className="-mt-lg flex-1 gap-xl rounded-t-sheet bg-background p-lg">
        <View className="items-center gap-sm">
          <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-surface-subtle">
            <Search size={34} color={colors.textSecondary} />
          </View>
          <AppText variant="h2" className="text-center">
            Chưa có sản phẩm này
          </AppText>
          <AppText variant="body" color="secondary" className="text-center">
            {`Mã `}
            <AppText variant="bodyMedium">{barcode}</AppText>
            {` chưa có trong dữ liệu SmartMeal. Bạn có thể bổ sung thông tin bằng một trong các cách sau.`}
          </AppText>
        </View>

        <View className="gap-sm">
          <ActionRow
            icon={<FileText size={24} color={colors.primary} />}
            title="Quét nhãn dinh dưỡng"
            description="Đọc bảng Nutrition Facts bằng camera"
            onPress={() => navigation.replace(MAIN_STACK_ROUTES.OCR_CAMERA, { mealType })}
          />
          <ActionRow
            icon={<Search size={24} color={colors.primary} />}
            title="Nhập thủ công"
            description="Tự nhập calo và macro từ bao bì"
            onPress={() => navigation.replace(MAIN_STACK_ROUTES.CREATE_FOOD, { mealType })}
          />
        </View>

        <View className="flex-1" />
        <AppButton
          label="Bỏ qua"
          variant="outline"
          onPress={() =>
            navigation.navigate(MAIN_STACK_ROUTES.MAIN_TABS, { screen: MAIN_TAB_ROUTES.HOME })
          }
        />
      </View>
    </View>
  );
}
