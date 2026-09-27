const {
  lightColors,
  spacing,
  radius,
  fontSize,
  fontFamily,
} = require('./src/theme/tokens');

function toKebabCase(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

// Tên biến CSS lấy đúng key của lightColors/darkColors (xem src/theme/cssVars.ts) —
// giá trị thật tại runtime do CSS variable quyết định (light/dark), không cố định ở đây.
function buildColorTokens(colors) {
  return Object.fromEntries(
    Object.keys(colors).map(key => {
      const kebabKey = toKebabCase(key);
      return [kebabKey, `rgb(var(--color-${kebabKey}) / <alpha-value>)`];
    }),
  );
}

function buildFontFamilyTokens(family) {
  return Object.fromEntries(
    Object.entries(family).map(([key, value]) => [toKebabCase(key), value]),
  );
}

function buildFontSizeTokens(scale) {
  return Object.fromEntries(
    Object.entries(scale).map(([key, { size, lineHeight }]) => [
      toKebabCase(key),
      [`${size}px`, `${lineHeight}px`],
    ]),
  );
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    colors: buildColorTokens(lightColors),
    spacing,
    borderRadius: radius,
    fontFamily: buildFontFamilyTokens(fontFamily),
    fontSize: buildFontSizeTokens(fontSize),
    extend: {},
  },
  plugins: [],
};
