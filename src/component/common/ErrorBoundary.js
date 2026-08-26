/**
 * HeartLink ErrorBoundary
 *
 * Catches render-time errors anywhere below it in the tree and shows a
 * recoverable fallback screen instead of crashing to React Native's raw
 * red/white error screen with no way back in.
 *
 * React error boundaries MUST be class components — there is no hook
 * equivalent for getDerivedStateFromError/componentDidCatch.
 *
 * This only covers render/lifecycle errors (React's contract for error
 * boundaries) — it does NOT catch errors inside event handlers, async code,
 * or promise rejections. Those still need their own try/catch, same as
 * before.
 *
 * NOTE: this logs to console and keeps the last crash in AsyncStorage for
 * local inspection — there is no remote crash-reporting service wired up
 * (e.g. Sentry/Bugsnag) because that needs an account + DSN from you. Ask
 * for that if you want crashes visible outside of a connected device's logs.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from 'src/constants/Colors';
import { FontSize, FontWeight } from 'src/constants/topography';
import { Spacing, Radius } from 'src/constants/layout';

const LAST_CRASH_KEY = 'heartlink:lastCrash';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Same logging pattern used everywhere else in this app (no logging
    // service configured yet) — at least this way a crash doesn't vanish
    // silently on a real device the way an uncaught render error otherwise
    // would.
    console.error('💥 [ErrorBoundary] Caught render error:', error, errorInfo?.componentStack);

    AsyncStorage.setItem(
      LAST_CRASH_KEY,
      JSON.stringify({
        message:   error?.message,
        stack:     error?.stack,
        component: errorInfo?.componentStack,
        at:        new Date().toISOString(),
      })
    ).catch(() => {});
  }

  handleTryAgain = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.emoji}>💔</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            HeartLink hit an unexpected error. Your data is safe — try again,
            and if it keeps happening, please let us know.
          </Text>

          {__DEV__ && this.state.error ? (
            <View style={styles.debugBox}>
              <Text style={styles.debugTitle}>Dev details (hidden in production):</Text>
              <Text style={styles.debugText}>{String(this.state.error?.message || this.state.error)}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.button} onPress={this.handleTryAgain} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
  },
  emoji: { fontSize: 56, marginBottom: Spacing.md },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  debugBox: {
    width: '100%',
    backgroundColor: '#FFF5F5',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  debugTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: '#B91C1C',
    marginBottom: 4,
  },
  debugText: {
    fontSize: FontSize.xs,
    color: '#B91C1C',
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: Radius.full,
  },
  buttonText: {
    color: Colors.white,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
});
