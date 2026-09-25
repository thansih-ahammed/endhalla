import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from '../shared/store';
import AppNavigator from './navigation/AppNavigator';
import { AlertProvider } from '../shared/components/AlertProvider';
import { setupNotificationChannels } from '../shared/utils/notificationChannels';

export default function App() {
  useEffect(() => {
    // Deliberately not called from index.client.js's top level — that file
    // also runs for a pure background push (a headless JS task with no
    // Activity/UI attached), and this only needs to exist by the time the
    // app is actually open, or right before an incoming-call notification
    // is displayed (see incomingCallNotification.ts, which also ensures it).
    setupNotificationChannels();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* SafeAreaProvider must wrap everything: without it every SafeAreaView
          and useSafeAreaInsets() reports zero insets, so content slides under
          the status bar and the system navigation bar. */}
      <SafeAreaProvider>
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
        <Provider store={store}>
          <AlertProvider>
            <AppNavigator />
          </AlertProvider>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
