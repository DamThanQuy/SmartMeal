import { Image } from 'expo-image';
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppBadge, AppText } from '@/components/ui';
import type { RecommendedMeal } from '../types/dashboard.types';

export interface RecommendedMealCardProps {
  meal: RecommendedMeal;
  onPress?: () => void;
}

const MEAL_IMAGES = {
  bowl: require('../../../../assets/images/meal-bowl.jpg'),
  salad: require('../../../../assets/images/vegetable-salad.jpg'),
};

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
        source={MEAL_IMAGES[meal.imageKey ?? 'bowl']}
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
        <AppBadge label={meal.tag} />
      </View>
    </Pressable>
  );
}
