import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { openSession } from '../services/sessionService';
import type { SessionOpenResult } from '../types/auth.types';

export interface UseGoogleLoginOptions {
  /**
   * Gß╗ìi khi API /auth/google trß║ú vß╗ü th├ánh c├┤ng (kß║┐t quß║ú cß╗ºa openSession:
   * user + needsSurvey). M├án h├¼nh d├╣ng ─æß╗â ─æiß╗üu h╞░ß╗¢ng.
   */
  onSuccess?: (result: SessionOpenResult) => void;
}

/**
 * Hook Google Sign-In ΓÇö chß╗ë hoß║ít ─æß╗Öng tr├¬n Web (Expo Web).
 *
 * C├ích hoß║ít ─æß╗Öng tr├¬n Web:
 * 1. Google Identity Services render n├║t ch├¡nh thß╗⌐c v├áo AuthGoogleButton.
 * 2. Ng╞░ß╗¥i d├╣ng chß╗ìn t├ái khoß║ún ΓåÆ Google trß║ú ID token qua callback.
 * 3. Gß╗ìi `authService.loginWithGoogle({ idToken })` ΓåÆ backend x├íc minh token,
 *    tß║ío/─æ─âng nhß║¡p t├ái khoß║ún SmartMeal, trß║ú access+refresh token.
 * 4. `openSession(user)` nß║íp hß╗ô s╞í sß╗⌐c khß╗Åe + quyß║┐t ─æß╗ïnh cß║ºn l├ám khß║úo s├ít kh├┤ng.
 * 5. Gß╗ìi `onSuccess({ user, needsSurvey })` ─æß╗â m├án h├¼nh ─æiß╗üu h╞░ß╗¢ng.
 *
 * Tr├¬n native (Android/iOS): hook log warning v├á return.
 * Native cß║ºn expo-auth-session + Dev Client (xem docs/SmartMeal_GoogleSignIn_Tasks.md).
 */
export function useGoogleLogin(options?: UseGoogleLoginOptions) {
  const googleMutation = useMutation({
    mutationFn: async (idToken: string): Promise<SessionOpenResult> => {
      const { user } = await authService.loginWithGoogle({ idToken });
      return openSession(user);
    },
    onSuccess: (result: SessionOpenResult) => {
      options?.onSuccess?.(result);
    },
  });
  const mutateGoogleLogin = googleMutation.mutate;

  const [isPrompting, setIsPrompting] = useState(false);
  const [promptError, setPromptError] = useState<Error | null>(null);

  /**
   * Fallback cho native; Web d├╣ng n├║t Google Identity Services render trß╗▒c tiß║┐p.
   */
  const start = useCallback(async () => {
    if (Platform.OS !== 'web') {
      console.warn(
        '[GoogleLogin] Google Sign-In ch╞░a hoß║ít ─æß╗Öng tr├¬n native. ' +
          'Cß║ºn expo-auth-session + Dev Client. Xem docs/SmartMeal_GoogleSignIn_Tasks.md.',
      );
      return;
    }

  }, []);

  const acceptCredential = useCallback((idToken: string) => {
    setPromptError(null);
    setIsPrompting(false);
    mutateGoogleLogin(idToken);
  }, [mutateGoogleLogin]);

  return {
    /** true khi ─æang chß╗¥ Google prompt. */
    isPrompting,
    /** Bß║Ñm n├║t Google trong App. */
    start,
    /** Callback nhß║¡n ID token tß╗½ n├║t Google Identity Services ─æ╞░ß╗úc render trß╗▒c tiß║┐p. */
    acceptCredential,
    /** true khi ─æang gß╗ìi API /auth/google. */
    isLoading: googleMutation.isPending,
    /** Lß╗ùi tß╗½ API ΓÇö c├│ thß╗â hiß╗ân thß╗ï ß╗ƒ m├án h├¼nh. */
    error: promptError ?? googleMutation.error,
    /** Kß║┐t quß║ú (user + needsSurvey) sau khi openSession xong. */
    result: googleMutation.data,
  };
}
