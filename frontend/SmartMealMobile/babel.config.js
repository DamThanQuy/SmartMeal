module.exports = {
  presets: ['babel-preset-expo', 'nativewind/babel'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './src',
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    ],
    // react-native-worklets/plugin (Reanimated 4) phải luôn đứng cuối cùng.
    'react-native-worklets/plugin',
  ],
};
