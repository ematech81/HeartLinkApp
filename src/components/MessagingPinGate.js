/**
 * HeartLink — MessagingPinGate
 * Premium-only "app lock" for chats, modeled on Facebook Messenger's App
 * Lock: a Premium subscriber sets a 4-digit PIN the first time they try to
 * message someone, and from then on has to re-enter it to get back into
 * messaging each time the app is relaunched (see authStore's
 * `messagingUnlocked`, which is intentionally session-only, never persisted).
 *
 * Render this as a full-screen blocker in front of whatever needs
 * protecting (ChatScreen, MessagesScreen) — it covers the screen itself
 * rather than being a small popup, so there's no way to see message content
 * behind/around it while locked.
 *
 * Free (non-subscribed) users never see this at all — every call site is
 * expected to check `user.isSubscribed` itself before rendering this
 * component; this component doesn't re-check that on its own so that a
 * subscription lapsing mid-session doesn't suddenly lock someone out of a
 * feature they're being told (elsewhere) they no longer have access to.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import Colors from 'src/constants/Colors';
import { FontSize, FontWeight } from 'src/constants/topography';
import { Spacing, Radius, Shadows } from 'src/constants/layout';
import { UserAPI } from 'services/ApiServices';
import { useAuth } from 'src/store/authStore';

const PIN_LENGTH = 4;
const emptyPin = () => Array(PIN_LENGTH).fill('');

// ── Reusable 4-box PIN input ──────────────────────────────────────────────────
function PinBoxes({ value, onChangeDigit, onSubmitFull, autoFocus, disabled }) {
  const inputs = useRef([]);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputs.current[0]?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  const handleChange = (text, index) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...value];
    next[index] = digit;
    onChangeDigit(next);

    if (digit && index < PIN_LENGTH - 1) inputs.current[index + 1]?.focus();
    if (digit && index === PIN_LENGTH - 1) {
      const full = next.join('');
      if (full.length === PIN_LENGTH) onSubmitFull(full);
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      const next = [...value];
      next[index - 1] = '';
      onChangeDigit(next);
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={s.pinRow}>
      {value.map((digit, i) => (
        <TextInput
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          style={[s.pinBox, digit && s.pinBoxFilled]}
          value={digit ? '•' : ''}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={(e) => handleKeyPress(e, i)}
          keyboardType="number-pad"
          maxLength={1}
          selectTextOnFocus
          caretHidden
          editable={!disabled}
          textContentType="oneTimeCode"
        />
      ))}
    </View>
  );
}

export default function MessagingPinGate({ onUnlock, onCancel }) {
  const { unlockMessagingSession } = useAuth();

  // stage: 'loading' | 'setup-enter' | 'setup-confirm' | 'unlock' | 'forgot-password' | 'forgot-newpin'
  const [stage,      setStage]      = useState('loading');
  const [pin,         setPin]         = useState(emptyPin());
  const [firstPin,    setFirstPin]    = useState(''); // held between setup-enter → setup-confirm
  const [password,    setPassword]    = useState('');
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [lockedFor,   setLockedFor]   = useState(0); // seconds remaining, from server

  // ── Countdown for a server-side lockout ─────────────────────────────────
  useEffect(() => {
    if (lockedFor <= 0) return;
    const t = setTimeout(() => setLockedFor((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [lockedFor]);

  // ── Find out whether a PIN already exists ───────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = await UserAPI.getMessagingPinStatus();
        setStage(data.hasPin ? 'unlock' : 'setup-enter');
      } catch (err) {
        setError(err.message || 'Could not check PIN status. Please try again.');
        setStage('unlock'); // safe default — falls back to asking for a PIN rather than silently unlocking
      }
    })();
  }, []);

  const resetPinInput = () => setPin(emptyPin());

  // ── First-time setup: two-step (enter, then confirm) ────────────────────
  const handleSetupEnter = (full) => {
    setFirstPin(full);
    resetPinInput();
    setError('');
    setStage('setup-confirm');
  };

  const handleSetupConfirm = async (full) => {
    if (full !== firstPin) {
      setError("PINs didn't match — let's start over.");
      resetPinInput();
      setFirstPin('');
      setStage('setup-enter');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await UserAPI.setMessagingPin(full);
      unlockMessagingSession();
      onUnlock?.();
    } catch (err) {
      setError(err.message || 'Could not save your PIN. Please try again.');
      resetPinInput();
      setFirstPin('');
      setStage('setup-enter');
    } finally {
      setLoading(false);
    }
  };

  // ── Unlock with an existing PIN ──────────────────────────────────────────
  const handleUnlockSubmit = async (full) => {
    setLoading(true);
    setError('');
    try {
      await UserAPI.verifyMessagingPin(full);
      unlockMessagingSession();
      onUnlock?.();
    } catch (err) {
      // The axios interceptor spreads extra response fields (locked,
      // secondsLeft, attemptsRemaining) flat onto the rejected error object
      // alongside message/status — not nested under a .data key.
      if (err.locked && err.secondsLeft) {
        setLockedFor(err.secondsLeft);
        setError(err.message || 'Too many incorrect attempts.');
      } else {
        setError(err.message || 'Incorrect PIN.');
      }
      resetPinInput();
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot PIN → re-auth with account password, then set a new PIN ──────
  const handleForgotPasswordSubmit = () => {
    if (!password) { setError('Enter your account password.'); return; }
    setError('');
    resetPinInput();
    setStage('forgot-newpin');
  };

  const handleForgotNewPinSubmit = async (full) => {
    setLoading(true);
    setError('');
    try {
      await UserAPI.resetMessagingPin(password, full);
      unlockMessagingSession();
      onUnlock?.();
    } catch (err) {
      setError(err.message || 'Could not reset your PIN. Please try again.');
      setPassword('');
      resetPinInput();
      setStage('forgot-password');
    } finally {
      setLoading(false);
    }
  };

  const onPinBoxSubmit = useCallback((full) => {
    if (stage === 'setup-enter')   return handleSetupEnter(full);
    if (stage === 'setup-confirm') return handleSetupConfirm(full);
    if (stage === 'unlock')        return handleUnlockSubmit(full);
    if (stage === 'forgot-newpin') return handleForgotNewPinSubmit(full);
  }, [stage, firstPin, password]);

  // ── Copy per stage ────────────────────────────────────────────────────────
  const copy = {
    loading:        { icon: '🔒', title: 'Just a moment…',            sub: '' },
    'setup-enter':   { icon: '🔒', title: 'Protect Your Messages',     sub: 'Set a 4-digit PIN to keep your chats private, just like Messenger.' },
    'setup-confirm': { icon: '🔒', title: 'Confirm Your PIN',          sub: 'Enter the same 4 digits again to confirm.' },
    unlock:          { icon: '🔒', title: 'Enter Your PIN',            sub: 'Enter your 4-digit PIN to open messaging.' },
    'forgot-password':{ icon: '🔑', title: 'Verify Your Identity',     sub: "Enter your account password to reset your messaging PIN." },
    'forgot-newpin':  { icon: '🔒', title: 'Set a New PIN',            sub: 'Choose a new 4-digit PIN for your messages.' },
  }[stage] || {};

  const isLocked = lockedFor > 0;

  return (
    <KeyboardAvoidingView
      style={s.overlay}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={s.card}>
        {stage === 'loading' ? (
          <ActivityIndicator size="large" color={Colors.primary} />
        ) : (
          <>
            <Text style={s.icon}>{copy.icon}</Text>
            <Text style={s.title}>{copy.title}</Text>
            <Text style={s.sub}>{copy.sub}</Text>

            {stage === 'forgot-password' ? (
              <>
                <TextInput
                  style={s.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Account password"
                  placeholderTextColor={Colors.textLight}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!loading}
                />
                {!!error && <Text style={s.error}>{error}</Text>}
                <TouchableOpacity
                  style={[s.primaryBtn, !password && s.primaryBtnDisabled]}
                  onPress={handleForgotPasswordSubmit}
                  disabled={!password || loading}
                  activeOpacity={0.85}
                >
                  <Text style={s.primaryBtnText}>Continue</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <PinBoxes
                  value={pin}
                  onChangeDigit={setPin}
                  onSubmitFull={onPinBoxSubmit}
                  autoFocus
                  disabled={loading || isLocked}
                />
                {loading && <ActivityIndicator style={{ marginTop: Spacing.md }} color={Colors.primary} />}
                {!!error && !loading && (
                  <Text style={s.error}>
                    {isLocked ? `${error} (${lockedFor}s)` : error}
                  </Text>
                )}
              </>
            )}

            {stage === 'unlock' && (
              <TouchableOpacity
                style={s.linkBtn}
                onPress={() => { setError(''); resetPinInput(); setStage('forgot-password'); }}
                disabled={loading}
              >
                <Text style={s.linkText}>Forgot PIN?</Text>
              </TouchableOpacity>
            )}

            {onCancel && (
              <TouchableOpacity style={s.linkBtn} onPress={onCancel} disabled={loading}>
                <Text style={s.cancelText}>← Back</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  icon:  { fontSize: 44, marginBottom: Spacing.md },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.text, textAlign: 'center', marginBottom: 6 },
  sub:   { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.xl, paddingHorizontal: Spacing.sm },

  pinRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  pinBox: {
    width: 56, height: 64,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  pinBoxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.backgroundGradientStart,
  },

  passwordInput: {
    width: '100%',
    height: 50,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.base,
    color: Colors.text,
    marginBottom: Spacing.md,
  },

  error: {
    fontSize: FontSize.sm,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },

  primaryBtn: {
    width: '100%',
    height: 50,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    ...Shadows.sm,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },

  linkBtn: { marginTop: Spacing.lg, paddingVertical: Spacing.sm },
  linkText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
  cancelText: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: FontWeight.medium },
});
