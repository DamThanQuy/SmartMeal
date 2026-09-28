import { Heart, UtensilsCrossed } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppBadge, AppText } from '@/components/ui';
import { shadows } from '@/theme/shadows';
import { useTheme } from '@/theme/ThemeProvider';
import { RECIPE_TAG_OPTIONS, type Recipe } from '../types/recipe.types';

export interface RecipeCardProps {
  recipe: Recipe;
  onPress: () => void;
  /** Mặc định là tên tag đầu tiên — Fridge.dc.html dùng "Dùng N/M nguyên liệu" thay vào đây. */
  badgeLabel?: string;
  showFavorite?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  className?: string;
}

// design/design.md mục 22 (Recipe Card) — dùng chung cho Discovery, Favorites, Fridge (lưới 2 cột).
export function RecipeCard({
  recipe,
  onPress,
  badgeLabel,
  showFavorite = true,
  isFavorite = false,
  onToggleFavorite,
  className = '',
}: RecipeCardProps) {
  const { colors } = useTheme();
  const defaultBadge = RECIPE_TAG_OPTIONS.find(option => option.id === recipe.tags[0])?.label;

  return (
    <View style={shadows.card} className={`overflow-hidden rounded-card bg-surface ${className}`}>
      <View className="relative">
        <View className="h-[120px] w-full items-center justify-center bg-primary-soft">
          <UtensilsCrossed size={28} color={colors.primary} />
        </View>
        {showFavorite ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? `Bỏ yêu thích ${recipe.name}` : `Yêu thích ${recipe.name}`}
            accessibilityState={{ selected: isFavorite }}
            onPress={onToggleFavorite}
            className="absolute right-xs top-xs h-[44px] w-[44px] items-center justify-center rounded-full bg-surface"
          >
            <Heart
              size={20}
              color={isFavorite ? colors.primary : colors.textSecondary}
              fill={isFavorite ? colors.primary : 'none'}
            />
          </Pressable>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={recipe.name}
        onPress={onPress}
        className="gap-xxs px-sm pb-sm pt-xs"
      >
        <AppText variant="bodyMedium" numberOfLines={1}>
          {recipe.name}
        </AppText>
        <AppText variant="caption" color="secondary">
          {`${recipe.durationMinutes} phút · ${recipe.nutritionPerServing.calories} kcal`}
        </AppText>
        {badgeLabel ?? defaultBadge ? <AppBadge label={badgeLabel ?? defaultBadge ?? ''} /> : null}
      </Pressable>
    </View>
  );
}
