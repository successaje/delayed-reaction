import AsyncStorage from '@amazon-devices/react-native-async-storage__async-storage';
import { DelayedReactionTV, type TvConfig } from '@delayed-reaction/tv-ui';
import { API_URL, WEB_URL } from './config';

const config: TvConfig = {
  apiUrl: API_URL,
  webUrl: WEB_URL,
  storage: AsyncStorage,
  deviceName: 'Living room',
};

export const App = () => <DelayedReactionTV config={config} />;
