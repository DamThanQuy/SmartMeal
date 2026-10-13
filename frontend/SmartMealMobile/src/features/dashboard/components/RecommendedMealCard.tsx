import { Image } from 'expo-image';
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppBadge, AppText } from '@/components/ui';
import type { RecommendedMeal } from '../types/dashboard.types';

export interface RecommendedMealCardProps {
  meal: RecommendedMeal;
  onPress?: () => void;
}

// Ảnh dự phòng khi công thức chưa có ảnh trên server.
const FALLBACK_IMAGE = require('../../../../assets/images/meal-bowl.jpg');

export function RecommendedMealCard({
  meal,
  onPress,
}: RecommendedMealCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${meal.name}, ${meal.durationMinutes} phút, ${meal.calories} kcal`}
      onPress={onPress}
      className="flex-1 overflow-hidden rounded-card border border-border bg-surface active:opacity-80"
    >
      <Image
        source={meal.imageUrl ? { uri: meal.imageUrl } : FALLBACK_IMAGE}
        accessibilityLabel={meal.name}
        contentFit="cover"
        style={{ width: '100%', height: 136 }}
      />
      <View className="gap-xs p-sm">
        <AppText variant="bodyMedium" numberOfLines={1}>
          {meal.name}
        </AppText>
        <AppText variant="caption" color="secondary">
          {`${meal.durationMinutes} phút · ${meal.calories} kcal`}
        </AppText>
        {meal.tag ? <AppBadge label={meal.tag} /> : null}
      </View>
    </Pressable>
  );
}
