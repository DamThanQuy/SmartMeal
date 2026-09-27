/**
 * Nguồn dữ liệu thô (raw) duy nhất cho design token — file CommonJS thuần (không TS)
 * vì được require() trực tiếp bởi tailwind.config.js (chạy trong Node, không qua Babel/TS).
 * src/theme/*.ts import lại từ đây và bọc thêm type cho phần còn lại của app.
 *
 * Giá trị màu light lấy đúng docs/design.md mục 4, 40, 41, 58.
 * Các token đánh dấu "derived" là mở rộng hợp lý (không có trong design.md, chủ yếu
 * để phục vụ dark mode) — nên được design review xác nhận lại khi có điều kiện.
 */

// docs/design.md mục 4.1–4.8, 40 (Button System), 41 (Input)
const lightColors = {
  primary: '#22A447', // 4.1 Primary Green
  primaryPressed: '#16863A', // 4.2 Primary Dark
  primarySoft: '#EAF8EF', // 4.3 Primary Soft
  onPrimary: '#FFFFFF', // 40. Primary button text
  onPrimarySoft: '#16863A', // 40. Secondary button text

  background: '#F7FAF8', // 4.4
  surface: '#FFFFFF', // 4.5
  surfaceElevated: '#FFFFFF', // derived — 4.5: modal/bottom sheet cũng dùng Surface
  surfaceSubtle: '#EFF5F1', // derived — nền phụ nhẹ hơn surface, đậm hơn background

  textPrimary: '#183022', // 4.6
  textSecondary: '#64746A', // 4.6
  textMuted: '#94A39A', // 4.6 (cũng là placeholder — 41)
  textInverse: '#FFFFFF', // derived — chữ trên nền primary/tối

  border: '#E4ECE7', // 4.7
  borderStrong: '#C7D6CC', // derived — viền nhấn mạnh hơn border mặc định
  borderFocus: '#22A447', // 41. Input focus = primary

  success: '#22A447', // 4.8
  successSoft: '#EAF8EF', // derived (= primarySoft)
  successText: '#16863A', // derived (= primaryPressed)

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
  skeleton: '#E4ECE7', // derived (= border) — nền shimmer loading
};

// docs/design.md mục 54 (Dark Mode) chỉ định nghĩa background/surface/text — các token
// còn lại là derived để đảm bảo contrast trên nền tối (design.md: "Primary Green cần
// điều chỉnh để đảm bảo contrast"). Cần design review khi có điều kiện.
const darkColors = {
  primary: '#34C463', // derived — sáng hơn light primary để đủ contrast trên nền tối
  primaryPressed: '#2BA854', // derived
  primarySoft: '#163524', // derived
  onPrimary: '#FFFFFF',
  onPrimarySoft: '#6FE39B', // derived

  background: '#101812', // 54.
  surface: '#18231C', // 54.
  surfaceElevated: '#1F2C23', // derived — sáng hơn surface để tạo chiều sâu
  surfaceSubtle: '#131C16', // derived

  textPrimary: '#F1F6F2', // 54.
  textSecondary: '#B7C4BB', // derived
  textMuted: '#7E8C84', // derived
  textInverse: '#16231A', // derived — chữ trên nền sáng đặt trong theme tối

  border: '#26332B', // derived
  borderStrong: '#34443A', // derived
  borderFocus: '#34C463', // derived (= dark primary)

  success: '#34C463', // derived (= dark primary)
  successSoft: '#163524', // derived
  successText: '#6FE39B', // derived

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
  skeleton: '#26332B', // derived (= dark border)
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
// LƯU Ý: chưa có file Inter-*.ttf trong src/assets/fonts và chưa link native — trước khi
// link, RN sẽ tự fallback sang font mặc định hệ điều hành (không lỗi, chỉ khác font).
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
