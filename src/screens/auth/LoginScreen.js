/**
 * HeartLink LoginScreen
 * Email/password only (2026-09-03) — phone login and Google Sign-In were
 * both removed: BulkSMS was only delivering OTPs after 10am daily (making
 * phone login unreliable), and Google Sign-In wasn't working. See
 * RegistrationScreen.js for the matching change on the sign-up side.
 */

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import AppStatusBar from 'src/component/common/AppStatusBar';
import Button from 'src/component/common/Button';
import Input from 'src/component/common/Input';
import { Routes } from 'src/constants/appConstants';
import Colors from 'src/constants/Colors';
import { Radius, Shadows, Spacing } from 'src/constants/layout';
import { FontWeight, FontSize } from 'src/constants/topography';
import { useForm } from 'src/hooks/useForm';
import { validateEmail, validatePassword } from 'utils/Validation';
import { useAuth } from 'src/store/authStore';

export default function LoginScreen({ navigation }) {
  const { login, isLoading, clearError } = useAuth();

  const { values, errors, handleChange, handleBlur } = useForm(
    { email: '', password: '' },
    { email: validateEmail, password: validatePassword }
  );

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
      // Unverified email/password account — send them to finish verifying
      // rather than just showing an error with no way forward.
      if (result.requiresEmailVerification) {
        navigation.navigate(Routes.VERIFY_EMAIL, { email: result.email || values.email.trim() });
        return;
      }

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

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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

        {/* Form */}
        <View style={styles.form}>
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
            loading={isLoading}
            size="lg"
            style={styles.actionBtn}
          />
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

  form:       { marginBottom: Spacing.lg },
  forgotRow:  { alignSelf: 'flex-end', marginBottom: Spacing.lg, marginTop: -8 },
  forgotText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },
  actionBtn:  { width: '100%' },

  registerRow:  { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.md, marginBottom: 50 },
  registerText: { fontSize: FontSize.base, color: Colors.textSecondary },
  registerLink: { fontSize: FontSize.base, color: Colors.primary, fontWeight: FontWeight.semibold },
});
