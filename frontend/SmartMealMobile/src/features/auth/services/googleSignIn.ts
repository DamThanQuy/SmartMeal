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
 * YÊU CẦU CẤU HÌNH (Google Cloud Console — Project: zinc-night-511604-v9):
 *   - OAuth consent screen: External, app name "SmartMeal",
 *     support email damthanchiem@gmail.com, test user damthanchiem@gmail.com.
 *   - Web OAuth 2.0 Client:
 *       Name: Web client 1
 *       Authorized JavaScript origin: http://localhost:8082
 *   - EXPO_PUBLIC_GOOGLE_CLIENT_ID trong `.env`
 *
 * LƯU Ý BẢO MẬT (P1-BE-01): Backend PHẢI tự xác minh ID token với Google
 * (thư viện `Google.Identity` / token endpoint), KHÔNG tin email do client tự gửi.
 *
 * Native (Android/iOS): chưa support — xem task "Native" trong
 * docs/SmartMeal_GoogleSignIn_Tasks.md.
 */

import { Platform } from 'react-native';

// EXPO_PUBLIC_ prefix — Expo inline vào bundle lúc build.
// undefined nếu chưa đặt trong .env → Google Sign-In tắt (nút sẽ hiện
// "Google Client ID chưa cấu hình").
const GOOGLE_CLIENT_ID: string | undefined =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

// Web-only: Google Identity Services script chỉ load được trên trình duyệt.
const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

let gsiReady: Promise<void> | null = null;

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
      if ((window as any).google?.accounts?.id) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = GSI_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if ((window as any).google?.accounts?.id) {
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
type IdTokenError = { error_type: string; error_reason?: string; error_description?: string };

type GsiAccountsId = {
  initialize: (params: {
    client_id: string;
    callback: (response: IdCredentialResponse) => void;
    hint?: string;
  }) => void;
  prompt: () => void;
  renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
};

function getGsi(): GsiAccountsId {
  const accounts = (window as any).google?.accounts?.id;
  if (!accounts) {
    throw new Error(
      'Google Identity Services chưa sẵn sàng. Kiểm tra EXPO_PUBLIC_GOOGLE_CLIENT_ID và kết nối mạng.',
    );
  }
  return accounts as GsiAccountsId;
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
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('your-google-oauth')) {
      throw new Error(
        'Google Client ID chưa được cấu hình. Đặt EXPO_PUBLIC_GOOGLE_CLIENT_ID trong .env rồi restart Metro.',
      );
    }

    await ensureGsiScript();
    const gsi = getGsi();

    return new Promise<string>((resolve, reject) => {
      let settled = false;

      const onCredential = (response: IdCredentialResponse) => {
        settled = true;
        resolve(response.credential);
      };

      gsi.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: onCredential,
        hint: options?.hintEmail,
      });

      // Nếu usePromptButton → render nút Google vào element (màn hình cần truyền DOM ref).
      // Mặc định: gọi prompt() để Google hiện nút của chính Google trên page.
      if (options?.usePromptButton) {
        // Gọier sẽ render nút qua renderButton (xem useGoogleLogin hook).
        // prompt() vẫn dùng ở chế độ headless.
        gsi.prompt();
      } else {
        gsi.prompt();
      }

      // Người dùng có thể không bấm ngay → không có callback nào.
      // Không timeout tự động; hook bên trên sẽ manage trạng thái.
    });
  })();
}

/**
 * Render nút Google (styled button của Google) vào element DOM.
 * Chỉ dùng khi muốn hiển thị chính nút Google thay vì nút App.
 */
export function renderGoogleButton(
  container: HTMLElement,
  options?: { theme?: 'outline' | 'filled_black' | 'filled_white'; text?: 'sign_in' | 'continue' },
): void {
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('your-google-oauth')) {
    console.warn('[googleSignIn] EXPO_PUBLIC_GOOGLE_CLIENT_ID chưa cấu hình — không thể render nút.');
    return;
  }
  void (async () => {
    await ensureGsiScript();
    const gsi = getGsi();
    gsi.renderButton(container, {
      client_id: GOOGLE_CLIENT_ID,
      width: 280,
      theme: options?.theme ?? 'outline',
      text: options?.text ?? 'continue',
    });
  })();
}
