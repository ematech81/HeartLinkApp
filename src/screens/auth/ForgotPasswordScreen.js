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
import { FontSize, FontWeight } from 'src/constants/topography';
import { AuthAPI } from 'services/ApiServices';
import AppStatusBar from 'src/component/common/AppStatusBar';
import BackButton from 'src/component/common/BackButton';
import Input from 'src/component/common/Input';
import Button from 'src/component/common/Button';
import { validateEmail } from 'utils/Validation';
import { Routes } from 'src/constants/appConstants';
import { Radius, Shadows, Spacing } from 'src/constants/layout';

// Email/password is the only account type now (phone login removed
// 2026-09-03) — this screen no longer needs an email/phone method toggle.
export default function ForgotPasswordScreen({ navigation }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const err = validateEmail(value);
    setError(err || '');
    return !err;
  };

  const handleSend = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await AuthAPI.forgotPassword(value.trim());
      // Navigate to reset screen — user will enter the 6-character code from their email
      navigation.navigate(Routes.RESET_PASSWORD);
    } catch (err) {
      Alert.alert('Error', err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
            No worries! Enter your email address and
            we'll send you a verification code to reset your password.
          </Text>
        </View>

        {/* Input */}
        <Input
          label="Email Address"
          placeholder="you@example.com"
          value={value}
          onChangeText={(v) => { setValue(v); setError(''); }}
          onBlur={validate}
          error={error}
          keyboardType="email-address"
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
            Check your spam folder if you do not see the email within a few minutes.
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
