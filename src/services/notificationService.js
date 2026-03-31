/**
 * HeartLink — NotificationService
 * Handles push notification registration, permission, and tap navigation.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { UserAPI } from 'services/ApiServices';

// ── How notifications appear when app is in foreground ───────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

// ── Register for push notifications ──────────────────────────────────────────
export const registerForPushNotifications = async () => {
  try {
    // Android: create a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('heartlink', {
        name:        'HeartLink',
        importance:  Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor:  '#FF4B7A',
        sound:       'default',
      });
    }

    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('⚠️ [Push] Permission not granted');
      return null;
    }

    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'your-expo-project-id', // replace with your EAS project ID
    });

    const token = tokenData.data;
    console.log('📲 [Push] Token:', token);

    // Save token to backend
    await UserAPI.savePushToken(token);
    console.log('✅ [Push] Token saved to backend');

    return token;
  } catch (err) {
    console.log('❌ [Push] Registration error:', err.message);
    return null;
  }
};

// ── Set up notification tap listener ─────────────────────────────────────────
// Call this once in AppNavigator with a navigationRef
export const setupNotificationListeners = (navigationRef) => {
  // Tapping a notification while app is open or in background
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    handleNotificationTap(data, navigationRef);
  });

  return () => subscription.remove(); // return cleanup function
};

// ── Handle notification tap → navigate to correct screen ─────────────────────
const handleNotificationTap = (data, navigationRef) => {
  if (!navigationRef?.isReady()) return;

  if (data?.type === 'message' && data?.senderId) {
    navigationRef.navigate('Chat', {
      userId:   data.senderId,
      userName: data.senderName || 'Match',
    });
  } else if (data?.type === 'match') {
    navigationRef.navigate('Matches');
  }
};

// ── Clear badge count ─────────────────────────────────────────────────────────
export const clearBadge = () => {
  Notifications.setBadgeCountAsync(0);
};
