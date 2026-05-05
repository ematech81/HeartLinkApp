/**
 * HeartLink LoginScreen
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AppStatusBar from 'src/component/common/AppStatusBar';
import Button from 'src/component/common/Button';
import Input from 'src/component/common/Input';
import { Routes } from 'src/constants/appConstants';
import Colors from 'src/constants/Colors';
import { Radius, Shadows, Spacing } from 'src/constants/layout';
import { FontWeight, FontSize } from 'src/constants/topography';
import { useForm } from 'src/hooks/useForm';
import { validateEmail, validatePassword, validatePhone } from 'utils/Validation';
import { useAuth } from 'src/store/authStore';
import { AuthAPI } from 'services/ApiServices';

// Required to close the browser popup on redirect
WebBrowser.maybeCompleteAuthSession();

// Google OAuth client IDs
const GOOGLE_WEB_CLIENT_ID     = '529395727102-orvff4q7raal1p72nrgt1vcjvagvumas.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = '114769987830-rss1hfqerm67rdk4q6gl74shoos1mes3.apps.googleusercontent.com';

// Redirect URI — native Android client handles its own redirect, web client uses Expo proxy
const REDIRECT_URI = GOOGLE_ANDROID_CLIENT_ID
  ? AuthSession.makeRedirectUri({ scheme: 'heartlink', path: 'oauth2redirect' })
  : 'https://auth.expo.io/@ematech81/heartlink-app';

console.log('🔑 [Google OAuth] Redirect URI:', REDIRECT_URI);
console.log('🔑 [Google OAuth] Using Android client:', !!GOOGLE_ANDROID_CLIENT_ID);

const METHODS = [
  { id: 'email', label: '✉️  Email' },
  { id: 'phone', label: '📱  Phone' },
];

export default function LoginScreen({ navigation }) {
  const { login, googleLogin, isLoading, clearError } = useAuth();
  const [loginMethod,   setLoginMethod]   = useState('email');
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { values, errors, handleChange, handleBlur } = useForm(
    { email: '', password: '', phone: '' },
    { email: validateEmail, password: validatePassword, phone: validatePhone }
  );

  // ── expo-auth-session Google request ──────────────────────────────────────
  // responseType: 'token' forces implicit grant → access_token returned directly
  // (default in v7 may be 'code' which requires server-side exchange we don't have)
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId:        GOOGLE_WEB_CLIENT_ID,
    ...(GOOGLE_ANDROID_CLIENT_ID && { androidClientId: GOOGLE_ANDROID_CLIENT_ID }),
    redirectUri:     REDIRECT_URI,
    responseType:    'token',
    scopes:          ['openid', 'profile', 'email'],
  });

  // Handle the OAuth response once it arrives
  useEffect(() => {
    if (!response) return;

    console.log('🔑 [Google OAuth] Response type:', response.type);
    console.log('🔑 [Google OAuth] Response:', JSON.stringify(response, null, 2));

    if (response.type === 'error') {
      setGoogleLoading(false);
      Alert.alert('Google Sign-In Failed', response.error?.message || 'Authentication error.');
      return;
    }

    if (response.type === 'dismiss' || response.type === 'cancel') {
      setGoogleLoading(false);
      return;
    }

    if (response.type !== 'success') {
      setGoogleLoading(false);
      return;
    }

    // accessToken can live in different places depending on expo-auth-session version
    const accessToken =
      response.authentication?.accessToken ||
      response.params?.access_token;

    console.log('🔑 [Google OAuth] Access token:', accessToken ? '✅ received' : '❌ missing');

    if (!accessToken) {
      setGoogleLoading(false);
      Alert.alert(
        'Google Sign-In Failed',
        'No access token received from Google. Please try again.',
      );
      return;
    }

    handleGoogleToken(accessToken);
  }, [response]);

  const handleGoogleToken = async (accessToken) => {
    try {
      const result = await googleLogin(accessToken);

      if (!result.success) {
        Alert.alert('Sign-In Failed', result.message || 'Google authentication failed.');
        return;
      }

      if (result.isNewUser) {
        navigation.navigate(Routes.REGISTER, {
          googleMode:  true,
          googleToken: result.token,
          googleUser: {
            name:           result.user.name,
            email:          result.user.email,
            profilePicture: result.user.profilePicture,
            userId:         result.user._id,
          },
        });
      }
      // Existing user → AUTH_SUCCESS already dispatched → navigator auto-redirects
    } catch (err) {
      Alert.alert('Sign-In Failed', err.message || 'An unexpected error occurred.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await promptAsync();
      // Response is handled in the useEffect above
    } catch (err) {
      setGoogleLoading(false);
      Alert.alert('Google Sign-In Failed', err.message || 'Could not open Google sign-in.');
    }
  };

  // ── Email / password login ─────────────────────────────────────────────────
  const handleEmailLogin = async () => {
    const emailErr = validateEmail(values.email);
    const passErr  = validatePassword(values.password);
    if (emailErr || passErr) {
      if (emailErr) handleBlur('email');
      if (passErr)  handleBlur('password');
      return;
    }
    clearError();
    const result = await login({ email: values.email.trim(), password: values.password });
    if (!result.success) {
      let msg = result.message;
      if (msg?.toLowerCase().includes('network') || msg?.toLowerCase().includes('econnrefused')) {
        msg = 'Unable to connect to the server. Please check your internet connection.';
      } else if (msg?.toLowerCase().includes('invalid credentials')) {
        msg = 'The email or password you entered is incorrect.';
      } else if (msg?.toLowerCase().includes('not found') || msg?.toLowerCase().includes('no account')) {
        msg = 'No account found with this email address. Please register first.';
      } else if (msg?.toLowerCase().includes('banned') || msg?.toLowerCase().includes('suspended')) {
        msg = 'Your account has been suspended. Please contact support.';
      }
      Alert.alert('Login Failed', msg);
    }
  };

  // ── Phone / OTP login ──────────────────────────────────────────────────────
  const handlePhoneContinue = async () => {
    const phoneErr = validatePhone(values.phone);
    if (phoneErr) { handleBlur('phone'); return; }
    setCheckingPhone(true);
    try {
      await AuthAPI.sendOtp(values.phone.trim());
      navigation.navigate(Routes.OTP, { phone: values.phone.trim() });
    } catch (err) {
      let msg = err.message;
      if (msg?.toLowerCase().includes('not found') || msg?.toLowerCase().includes('no account')) {
        msg = 'This phone number is not registered. Please sign up first.';
      } else if (msg?.toLowerCase().includes('network') || msg?.toLowerCase().includes('econnrefused')) {
        msg = 'Unable to connect to the server. Please check your internet connection.';
      }
      Alert.alert('Error', msg);
    } finally {
      setCheckingPhone(false);
    }
  };

  const handleMethodSwitch = (id) => { setLoginMethod(id); clearError(); };
  const isEmailLoading = isLoading && loginMethod === 'email';
  const isPhoneLoading = checkingPhone;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppStatusBar theme="dark" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoHeart}>♥</Text>
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue finding love</Text>
        </View>

        {/* Method toggle */}
        <View style={styles.toggleRow}>
          {METHODS.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.toggleBtn, loginMethod === m.id && styles.toggleBtnActive]}
              onPress={() => handleMethodSwitch(m.id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.toggleText, loginMethod === m.id && styles.toggleTextActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form */}
        <View style={styles.form}>
          {loginMethod === 'email' ? (
            <>
              <Input
                label="Email Address"
                placeholder="you@example.com"
                value={values.email}
                onChangeText={(v) => handleChange('email', v)}
                onBlur={() => handleBlur('email')}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Input
                label="Password"
                placeholder="Enter your password"
                value={values.password}
                onChangeText={(v) => handleChange('password', v)}
                onBlur={() => handleBlur('password')}
                error={errors.password}
                secureTextEntry
              />
              <TouchableOpacity
                style={styles.forgotRow}
                onPress={() => navigation.navigate(Routes.FORGOT_PASSWORD)}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
              <Button
                title="Sign In"
                onPress={handleEmailLogin}
                loading={isEmailLoading}
                size="lg"
                style={styles.actionBtn}
              />
            </>
          ) : (
            <>
              <Input
                label="Phone Number"
                placeholder="+234 800 000 0000"
                value={values.phone}
                onChangeText={(v) => handleChange('phone', v)}
                onBlur={() => handleBlur('phone')}
                error={errors.phone}
                keyboardType="phone-pad"
              />
              <Button
                title="Send OTP"
                onPress={handlePhoneContinue}
                loading={isPhoneLoading}
                size="lg"
                style={styles.actionBtn}
              />
            </>
          )}

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign-In */}
          <TouchableOpacity
            style={[styles.googleBtn, (googleLoading || !request) && styles.googleBtnDisabled]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading || !request}
            activeOpacity={0.8}
          >
            {googleLoading ? (
              <ActivityIndicator color="#444" size="small" />
            ) : (
              <>
                {/* Google "G" logo using coloured letters */}
                <View style={styles.googleLogoBox}>
                  <Text style={styles.googleLogoText}>G</Text>
                </View>
                <Text style={styles.googleText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Register link */}
        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate(Routes.REGISTER)}>
            <Text style={styles.registerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll:    { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: 40 },

  header:    { alignItems: 'center', marginBottom: Spacing.xl },
  logoBox: {
    width: 72, height: 72, borderRadius: Radius.xl,
    backgroundColor: Colors.backgroundGradientStart,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md, ...Shadows.primary,
  },
  logoHeart: { fontSize: 36, color: Colors.primary },
  title:     { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: Colors.text, marginBottom: 6 },
  subtitle:  { fontSize: FontSize.base, color: Colors.textSecondary },

  toggleRow: {
    flexDirection: 'row', backgroundColor: '#F3F4F6',
    borderRadius: Radius.full, padding: 4, marginBottom: Spacing.lg,
  },
  toggleBtn:        { flex: 1, paddingVertical: 10, borderRadius: Radius.full, alignItems: 'center' },
  toggleBtnActive:  { backgroundColor: Colors.white, ...Shadows.sm },
  toggleText:       { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  toggleTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },

  form:       { marginBottom: Spacing.lg },
  forgotRow:  { alignSelf: 'flex-end', marginBottom: Spacing.lg, marginTop: -8 },
  forgotText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },
  actionBtn:  { width: '100%' },

  divider:     { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg, gap: Spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: FontSize.xs, color: Colors.textLight },

  // Google button
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, paddingVertical: 14, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    backgroundColor: Colors.white, ...Shadows.sm,
    minHeight: 52,
  },
  googleBtnDisabled: { opacity: 0.55 },
  googleLogoBox: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#4285F4',
  },
  googleLogoText: { fontSize: 15, fontWeight: '800', color: '#4285F4' },
  googleText:     { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.text },

  registerRow:  { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.md, marginBottom: 50 },
  registerText: { fontSize: FontSize.base, color: Colors.textSecondary },
  registerLink: { fontSize: FontSize.base, color: Colors.primary, fontWeight: FontWeight.semibold },
});
