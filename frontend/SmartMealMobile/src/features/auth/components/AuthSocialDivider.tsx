import React from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/ui/AppText';

// D├╣ng chung cho Login + Register (design/Main.dc.html, design/Register.dc.html) ΓÇö component
// ─æß║╖c th├╣ feature auth, build tß╗½ AppText n├¬n ─æß║╖t trong features/auth/components.
export function AuthSocialDivider() {
  return (
    <View className="flex-row items-center gap-sm">
      <View className="h-[1px] flex-1 bg-border" />
      <AppText variant="caption" color="secondary">
        Hoß║╖c
      </AppText>
      <View className="h-[1px] flex-1 bg-border" />
    </View>
  );
}
