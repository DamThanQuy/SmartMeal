import React from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/ui/AppText';

// Dùng chung cho Login + Register (design/Main.dc.html, design/Register.dc.html) — component
// đặc thù feature auth, build từ AppText nên đặt trong features/auth/components.
export function AuthSocialDivider() {
  return (
    <View className="flex-row items-center gap-sm">
      <View className="h-[1px] flex-1 bg-border" />
      <AppText variant="caption" color="secondary">
        Hoặc
      </AppText>
      <View className="h-[1px] flex-1 bg-border" />
    </View>
  );
}
