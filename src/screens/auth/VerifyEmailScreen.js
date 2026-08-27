/**
 * HeartLink VerifyEmailScreen
 * Shown right after registration for email/password accounts — the account
 * isn't usable (no login) until this code is confirmed. Mirrors OtpScreen.js
 * (same alphanumeric-code-box pattern) but talks to the email-specific
 * endpoints and carries `email` instead of `phone`.
 */
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
  ActivityIndicator,
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

export default function VerifyEmailScreen({ navigation, route }) {
  const email = route?.params?.email ?? '';

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_COUNTDOWN);
  const [canResend, setCanResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [initialSending, setInitialSending] = useState(true);
  const { loginWithToken } = useAuth();

  const inputs = useRef([]);

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

  // ── Auto-send a fresh code on mount ─────────────────────────────────────────
  // Whoever navigated here may or may not have just triggered a send —
  // registration does (register() sends one server-side; RegistrationScreen
  // passes codeAlreadySent:true so this doesn't redundantly send a SECOND
  // code that would immediately invalidate the first one the user already
  // has open in their inbox). A blocked login redirect never sends one
  // (login() only checks status), so this fires for that case — and for
  // anyone who reopens the app mid-flow with an already-expired code.
  useEffect(() => {
    if (!email) return;
    if (route?.params?.codeAlreadySent) {
      setInitialSending(false);
      return;
    }
    (async () => {
      await sendCode({ isInitial: true });
      setInitialSending(false);
    })();
  }, []);

  // ── OTP input handlers — alphanumeric (e.g. "OT34K6"), not digit-only ────────
  const handleChange = (text, index) => {
    const char = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(-1);
    const newOtp = [...otp];
    newOtp[index] = char;
    setOtp(newOtp);

    if (char && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }

    if (char && index === OTP_LENGTH - 1) {
      const fullCode = [...newOtp.slice(0, OTP_LENGTH - 1), char].join('');
      if (fullCode.length === OTP_LENGTH) {
        verifyCode(fullCode);
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

  // ── Verify code ───────────────────────────────────────────────────────────────
  const verifyCode = async (code) => {
    const otpCode = code ?? otp.join('');
    if (otpCode.length < OTP_LENGTH) {
      Alert.alert('Incomplete', 'Please enter the full 6-character code.');
      return;
    }
    setLoading(true);
    try {
      const data = await AuthAPI.verifyEmailOtp(email, otpCode);
      // Backend returns { success, token, user } — same shape as register/login
      await loginWithToken(data.token, data.user);
    } catch (err) {
      Alert.alert('Invalid Code', err.message || 'Please try again.');
      setOtp(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // ── Send/resend the verification code ────────────────────────────────────────
  // Shared by the initial auto-send-on-mount effect above and the "Resend
  // Code" button below — `isInitial` just suppresses the "Code Sent" alert
  // for the auto-send (silent success, only surfaced if it fails).
  const sendCode = async ({ isInitial = false } = {}) => {
    try {
      await AuthAPI.resendEmailOtp(email);
      setOtp(Array(OTP_LENGTH).fill(''));
      setResendTimer(RESEND_COUNTDOWN);
      setCanResend(false);
      inputs.current[0]?.focus();
      if (!isInitial) {
        Alert.alert('Code Sent', `A new code has been sent to ${email}`);
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to send verification code. Please try again.');
    }
  };

  const handleResend = async () => {
    if (!canResend || resendLoading) return;
    setResendLoading(true);
    await sendCode();
    setResendLoading(false);
  };

  const filledCount = otp.filter(Boolean).length;
  const isComplete = filledCount === OTP_LENGTH;

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
        {/* No back button — going back would strand the user with an
            already-created-but-unverified account and no way in */}
        <View style={styles.backBtn} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Text style={styles.iconEmoji}>📧</Text>
          </View>

          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            {initialSending ? 'Sending a verification code to' : `We sent a ${OTP_LENGTH}-character verification code to`}
          </Text>
          <Text style={styles.email}>{email || 'your email'}</Text>
          {initialSending && (
            <View style={styles.sendingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.sendingText}>Sending...</Text>
            </View>
          )}
        </View>

        {/* OTP boxes */}
        <View style={styles.otpRow}>
          {otp.map((char, i) => {
            const isFocusTarget = i === filledCount && !isComplete;
            const isFilled = Boolean(char);

            return (
              <TextInput
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                style={[
                  styles.otpBox,
                  isFilled && styles.otpBoxFilled,
                  isFocusTarget && styles.otpBoxActive,
                ]}
                value={char}
                onChangeText={(t) => handleChange(t, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                keyboardType="default"
                autoCapitalize="characters"
                maxLength={1}
                selectTextOnFocus
                caretHidden
                editable={!initialSending}
                textContentType="oneTimeCode"
              />
            );
          })}
        </View>

        {/* Progress hint */}
        <Text style={styles.progressHint}>
          {isComplete
            ? '✓  Code complete — verifying...'
            : `${filledCount} of ${OTP_LENGTH} characters entered`}
        </Text>

        {/* Verify button */}
        <Button
          title="Verify & Activate Account"
          onPress={() => verifyCode()}
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

        {/* Back to login — the account exists, just needs verifying later */}
        <TouchableOpacity
          style={styles.wrongNumberBtn}
          onPress={() => navigation.navigate(Routes.LOGIN)}
        >
          <Text style={styles.wrongNumberText}>
            Verify later? <Text style={styles.wrongNumberLink}>Back to Sign In</Text>
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
    height: 24,
  },

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
  email: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    marginTop: 2,
  },
  sendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.md,
  },
  sendingText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },

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

  progressHint: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },

  verifyBtn: {
    width: '100%',
    marginBottom: Spacing.lg,
  },

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
