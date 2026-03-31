/**
 * HeartLink LoginScreen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import AppStatusBar from 'src/component/common/AppStatusBar';
import Button from 'src/component/common/Button';
import Input from 'src/component/common/Input';
import { Routes } from 'src/constants/appConstants';
import Colors from 'src/constants/Colors';
import { Radius, Shadows, Spacing } from 'src/constants/layout';
import { FontWeight, TextStyles, FontSize } from 'src/constants/topography';
import { useForm } from 'src/hooks/useForm';
import { validateEmail, validatePassword,validatePhone } from 'utils/Validation';
import { useAuth } from 'src/store/authStore';
import { AuthAPI } from 'services/ApiServices';


const METHODS = [
  { id: 'email', label: '✉️  Email' },
  { id: 'phone', label: '📱  Phone' },
];
 
export default function LoginScreen({ navigation }) {
  const { login, isLoading, clearError } = useAuth();
  const [loginMethod, setLoginMethod] = useState('email');
  const [checkingPhone, setCheckingPhone] = useState(false);
 
  const { values, errors, handleChange, handleBlur, validate } = useForm(
    { email: '', password: '', phone: '' },
    {
      email:    validateEmail,
      password: validatePassword,
      phone:    validatePhone,
    }
  );
 
  // ── Email / password login ─────────────────────────────────────────────────
  const handleEmailLogin = async () => {
    // Only validate email + password fields
    const emailErr  = validateEmail(values.email);
    const passErr   = validatePassword(values.password);
    if (emailErr || passErr) {
      if (emailErr) handleBlur('email');
      if (passErr)  handleBlur('password');
      return;
    }
 
    clearError();
    const result = await login({ email: values.email.trim(), password: values.password });
 
    if (!result.success) {
      // Map backend messages to user-friendly text
      let message = result.message;
      if (
        message?.toLowerCase().includes('network') ||
        message?.toLowerCase().includes('timeout') ||
        message?.toLowerCase().includes('econnrefused')
      ) {
        message = 'Unable to connect to the server. Please check your internet connection and try again.';
      } else if (message?.toLowerCase().includes('invalid credentials')) {
        message = 'The email or password you entered is incorrect. Please try again.';
      } else if (message?.toLowerCase().includes('not found') || message?.toLowerCase().includes('no account')) {
        message = 'No account found with this email address. Please register first.';
      } else if (message?.toLowerCase().includes('banned') || message?.toLowerCase().includes('suspended')) {
        message = 'Your account has been suspended. Please contact support.';
      }
      Alert.alert('Login Failed', message);
    }
  };
 
  // ── Phone / OTP login — check registration first ───────────────────────────
  const handlePhoneContinue = async () => {
    const phoneErr = validatePhone(values.phone);
    if (phoneErr) {
      handleBlur('phone');
      return;
    }
 
    setCheckingPhone(true);
    try {
      // Send OTP — backend will return 404 if phone not registered
      await AuthAPI.sendOtp(values.phone.trim());
      // Only navigate if OTP was sent successfully
      navigation.navigate(Routes.OTP, { phone: values.phone.trim() });
    } catch (err) {
      let message = err.message;
      if (
        message?.toLowerCase().includes('not found') ||
        message?.toLowerCase().includes('no account')
      ) {
        message = 'This phone number is not registered. Please sign up first.';
      } else if (
        message?.toLowerCase().includes('network') ||
        message?.toLowerCase().includes('econnrefused')
      ) {
        message = 'Unable to connect to the server. Please check your internet connection.';
      }
      Alert.alert('Error', message);
    } finally {
      setCheckingPhone(false);
    }
  };
 
  const handleMethodSwitch = (id) => {
    setLoginMethod(id);
    clearError();
  };
 
  const isEmailLoading  = isLoading && loginMethod === 'email';
  const isPhoneLoading  = checkingPhone && loginMethod === 'phone';
 
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
 
        {/* Toggle */}
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
 
          {/* Social */}
          <View style={styles.socialRow}>
            {['🇬 Google', '🍎 Apple'].map((label) => (
              <TouchableOpacity key={label} style={styles.socialBtn}>
                <Text style={styles.socialText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: 40 },
 
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  logoBox: {
    width: 72, height: 72, borderRadius: Radius.xl,
    backgroundColor: Colors.backgroundGradientStart,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md, ...Shadows.primary,
  },
  logoHeart: { fontSize: 36, color: Colors.primary },
  title: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: Colors.text, marginBottom: 6 },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary },
 
  toggleRow: {
    flexDirection: 'row', backgroundColor: '#F3F4F6',
    borderRadius: Radius.full, padding: 4, marginBottom: Spacing.lg,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: Radius.full, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: Colors.white, ...Shadows.sm },
  toggleText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  toggleTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
 
  form: { marginBottom: Spacing.lg },
  forgotRow: { alignSelf: 'flex-end', marginBottom: Spacing.lg, marginTop: -8 },
  forgotText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },
  actionBtn: { width: '100%' },
 
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg, gap: Spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: FontSize.xs, color: Colors.textLight },
 
  socialRow: { flexDirection: 'row', gap: Spacing.sm },
  socialBtn: {
    flex: 1, paddingVertical: 13, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    alignItems: 'center', backgroundColor: Colors.white, ...Shadows.sm,
  },
  socialText: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.text },
 
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.md , marginBottom: 50},
  registerText: { fontSize: FontSize.base, color: Colors.textSecondary },
  registerLink: { fontSize: FontSize.base, color: Colors.primary, fontWeight: FontWeight.semibold },
});