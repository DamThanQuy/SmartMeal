import { AlertTriangle } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { InlineBanner } from '@/components/common';
import { AppText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

export interface AiAllergyWarningsProps {
  warnings: readonly string[];
  className?: string;
}

// BR-054/061 — dữ liệu mẫu của backend (chưa cấu hình AI, chỉ ở môi trường phát triển) phải được báo
// rõ để không bị lưu nhầm thành bữa ăn thật.
export function AiDemoNotice({ className = '' }: { className?: string }) {
  const { colors } = useTheme();
  return (
    <InlineBanner
      icon={<AlertTriangle size={20} color={colors.warning} />}
      title="Dữ liệu mẫu"
      description="AI chưa được cấu hình trên máy chủ nên đây không phải kết quả thật. Đừng ghi vào nhật ký như bữa ăn của bạn."
      className={className}
    />
  );
}

// BR-102/140 — cảnh báo dị ứng theo hồ sơ của người dùng. Chỉ là tham khảo, không khẳng định "an toàn
// tuyệt đối" và không thay thế tư vấn y tế (BR-112, BR-291).
export function AiAllergyWarnings({ warnings, className = '' }: AiAllergyWarningsProps) {
  const { colors } = useTheme();
  if (warnings.length === 0) return null;

  return (
    <View
      accessibilityRole="alert"
      className={`gap-xs rounded-card border border-error bg-surface p-md ${className}`}
    >
      <View className="flex-row items-center gap-sm">
        <AlertTriangle size={20} color={colors.error} />
        <AppText variant="bodyMedium">Cảnh báo dị ứng</AppText>
      </View>
      {warnings.map(warning => (
        <AppText key={warning} variant="body">
          {warning}
        </AppText>
      ))}
      <AppText variant="caption" color="secondary">
        Chỉ mang tính tham khảo, không thay thế tư vấn y tế.
      </AppText>
    </View>
  );
}
