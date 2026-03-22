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
import { validateEmail, validatePassword } from 'utils/Validation';
import { useAuth } from 'src/store/authStore';


export default function LoginScreen({ navigation }) {
  const { login, isLoading, clearError } = useAuth();
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' | 'phone'

  const { values, errors, handleChange, handleBlur, validate } = useForm(
    { email: '', password: '' },
    {
      email: validateEmail,
      password: validatePassword,
    }
  );

  const handleLogin = async () => {
    if (!validate()) return;
    clearError();
    const result = await login({ email: values.email, password: values.password });
    if (!result.success) {
      Alert.alert('Login Failed', result.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppStatusBar theme= 'dark' />
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

        {/* Toggle: Email / Phone */}
        <View style={styles.toggleRow}>
          {['email', 'phone'].map((method) => (
            <TouchableOpacity
              key={method}
              style={[styles.toggleBtn, loginMethod === method && styles.toggleBtnActive]}
              onPress={() => setLoginMethod(method)}
            >
              <Text style={[styles.toggleText, loginMethod === method && styles.toggleTextActive]}>
                {method === 'email' ? '✉️  Email' : '📱  Phone'}
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
            </>
          ) : (
            <Input
              label="Phone Number"
              placeholder="+234 800 000 0000"
              value={values.email}
              onChangeText={(v) => handleChange('email', v)}
              keyboardType="phone-pad"
            />
          )}

          {/* Forgot password */}
          <TouchableOpacity
            style={styles.forgotRow}
            onPress={() => navigation.navigate(Routes.FORGOT_PASSWORD)}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Sign In button */}
          <Button
            title={loginMethod === 'phone' ? 'Send OTP' : 'Sign In'}
            onPress={loginMethod === 'phone'
              ? () => navigation.navigate(Routes.OTP, { phone: values.email })
              : handleLogin}
            loading={isLoading}
            size="lg"
            style={styles.loginBtn}
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social buttons */}
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: 40,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    backgroundColor: Colors.backgroundGradientStart,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.primary,
  },
  logoHeart: {
    fontSize: 36,
    color: Colors.primary,
  },
  title: {
    ...TextStyles.h2,
    color: Colors.text,
    marginBottom: 6,
  },
  subtitle: {
    ...TextStyles.body,
    color: Colors.textSecondary,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: Radius.full,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.full,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  toggleText: {
    ...TextStyles.label,
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: Colors.primary,
  },

  // Form
  form: {
    marginBottom: Spacing.lg,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
    marginTop: -8,
  },
  forgotText: {
    ...TextStyles.bodySmall,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  loginBtn: {
    width: '100%',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    ...TextStyles.caption,
    color: Colors.textLight,
  },

  // Social
  socialRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  socialBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  socialText: {
    ...TextStyles.bodyMedium,
    color: Colors.text,
  },

  // Register
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  registerText: {
    ...TextStyles.body,
    color: Colors.textSecondary,
  },
  registerLink: {
    ...TextStyles.bodyMedium,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
});