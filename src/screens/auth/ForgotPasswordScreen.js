import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Colors from 'src/constants/Colors';
import { FontSize, FontWeight, TextStyles } from 'src/constants/Typography';
import { AuthAPI } from 'src/services/ApiService';
import AppStatusBar from 'src/components/common/AppStatusBar';
import BackButton from 'src/components/common/BackButton';
import Input from 'src/components/common/Input';
import Button from 'src/components/common/Button';
import { validateEmail, validatePhone } from 'utils/Validation';
import { Routes } from 'src/constants/appConstants';
import { Radius, Shadows, Spacing } from 'src/constants/layout';

const METHODS = [
  { id: 'email', label: '✉️  Email', placeholder: 'you@example.com', keyboardType: 'email-address' },
  { id: 'phone', label: '📱  Phone', placeholder: '+234 800 000 0000', keyboardType: 'phone-pad' },
];

export default function ForgotPasswordScreen({ navigation }) {
  const [method, setMethod] = useState('email');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const activeMethod = METHODS.find((m) => m.id === method);

  const validate = () => {
    const err = method === 'email' ? validateEmail(value) : validatePhone(value);
    setError(err || '');
    return !err;
  };

  const handleSend = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      if (method === 'email') {
        await AuthAPI.forgotPassword(value.trim());
      } else {
        await AuthAPI.sendOtp(value.trim());
      }
      // Navigate to OTP screen, passing context so it knows to go to ResetPassword after
      navigation.navigate(Routes.OTP, {
        phone: method === 'phone' ? value.trim() : undefined,
        email: method === 'email' ? value.trim() : undefined,
        isForgotPassword: true,
      });
    } catch (err) {
      Alert.alert('Error', err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMethodSwitch = (id) => {
    setMethod(id);
    setValue('');
    setError('');
  };

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
        <BackButton style={styles.backBtn} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Text style={styles.iconEmoji}>🔑</Text>
          </View>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            No worries! Enter your {method === 'email' ? 'email address' : 'phone number'} and
            we'll send you a verification code to reset your password.
          </Text>
        </View>

        {/* Method toggle */}
        <View style={styles.toggleRow}>
          {METHODS.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.toggleBtn, method === m.id && styles.toggleBtnActive]}
              onPress={() => handleMethodSwitch(m.id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.toggleText, method === m.id && styles.toggleTextActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Input */}
        <Input
          label={method === 'email' ? 'Email Address' : 'Phone Number'}
          placeholder={activeMethod.placeholder}
          value={value}
          onChangeText={(v) => { setValue(v); setError(''); }}
          onBlur={validate}
          error={error}
          keyboardType={activeMethod.keyboardType}
          autoCapitalize="none"
          autoFocus
        />

        {/* Send button */}
        <Button
          title="Send Verification Code"
          onPress={handleSend}
          loading={loading}
          disabled={!value.trim()}
          size="lg"
          style={styles.sendBtn}
        />

        {/* Info note */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            {method === 'email'
              ? 'Check your spam folder if you do not see the email within a few minutes.'
              : 'Standard SMS rates may apply depending on your carrier.'}
          </Text>
        </View>

        {/* Back to login */}
        <TouchableOpacity
          style={styles.loginRow}
          onPress={() => navigation.navigate(Routes.LOGIN)}
        >
          <Text style={styles.loginText}>
            Remember your password?{'  '}
            <Text style={styles.loginLink}>Sign In</Text>
          </Text>
        </TouchableOpacity>
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
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  backBtn: {
    marginBottom: Spacing.xl,
  },

  // ── Header ───────────────────────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconBox: {
    width: 88,
    height: 88,
    borderRadius: Radius.xl,
    backgroundColor: Colors.backgroundGradientStart,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  iconEmoji: {
    fontSize: 44,
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.extrabold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.sm,
  },

  // ── Toggle ───────────────────────────────────────────────────────────────────
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
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },

  // ── Button ───────────────────────────────────────────────────────────────────
  sendBtn: {
    width: '100%',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },

  // ── Info box ─────────────────────────────────────────────────────────────────
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  infoIcon: {
    fontSize: FontSize.base,
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: '#0369A1',
    lineHeight: 20,
  },

  // ── Login link ───────────────────────────────────────────────────────────────
  loginRow: {
    alignSelf: 'center',
    paddingVertical: Spacing.sm,
  },
  loginText: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  loginLink: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
});