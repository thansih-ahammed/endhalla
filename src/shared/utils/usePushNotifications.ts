import { useEffect, useRef } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import {
  getMessaging,
  requestPermission as requestMessagingPermission,
  getToken,
  onMessage,
  onTokenRefresh,
  onNotificationOpenedApp,
  getInitialNotification,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import notifee, { Event, EventType } from '@notifee/react-native';
import { connectChatUser } from '../chat/streamChatClient';
import { useAppAlert } from '../components/AlertProvider';
import {
  displayIncomingCallNotification,
  clearIncomingCallNotifications,
  handleIncomingCallNotificationEvent,
} from './incomingCallNotification';
import { stopIncomingCallRingtone } from './incomingCallRingtone';

interface ChatTokenData {
  apiKey: string;
  token: string;
  userId: string;
  userName: string;
}

interface UsePushNotificationsArgs {
  /** Only start once the user is actually logged in. */
  enabled: boolean;
  /** Sends the FCM token to our backend for this user's account. */
  registerToken: (fcmToken: string) => Promise<unknown>;
  /** Fetches a Stream Chat identity token — used only to register this device for chat push. */
  getChatToken?: () => Promise<ChatTokenData>;
  /** Called when the user taps a notification (backgrounded or from killed state). */
  onNotificationTap?: (data: Record<string, string>) => void;
}

async function requestPermission(messagingInstance: ReturnType<typeof getMessaging>): Promise<boolean> {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
  }
  await notifee.requestPermission();
  const authStatus = await requestMessagingPermission(messagingInstance);
  return (
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL
  );
}

export function usePushNotifications({
  enabled,
  registerToken,
  getChatToken,
  onNotificationTap,
}: UsePushNotificationsArgs) {
  const registeredRef = useRef(false);
  const { showAlert } = useAppAlert();

  useEffect(() => {
    if (!enabled || registeredRef.current) return;
    registeredRef.current = true;

    const messagingInstance = getMessaging();

    (async () => {
      const granted = await requestPermission(messagingInstance);
      if (!granted) return;

      const fcmToken = await getToken(messagingInstance);
      await registerToken(fcmToken).catch((err) =>
        console.error('Failed to register push token:', err),
      );

      if (getChatToken) {
        try {
          const chatToken = await getChatToken();
          const chatClient = await connectChatUser(chatToken);
          await chatClient.addDevice(fcmToken, 'firebase');
        } catch (err) {
          console.error('Failed to register device for chat push:', err);
        }
      }
    })();

    const unsubscribeRefresh = onTokenRefresh(messagingInstance, async (newToken) => {
      await registerToken(newToken).catch((err) =>
        console.error('Failed to re-register refreshed push token:', err),
      );
    });

    // Incoming calls are sent data-only (see backend/src/utils/callToken.js)
    // and build their own full-screen-capable notification via notifee —
    // see incomingCallNotification.ts. Everything else still uses a plain
    // `notification` payload the OS displays on its own.
    const unsubscribeForeground = onMessage(messagingInstance, async (remoteMessage) => {
      const data = remoteMessage.data as Record<string, string> | undefined;

      if (data?.type === 'incoming_call') {
        await displayIncomingCallNotification({
          bookingId: data.bookingId,
          callerName: data.callerName || 'Your counsellor',
        });
        return;
      }

      const title = remoteMessage.notification?.title || 'Endhalla';
      const body = remoteMessage.notification?.body || '';
      if (body) showAlert({ title, message: body, tone: 'info' });
    });

    const unsubscribeOpened = onNotificationOpenedApp(messagingInstance, (remoteMessage) => {
      if (remoteMessage.data) onNotificationTap?.(remoteMessage.data as Record<string, string>);
    });

    getInitialNotification(messagingInstance).then((remoteMessage) => {
      if (remoteMessage?.data) {
        onNotificationTap?.(remoteMessage.data as Record<string, string>);
      }
    });

    // notifee handles taps/actions on the notifications *it* displayed
    // (i.e. incoming calls) — separate event system from the FCM-displayed
    // ones above.
    const handleNotifeeEvent = ({ type, detail }: Event) => {
      handleIncomingCallNotificationEvent({ type, detail });

      const data = detail.notification?.data as Record<string, string> | undefined;
      if (!data) return;

      if (
        type === EventType.PRESS ||
        (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'answer')
      ) {
        onNotificationTap?.(data);
      }
    };

    // notifee.onBackgroundEvent is registered separately at the app entry
    // point (index.client.js) — it must be a top-level registration to fire
    // while the app is killed, not something tied to this hook's lifecycle.
    const unsubscribeNotifeeForeground = notifee.onForegroundEvent(handleNotifeeEvent);

    notifee.getInitialNotification().then((initial) => {
      const data = initial?.notification?.data as Record<string, string> | undefined;
      if (data) {
        clearIncomingCallNotifications();
        stopIncomingCallRingtone();
        onNotificationTap?.(data);
      }
    });

    return () => {
      unsubscribeRefresh();
      unsubscribeForeground();
      unsubscribeOpened();
      unsubscribeNotifeeForeground();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
