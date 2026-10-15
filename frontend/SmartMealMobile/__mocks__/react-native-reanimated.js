/**
 * Manual mock cho react-native-reanimated trong Jest.
 * v4 chuyển sang native Nitro/worklets binding không chạy được trong môi trường Jest (Node) —
 * package tự mock lại bị lỗi self-reference (src/mock.ts import ngược package 'react-native-reanimated').
 * Mock tối giản này chỉ cần đáp ứng đúng phần API các component trong repo đang dùng
 * (LoadingState, PetAnimation — Bé Mầm ở màn Welcome/Pet, PetScreen) + phần react-native-gesture-handler
 * tự require "react-native-reanimated" nội bộ (Wrap.tsx gọi Reanimated.default.createAnimatedComponent).
 */
const { View } = require('react-native');

function createAnimatedComponent(Component) {
  return Component;
}

function useSharedValue(initialValue) {
  const shared = {
    value: initialValue,
    get: () => shared.value,
    set: next => {
      shared.value = typeof next === 'function' ? next(shared.value) : next;
    },
  };
  return shared;
}

function useAnimatedStyle(factory) {
  return factory();
}

function withTiming(toValue) {
  return toValue;
}

function withSpring(toValue) {
  return toValue;
}

function withRepeat(animation) {
  return animation;
}

/** Không chạy animation trong test: giá trị cuối của chuỗi. */
function withSequence(...animations) {
  return animations[animations.length - 1];
}

const Easing = {
  inOut: easing => easing,
  ease: value => value,
  linear: value => value,
  sin: value => value,
};

/** Layout animation (entering/exiting): builder chain như FadeIn.duration(300).delay(100). */
function createLayoutAnimation() {
  const builder = {};
  ['duration', 'delay', 'springify', 'damping', 'easing', 'withCallback'].forEach(method => {
    builder[method] = () => builder;
  });
  return builder;
}

const FadeIn = createLayoutAnimation();
const FadeOut = createLayoutAnimation();

module.exports = {
  __esModule: true,
  default: { View, createAnimatedComponent },
  createAnimatedComponent,
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
};
