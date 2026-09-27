/**
 * Manual mock cho react-native-reanimated trong Jest.
 * v4 chuyển sang native Nitro/worklets binding không chạy được trong môi trường Jest (Node) —
 * package tự mock lại bị lỗi self-reference (src/mock.ts import ngược package 'react-native-reanimated').
 * Mock tối giản này chỉ cần đáp ứng đúng phần API các component trong repo đang dùng
 * (src/components/common/LoadingState.tsx) + phần react-native-gesture-handler tự require
 * "react-native-reanimated" nội bộ (Wrap.tsx gọi Reanimated.default.createAnimatedComponent).
 */
const { View } = require('react-native');

function createAnimatedComponent(Component) {
  return Component;
}

function useSharedValue(initialValue) {
  return { value: initialValue };
}

function useAnimatedStyle(factory) {
  return factory();
}

function withTiming(toValue) {
  return toValue;
}

function withRepeat(animation) {
  return animation;
}

const Easing = {
  inOut: easing => easing,
  ease: value => value,
  linear: value => value,
};

module.exports = {
  __esModule: true,
  default: { View, createAnimatedComponent },
  createAnimatedComponent,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
};
