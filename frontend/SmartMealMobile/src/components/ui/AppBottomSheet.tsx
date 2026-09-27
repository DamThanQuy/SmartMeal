import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/theme/spacing';

export interface AppBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  className?: string;
}

// docs/tech_stack.md liệt kê @gorhom/bottom-sheet cho Bottom Sheet nhưng package đó chưa
// nằm trong phạm vi cài đặt lần này. AppBottomSheet tạm build trên Modal của RN — cùng
// interface (visible/onClose/children) nên có thể thay implementation sau mà không đổi UI.
// TODO: migrate sang @gorhom/bottom-sheet khi được cài để có gesture kéo/thả mượt hơn.
export function AppBottomSheet({
  visible,
  onClose,
  children,
  className = '',
}: AppBottomSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng"
          className="absolute inset-0 bg-overlay/40"
          onPress={onClose}
        />
        <View
          className={`rounded-t-sheet bg-surface p-lg ${className}`}
          style={{ paddingBottom: insets.bottom + spacing.md }}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
}
