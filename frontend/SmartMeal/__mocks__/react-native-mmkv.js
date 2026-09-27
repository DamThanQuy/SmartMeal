/**
 * Manual mock cho react-native-mmkv trong Jest.
 * v4 dùng Nitro Modules (native binding) không chạy được trong môi trường Jest (Node).
 * Mock này thay bằng một Map trong bộ nhớ, đủ để test code gọi qua storageService
 * (src/services/storage/storage.ts) mà không cần build native.
 */
function createMMKV() {
  const map = new Map();

  return {
    set(key, value) {
      map.set(key, value);
    },
    getString(key) {
      const value = map.get(key);
      return typeof value === 'string' ? value : undefined;
    },
    getBoolean(key) {
      const value = map.get(key);
      return typeof value === 'boolean' ? value : undefined;
    },
    getNumber(key) {
      const value = map.get(key);
      return typeof value === 'number' ? value : undefined;
    },
    contains(key) {
      return map.has(key);
    },
    remove(key) {
      return map.delete(key);
    },
    getAllKeys() {
      return Array.from(map.keys());
    },
    clearAll() {
      map.clear();
    },
  };
}

module.exports = {
  __esModule: true,
  createMMKV,
  existsMMKV: () => false,
  deleteMMKV: () => true,
};
