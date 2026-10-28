// Expo installs fetch lazily. Resolve the real preset-provided globals before a
// test resets modules and replaces react-native with a focused partial mock.
// Otherwise Axios's first fetch lookup can initialize native Expo modules using
// that partial mock instead of the React Native environment from jest-expo.
for (const name of ['Headers', 'Request', 'Response', 'fetch']) {
  void globalThis[name];
}
