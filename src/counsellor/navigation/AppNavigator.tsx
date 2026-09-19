import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/Onboarding/LoginScreen";
import PhoneInputScreen from "../screens/Onboarding/PhoneInputScreen";
import OTPVerificationScreen from "../screens/Onboarding/OTPVerificationScreen";
import FullNameScreen from "../screens/Onboarding/FullNameScreen";
import GenderScreen from "../screens/Onboarding/GenderScreen";
import ExperienceScreen from "../screens/Onboarding/ExperienceScreen";
import SessionRatesScreen from "../screens/Onboarding/SessionRatesScreen";
import LanguagesScreen from "../screens/Onboarding/LanguagesScreen";
import AreasOfFocusScreen from "../screens/Onboarding/AreasOfFocusScreen";
import CertificatesScreen from "../screens/Onboarding/CertificatesScreen";
import SuccessScreen from "../screens/Onboarding/SuccessScreen";
import MainTabNavigator from "./MainTabNavigator";
import SessionDetailScreen from "../screens/Sessions/SessionDetailScreen";
import VideoCallScreen from "../../shared/videoCall/VideoCallScreen";
import ChatScreen from "../../shared/chat/ChatScreen";
import MessagesScreen from "../screens/Chat/MessagesScreen";
import { useAppDispatch, useAppSelector } from "../../shared/store";
import { restoreSession } from "../../shared/store/authSlice";
import { usePushNotifications } from "../../shared/utils/usePushNotifications";
import { useUpdateCounsellorPushTokenMutation, useLazyGetCounsellorChatTokenQuery } from "../../shared/store/api/counsellorApi";
import { colors } from "../theme";

const Stack = createNativeStackNavigator();
export const navigationRef = createNavigationContainerRef<any>();

// A notification tap (especially one that cold-starts the app) can fire
// before NavigationContainer finishes mounting — navigationRef.isReady()
// is false for a moment, and previously that silently dropped the
// navigation. Retry instead of giving up.
function navigateWhenReady(routeName: string, params?: object, attempt = 0) {
  if (navigationRef.isReady()) {
    (navigationRef.navigate as (name: string, params?: object) => void)(routeName, params);
    return;
  }
  if (attempt >= 20) return;
  setTimeout(() => navigateWhenReady(routeName, params, attempt + 1), 500);
}

export default function AppNavigator() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const [updatePushToken] = useUpdateCounsellorPushTokenMutation();
  const [fetchChatToken] = useLazyGetCounsellorChatTokenQuery();

  // Restore the saved session so a signed-in counsellor lands on the tabs
  // instead of the login screen after a cold start.
  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  usePushNotifications({
    enabled: isAuthenticated,
    registerToken: (token) => updatePushToken(token).unwrap(),
    getChatToken: () => fetchChatToken().unwrap(),
    onNotificationTap: (data) => {
      if (data.type === 'booking' || data.type === 'payment' || data.type === 'counsellor_review') {
        if (data.bookingId) navigateWhenReady('SessionDetail', { bookingId: data.bookingId });
        else navigateWhenReady('Main', { screen: 'Home' });
      } else if (data.type === 'chat') {
        navigateWhenReady('Messages');
      }
    },
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Onboarding and the main tabs live in one stack: OTP verification signs the
  // counsellor in *before* the profile steps, so gating the stack on
  // isAuthenticated alone would skip onboarding. The initial route just picks
  // where a cold start lands; screens navigate/reset explicitly from there.
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={isAuthenticated ? 'Main' : 'Login'}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="PhoneInput" component={PhoneInputScreen} />
        <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
        <Stack.Screen name="FullName" component={FullNameScreen} />
        <Stack.Screen name="Gender" component={GenderScreen} />
        <Stack.Screen name="Experience" component={ExperienceScreen} />
        <Stack.Screen name="SessionRates" component={SessionRatesScreen} />
        <Stack.Screen name="Languages" component={LanguagesScreen} />
        <Stack.Screen name="AreasOfFocus" component={AreasOfFocusScreen} />
        <Stack.Screen name="Certificates" component={CertificatesScreen} />
        <Stack.Screen name="Success" component={SuccessScreen} />

        <Stack.Screen name="Main" component={MainTabNavigator} />
        <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
        <Stack.Screen name="VideoCall" component={VideoCallScreen} options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="Messages" component={MessagesScreen} />
        <Stack.Screen name="ChatScreen" component={ChatScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
