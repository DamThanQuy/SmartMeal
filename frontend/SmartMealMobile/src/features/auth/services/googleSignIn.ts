/**
 * Google Sign-In (Web only) — Google Identity Services (GSI).
 *
 * Chỉ chạy được trên Web (Expo Web / trình duyệt). Trên native (Android/iOS) cần
 * `expo-auth-session` + Expo Dev Client — chưa implement ở đây.
 *
 * Cách hoạt động:
 * 1. Load script `https://accounts.google.com/gsi/client` (chỉ load một lần).
 * 2. Gọi `google.accounts.id.initialize({ client_id, ... })`.
 * 3. Gọi `google.accounts.id.prompt()` — Google render nút "Continue with Google"
 *    của chính Google. Người dùng bấm → Google trả về ID token (credential)
 *    qua callback `success`.
 * 4. `getGoogleIdToken()` trả về Promise<string> — ID token (JWT) sẽ được gửi
 *    lên backend `POST /auth/google { idToken }` để máy chủ xác minh.
 *
 * YÊU CẦU CẤU HÌNH (Google Cloud Console của nhóm):
 *   - OAuth consent screen (External). Khi còn ở chế độ "Testing", chỉ tài khoản Google có
 *     trong danh sách test user mới đăng nhập được.
 *   - Web OAuth 2.0 Client: "Authorized JavaScript origins" phải có đúng origin đang chạy
 *     Expo Web (vd. http://localhost:8081) — origin đó cũng phải nằm trong Cors__AllowedOrigins của BE.
 *   - Cùng một Client ID cho EXPO_PUBLIC_GOOGLE_CLIENT_ID (FE) và Google__ClientId (BE).
 *
 * LƯU Ý BẢO MẬT (P1-BE-01): Backend tự xác minh ID token với Google (Google.Apis.Auth), không
 * tin email do client tự gửi.
 *
 * Native (Android/iOS): chưa hỗ trợ — cần expo-auth-session, Client ID Android/iOS và BE nhận
 * thêm các Client ID đó làm audience. Màn hình ẩn nút Google trên native (`isGoogleSignInAvailable`).
 */

import { Platform } from 'react-native';

// EXPO_PUBLIC_ prefix — Expo inline vào bundle lúc build.
// undefined nếu chưa đặt trong .env → Google Sign-In tắt (nút sẽ hiện
// "Google Client ID chưa cấu hình").
const GOOGLE_CLIENT_ID: string | undefined =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

function hasClientId(clientId: string | undefined): clientId is string {
  return Boolean(clientId) && !clientId?.includes('your-google-oauth');
}

/**
 * Có hiển thị đăng nhập Google không: chỉ trên Web và khi đã cấu hình Client ID. Trên native nút
 * chưa làm được gì (cần expo-auth-session + Dev Client) nên màn hình ẩn hẳn thay vì để nút chết.
 */
export function isGoogleSignInAvailable(): boolean {
  return Platform.OS === 'web' && hasClientId(GOOGLE_CLIENT_ID);
}

// Web-only: Google Identity Services script chỉ load được trên trình duyệt.
const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

type GsiWindow = Window & { google?: { accounts?: { id?: GsiAccountsId } } };

function gsiAccountsId(): GsiAccountsId | undefined {
  return (window as GsiWindow).google?.accounts?.id;
}

let gsiReady: Promise<void> | null = null;
let activeCredentialHandler: ((credential: string) => void) | null = null;
let gsiInitialized = false;

/**
 * Load script GSI một lần. Resolve khi window.google.accounts.id khả dụng.
 * Reject nếu đang chạy trên native (không có window/document).
 */
function ensureGsiScript(): Promise<void> {
  if (!gsiReady) {
    gsiReady = new Promise<void>((resolve, reject) => {
      // Platform.select không chạy trên web → Platform.OS === 'web'.
      if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') {
        reject(
          new Error(
            'Google Sign-In chỉ hoạt động trên Web. Trên native cần expo-auth-session + Dev Client.',
          ),
        );
        return;
      }

      // Script đã load trước đó → resolve ngay.
      if (gsiAccountsId()) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = GSI_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (gsiAccountsId()) {
          resolve();
        } else {
          reject(new Error('Không thể tải Google Identity Services.'));
        }
      };
      script.onerror = () => {
        reject(new Error('Không thể tải Google Identity Services (network error).'));
      };
      document.head.appendChild(script);
    });
  }
  return gsiReady;
}

export interface GoogleSignInOptions {
  /** Hiển thị nút của Google thay vì nút của app. Mặc định false. */
  usePromptButton?: boolean;
  /** Email đã biết trước để gợi ý (không bắt buộc). */
  hintEmail?: string;
}

type IdCredentialResponse = { credential: string; select_by?: string };
type PromptMomentNotification = {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
  getNotDisplayedReason?: () => string;
  getSkippedReason?: () => string;
  getDismissedReason?: () => string;
};

type GsiAccountsId = {
  initialize: (params: {
    client_id: string;
    callback: (response: IdCredentialResponse) => void;
    hint?: string;
  }) => void;
  prompt: (listener?: (notification: PromptMomentNotification) => void) => void;
  renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
};

function getGsi(): GsiAccountsId {
  const accounts = gsiAccountsId();
  if (!accounts) {
    throw new Error(
      'Google Identity Services chưa sẵn sàng. Kiểm tra EXPO_PUBLIC_GOOGLE_CLIENT_ID và kết nối mạng.',
    );
  }
  return accounts;
}

/**
 * Lấy Google ID token (JWT) từ Google Sign-In.
 *
 * Cách 1 (prompt button): Google render nút → người dùng bấm → callback nhận credential.
 * Cách 2 (headless, dùng với nút App tự build): initialize rồi gọi prompt()
 * để Google hiển thị popup/nút của Google.
 *
 * Trả về Promise<string> (ID token). Reject nếu người dùng hủy hoặc Client ID
 * chưa cấu hình.
 */
export function getGoogleIdToken(options?: GoogleSignInOptions): Promise<string> {
  return (async () => {
    if (!hasClientId(GOOGLE_CLIENT_ID)) {
      throw new Error(
        'Google Client ID chưa được cấu hình. Đặt EXPO_PUBLIC_GOOGLE_CLIENT_ID trong .env rồi restart Metro.',
      );
    }

    await ensureGsiScript();
    const gsi = getGsi();

    return new Promise<string>((resolve, reject) => {
      let settled = false;
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error('Đăng nhập Google hết thời gian chờ. Vui lòng thử lại.'));
      }, 20_000);

      const fail = (message: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        reject(new Error(message));
      };

      const onCredential = (response: IdCredentialResponse) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve(response.credential);
      };

      gsi.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: onCredential,
        hint: options?.hintEmail,
      });

      // The app button calls prompt() headlessly. Always settle the promise when
      // Google says the prompt was dismissed, skipped, or could not be displayed.
      gsi.prompt(notification => {
        if (notification.isNotDisplayed()) {
          fail(`Google Sign-In không hiển thị được (${notification.getNotDisplayedReason?.() ?? 'unknown'}).`);
        } else if (notification.isSkippedMoment()) {
          fail(`Bạn đã bỏ qua đăng nhập Google (${notification.getSkippedReason?.() ?? 'skipped'}).`);
        } else if (notification.isDismissedMoment()) {
          fail(`Đăng nhập Google đã bị hủy (${notification.getDismissedReason?.() ?? 'dismissed'}).`);
        }
      });
    });
  })();
}

/**
 * Render nút Google (styled button của Google) vào element DOM.
 * Chỉ dùng khi muốn hiển thị chính nút Google thay vì nút App.
 */
export function renderGoogleButton(
  container: HTMLElement,
  onCredential: (credential: string) => void,
  options?: { theme?: 'outline' | 'filled_black' | 'filled_white'; text?: 'sign_in' | 'continue' },
): () => void {
  if (!hasClientId(GOOGLE_CLIENT_ID)) {
    console.warn('[googleSignIn] EXPO_PUBLIC_GOOGLE_CLIENT_ID chưa cấu hình — không thể render nút.');
    return () => undefined;
  }
  let disposed = false;
  activeCredentialHandler = onCredential;
  void (async () => {
    try {
      await ensureGsiScript();
      if (disposed) return;
      const gsi = getGsi();
      if (!gsiInitialized) {
        gsi.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: response => activeCredentialHandler?.(response.credential),
        });
        gsiInitialized = true;
      }
      container.replaceChildren();
      gsi.renderButton(container, {
        type: 'standard',
        size: 'large',
        width: Math.min(400, Math.max(240, Math.floor(container.getBoundingClientRect().width || 280))),
        theme: options?.theme ?? 'outline',
        text: options?.text ?? 'continue_with',
        shape: 'rectangular',
      });
    } catch (error) {
      console.error('[googleSignIn] Không thể render nút Google:', error);
    }
  })();
  return () => {
    disposed = true;
    if (activeCredentialHandler === onCredential) activeCredentialHandler = null;
    container.replaceChildren();
  };
}
