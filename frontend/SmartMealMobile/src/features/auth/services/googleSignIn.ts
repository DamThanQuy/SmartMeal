/**
 * Google Sign-In (Web only) ΓÇö Google Identity Services (GSI).
 *
 * Chß╗ë chß║íy ─æ╞░ß╗úc tr├¬n Web (Expo Web / tr├¼nh duyß╗çt). Tr├¬n native (Android/iOS) cß║ºn
 * `expo-auth-session` + Expo Dev Client ΓÇö ch╞░a implement ß╗ƒ ─æ├óy.
 *
 * C├ích hoß║ít ─æß╗Öng:
 * 1. Load script `https://accounts.google.com/gsi/client` (chß╗ë load mß╗Öt lß║ºn).
 * 2. Gß╗ìi `google.accounts.id.initialize({ client_id, ... })`.
 * 3. Gß╗ìi `google.accounts.id.prompt()` ΓÇö Google render n├║t "Continue with Google"
 *    cß╗ºa ch├¡nh Google. Ng╞░ß╗¥i d├╣ng bß║Ñm ΓåÆ Google trß║ú vß╗ü ID token (credential)
 *    qua callback `success`.
 * 4. `getGoogleIdToken()` trß║ú vß╗ü Promise<string> ΓÇö ID token (JWT) sß║╜ ─æ╞░ß╗úc gß╗¡i
 *    l├¬n backend `POST /auth/google { idToken }` ─æß╗â m├íy chß╗º x├íc minh.
 *
 * Y├èU Cß║ªU Cß║ñU H├îNH (Google Cloud Console ΓÇö Project: zinc-night-511604-v9):
 *   - OAuth consent screen: External, app name "SmartMeal",
 *     support email damthanchiem@gmail.com, test user damthanchiem@gmail.com.
 *   - Web OAuth 2.0 Client:
 *       Name: Web client 1
 *       Authorized JavaScript origin: http://localhost:8082
 *   - EXPO_PUBLIC_GOOGLE_CLIENT_ID trong `.env`
 *
 * L╞»U ├¥ Bß║óO Mß║¼T (P1-BE-01): Backend PHß║óI tß╗▒ x├íc minh ID token vß╗¢i Google
 * (th╞░ viß╗çn `Google.Identity` / token endpoint), KH├öNG tin email do client tß╗▒ gß╗¡i.
 *
 * Native (Android/iOS): ch╞░a support ΓÇö xem task "Native" trong
 * docs/SmartMeal_GoogleSignIn_Tasks.md.
 */

import { Platform } from 'react-native';

// EXPO_PUBLIC_ prefix ΓÇö Expo inline v├áo bundle l├║c build.
// undefined nß║┐u ch╞░a ─æß║╖t trong .env ΓåÆ Google Sign-In tß║»t (n├║t sß║╜ hiß╗çn
// "Google Client ID ch╞░a cß║Ñu h├¼nh").
const GOOGLE_CLIENT_ID: string | undefined =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

// Web-only: Google Identity Services script chß╗ë load ─æ╞░ß╗úc tr├¬n tr├¼nh duyß╗çt.
const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

let gsiReady: Promise<void> | null = null;
let activeCredentialHandler: ((credential: string) => void) | null = null;
let gsiInitialized = false;

/**
 * Load script GSI mß╗Öt lß║ºn. Resolve khi window.google.accounts.id khß║ú dß╗Ñng.
 * Reject nß║┐u ─æang chß║íy tr├¬n native (kh├┤ng c├│ window/document).
 */
function ensureGsiScript(): Promise<void> {
  if (!gsiReady) {
    gsiReady = new Promise<void>((resolve, reject) => {
      // Platform.select kh├┤ng chß║íy tr├¬n web ΓåÆ Platform.OS === 'web'.
      if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') {
        reject(
          new Error(
            'Google Sign-In chß╗ë hoß║ít ─æß╗Öng tr├¬n Web. Tr├¬n native cß║ºn expo-auth-session + Dev Client.',
          ),
        );
        return;
      }

      // Script ─æ├ú load tr╞░ß╗¢c ─æ├│ ΓåÆ resolve ngay.
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
          reject(new Error('Kh├┤ng thß╗â tß║úi Google Identity Services.'));
        }
      };
      script.onerror = () => {
        reject(new Error('Kh├┤ng thß╗â tß║úi Google Identity Services (network error).'));
      };
      document.head.appendChild(script);
    });
  }
  return gsiReady;
}

export interface GoogleSignInOptions {
  /** Hiß╗ân thß╗ï n├║t cß╗ºa Google thay v├¼ n├║t cß╗ºa app. Mß║╖c ─æß╗ïnh false. */
  usePromptButton?: boolean;
  /** Email ─æ├ú biß║┐t tr╞░ß╗¢c ─æß╗â gß╗úi ├╜ (kh├┤ng bß║»t buß╗Öc). */
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
  const accounts = (window as any).google?.accounts?.id;
  if (!accounts) {
    throw new Error(
      'Google Identity Services ch╞░a sß║╡n s├áng. Kiß╗âm tra EXPO_PUBLIC_GOOGLE_CLIENT_ID v├á kß║┐t nß╗æi mß║íng.',
    );
  }
  return accounts as GsiAccountsId;
}

/**
 * Lß║Ñy Google ID token (JWT) tß╗½ Google Sign-In.
 *
 * C├ích 1 (prompt button): Google render n├║t ΓåÆ ng╞░ß╗¥i d├╣ng bß║Ñm ΓåÆ callback nhß║¡n credential.
 * C├ích 2 (headless, d├╣ng vß╗¢i n├║t App tß╗▒ build): initialize rß╗ôi gß╗ìi prompt()
 * ─æß╗â Google hiß╗ân thß╗ï popup/n├║t cß╗ºa Google.
 *
 * Trß║ú vß╗ü Promise<string> (ID token). Reject nß║┐u ng╞░ß╗¥i d├╣ng hß╗ºy hoß║╖c Client ID
 * ch╞░a cß║Ñu h├¼nh.
 */
export function getGoogleIdToken(options?: GoogleSignInOptions): Promise<string> {
  return (async () => {
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('your-google-oauth')) {
      throw new Error(
        'Google Client ID ch╞░a ─æ╞░ß╗úc cß║Ñu h├¼nh. ─Éß║╖t EXPO_PUBLIC_GOOGLE_CLIENT_ID trong .env rß╗ôi restart Metro.',
      );
    }

    await ensureGsiScript();
    const gsi = getGsi();

    return new Promise<string>((resolve, reject) => {
      let settled = false;
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error('─É─âng nhß║¡p Google hß║┐t thß╗¥i gian chß╗¥. Vui l├▓ng thß╗¡ lß║íi.'));
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
          fail(`Google Sign-In kh├┤ng hiß╗ân thß╗ï ─æ╞░ß╗úc (${notification.getNotDisplayedReason?.() ?? 'unknown'}).`);
        } else if (notification.isSkippedMoment()) {
          fail(`Bß║ín ─æ├ú bß╗Å qua ─æ─âng nhß║¡p Google (${notification.getSkippedReason?.() ?? 'skipped'}).`);
        } else if (notification.isDismissedMoment()) {
          fail(`─É─âng nhß║¡p Google ─æ├ú bß╗ï hß╗ºy (${notification.getDismissedReason?.() ?? 'dismissed'}).`);
        }
      });
    });
  })();
}

/**
 * Render n├║t Google (styled button cß╗ºa Google) v├áo element DOM.
 * Chß╗ë d├╣ng khi muß╗æn hiß╗ân thß╗ï ch├¡nh n├║t Google thay v├¼ n├║t App.
 */
export function renderGoogleButton(
  container: HTMLElement,
  onCredential: (credential: string) => void,
  options?: { theme?: 'outline' | 'filled_black' | 'filled_white'; text?: 'sign_in' | 'continue' },
): () => void {
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('your-google-oauth')) {
    console.warn('[googleSignIn] EXPO_PUBLIC_GOOGLE_CLIENT_ID ch╞░a cß║Ñu h├¼nh ΓÇö kh├┤ng thß╗â render n├║t.');
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
      console.error('[googleSignIn] Kh├┤ng thß╗â render n├║t Google:', error);
    }
  })();
  return () => {
    disposed = true;
    if (activeCredentialHandler === onCredential) activeCredentialHandler = null;
    container.replaceChildren();
  };
}
