import React, { useRef, useState } from 'react';
import {
  Modal, View, StyleSheet, TouchableOpacity, Text,
  ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const REDIRECT_HOST = 'heartlink.app';
const REDIRECT_PATH = '/payment/callback';

export default function FlutterwaveWebView({
  visible,
  paymentLink,   // data.link from /payment/initialize
  txRef,         // our tx_ref — used for manual confirm fallback
  onSuccess,     // called with txRef when payment confirmed
  onCancel,      // called when user goes back without paying
}) {
  const insets         = useSafeAreaInsets();
  const webRef         = useRef(null);
  const [pageLoading,  setPageLoading]  = useState(true);
  const [loadError,    setLoadError]    = useState(false);

  // Detect Flutterwave's redirect to our callback URL.
  // URL format: https://heartlink.app/payment/callback?status=successful&tx_ref=...&transaction_id=...
  const handleNavChange = (state) => {
    const url = state.url || '';
    if (url.includes(REDIRECT_HOST + REDIRECT_PATH)) {
      try {
        const params = new URL(url).searchParams;
        const status = params.get('status');
        const ref    = params.get('tx_ref') || txRef;
        if (status === 'successful' && ref) {
          onSuccess(ref);
        } else {
          // cancelled or failed — fall back to manual flow
          onCancel();
        }
      } catch {
        onSuccess(txRef); // URL parse failed, trust the stored txRef
      }
    }
  };

  // Intercept before loading so the redirect page never actually renders
  const handleShouldStartLoad = (request) => {
    const url = request.url || '';
    if (url.includes(REDIRECT_HOST + REDIRECT_PATH)) {
      try {
        const params = new URL(url).searchParams;
        const status = params.get('status');
        const ref    = params.get('tx_ref') || txRef;
        if (status === 'successful' && ref) {
          onSuccess(ref);
        } else {
          onCancel();
        }
      } catch {
        onSuccess(txRef);
      }
      return false; // block loading the redirect page
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
          <TouchableOpacity style={styles.backBtn} onPress={onCancel}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>Secure Payment</Text>
          <View style={styles.lockBadge}>
            <Text style={styles.lockText}>🔒</Text>
          </View>
        </View>

        {/* ── Instruction strip ─────────────────────────────────────────── */}
        <View style={styles.instructionStrip}>
          <Text style={styles.instructionTxt}>
            Complete your payment on Flutterwave, then tap{' '}
            <Text style={styles.instructionBold}>"I've Paid"</Text> below.
          </Text>
        </View>

        {/* ── WebView / error ──────────────────────────────────────────── */}
        {loadError ? (
          <View style={styles.centered}>
            <Text style={styles.errorIcon}>😕</Text>
            <Text style={styles.errorTitle}>Could not load payment page</Text>
            <Text style={styles.errorSub}>Check your connection and try again.</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => { setLoadError(false); webRef.current?.reload(); }}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.webContainer}>
            {pageLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#FF4B7A" />
                <Text style={styles.loadingText}>Connecting to Flutterwave…</Text>
              </View>
            )}
            <WebView
              ref={webRef}
              source={{ uri: paymentLink }}
              onLoadStart={() => setPageLoading(true)}
              onLoadEnd={()   => setPageLoading(false)}
              onError={()     => { setPageLoading(false); setLoadError(true); }}
              onNavigationStateChange={handleNavChange}
              onShouldStartLoadWithRequest={handleShouldStartLoad}
              javaScriptEnabled
              domStorageEnabled
              style={styles.webview}
              mixedContentMode="always"
            />
          </View>
        )}

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity
            style={styles.paidBtn}
            onPress={() => onSuccess(txRef)}
            activeOpacity={0.85}
          >
            <Text style={styles.paidBtnTxt}>✓  I've Completed Payment</Text>
          </TouchableOpacity>
          <Text style={styles.footerNote}>Powered by Flutterwave · 256-bit SSL</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  backBtn:  { paddingVertical: 4, paddingRight: 8 },
  backText: { fontSize: 15, color: '#FF4B7A', fontWeight: '600' },
  topTitle: { fontSize: 15, fontWeight: '700', color: '#2D3436' },
  lockBadge:{ width: 44, alignItems: 'flex-end' },
  lockText: { fontSize: 16 },

  instructionStrip: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#FDE68A',
  },
  instructionTxt:  { fontSize: 12, color: '#92400E', textAlign: 'center', lineHeight: 18 },
  instructionBold: { fontWeight: '700' },

  webContainer:   { flex: 1 },
  webview:        { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    gap: 12, zIndex: 10,
  },
  loadingText: { fontSize: 14, color: '#888', marginTop: 4 },

  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  errorIcon:  { fontSize: 52 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#2D3436' },
  errorSub:   { fontSize: 13, color: '#888', textAlign: 'center' },
  retryBtn:   { marginTop: 8, backgroundColor: '#FF4B7A', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24 },
  retryText:  { color: '#fff', fontWeight: '700', fontSize: 14 },

  footer: {
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6',
    paddingHorizontal: 16, paddingTop: 12, gap: 6, alignItems: 'center',
  },
  paidBtn: {
    width: '100%', height: 52, borderRadius: 26,
    backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowColor: '#22C55E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 5 },
    }),
  },
  paidBtnTxt:  { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
  footerNote:  { fontSize: 10, color: '#A0A0A0' },
});
