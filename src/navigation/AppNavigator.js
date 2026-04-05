
import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Routes } from 'src/constants/appConstants';
import Colors from 'src/constants/Colors';
import SocketService from 'services/socketService';
import {
  registerForPushNotifications,
  setupNotificationListeners,
  clearBadge,
} from 'src/services/notificationService';
import { useSubscriptionStatus } from 'src/hooks/useSubscriptionStatus';
import ExpiryBanner from 'src/components/ExpiryBanner';


import SplashScreen from 'screen/generalScreens/SplashScreen';
import OnboardingScreen from 'screen/generalScreens/OnboardingScreen';
import WelcomeScreen from 'screen/generalScreens/WelcomeScreen';
import RegisterScreen from 'screen/auth/RegistrationScreen';
import CompleteProfileScreen from 'screen/auth/RegistrationScreen'; // same component, google mode
import LoginScreen from 'screen/auth/LoginScreen';
import ForgotPasswordScreen from 'screen/auth/ResetPasswordScreen';
import ResetPasswordScreen from 'screen/auth/ResetPasswordScreen';

// Main screens (stubs for now)
import HomeScreen     from 'src/screens/main/HomeScreen';
import DiscoverScreen from 'src/screens/main/DiscoverScreen';
import MatchesScreen  from 'src/screens/main/MatchesScreen';
import MessagesScreen from 'src/screens/main/MessagesScreen';
import ProfileScreen  from 'src/screens/main/ProfileScreen';
import LikesScreen    from 'src/screens/main/LikesScreen';
import { useAuth } from 'src/store/authStore';
import OTPScreen from 'src/screens/auth/OtpScreen';
import ChatScreen from 'screen/main/ChatScreen';
import UserProfileScreen from 'screen/main/UserProfileScreen';
import MatchScreen from 'screen/generalScreens/MatchScreen';
import EditProfileScreen from 'screen/main/EditProfileScreen';
// import ChatScreen from 'src/screens/main/ChatScreen';


const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Loading screen (shown while restoring session) ────────────────────────────
function InitializingScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.heart}>♥</Text>
      <ActivityIndicator color={Colors.primary} style={{ marginTop: 16 }} />
    </View>
  );
}

// ── Bottom tabs ───────────────────────────────────────────────────────────────

function MainTabs() {
  const insets = useSafeAreaInsets();           // ← get device insets

  const tabs = [
    { name: Routes.HOME,     component: HomeScreen,     label: 'Swipe',    icon: '🔥' },
    { name: Routes.DISCOVER, component: DiscoverScreen, label: 'Discover', icon: '🔍' },
    { name: Routes.MATCHES,  component: MatchesScreen,  label: 'Matches',  icon: '💕' },
    { name: Routes.MESSAGES, component: MessagesScreen, label: 'Messages', icon: '💬' },
    { name: Routes.LIKES,    component: LikesScreen,    label: 'Likes',    icon: '❤️' },
  ];

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: '#F3F4F6',
          // ✅ Dynamically account for the system nav bar
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      {tabs.map(({ name, component, label, icon }) => (
        <Tab.Screen
          key={name}
          name={name}
          component={component}
          options={{
            tabBarLabel: label,
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

// ── Authenticated shell — wraps all logged-in screens ────────────────────────
function AuthenticatedShell({ children, navigationRef }) {
  const {
    showSubExpiryWarning,
    showBoostExpiryWarning,
    subDaysLeft,
    boostDaysLeft,
  } = useSubscriptionStatus();

  return (
    <View style={{ flex: 1 }}>
      {children}
      <ExpiryBanner
        showSubWarning={showSubExpiryWarning}
        showBoostWarning={showBoostExpiryWarning}
        subDaysLeft={subDaysLeft}
        boostDaysLeft={boostDaysLeft}
        onRenewSub={() => navigationRef?.current?.navigate('Profile')}
      />
    </View>
  );
}

// ── Root navigator ────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { isAuthenticated, isInitializing, user } = useAuth();
  const navigationRef = useRef(null);

  // ── Connect/disconnect socket with auth state ─────────────────────────────
  useEffect(() => {
    if (isAuthenticated && user?._id) {
      SocketService.connect(user._id);
    } else {
      SocketService.disconnect();
    }
  }, [isAuthenticated, user?._id]);

  // ── Register push notifications when user logs in ─────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user?._id) return;
    registerForPushNotifications();
    clearBadge();
    const unsubscribe = setupNotificationListeners(navigationRef.current);
    return unsubscribe;
  }, [isAuthenticated, user?._id]);

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isInitializing ? (
            <Stack.Screen name="Initializing" component={InitializingScreen} />
          ) : isAuthenticated && user && !user.isProfileComplete ? (
            // Google new user — force them to complete their profile before entering the app
            <Stack.Screen name="CompleteProfile">
              {(props) => (
                <CompleteProfileScreen
                  {...props}
                  route={{
                    ...props.route,
                    params: {
                      googleMode:  true,
                      googleToken: null,      // token already saved in authStore
                      googleUser: {
                        name:           user.name,
                        email:          user.email,
                        profilePicture: user.profilePicture,
                        userId:         user._id,
                      },
                    },
                  }}
                />
              )}
            </Stack.Screen>
          ) : isAuthenticated ? (
            // ✅ Wrap authenticated screens with expiry banner shell
            <Stack.Screen name="AuthRoot">
              {() => (
                <AuthenticatedShell navigationRef={navigationRef}>
                  <Stack.Navigator screenOptions={{ headerShown: false }}>
                    <Stack.Screen name={Routes.MAIN} component={MainTabs} />
                    <Stack.Screen name={Routes.CHAT} component={ChatScreen} />
                    <Stack.Screen name={Routes.USER_PROFILE} component={UserProfileScreen} />
                    <Stack.Screen
                      name="MatchScreen"
                      component={MatchScreen}
                      options={{ presentation: 'transparentModal', animation: 'fade', headerShown: false }}
                    />
                    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                    <Stack.Screen name={Routes.PROFILE} component={ProfileScreen} />
                  </Stack.Navigator>
                </AuthenticatedShell>
              )}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen name={Routes.SPLASH} component={SplashScreen} />
              <Stack.Screen name={Routes.WELCOME} component={WelcomeScreen} />
              <Stack.Screen name={Routes.ONBOARDING} component={OnboardingScreen} />
              <Stack.Screen name={Routes.LOGIN} component={LoginScreen} />
              <Stack.Screen name={Routes.REGISTER} component={RegisterScreen} />
              <Stack.Screen name={Routes.OTP} component={OTPScreen} />
              <Stack.Screen name={Routes.FORGOT_PASSWORD} component={ForgotPasswordScreen} />
              <Stack.Screen name={Routes.RESET_PASSWORD} component={ResetPasswordScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  heart: { fontSize: 48, color: Colors.primary },
  tabBar: {
    backgroundColor: Colors.white,
    borderTopColor: '#F3F4F6',
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabLabel: { fontSize: 10, fontWeight: '500' },
});


