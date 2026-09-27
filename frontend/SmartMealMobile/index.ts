// Phải là import đầu tiên của toàn bộ app (yêu cầu của react-native-gesture-handler).
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
