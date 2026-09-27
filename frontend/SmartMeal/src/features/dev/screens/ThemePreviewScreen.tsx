import React, { useState } from 'react';
import { View } from 'react-native';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenContainer,
  SectionHeader,
} from '@/components/common';
import {
  AppBottomSheet,
  AppButton,
  AppCard,
  AppChip,
  AppIconButton,
  AppInput,
  AppText,
} from '@/components/ui';
import { MOCK_SCENARIOS, type MockScenario } from '@/config/mock';
import { useAppStore } from '@/state/app/appStore';
import { useTheme, type ThemeMode } from '@/theme/ThemeProvider';

const MODE_OPTIONS: Array<{ label: string; value: ThemeMode }> = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

const MOCK_SCENARIO_LABELS: Record<MockScenario, string> = {
  success: 'Success',
  empty: 'Empty',
  error: 'Error',
  slow: 'Slow',
};

const MEAL_CHIPS = ['Sáng', 'Trưa', 'Tối'];

/**
 * Màn hình dev để kiểm tra bằng mắt toàn bộ token + primitive sau khi wire NativeWind.
 * Không thuộc luồng người dùng thật — chỉ dùng nội bộ khi phát triển.
 */
export function ThemePreviewScreen() {
  const { mode, resolvedScheme, setMode } = useTheme();
  const mockScenario = useAppStore(state => state.mockScenario);
  const setMockScenario = useAppStore(state => state.setMockScenario);
  const [inputValue, setInputValue] = useState('');
  const [selectedChip, setSelectedChip] = useState(MEAL_CHIPS[0]);
  const [sheetVisible, setSheetVisible] = useState(false);

  return (
    <ScreenContainer scroll contentContainerClassName="gap-xl py-lg">
      <View className="gap-xs">
        <AppText variant="display">SmartMeal Theme</AppText>
        <AppText variant="body" color="secondary">
          {`mode: ${mode} · resolved: ${resolvedScheme} · mock: ${mockScenario}`}
        </AppText>
      </View>

      <View className="flex-row gap-sm">
        {MODE_OPTIONS.map(option => (
          <AppChip
            key={option.value}
            label={option.label}
            selected={mode === option.value}
            onPress={() => setMode(option.value)}
          />
        ))}
      </View>

      <View className="gap-sm">
        <SectionHeader title="Mock scenario" />
        <AppText variant="caption" color="muted">
          Áp dụng cho mọi mock service (auth/health...) — xem CLAUDE.md mục 8.
        </AppText>
        <View className="flex-row flex-wrap gap-sm">
          {MOCK_SCENARIOS.map(scenario => (
            <AppChip
              key={scenario}
              label={MOCK_SCENARIO_LABELS[scenario]}
              selected={mockScenario === scenario}
              onPress={() => setMockScenario(scenario)}
            />
          ))}
        </View>
      </View>

      <View className="gap-sm">
        <SectionHeader title="Buttons" />
        <AppButton label="Primary" variant="primary" onPress={() => {}} />
        <AppButton label="Secondary" variant="secondary" onPress={() => {}} />
        <AppButton label="Outline" variant="outline" onPress={() => {}} />
        <AppButton label="Text" variant="text" onPress={() => {}} />
        <AppButton
          label="Loading"
          variant="primary"
          loading
          onPress={() => {}}
        />
        <AppButton
          label="Disabled"
          variant="primary"
          disabled
          onPress={() => {}}
        />
      </View>

      <View className="gap-sm">
        <SectionHeader title="Typography" />
        <AppText variant="display">Display</AppText>
        <AppText variant="h1">H1 — Screen title</AppText>
        <AppText variant="h2">H2 — Section title</AppText>
        <AppText variant="h3">H3 — Card title</AppText>
        <AppText variant="bodyLg">Body Large</AppText>
        <AppText variant="body">Body</AppText>
        <AppText variant="bodyMedium">Body Medium</AppText>
        <AppText variant="caption" color="muted">
          Caption / supporting information
        </AppText>
      </View>

      <View className="gap-sm">
        <SectionHeader title="Input" />
        <AppInput
          label="Ghi chú"
          placeholder="Nhập ghi chú..."
          value={inputValue}
          onChangeText={setInputValue}
        />
        <AppInput
          label="Có lỗi"
          placeholder="Bắt buộc"
          value=""
          error="Trường này là bắt buộc"
          onChangeText={() => {}}
        />
      </View>

      <View className="gap-sm">
        <SectionHeader title="Card" />
        <AppCard variant="default">
          <AppText variant="h3">Standard Card</AppText>
          <AppText variant="body" color="secondary">
            bg-surface + shadow nhẹ (docs/design.md mục 9)
          </AppText>
        </AppCard>
        <AppCard variant="soft">
          <AppText variant="h3" color="onPrimarySoft">
            Soft Card
          </AppText>
        </AppCard>
        <AppCard variant="outlined">
          <AppText variant="h3">Outlined Card</AppText>
        </AppCard>
      </View>

      <View className="gap-sm">
        <SectionHeader title="Chip" />
        <View className="flex-row gap-sm">
          {MEAL_CHIPS.map(label => (
            <AppChip
              key={label}
              label={label}
              selected={selectedChip === label}
              onPress={() => setSelectedChip(label)}
            />
          ))}
        </View>
      </View>

      <View className="gap-sm">
        <SectionHeader title="Icon Button" />
        <View className="flex-row gap-sm">
          <AppIconButton
            accessibilityLabel="Thêm"
            icon={<AppText variant="h3">＋</AppText>}
          />
          <AppIconButton
            accessibilityLabel="Yêu thích"
            variant="soft"
            icon={
              <AppText variant="h3" color="onPrimarySoft">
                ♥
              </AppText>
            }
          />
          <AppIconButton
            accessibilityLabel="Vô hiệu hoá"
            disabled
            icon={<AppText variant="h3">×</AppText>}
          />
        </View>
      </View>

      <View className="gap-sm">
        <SectionHeader title="Bottom Sheet" />
        <AppButton
          label="Mở Bottom Sheet"
          variant="outline"
          onPress={() => setSheetVisible(true)}
        />
      </View>

      <View className="gap-sm">
        <SectionHeader title="Loading state (skeleton)" />
        <View className="overflow-hidden rounded-card border border-border">
          <LoadingState variant="skeleton" lines={3} />
        </View>
      </View>

      <View className="gap-sm">
        <SectionHeader title="Empty state" />
        <View className="h-[220px] overflow-hidden rounded-card border border-border">
          <EmptyState
            title="Chưa có dữ liệu"
            description="Thêm bữa ăn đầu tiên của bạn để bắt đầu theo dõi."
            actionLabel="Thêm ngay"
            onAction={() => {}}
          />
        </View>
      </View>

      <View className="gap-sm">
        <SectionHeader title="Error state" />
        <View className="h-[220px] overflow-hidden rounded-card border border-border">
          <ErrorState
            description="Không thể tải dữ liệu, vui lòng thử lại."
            onRetry={() => {}}
          />
        </View>
      </View>

      <AppBottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      >
        <AppText variant="h2">Bottom Sheet</AppText>
        <AppText variant="body" color="secondary" className="mt-xs">
          Nội dung mẫu để kiểm tra AppBottomSheet trên nền theme hiện tại.
        </AppText>
        <AppButton
          label="Đóng"
          variant="primary"
          className="mt-md"
          onPress={() => setSheetVisible(false)}
        />
      </AppBottomSheet>
    </ScreenContainer>
  );
}
