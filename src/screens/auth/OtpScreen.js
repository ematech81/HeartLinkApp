import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Colors from 'src/constants/Colors';
import { useAuth } from 'src/store/authStore';
import { Radius, Shadows, Spacing } from 'src/constants/layout';
import { FontSize, FontWeight } from 'src/constants/topography';
import { Routes, Validation } from 'src/constants/appConstants';
import { AuthAPI } from 'services/ApiServices';
import AppStatusBar from 'src/component/common/AppStatusBar';
import BackButton from 'src/component/common/BackButton';
import Button from 'src/component/common/Button';

const OTP_LENGTH = Validation.otpLength; // 6
const RESEND_COUNTDOWN = 60;

export default function OTPScreen({ navigation, route }) {
  const phone = route?.params?.phone ?? '';
  const isVerifyingRegistration = route?.params?.isRegistration ?? false;
  

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_COUNTDOWN);
  const [canResend, setCanResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const { loginWithToken } = useAuth();

  const inputs = useRef([]);
  const { login } = useAuth();

  // ── Countdown timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (resendTimer <= 0) {
      setCanResend(true);
      return;
    }
    const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // ── Auto-focus first box ─────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => inputs.current[0]?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  // ── OTP input handlers ───────────────────────────────────────────────────────
  const handleChange = (text, index) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Move to next box
    if (digit && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }

    // Auto-submit when last box filled
    if (digit && index === OTP_LENGTH - 1) {
      const fullCode = [...newOtp.slice(0, OTP_LENGTH - 1), digit].join('');
      if (fullCode.length === OTP_LENGTH) {
        verifyOtp(fullCode);
      }
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      inputs.current[index - 1]?.focus();
    }
  };

  // ── Verify OTP ───────────────────────────────────────────────────────────────
  // At the top — add loginWithToken to useAuth

  
  // Replace the verifyOtp function with this:
  const verifyOtp = async (code) => {
    const otpCode = code ?? otp.join('');
    if (otpCode.length < OTP_LENGTH) {
      Alert.alert('Incomplete', 'Please enter the full 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const data = await AuthAPI.verifyOtp(phone, otpCode);
  
      if (route?.params?.isForgotPassword) {
        // Go to reset password screen
        navigation.navigate(Routes.RESET_PASSWORD, {
          token: data.resetToken,
          email: route.params.email,
        });
      } else {
        // Log user in — backend returns { success, token, user }
        await loginWithToken(data.token, data.user);
      }
    } catch (err) {
      Alert.alert('Invalid Code', err.message || 'Please try again.');
      setOtp(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ───────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (!canResend || resendLoading) return;
    setResendLoading(true);
    try {
      await AuthAPI.sendOtp(phone);
      setOtp(Array(OTP_LENGTH).fill(''));
      setResendTimer(RESEND_COUNTDOWN);
      setCanResend(false);
      inputs.current[0]?.focus();
      Alert.alert('Code Sent', `A new code has been sent to ${phone}`);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const filledCount = otp.filter(Boolean).length;
  const isComplete = filledCount === OTP_LENGTH;

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
        {/* Back button */}
        <BackButton style={styles.backBtn} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Text style={styles.iconEmoji}>🔐</Text>
          </View>

          <Text style={styles.title}>Verify Your Phone</Text>
          <Text style={styles.subtitle}>
            We sent a {OTP_LENGTH}-digit verification code to
          </Text>
          <Text style={styles.phone}>{phone || 'your phone number'}</Text>
        </View>

        {/* OTP boxes */}
        <View style={styles.otpRow}>
          {otp.map((digit, i) => {
            const isFocusTarget = i === filledCount && !isComplete;
            const isFilled = Boolean(digit);

            return (
              <TextInput
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                style={[
                  styles.otpBox,
                  isFilled && styles.otpBoxFilled,
                  isFocusTarget && styles.otpBoxActive,
                ]}
                value={digit}
                onChangeText={(t) => handleChange(t, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                keyboardType="numeric"
                maxLength={1}
                selectTextOnFocus
                caretHidden
                textContentType="oneTimeCode" // iOS autofill
              />
            );
          })}
        </View>

        {/* Progress hint */}
        <Text style={styles.progressHint}>
          {isComplete
            ? '✓  Code complete — verifying...'
            : `${filledCount} of ${OTP_LENGTH} digits entered`}
        </Text>

        {/* Verify button */}
        <Button
          title="Verify Code"
          onPress={() => verifyOtp()}
          loading={loading}
          disabled={!isComplete}
          size="lg"
          style={styles.verifyBtn}
        />

        {/* Resend row */}
        <View style={styles.resendRow}>
          <Text style={styles.resendText}>Didn't receive a code?  </Text>
          <TouchableOpacity
            onPress={handleResend}
            disabled={!canResend || resendLoading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.resendLink, !canResend && styles.resendDisabled]}>
              {resendLoading
                ? 'Sending...'
                : canResend
                ? 'Resend Code'
                : `Resend in ${resendTimer}s`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Wrong number */}
        <TouchableOpacity
          style={styles.wrongNumberBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.wrongNumberText}>
            Wrong number? <Text style={styles.wrongNumberLink}>Change it</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const BOX_SIZE = 52;

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
    lineHeight: 22,
  },
  phone: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    marginTop: 2,
  },

  // ── OTP Input ────────────────────────────────────────────────────────────────
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  otpBox: {
    width: BOX_SIZE,
    height: BOX_SIZE + 10,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  otpBoxActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  otpBoxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.backgroundGradientStart,
  },

  // ── Progress hint ────────────────────────────────────────────────────────────
  progressHint: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },

  // ── Buttons ──────────────────────────────────────────────────────────────────
  verifyBtn: {
    width: '100%',
    marginBottom: Spacing.lg,
  },

  // ── Resend ───────────────────────────────────────────────────────────────────
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  resendText: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  resendLink: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  resendDisabled: {
    color: Colors.textLight,
    fontWeight: FontWeight.regular,
  },

  // ── Wrong number ─────────────────────────────────────────────────────────────
  wrongNumberBtn: {
    alignSelf: 'center',
    paddingVertical: Spacing.sm,
  },
  wrongNumberText: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  wrongNumberLink: {
    color: Colors.primary,
    fontWeight: FontWeight.medium,
    textDecorationLine: 'underline',
  },
});