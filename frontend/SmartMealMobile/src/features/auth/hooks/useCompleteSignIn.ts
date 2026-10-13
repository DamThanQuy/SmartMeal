import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AUTH_ROUTES } from '@/constants/routes';
import type { AuthStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/state/auth/authStore';
import type { SessionOpenResult } from '../types/auth.types';

/**
 * Sau khi mở phiên (email hay Google): đã có Health Profile thì vào Main; chưa có thì đi thẳng wizard
 * và bỏ màn hiện tại khỏi stack vì đã có phiên.
 */
export function useCompleteSignIn() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const login = useAuthStore(state => state.login);
  const setPendingUser = useAuthStore(state => state.setPendingUser);

  return ({ user, needsSurvey }: SessionOpenResult) => {
    if (!needsSurvey) {
      login(user);
      return;
    }
    setPendingUser(user);
    navigation.reset({ index: 0, routes: [{ name: AUTH_ROUTES.HEALTH_PROFILE_BASIC_INFO }] });
  };
}
