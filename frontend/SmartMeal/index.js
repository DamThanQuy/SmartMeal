/**
 * @format
 */

// Phải là import đầu tiên của toàn bộ app (yêu cầu của react-native-gesture-handler).
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
