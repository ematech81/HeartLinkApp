/**
 * PaystackWebView
 *
 * A reusable Modal that:
 *  1. Displays Paystack's hosted checkout page inside a WebView.
 *  2. Intercepts the callback URL to detect payment completion.
 *  3. Calls onSuccess(reference) or onCancel() accordingly.
 *
 * Usage:
 *   <PaystackWebView
 *     visible={showPaystack}
 *     authorizationUrl={checkoutUrl}   // from /api/payment/initialize
 *     reference={txRef}
 *     onSuccess={(ref) => handleVerify(ref)}
 *     onCancel={() => setShowPaystack(false)}
 *   />
 *
 * The callback URL we intercept: https://heartlink.app/payment/callback
 */

import React, { useRef, useState } from 'react';
import {
  Modal, View, StyleSheet, TouchableOpacity, Text,
  ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// The redirect URL configured in /api/payment/initialize
const CALLBACK_HOST = 'heartlink.app';
const CALLBACK_PATH = '/payment/callback';

export default function PaystackWebView({
  visible,
  authorizationUrl,
  reference,
  onSuccess,
  onCancel,
}) {
  const insets   = useSafeAreaInsets();
  const webRef   = useRef(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error,       setError]       = useState(false);

  // Intercept navigation to detect Paystack's callback redirect
  const handleNavChange = (state) => {
    const url = state.url || '';
    try {
      const parsed = new URL(url);
      if (parsed.hostname === CALLBACK_HOST && parsed.pathname === CALLBACK_PATH) {
        // Payment completed — hand the reference back to the caller
        onSuccess(reference);
      }
    } catch {
      // URL parse failed — not our redirect, ignore
    }
  };

  // Also handle the trampoline URL that Paystack sometimes uses on mobile
  const handleShouldStartLoad = (request) => {
    const url = request.url || '';
    if (url.includes(CALLBACK_HOST + CALLBACK_PATH)) {
      onSuccess(reference);
      return false; // block the navigation
    }
    return true;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>Secure Payment</Text>
          <View style={styles.lockBadge}>
            <Text style={styles.lockText}>🔒</Text>
          </View>
        </View>

        {/* ── WebView ──────────────────────────────────────────────────── */}
        {error ? (
          <View style={styles.centered}>
            <Text style={styles.errorIcon}>😕</Text>
            <Text style={styles.errorTitle}>Could not load payment page</Text>
            <Text style={styles.errorSub}>Please check your connection and try again.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => { setError(false); webRef.current?.reload(); }}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.webContainer}>
            {pageLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#FF4B7A" />
                <Text style={styles.loadingText}>Connecting to Paystack…</Text>
              </View>
            )}
            <WebView
              ref={webRef}
              source={{ uri: authorizationUrl }}
              onLoadStart={() => setPageLoading(true)}
              onLoadEnd={()  => setPageLoading(false)}
              onError={()    => { setPageLoading(false); setError(true); }}
              onNavigationStateChange={handleNavChange}
              onShouldStartLoadWithRequest={handleShouldStartLoad}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState={false}
              style={styles.webview}
              // Allow mixed content so Paystack's iframes load correctly
              mixedContentMode="always"
            />
          </View>
        )}

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
          <Text style={styles.footerText}>Powered by Paystack · 256-bit SSL encryption</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#fff' },

  topBar: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor:   '#fff',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  cancelBtn:  { paddingVertical: 4, paddingRight: 8 },
  cancelText: { fontSize: 15, color: '#FF4B7A', fontWeight: '600' },
  topTitle:   { fontSize: 15, fontWeight: '700', color: '#2D3436' },
  lockBadge:  { width: 28, alignItems: 'flex-end' },
  lockText:   { fontSize: 16 },

  webContainer:   { flex: 1 },
  webview:        { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             12,
    zIndex:          10,
  },
  loadingText: { fontSize: 14, color: '#888', marginTop: 4 },

  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  errorIcon:  { fontSize: 52 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#2D3436' },
  errorSub:   { fontSize: 13, color: '#888', textAlign: 'center' },
  retryBtn:   { marginTop: 8, backgroundColor: '#FF4B7A', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24 },
  retryText:  { color: '#fff', fontWeight: '700', fontSize: 14 },

  footer:     { alignItems: 'center', paddingTop: 8, backgroundColor: '#FAFAFA', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  footerText: { fontSize: 11, color: '#A0A0A0' },
});
