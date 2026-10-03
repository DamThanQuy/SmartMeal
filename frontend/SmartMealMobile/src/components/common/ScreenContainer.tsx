import React from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

export interface ScreenContainerProps {
  scroll?: boolean;
  edges?: Edge[];
  className?: string;
  contentContainerClassName?: string;
  style?: StyleProp<ViewStyle>;
  header?: React.ReactNode;
  children?: React.ReactNode;
}

// docs/design.md mục 10 (Mobile Layout) — safe area + screen horizontal padding 16px (px-md).
export function ScreenContainer({
  scroll = false,
  edges = ['top', 'bottom', 'left', 'right'],
  className = '',
  contentContainerClassName = '',
  style,
  header,
  children,
}: ScreenContainerProps) {
  if (scroll) {
    return (
      <SafeAreaView edges={edges} className="flex-1 bg-background">
        {header}
        <ScrollView
          className="flex-1"
          style={style}
          contentContainerClassName={`px-md pb-xl ${contentContainerClassName}`}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={edges} className="flex-1 bg-background">
      {header}
      <View className={`flex-1 px-md ${className}`} style={style}>
        {children}
      </View>
    </SafeAreaView>
  );
}
