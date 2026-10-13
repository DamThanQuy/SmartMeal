import { AlertTriangle, Info, ShieldCheck } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import type { SafetyAlert } from '../types/scanner.types';

export interface SafetyAlertListProps {
  alerts: SafetyAlert[];
  className?: string;
}

const BORDER_CLASS: Record<SafetyAlert['severity'], string> = {
  danger: 'border-error',
  warning: 'border-warning',
  info: 'border-border',
};

// BR-140 — Smart Safety Alert: dị ứng/vượt ngưỡng hiện ngay, mức nguy hiểm trước. Không có cảnh báo
// thì chỉ nói "không thấy …", không khẳng định "an toàn tuyệt đối" (BR-112/291).
export function SafetyAlertList({ alerts, className = '' }: SafetyAlertListProps) {
  const { colors } = useTheme();

  if (alerts.length === 0) {
    return (
      <View className={`flex-row items-center gap-sm rounded-card border border-border bg-surface p-md ${className}`}>
        <ShieldCheck size={20} color={colors.primary} />
        <AppText variant="caption" color="secondary" className="flex-1">
          Không thấy chất gây dị ứng bạn đã khai báo hay chỉ số vượt ngưỡng. Đây là kiểm tra tham khảo, không
          thay thế tư vấn y khoa.
        </AppText>
      </View>
    );
  }

  return (
    <View className={`gap-xs ${className}`} accessibilityRole="alert">
      {alerts.map(alert => (
        <View
          key={`${alert.type}-${alert.message}`}
          className={`flex-row items-start gap-sm rounded-card border bg-surface p-md ${BORDER_CLASS[alert.severity]}`}
        >
          {alert.severity === 'info' ? (
            <Info size={20} color={colors.info} />
          ) : (
            <AlertTriangle size={20} color={alert.severity === 'danger' ? colors.error : colors.warning} />
          )}
          <AppText variant="body" className="flex-1">
            {alert.message}
          </AppText>
        </View>
      ))}
      <AppText variant="caption" color="secondary">
        Cảnh báo dinh dưỡng mang tính tham khảo, không phải chẩn đoán y khoa.
      </AppText>
    </View>
  );
}
