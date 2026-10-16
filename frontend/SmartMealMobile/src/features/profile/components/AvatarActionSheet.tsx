import { Camera, Image as ImageIcon, Trash2 } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import { AppBottomSheet, AppButton, AppText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { ProfileMenuRow } from './ProfileMenuRow';

// Modal của AppBottomSheet trượt xuống ~300 ms; mở camera/thư viện khi sheet còn đang đóng có thể bị
// iOS từ chối (đang có màn được present) nên chờ sheet đóng hẳn rồi mới chạy lựa chọn.
const SHEET_DISMISS_MS = 350;

export interface AvatarActionSheetProps {
  visible: boolean;
  /** Đang có ảnh đại diện — chỉ khi đó mới hiện "Xóa ảnh đại diện". */
  hasAvatar: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onChooseFromLibrary: () => void;
  onRemove: () => void;
}

// Chạm vào ảnh đại diện (Profile, EditProfile) → chụp ảnh mới / chọn từ thư viện / xóa ảnh.
export function AvatarActionSheet({
  visible,
  hasAvatar,
  onClose,
  onTakePhoto,
  onChooseFromLibrary,
  onRemove,
}: AvatarActionSheetProps) {
  const { colors } = useTheme();

  const select = (action: () => void) => {
    onClose();
    setTimeout(action, SHEET_DISMISS_MS);
  };

  return (
    <AppBottomSheet visible={visible} onClose={onClose}>
      <View className="gap-xs">
        <AppText variant="h3" className="pb-xs">
          Ảnh đại diện
        </AppText>
        <ProfileMenuRow
          icon={<Camera size={20} color={colors.primary} />}
          label="Chụp ảnh mới"
          onPress={() => select(onTakePhoto)}
        />
        <ProfileMenuRow
          icon={<ImageIcon size={20} color={colors.primary} />}
          label="Chọn từ thư viện"
          onPress={() => select(onChooseFromLibrary)}
        />
        {hasAvatar ? (
          <ProfileMenuRow
            icon={<Trash2 size={20} color={colors.error} />}
            label="Xóa ảnh đại diện"
            tone="error"
            onPress={() => select(onRemove)}
          />
        ) : null}
        <AppButton label="Hủy" variant="text" onPress={onClose} className="mt-xs" />
      </View>
    </AppBottomSheet>
  );
}
