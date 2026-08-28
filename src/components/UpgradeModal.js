import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ActivityIndicator, Alert, Platform, ScrollView,
} from 'react-native';
import { PaymentAPI } from 'services/ApiServices';
import { useAuth } from 'src/store/authStore';
import KoraPayWebView from 'src/components/KoraPayWebView';
import Colors from 'src/constants/Colors';

const BENEFITS = [
  { icon: '♾️', text: 'Send unlimited messages to anyone' },
  { icon: '🚫', text: 'Block users who make you uncomfortable' },
  { icon: '🚨', text: 'Report inappropriate profiles' },
  { icon: '❤️', text: 'See who liked you instantly' },
  { icon: '⚡', text: 'Priority in search results' },
  { icon: '✔',  text: 'Verified member badge on your profile' },
];

const PLANS = [
  { id: 'monthly',  label: 'Monthly',  price: '₦5,000',  per: '/ month',    badge: null,          highlight: false },
  { id: 'sixMonth', label: '6 Months', price: '₦20,000', per: '/ 6 months', badge: '🔥 Best Value', highlight: true, note: 'Includes 1 week FREE profile boost!' },
];

// ── Pre-payment info modal ────────────────────────────────────────────────────
function PrePaymentModal({ visible, plan, onProceed, onCancel }) {
  const label = plan === 'sixMonth' ? '6-Month Premium — ₦20,000' : 'Monthly Premium — ₦5,000';
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={p.backdrop}>
        <View style={p.sheet}>
          <Text style={p.icon}>💳</Text>
          <Text style={p.title}>How Payment Works</Text>
          <Text style={p.planPill}>{label}</Text>
          <View style={p.steps}>
            {[
              { n: '1', text: "Tap Proceed — KoraPay's secure checkout will open." },
              { n: '2', text: 'Complete your payment inside the KoraPay page.' },
              { n: '3', text: 'Tap "I\'ve Completed Payment" to return here.' },
              { n: '4', text: 'Tap "Confirm Payment" — your Premium activates instantly.' },
            ].map(({ n, text }) => (
              <View key={n} style={p.stepRow}>
                <View style={p.stepNum}><Text style={p.stepNumTxt}>{n}</Text></View>
                <Text style={p.stepTxt}>{text}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={p.proceedBtn} onPress={onProceed} activeOpacity={0.85}>
            <Text style={p.proceedBtnTxt}>Proceed to Payment →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={p.cancelBtn} onPress={onCancel}>
            <Text style={p.cancelBtnTxt}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Confirm card (shown after WebView closes) ─────────────────────────────────
function ConfirmCard({ plan, reference, loading, onConfirm, onDiscard }) {
  const label = plan === 'sixMonth' ? '6-Month Premium' : 'Monthly Premium';
  const price = plan === 'sixMonth' ? '₦20,000' : '₦5,000';
  return (
    <View style={c.card}>
      <View style={c.headerRow}>
        <Text style={c.icon}>✅</Text>
        <View style={{ flex: 1 }}>
          <Text style={c.title}>Payment Completed?</Text>
          <Text style={c.sub}>Tap Confirm to activate your Premium instantly.</Text>
        </View>
      </View>
      <View style={c.detail}>
        <Text style={c.detailLine}>Plan:  <Text style={c.detailVal}>{label}</Text></Text>
        <Text style={c.detailLine}>Amount: <Text style={c.detailVal}>{price}</Text></Text>
        <Text style={c.detailLine}>Ref:   <Text style={c.detailRef}>{reference}</Text></Text>
      </View>
      <TouchableOpacity
        style={[c.confirmBtn, loading && { opacity: 0.7 }]}
        onPress={onConfirm}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={c.confirmBtnTxt}>Confirm Payment</Text>
        }
      </TouchableOpacity>
      <TouchableOpacity style={c.discardBtn} onPress={onDiscard}>
        <Text style={c.discardBtnTxt}>I did not complete payment — start over</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function UpgradeModal({ visible, onClose, onSuccess }) {
  const { updateUser } = useAuth();

  const [selectedPlan,  setSelectedPlan]  = useState('monthly');
  const [showPreInfo,   setShowPreInfo]   = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [confirming,    setConfirming]    = useState(false);

  // KoraPay checkout state
  const [checkoutUrl,   setCheckoutUrl]   = useState(null);
  const [pendingRef,    setPendingRef]    = useState(null);
  const [showWebView,   setShowWebView]   = useState(false);

  // ── Step 1: show pre-info ────────────────────────────────────────────────
  const handlePayNow = () => setShowPreInfo(true);

  // ── Step 2: initialize transaction ──────────────────────────────────────
  const startPayment = async () => {
    setShowPreInfo(false);
    setLoading(true);
    try {
      const data = await PaymentAPI.initializePayment(selectedPlan);
      // NOTE: this used to read `data.authorization_url` (Paystack's field
      // name from a pre-Flutterwave version of this flow) against a backend
      // that only ever returned `payment_link` — always undefined, so this
      // entire modal — the app's main contextual paywall, wired into six
      // screens — silently dead-ended at every use. Fixed as part of the
      // KoraPay migration.
      setCheckoutUrl(data.payment_link);
      setPendingRef(data.reference);
      setShowWebView(true);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not start payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3a: WebView auto-detected callback ──────────────────────────────
  const handleWebViewSuccess = (reference) => {
    setShowWebView(false);
    setCheckoutUrl(null);
    verifyPayment(reference);
  };

  // ── Step 3b: user manually returned (keeps pendingRef for confirm card) ──
  const handleWebViewCancel = () => {
    setShowWebView(false);
    setCheckoutUrl(null);
    // pendingRef is kept — confirm card will appear
  };

  // ── Step 4: verify & activate ────────────────────────────────────────────
  // `selectedPlan` here is only for the local optimistic state patch below —
  // the backend independently derives the real plan from its own Transaction
  // record (created at initialize time), never from this client-side value.
  const verifyPayment = async (reference) => {
    setConfirming(true);
    try {
      const data = await PaymentAPI.verifyPayment(reference);

      await updateUser({
        isSubscribed:       true,
        subscriptionExpiry: data.subscriptionExpiry,
        subscriptionPlan:   selectedPlan,
        isVerified:         true,
        ...(data.boostExpiry ? { isBoosted: true, boostExpiry: data.boostExpiry } : {}),
      });

      setPendingRef(null);
      onClose();
      onSuccess?.();
      Alert.alert(
        '🎉 Payment Successful!',
        data.message || 'Your premium access is now active.',
        [{ text: 'Awesome!', style: 'default' }]
      );
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('not completed') || msg.toLowerCase().includes('mismatch')) {
        Alert.alert(
          'Payment Not Found',
          'We could not confirm your payment yet. If you completed it, wait a moment and tap Confirm again.',
        );
      } else {
        Alert.alert('Verification Failed', msg || 'Could not verify. Please try again.');
      }
    } finally {
      setConfirming(false);
    }
  };

  const discardPending = () => setPendingRef(null);

  return (
    <>
      {/* ── Main plan-picker sheet ─────────────────────────────────────── */}
      <Modal
        visible={visible && !showWebView}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Close (X) — "Maybe Later" sits at the very bottom of a long
              scrolling sheet and is easy to miss without scrolling all the
              way down; this gives an always-visible way to dismiss. */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

            {/* ── Confirm card (after manual return) ───────────────── */}
            {pendingRef && (
              <ConfirmCard
                plan={selectedPlan}
                reference={pendingRef}
                loading={confirming}
                onConfirm={() => verifyPayment(pendingRef)}
                onDiscard={discardPending}
              />
            )}

            {/* Crown + headline */}
            <Text style={styles.crown}>👑</Text>
            <Text style={styles.title}>HeartLink Premium</Text>
            <Text style={styles.subtitle}>
              Unlock every feature and find your perfect match faster.
            </Text>

            {/* Plan selector */}
            <View style={styles.plansRow}>
              {PLANS.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    selectedPlan === plan.id && styles.planCardActive,
                    plan.highlight && styles.planCardHighlight,
                  ]}
                  onPress={() => setSelectedPlan(plan.id)}
                  activeOpacity={0.85}
                >
                  {plan.badge && (
                    <View style={styles.planBadge}>
                      <Text style={styles.planBadgeText}>{plan.badge}</Text>
                    </View>
                  )}
                  <Text style={[styles.planLabel, selectedPlan === plan.id && styles.planLabelActive]}>
                    {plan.label}
                  </Text>
                  <Text style={[styles.planPrice, selectedPlan === plan.id && styles.planPriceActive]}>
                    {plan.price}
                  </Text>
                  <Text style={styles.planPer}>{plan.per}</Text>
                  {plan.note && <Text style={styles.planNote}>{plan.note}</Text>}
                  {selectedPlan === plan.id && (
                    <View style={styles.planCheckmark}>
                      <Text style={styles.planCheckmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Benefits */}
            <View style={styles.benefitsList}>
              {BENEFITS.map((b, i) => (
                <View key={i} style={styles.benefitRow}>
                  <View style={styles.benefitIconWrap}>
                    <Text style={styles.benefitIcon}>{b.icon}</Text>
                  </View>
                  <Text style={styles.benefitText}>{b.text}</Text>
                </View>
              ))}
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={[styles.subscribeBtn, (loading || confirming) && styles.subscribeBtnLoading]}
              onPress={handlePayNow}
              disabled={loading || confirming}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : (
                  <View style={styles.ctaInner}>
                    <Text style={styles.subscribeBtnText}>
                      Pay {PLANS.find((p) => p.id === selectedPlan)?.price} with KoraPay
                    </Text>
                    <Text style={styles.ctaLock}>🔒</Text>
                  </View>
                )
              }
            </TouchableOpacity>

            <Text style={styles.priceNote}>Secure payment via KoraPay · Cancel anytime</Text>

            <TouchableOpacity onPress={onClose} style={styles.laterBtn}>
              <Text style={styles.laterText}>Maybe Later</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Pre-payment info ──────────────────────────────────────────── */}
      <PrePaymentModal
        visible={showPreInfo}
        plan={selectedPlan}
        onProceed={startPayment}
        onCancel={() => setShowPreInfo(false)}
      />

      {/* ── KoraPay checkout WebView ───────────────────────────────────── */}
      {showWebView && checkoutUrl && (
        <KoraPayWebView
          visible={showWebView}
          paymentLink={checkoutUrl}
          reference={pendingRef}
          onSuccess={handleWebViewSuccess}
          onCancel={handleWebViewCancel}
        />
      )}
    </>
  );
}

// ── Pre-payment modal styles ───────────────────────────────────────────────────
const p = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, alignItems: 'center', gap: 8 },
  icon:       { fontSize: 36, marginBottom: 4 },
  title:      { fontSize: 18, fontWeight: '800', color: '#111827' },
  planPill:   { backgroundColor: '#F0FDF4', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, fontSize: 13, color: '#15803D', fontWeight: '700', overflow: 'hidden' },
  steps:      { width: '100%', gap: 10, marginTop: 6 },
  stepRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNum:    { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FF4B7A', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  stepNumTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },
  stepTxt:    { flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 },
  proceedBtn: { width: '100%', height: 52, borderRadius: 26, backgroundColor: '#FF4B7A', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  proceedBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cancelBtn:  { paddingVertical: 10 },
  cancelBtnTxt: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
});

// ── Confirm card styles ────────────────────────────────────────────────────────
const c = StyleSheet.create({
  card:        { backgroundColor: '#F0FDF4', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1.5, borderColor: '#86EFAC', gap: 10 },
  headerRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  icon:        { fontSize: 26 },
  title:       { fontSize: 14, fontWeight: '700', color: '#14532D' },
  sub:         { fontSize: 11, color: '#166534', marginTop: 2 },
  detail:      { backgroundColor: '#DCFCE7', borderRadius: 10, padding: 10, gap: 3 },
  detailLine:  { fontSize: 12, color: '#374151' },
  detailVal:   { fontWeight: '700', color: '#111827' },
  detailRef:   { fontWeight: '600', color: '#6B7280', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  confirmBtn:  { height: 48, borderRadius: 24, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' },
  confirmBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  discardBtn:  { alignItems: 'center', paddingVertical: 4 },
  discardBtnTxt: { fontSize: 11, color: '#9CA3AF', textDecorationLine: 'underline' },
});

// ── Sheet styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 22, paddingBottom: Platform.OS === 'ios' ? 40 : 28, paddingTop: 12,
    maxHeight: '92%',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.12, shadowRadius: 16 },
      android: { elevation: 24 },
    }),
  },
  handle: { width: 44, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', alignSelf: 'center', marginBottom: 16 },

  closeBtn: {
    position: 'absolute', top: 14, right: 14, zIndex: 10,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 15, fontWeight: '700', color: '#6B7280' },

  crown:    { fontSize: 40, textAlign: 'center', marginBottom: 6 },
  title:    { fontSize: 22, fontWeight: '800', color: '#2D3436', textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 4, marginBottom: 18, lineHeight: 19, paddingHorizontal: 10 },

  plansRow:          { flexDirection: 'row', gap: 10, marginBottom: 20 },
  planCard:          { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 2, borderColor: '#F0E0E6', backgroundColor: '#FFFAFA', position: 'relative' },
  planCardActive:    { borderColor: '#FF4B7A', backgroundColor: '#FFF0F3' },
  planCardHighlight: { borderColor: '#FF4B7A' },
  planBadge:         { backgroundColor: '#FF4B7A', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginBottom: 6 },
  planBadgeText:     { fontSize: 9, color: '#fff', fontWeight: '700', letterSpacing: 0.3 },
  planLabel:         { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 4 },
  planLabelActive:   { color: '#FF4B7A' },
  planPrice:         { fontSize: 20, fontWeight: '800', color: '#2D3436' },
  planPriceActive:   { color: '#FF4B7A' },
  planPer:           { fontSize: 11, color: '#A0A0A0', marginTop: 2 },
  planNote:          { fontSize: 10, color: '#FF4B7A', fontWeight: '600', textAlign: 'center', marginTop: 5, lineHeight: 14 },
  planCheckmark:     { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, backgroundColor: '#FF4B7A', alignItems: 'center', justifyContent: 'center' },
  planCheckmarkText: { fontSize: 10, color: '#fff', fontWeight: '700' },

  benefitsList:    { marginBottom: 18 },
  benefitRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  benefitIconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFF0F3', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  benefitIcon:     { fontSize: 15 },
  benefitText:     { flex: 1, fontSize: 13, color: '#444', fontWeight: '500' },

  subscribeBtn: {
    height: 52, borderRadius: 26, backgroundColor: '#FF4B7A',
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowColor: '#FF4B7A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  subscribeBtnLoading: { opacity: 0.75 },
  ctaInner:            { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subscribeBtnText:    { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
  ctaLock:             { fontSize: 15 },
  priceNote:           { fontSize: 11, color: '#A0A0A0', textAlign: 'center', marginTop: 8 },
  laterBtn:            { alignSelf: 'center', paddingVertical: 12 },
  laterText:           { fontSize: 13, color: '#A0A0A0', fontWeight: '500' },
});
