import { Platform } from 'react-native';

export interface AppShadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

// docs/design.md mục 9 — Shadow phải nhẹ. RN không style được box-shadow qua className
// một cách nhất quán 2 nền tảng, nên shadow giữ dạng StyleSheet object dùng chung.
// TODO: chưa có giá trị shadow riêng cho dark mode trong design.md — đang dùng chung.
const shadowColor = '#183022';

export const shadows: Record<'card' | 'elevated', AppShadow> = {
  card: {
    shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: Platform.OS === 'android' ? 3 : 0,
  },
  elevated: {
    shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: Platform.OS === 'android' ? 8 : 0,
  },
};
