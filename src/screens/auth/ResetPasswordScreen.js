import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Colors from 'src/constants/Colors';
import { Spacing, Radius, Shadows }  from 'src/constants/layout';
import { Routes }  from 'src/constants/appConstants';
import { validatePassword, validateConfirmPassword }  from 'utils/Validation';
import { useForm } from 'src/hooks/useForm';
import Button from 'src/component/common/Button';
import {FontSize, FontWeight  } from 'src/constants/topography';
import { AuthAPI } from 'services/ApiServices';
import AppStatusBar from 'src/component/common/AppStatusBar';
import BackButton from 'src/component/common/BackButton';
import Input from 'src/component/common/Input';

// ── Password strength meter ───────────────────────────────────────────────────
function StrengthMeter({ password }) {
  const getStrength = () => {
    if (!password) return { score: 0, label: '', color: '#E5E7EB' };
    let score = 0;
    if (password.length >= 8)               score++;
    if (/[A-Z]/.test(password))             score++;
    if (/[0-9]/.test(password))             score++;
    if (/[^A-Za-z0-9]/.test(password))      score++;

    const levels = [
      { score: 1, label: 'Weak',      color: '#EF4444' },
      { score: 2, label: 'Fair',      color: '#F59E0B' },
      { score: 3, label: 'Good',      color: '#3B82F6' },
      { score: 4, label: 'Strong',    color: Colors.success },
    ];
    return levels[score - 1] || { score: 0, label: '', color: '#E5E7EB' };
  };

  const strength = getStrength();

  return (
    <View style={meterStyles.container}>
      <View style={meterStyles.barsRow}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              meterStyles.bar,
              { backgroundColor: i <= strength.score ? strength.color : '#E5E7EB' },
            ]}
          />
        ))}
      </View>
      {strength.label ? (
        <Text style={[meterStyles.label, { color: strength.color }]}>
          {strength.label}
        </Text>
      ) : null}
    </View>
  );
}

const meterStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  barsRow: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    width: 44,
    textAlign: 'right',
  },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ResetPasswordScreen({ navigation, route }) {
  const resetToken = route?.params?.token ?? '';
  const email      = route?.params?.email ?? '';
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);

  const { values, errors, handleChange, handleBlur, validate } = useForm(
    { password: '', confirmPassword: '' },
    {
      password: validatePassword,
      confirmPassword: (v) => validateConfirmPassword(values.password, v),
    }
  );

  const handleReset = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await AuthAPI.resetPassword(resetToken, values.password);
      setSuccess(true);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <View style={styles.successContainer}>
        <AppStatusBar theme="dark" />
        <View style={styles.successContent}>
          <View style={styles.successIconBox}>
            <Text style={styles.successEmoji}>🎉</Text>
          </View>
          <Text style={styles.successTitle}>Password Reset!</Text>
          <Text style={styles.successSubtitle}>
            Your password has been reset successfully. You can now sign in with your new password.
          </Text>
          <Button
            title="Back to Sign In"
            onPress={() => navigation.navigate(Routes.LOGIN)}
            size="lg"
            style={styles.successBtn}
          />
        </View>
      </View>
    );
  }

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
            <Text style={styles.iconEmoji}>🔒</Text>
          </View>
          <Text style={styles.title}>Create New Password</Text>
          <Text style={styles.subtitle}>
            Your new password must be different from your previous password.
          </Text>
        </View>

        {/* Password rules */}
        <View style={styles.rulesBox}>
          <Text style={styles.rulesTitle}>Password must contain:</Text>
          {[
            'At least 8 characters',
            'One uppercase letter (A-Z)',
            'One number (0-9)',
            'One special character (!@#$...)',
          ].map((rule, i) => {
            const checks = [
              values.password.length >= 8,
              /[A-Z]/.test(values.password),
              /[0-9]/.test(values.password),
              /[^A-Za-z0-9]/.test(values.password),
            ];
            const passed = checks[i];
            return (
              <View key={i} style={styles.ruleRow}>
                <Text style={[styles.ruleIcon, passed && styles.ruleIconPassed]}>
                  {passed ? '✓' : '○'}
                </Text>
                <Text style={[styles.ruleText, passed && styles.ruleTextPassed]}>
                  {rule}
                </Text>
              </View>
            );
          })}
        </View>

        {/* New password */}
        <Input
          label="New Password"
          placeholder="Enter new password"
          value={values.password}
          onChangeText={(v) => handleChange('password', v)}
          onBlur={() => handleBlur('password')}
          error={errors.password}
          secureTextEntry
        />
        <StrengthMeter password={values.password} />

        {/* Confirm password */}
        <Input
          label="Confirm New Password"
          placeholder="Re-enter new password"
          value={values.confirmPassword}
          onChangeText={(v) => handleChange('confirmPassword', v)}
          onBlur={() => handleBlur('confirmPassword')}
          error={errors.confirmPassword}
          secureTextEntry
        />

        {/* Reset button */}
        <Button
          title="Reset Password"
          onPress={handleReset}
          loading={loading}
          disabled={!values.password || !values.confirmPassword}
          size="lg"
          style={styles.resetBtn}
        />
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

  // ── Rules box ────────────────────────────────────────────────────────────────
  rulesBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  rulesTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ruleIcon: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    width: 16,
  },
  ruleIconPassed: {
    color: Colors.success,
  },
  ruleText: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  ruleTextPassed: {
    color: Colors.success,
    fontWeight: FontWeight.medium,
  },

  // ── Button ───────────────────────────────────────────────────────────────────
  resetBtn: {
    width: '100%',
    marginTop: Spacing.sm,
  },

  // ── Success state ─────────────────────────────────────────────────────────────
  successContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
  },
  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing['2xl'],
  },
  successIconBox: {
    width: 110,
    height: 110,
    borderRadius: Radius.xl,
    backgroundColor: Colors.backgroundGradientStart,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  successEmoji: {
    fontSize: 56,
  },
  successTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.extrabold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    letterSpacing: -0.3,
  },
  successSubtitle: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  successBtn: {
    width: '100%',
  },
});