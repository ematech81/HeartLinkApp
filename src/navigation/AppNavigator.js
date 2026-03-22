import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import { Routes } from 'src/constants/AppConstants';

// import SplashScreen from 'src/screens/SplashScreen';
import { Routes } from 'src/constants/appConstants';
import SplashScreen from 'screen/generalScreens/SplashScreen';
import OnboardingScreen from 'screen/generalScreens/OnboardingScreen';
import WelcomeScreen from 'screen/generalScreens/WelcomeScreen';
import RegisterScreen from 'screen/auth/RegistrationScreen';
import LoginScreen from 'screen/auth/LoginScreen';
import ForgotPasswordScreen from 'screen/auth/ResetPasswordScreen';
import ResetPasswordScreen from 'screen/auth/ResetPasswordScreen';


const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name={Routes.WELCOME}  component={WelcomeScreen} />
        <Stack.Screen name={Routes.SPLASH}   component={SplashScreen} />
        <Stack.Screen name={Routes.ONBOARDING} component={OnboardingScreen} />
        <Stack.Screen name={Routes.LOGIN} component={LoginScreen} />
        <Stack.Screen name={Routes.REGISTER} component={RegisterScreen} />
        <Stack.Screen name={Routes.FORGOT_PASSWORD} component={ForgotPasswordScreen} />
       <Stack.Screen name={Routes.RESET_PASSWORD}  component={ResetPasswordScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}