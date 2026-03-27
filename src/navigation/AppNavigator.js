
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Routes } from 'src/constants/appConstants';
import Colors from 'src/constants/Colors';


import SplashScreen from 'screen/generalScreens/SplashScreen';
import OnboardingScreen from 'screen/generalScreens/OnboardingScreen';
import WelcomeScreen from 'screen/generalScreens/WelcomeScreen';
import RegisterScreen from 'screen/auth/RegistrationScreen';
import LoginScreen from 'screen/auth/LoginScreen';
import ForgotPasswordScreen from 'screen/auth/ResetPasswordScreen';
import ResetPasswordScreen from 'screen/auth/ResetPasswordScreen';

// Main screens (stubs for now)
import HomeScreen     from 'src/screens/main/HomeScreen';
import DiscoverScreen from 'src/screens/main/DiscoverScreen';
import MatchesScreen  from 'src/screens/main/MatchesScreen';
import MessagesScreen from 'src/screens/main/MessagesScreen';
import ProfileScreen  from 'src/screens/main/ProfileScreen';
import { useAuth } from 'src/store/authStore';
import OTPScreen from 'src/screens/auth/OtpScreen';
import ChatScreen from 'screen/main/ChatScreen';
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
    { name: Routes.HOME,     component: HomeScreen,     label: 'Home',     icon: '🏠' },
    // { name: Routes.DISCOVER, component: DiscoverScreen, label: 'Discover', icon: '🔍' },
    { name: Routes.MATCHES,  component: MatchesScreen,  label: 'Matches',  icon: '💕' },
    { name: Routes.MESSAGES, component: MessagesScreen, label: 'Messages', icon: '💬' },
    { name: Routes.PROFILE,  component: ProfileScreen,  label: 'Profile',  icon: '👤' },
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

// ── Root navigator ────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { isAuthenticated, isInitializing } = useAuth();

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isInitializing ? (
            <Stack.Screen name="Initializing" component={InitializingScreen} />
          ) : isAuthenticated ? (
            // ✅ Wrap authenticated screens in a Fragment
            <>
              <Stack.Screen name={Routes.MAIN} component={MainTabs} />
              <Stack.Screen name={Routes.CHAT} component={ChatScreen} />
              {/* Add other authenticated-only screens here */}
            </>
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


