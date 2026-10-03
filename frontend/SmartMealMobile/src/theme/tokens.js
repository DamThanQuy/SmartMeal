/**
 * Nguồn dữ liệu thô (raw) duy nhất cho design token — file CommonJS thuần (không TS)
 * vì được require() trực tiếp bởi tailwind.config.js (chạy trong Node, không qua Babel/TS).
 * src/theme/*.ts import lại từ đây và bọc thêm type cho phần còn lại của app.
 *
 * Palette light/dark cập nhật theo ảnh tham chiếu của người dùng.
 * Các màu ngữ nghĩa vẫn dùng chung cho toàn bộ ứng dụng.
 */

// docs/design.md mục 4.1–4.8, 40 (Button System), 41 (Input)
const lightColors = {
  primary: '#19B541',
  primaryPressed: '#128A32',
  primarySoft: '#E1F7E7',
  onPrimary: '#FFFFFF', // 40. Primary button text
  onPrimarySoft: '#248B3F',

  energyStart: '#1CBB48',
  energyEnd: '#16AE32',
  onEnergy: '#FFFFFF',
  energyTrack: '#58CD6C',
  energyFill: '#FFFFFF',

  background: '#F1FAF5',
  surface: '#FFFFFF', // 4.5
  surfaceElevated: '#FFFFFF', // derived — 4.5: modal/bottom sheet cũng dùng Surface
  surfaceSubtle: '#EAF5EE',

  textPrimary: '#18251D',
  textSecondary: '#748078',
  textMuted: '#87938C',
  textInverse: '#FFFFFF', // derived — chữ trên nền primary/tối

  border: '#E4EFE8',
  borderStrong: '#C7D6CC', // derived — viền nhấn mạnh hơn border mặc định
  borderFocus: '#19B541',

  success: '#19B541',
  successSoft: '#E1F7E7',
  successText: '#128A32',

  warning: '#F2A93B', // 4.8
  warningSoft: '#FDF1DC', // derived
  warningText: '#8A5A12', // derived

  error: '#D94A4A', // 4.8 (cũng là Input error — 41)
  errorSoft: '#FBE7E7', // derived
  errorText: '#A83232', // derived

  info: '#4D8FD6', // 4.8
  infoSoft: '#E8F1FB', // derived
  infoText: '#2E5F94', // derived

  overlay: '#000000', // derived — dùng kèm alpha, vd bg-overlay/40
  skeleton: '#E4EFE8', // (= border) — nền shimmer loading
};

// Chế độ tối: nền đen thuần, surface xám đen và màu xanh lá cho điểm nhấn.
const darkColors = {
  primary: '#4AC65C',
  primaryPressed: '#37AD49',
  primarySoft: '#103C20',
  onPrimary: '#080808',
  onPrimarySoft: '#79D98A',

  energyStart: '#4BC75D',
  energyEnd: '#43BD54',
  onEnergy: '#0A0A0A',
  energyTrack: '#7DD988',
  energyFill: '#111111',

  background: '#000000',
  surface: '#111111',
  surfaceElevated: '#1C1C1C',
  surfaceSubtle: '#0A0A0A',

  textPrimary: '#F5F5F5',
  textSecondary: '#A3A3A3',
  textMuted: '#858585',
  textInverse: '#141414', // chữ trên nền sáng đặt trong theme tối

  border: '#262626',
  borderStrong: '#3A3A3A',
  borderFocus: '#4AC65C',

  success: '#4AC65C',
  successSoft: '#103C20',
  successText: '#79D98A',

  warning: '#F5B85A', // derived
  warningSoft: '#3A2C12', // derived
  warningText: '#F7CD8A', // derived

  error: '#E36767', // derived
  errorSoft: '#3A1A1A', // derived
  errorText: '#F2A0A0', // derived

  info: '#6FA8E0', // derived
  infoSoft: '#17293A', // derived
  infoText: '#A8CDF2', // derived

  overlay: '#000000',
  skeleton: '#262626', // (= dark border)
};

// docs/design.md mục 7 — hệ 4px. '0' được thêm ngoài danh sách gốc vì cần thiết cho
// các trường hợp reset margin/padding/gap mặc định (không phải giá trị tuỳ ý).
const spacing = {
  0: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

// docs/design.md mục 8. 'none' được thêm ngoài danh sách gốc để giữ khả năng reset
// radius (tương đương rounded-none mặc định của Tailwind).
const radius = {
  none: 0,
  sm: 8,
  md: 12,
  card: 16,
  lg: 20,
  sheet: 24,
  pill: 999,
  full: 9999,
};

// docs/design.md mục 6.2 — Typography Scale (size/lineHeight tính theo px)
const fontSize = {
  display: { size: 28, lineHeight: 36, weight: '700' },
  h1: { size: 24, lineHeight: 32, weight: '700' },
  h2: { size: 20, lineHeight: 28, weight: '700' },
  h3: { size: 18, lineHeight: 26, weight: '600' },
  bodyLg: { size: 16, lineHeight: 24, weight: '400' },
  body: { size: 14, lineHeight: 20, weight: '400' },
  bodyMedium: { size: 14, lineHeight: 20, weight: '600' },
  caption: { size: 12, lineHeight: 16, weight: '400' },
  button: { size: 14, lineHeight: 20, weight: '600' },
};

// docs/design.md mục 6.1 — Inter. Theo CLAUDE.md mục 6: dùng đúng tên family theo từng
// weight (Regular/SemiBold/Bold), KHÔNG set fontWeight kèm fontFamily custom (Android có
// thể bỏ qua weight khi đã set family riêng).
// Font tĩnh trong assets/fonts được ThemeProvider nạp qua expo-font trước khi render UI.
const fontFamily = {
  sans: 'Inter-Regular',
  sansSemibold: 'Inter-SemiBold',
  sansBold: 'Inter-Bold',
};

module.exports = {
  lightColors,
  darkColors,
  spacing,
  radius,
  fontSize,
  fontFamily,
};
