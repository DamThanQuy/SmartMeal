import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Ellipse,
  G,
  Path,
  Rect,
} from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

export type PetStage = 1 | 2 | 3 | 4;

export interface PetAnimationProps {
  /** Giai đoạn Bé Mầm: 1=Mầm nhỏ, 2=2 lá vẫy tay, 3=nở hoa, 4=thần cây */
  stage: PetStage;
  /** 0–1 — tỉ lệ XP trong level hiện tại, dùng cho micro-scale bonus */
  xpRatio?: number;
  size?: number;
}

/** Xác định stage từ level (dùng ngoài component) */
export function stageFromLevel(level: number): PetStage {
  if (level <= 3) return 1;
  if (level <= 6) return 2;
  if (level <= 9) return 3;
  return 4;
}

// ─── SVG sub-components ─────────────────────────────────────────────────────

const LEAF = '#5DB85A';
const LEAF_DEEP = '#3D8C3A';
const POT = '#C97B4B';
const POT_DEEP = '#9E5C30';
const BLOOM = '#FFB347';
const STREAK = '#FFCC00';
const CHEEK = '#FF9999';
const FACE_COLOR = '#2D5A1B';

function Face({ y = 0, scale = 1 }: { y?: number; scale?: number }) {
  return (
    <G transform={`translate(0, ${y}) scale(${scale})`} origin="100, 100">
      <Ellipse cx="88" cy="98" rx="4.5" ry="5.5" fill={FACE_COLOR} />
      <Ellipse cx="112" cy="98" rx="4.5" ry="5.5" fill={FACE_COLOR} />
      <Path
        d="M90 110 q10 9 20 0"
        fill="none"
        stroke={FACE_COLOR}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Circle cx="78" cy="108" r="5" fill={CHEEK} opacity={0.7} />
      <Circle cx="122" cy="108" r="5" fill={CHEEK} opacity={0.7} />
    </G>
  );
}

function Pot() {
  return (
    <G>
      <Path d="M68 150 L74 196 q0 6 6 6 h40 q6 0 6-6 L132 150 Z" fill={POT} />
      <Rect x="62" y="142" width="76" height="14" rx="7" fill={POT_DEEP} />
    </G>
  );
}

// ─── Stage SVG bodies ────────────────────────────────────────────────────────

function Stage1Body() {
  return (
    <G>
      {/* short stem + 2 small leaves */}
      <Path d="M100 150 V 118" stroke={LEAF_DEEP} strokeWidth={6} strokeLinecap="round" />
      <Ellipse cx="82" cy="112" rx="18" ry="11" fill={LEAF} transform="rotate(-20, 82, 112)" />
      <Ellipse cx="118" cy="112" rx="18" ry="11" fill={LEAF} transform="rotate(20, 118, 112)" />
      {/* head bud small */}
      <Circle cx="100" cy="100" r="24" fill={LEAF} />
      <Face y={2} scale={0.85} />
    </G>
  );
}

function Stage2Body() {
  return (
    <G>
      {/* tall stem */}
      <Path d="M100 150 V 96" stroke={LEAF_DEEP} strokeWidth={7} strokeLinecap="round" />
      {/* side leaves */}
      <Ellipse cx="66" cy="120" rx="22" ry="13" fill={LEAF} transform="rotate(-18, 66, 120)" />
      <Ellipse cx="134" cy="120" rx="22" ry="13" fill={LEAF} transform="rotate(18, 134, 120)" />
      {/* head */}
      <Circle cx="100" cy="100" r="28" fill={LEAF} />
      <Face />
      {/* arms */}
      <G stroke={LEAF_DEEP} strokeWidth={5} strokeLinecap="round">
        <Path d="M74 128 q-16 -4 -22 -18" />
        <Path d="M126 128 q16 -4 22 -10" />
      </G>
    </G>
  );
}

function Stage3Body() {
  return (
    <G>
      <Path d="M100 150 V 96" stroke={LEAF_DEEP} strokeWidth={7} strokeLinecap="round" />
      {/* mid leaves */}
      <Ellipse cx="66" cy="120" rx="22" ry="13" fill={LEAF} transform="rotate(-18, 66, 120)" />
      <Ellipse cx="134" cy="120" rx="22" ry="13" fill={LEAF} transform="rotate(18, 134, 120)" />
      {/* upper leaves */}
      <Ellipse cx="72" cy="94" rx="20" ry="12" fill={LEAF_DEEP} transform="rotate(-30, 72, 94)" />
      <Ellipse cx="128" cy="94" rx="20" ry="12" fill={LEAF_DEEP} transform="rotate(30, 128, 94)" />
      {/* head + flower crown */}
      <Circle cx="100" cy="100" r="32" fill={LEAF} />
      {/* flower petals */}
      {[0, 72, 144, 216, 288].map(a => (
        <Ellipse
          key={a}
          cx="100"
          cy="62"
          rx="9"
          ry="13"
          fill={BLOOM}
          transform={`rotate(${a}, 100, 78)`}
        />
      ))}
      <Circle cx="100" cy="78" r="7" fill={STREAK} />
      <Face />
      <G stroke={LEAF_DEEP} strokeWidth={5} strokeLinecap="round">
        <Path d="M74 128 q-16 -4 -22 -18" />
        <Path d="M126 128 q16 -4 22 -10" />
      </G>
    </G>
  );
}

function Stage4Body() {
  const sparklePoints: [number, number][] = [
    [40, 60],
    [160, 70],
    [50, 130],
    [156, 132],
    [100, 30],
  ];
  return (
    <G>
      <Path d="M100 150 V 96" stroke={LEAF_DEEP} strokeWidth={7} strokeLinecap="round" />
      <Ellipse cx="66" cy="120" rx="22" ry="13" fill={LEAF} transform="rotate(-18, 66, 120)" />
      <Ellipse cx="134" cy="120" rx="22" ry="13" fill={LEAF} transform="rotate(18, 134, 120)" />
      <Ellipse cx="72" cy="94" rx="20" ry="12" fill={LEAF_DEEP} transform="rotate(-30, 72, 94)" />
      <Ellipse cx="128" cy="94" rx="20" ry="12" fill={LEAF_DEEP} transform="rotate(30, 128, 94)" />
      <Circle cx="100" cy="100" r="32" fill={LEAF} />
      {[0, 72, 144, 216, 288].map(a => (
        <Ellipse key={a} cx="100" cy="62" rx="9" ry="13" fill={BLOOM} transform={`rotate(${a}, 100, 78)`} />
      ))}
      <Circle cx="100" cy="78" r="7" fill={STREAK} />
      <Face />
      <G stroke={LEAF_DEEP} strokeWidth={5} strokeLinecap="round">
        <Path d="M74 128 q-16 -4 -22 -18" />
        <Path d="M126 128 q16 -4 22 -10" />
      </G>
      {/* crown */}
      <Path
        d="M78 74 l8 -16 l14 10 l14 -10 l8 16 Z"
        fill={STREAK}
        stroke={POT_DEEP}
        strokeWidth={2}
      />
      {/* sparkles */}
      {sparklePoints.map(([x, y], i) => (
        <Path
          key={i}
          d={`M${x} ${y - 8} l2.5 5.5 l5.5 2.5 l-5.5 2.5 l-2.5 5.5 l-2.5 -5.5 l-5.5 -2.5 l5.5 -2.5 Z`}
          fill={STREAK}
          opacity={0.85}
        />
      ))}
    </G>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * PetAnimation — Bé Mầm hoạt hình bằng RN Reanimated + react-native-svg.
 *
 * - Bounce (bob) nhẹ nhàng liên tục.
 * - Micro-scale: scale = 1 + xpRatio * 0.15 (Bé Mầm phình to hơn khi đầy XP).
 * - Entrance spring khi stage thay đổi.
 */
export function PetAnimation({ stage, xpRatio = 0, size = 200 }: PetAnimationProps) {
  const bobY = useSharedValue(0);
  const entryScale = useSharedValue(0.8);
  const entryOpacity = useSharedValue(0);

  // Micro-scale từ XP ratio
  const xpScale = 1 + xpRatio * 0.15;

  // Bob (nhún nhảy liên tục)
  useEffect(() => {
    bobY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [bobY]);

  // Entrance spring khi stage đổi
  useEffect(() => {
    entryScale.value = 0.8;
    entryOpacity.value = 0;
    entryScale.value = withSpring(xpScale, { stiffness: 180, damping: 14 });
    entryOpacity.value = withTiming(1, { duration: 300 });
  }, [stage, xpScale, entryScale, entryOpacity]);

  // Khi xpRatio đổi mà stage không đổi — chỉ update scale nhẹ
  useEffect(() => {
    entryScale.value = withSpring(xpScale, { stiffness: 120, damping: 18 });
  }, [xpRatio, xpScale, entryScale]);

  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bobY.value }],
  }));

  const entryStyle = useAnimatedStyle(() => ({
    transform: [{ scale: entryScale.value }],
    opacity: entryOpacity.value,
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      <Animated.View style={[bobStyle, entryStyle]}>
        <Svg viewBox="0 0 200 210" width={size} height={size}>
          {stage === 1 && <Stage1Body />}
          {stage === 2 && <Stage2Body />}
          {stage === 3 && <Stage3Body />}
          {stage === 4 && <Stage4Body />}
          <Pot />
        </Svg>
      </Animated.View>
    </View>
  );
}
