import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * Đang chạy trong app Expo Go (quét QR từ `npx expo start`). Expo Go chỉ có sẵn các module native của Expo SDK — thư viện
 * có code native riêng (vd. @react-native-google-signin/google-signin) chỉ chạy trên dev build / bản chính thức.
 */
export const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
