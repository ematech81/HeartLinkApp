import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, StatusBar, Modal, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PaymentAPI } from 'services/ApiServices';
import { useAuth } from 'src/store/authStore';
import PaystackWebView from 'src/components/PaystackWebView';
import Colors from 'src/constants/Colors';

const stillActive = (d) => d && new Date(d) > new Date();
const daysUntil = (d) => {
  if (!d) return 0;
  const ms = new Date(d) - new Date();
  return ms > 0 ? Math.ceil(ms / 86400000) : 0;
};
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

const PLANS = [
  { id: 'monthly', label: 'Monthly', price: '₦5,000', per: 'per month',           badge: null,          highlight: false },
  { id: 'yearly',  label: 'Yearly',  price: '₦20,000', per: 'per year  ·  save 67%', badge: '🔥 Best Value', highlight: true, note: '+ 1 week FREE boost' },
];

const SUB_BENEFITS = [
  { icon: '♾️', text: 'Unlimited messages to anyone' },
  { icon: '❤️', text: 'See who liked you instantly' },
  { icon: '✔',  text: 'Verified member badge' },
  { icon: '⚡', text: 'Priority in search results' },
  { icon: '🚫', text: 'Block users who bother you' },
  { icon: '🚨', text: 'Report inappropriate profiles' },
];

const BOOST_BENEFITS = [
  '3× more profile views',
  'Featured at the top of search results',
  'Shown first in the Community feed',
  'Verified badge for 7 days',
];

// ── Pre-payment info modal ────────────────────────────────────────────────────
function PrePaymentModal({ visible, plan, isBoost, onProceed, onCancel }) {
  const planLabel = isBoost ? 'Profile Boost' : plan === 'yearly' ? 'Yearly Premium' : 'Monthly Premium';
  const price     = isBoost ? '₦3,000' : plan === 'yearly' ? '₦20,000' : '₦5,000';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={p.backdrop}>
        <View style={p.sheet}>
          <Text style={p.icon}>💳</Text>
          <Text style={p.title}>How Payment Works</Text>
          <Text style={p.planPill}>{planLabel} · {price}</Text>

          <View style={p.steps}>
            {[
              { n: '1', text: "Tap Proceed — Paystack's secure checkout will open." },
              { n: '2', text: 'Complete your payment inside the Paystack page.' },
              { n: '3', text: 'Tap "I\'ve Completed Payment" to return here.' },
              { n: '4', text: 'Tap "Confirm Payment" — your access activates instantly.' },
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

// ── Pending confirm card ──────────────────────────────────────────────────────
function ConfirmCard({ plan, isBoost, reference, loading, onConfirm, onDiscard }) {
  const planLabel = isBoost ? 'Profile Boost (7 days)' : plan === 'yearly' ? 'Yearly Premium' : 'Monthly Premium';
  const price     = isBoost ? '₦3,000' : plan === 'yearly' ? '₦20,000' : '₦5,000';

  return (
    <View style={c.card}>
      <View style={c.headerRow}>
        <Text style={c.icon}>✅</Text>
        <View style={{ flex: 1 }}>
          <Text style={c.title}>Payment Completed?</Text>
          <Text style={c.sub}>Tap Confirm to activate your access instantly.</Text>
        </View>
      </View>

      <View style={c.detail}>
        <Text style={c.detailLine}>Plan:  <Text style={c.detailVal}>{planLabel}</Text></Text>
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

// ── Status card ───────────────────────────────────────────────────────────────
function StatusCard({ icon, title, subtitle, badge, badgeColor }) {
  return (
    <View style={s.statusCard}>
      <Text style={s.statusCardIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.statusCardTitle}>{title}</Text>
        <Text style={s.statusCardSub}>{subtitle}</Text>
      </View>
      {badge ? (
        <View style={[s.statusBadge, { backgroundColor: badgeColor || Colors.primary }]}>
          <Text style={s.statusBadgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, selected, onSelect }) {
  return (
    <TouchableOpacity
      style={[s.planCard, selected && s.planCardActive, plan.highlight && s.planCardHighlight]}
      onPress={() => onSelect(plan.id)}
      activeOpacity={0.85}
    >
      {plan.badge && (
        <View style={s.planBadge}><Text style={s.planBadgeText}>{plan.badge}</Text></View>
      )}
      <Text style={[s.planLabel, selected && s.planLabelActive]}>{plan.label}</Text>
      <Text style={[s.planPrice, selected && s.planPriceActive]}>{plan.price}</Text>
      <Text style={s.planPer}>{plan.per}</Text>
      {plan.note && <Text style={s.planNote}>{plan.note}</Text>}
      {selected && (
        <View style={s.planCheck}><Text style={s.planCheckText}>✓</Text></View>
      )}
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function SubscriptionScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();

  const [status,        setStatus]        = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [selectedPlan,  setSelectedPlan]  = useState('monthly');

  // Pre-payment modal
  const [showPreInfo,   setShowPreInfo]   = useState(false);
  const [pendingIsBoost,setPendingIsBoost]= useState(false);

  // Payment in-flight
  const [paying,        setPaying]        = useState(false);
  const [payingBoost,   setPayingBoost]   = useState(false);
  const [paystackUrl,   setPaystackUrl]   = useState(null);
  const [showWV,        setShowWV]        = useState(false);

  // Pending confirm (shown after WebView closes)
  const [pendingRef,    setPendingRef]    = useState(null);
  const [pendingPlan,   setPendingPlan]   = useState(null);
  const [confirming,    setConfirming]    = useState(false);

  const scrollRef = React.useRef(null);

  // ── Fetch live status ───────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const data = await PaymentAPI.getStatus();
      setStatus(data);
    } catch {
      setStatus({
        isSubscribed:         stillActive(user?.subscriptionExpiry),
        subscriptionPlan:     user?.subscriptionPlan,
        subscriptionExpiry:   user?.subscriptionExpiry,
        subscriptionDaysLeft: daysUntil(user?.subscriptionExpiry),
        isBoosted:            stillActive(user?.boostExpiry),
        boostExpiry:          user?.boostExpiry,
        boostDaysLeft:        daysUntil(user?.boostExpiry),
      });
    } finally {
      setLoadingStatus(false);
    }
  }, [user]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // ── Step 1: show pre-payment info ───────────────────────────────────────────
  const openPreInfo = (isBoost) => {
    setPendingIsBoost(isBoost);
    setShowPreInfo(true);
  };

  // ── Step 2: initialize Paystack transaction ─────────────────────────────────
  const startPayment = async () => {
    setShowPreInfo(false);
    const plan = pendingIsBoost ? 'boost' : selectedPlan;
    const setL = pendingIsBoost ? setPayingBoost : setPaying;
    setL(true);
    try {
      const data = await PaymentAPI.initializePayment(plan);
      setPaystackUrl(data.authorization_url);
      setPendingRef(data.reference);
      setPendingPlan(plan);
      setShowWV(true);
    } catch (err) {
      Alert.alert('Payment Error', err.message || 'Could not start payment. Please try again.');
    } finally {
      setL(false);
    }
  };

  // ── Step 3: WebView closed (manually or via callback) ──────────────────────
  const handleWebViewSuccess = (reference) => {
    // Auto-detected callback — go straight to verify
    setShowWV(false);
    setPaystackUrl(null);
    verifyPayment(reference, pendingPlan);
  };

  const handleWebViewCancel = () => {
    // User tapped Back — keep pendingRef so they can confirm manually
    setShowWV(false);
    setPaystackUrl(null);
    // Scroll to top so the ConfirmCard is visible
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 300);
  };

  // ── Step 4: verify & activate ───────────────────────────────────────────────
  const verifyPayment = async (reference, plan) => {
    setConfirming(true);
    try {
      const data = await PaymentAPI.verifyPayment(reference, plan);

      const patch = {};
      if (plan !== 'boost') {
        patch.isSubscribed       = true;
        patch.subscriptionExpiry = data.subscriptionExpiry;
        patch.subscriptionPlan   = plan;
        patch.isVerified         = true;
      }
      if (data.boostExpiry) {
        patch.isBoosted   = true;
        patch.boostExpiry = data.boostExpiry;
      }
      if (plan === 'boost') {
        patch.isBoosted   = true;
        patch.boostExpiry = data.boostExpiry;
        patch.isVerified  = true;
      }
      await updateUser(patch);
      await fetchStatus();

      // Clear pending state
      setPendingRef(null);
      setPendingPlan(null);

      Alert.alert(
        '🎉 Activated!',
        data.message || 'Your access is now active.',
        [{ text: 'Awesome!' }]
      );
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('not completed') || msg.toLowerCase().includes('mismatch')) {
        Alert.alert(
          'Payment Not Found',
          'We could not confirm your payment yet. If you completed the payment, please wait a minute and tap Confirm again.',
        );
      } else {
        Alert.alert('Error', msg || 'Verification failed. Please try again.');
      }
    } finally {
      setConfirming(false);
    }
  };

  const discardPending = () => {
    setPendingRef(null);
    setPendingPlan(null);
  };

  // Derived values
  const isSubscribed  = status?.isSubscribed;
  const isBoosted     = status?.isBoosted;
  const subDaysLeft   = status?.subscriptionDaysLeft ?? daysUntil(status?.subscriptionExpiry);
  const boostDaysLeft = status?.boostDaysLeft        ?? daysUntil(status?.boostExpiry);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Nav bar ─────────────────────────────────────────────────── */}
      <View style={s.navbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Premium & Boosts</Text>
        <View style={{ width: 36 }} />
      </View>

      {loadingStatus ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Pending confirm card ──────────────────────────────────── */}
          {pendingRef && (
            <ConfirmCard
              plan={pendingPlan}
              isBoost={pendingPlan === 'boost'}
              reference={pendingRef}
              loading={confirming}
              onConfirm={() => verifyPayment(pendingRef, pendingPlan)}
              onDiscard={discardPending}
            />
          )}

          {/* ── Current status ────────────────────────────────────────── */}
          <Text style={s.sectionTitle}>Your Current Status</Text>

          <StatusCard
            icon="👑"
            title={isSubscribed ? `Premium · ${status?.subscriptionPlan === 'yearly' ? 'Yearly' : 'Monthly'}` : 'Free Account'}
            subtitle={
              isSubscribed
                ? `${subDaysLeft} day${subDaysLeft !== 1 ? 's' : ''} remaining · expires ${fmtDate(status?.subscriptionExpiry)}`
                : 'Upgrade to unlock all features'
            }
            badge={isSubscribed ? 'Active' : 'Inactive'}
            badgeColor={isSubscribed ? '#22C55E' : '#9CA3AF'}
          />

          <StatusCard
            icon="⚡"
            title={isBoosted ? 'Profile Boost Active' : 'No Active Boost'}
            subtitle={
              isBoosted
                ? `${boostDaysLeft} day${boostDaysLeft !== 1 ? 's' : ''} left · expires ${fmtDate(status?.boostExpiry)}`
                : 'Boost to get 3× more views'
            }
            badge={isBoosted ? 'Active' : null}
            badgeColor="#F59E0B"
          />

          {/* ── Subscription plans ────────────────────────────────────── */}
          <Text style={s.sectionTitle}>{isSubscribed ? 'Renew or Change Plan' : 'Choose a Plan'}</Text>

          <View style={s.plansRow}>
            {PLANS.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                selected={selectedPlan === plan.id}
                onSelect={setSelectedPlan}
              />
            ))}
          </View>

          <View style={s.benefitsList}>
            {SUB_BENEFITS.map((b, i) => (
              <View key={i} style={s.benefitRow}>
                <View style={s.benefitIconWrap}>
                  <Text style={s.benefitIcon}>{b.icon}</Text>
                </View>
                <Text style={s.benefitText}>{b.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[s.primaryBtn, paying && s.primaryBtnLoading]}
            onPress={() => openPreInfo(false)}
            disabled={paying}
            activeOpacity={0.85}
          >
            {paying
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.primaryBtnText}>
                  {isSubscribed ? 'Renew' : 'Subscribe'} — {PLANS.find((p) => p.id === selectedPlan)?.price}
                </Text>
            }
          </TouchableOpacity>

          <Text style={s.secureNote}>🔒 Secure payment via Paystack</Text>

          {/* ── Boost section ─────────────────────────────────────────── */}
          <View style={s.divider} />
          <Text style={s.sectionTitle}>Boost Your Profile</Text>

          <View style={s.boostCard}>
            <Text style={s.boostCardIcon}>⚡</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.boostCardTitle}>Weekly Boost  ·  ₦3,000</Text>
              {BOOST_BENEFITS.map((line, i) => (
                <Text key={i} style={s.boostBenefit}>· {line}</Text>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[s.boostBtn, payingBoost && s.primaryBtnLoading]}
            onPress={() => openPreInfo(true)}
            disabled={payingBoost}
            activeOpacity={0.85}
          >
            {payingBoost
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.boostBtnText}>{isBoosted ? '⚡  Boost Again — ₦3,000' : '⚡  Boost My Profile — ₦3,000'}</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── Pre-payment info modal ────────────────────────────────────── */}
      <PrePaymentModal
        visible={showPreInfo}
        plan={selectedPlan}
        isBoost={pendingIsBoost}
        onProceed={startPayment}
        onCancel={() => setShowPreInfo(false)}
      />

      {/* ── Paystack WebView ──────────────────────────────────────────── */}
      {showWV && paystackUrl && (
        <PaystackWebView
          visible={showWV}
          authorizationUrl={paystackUrl}
          reference={pendingRef}
          onSuccess={handleWebViewSuccess}
          onCancel={handleWebViewCancel}
        />
      )}
    </View>
  );
}

// ── Pre-payment modal styles ───────────────────────────────────────────────────
const p = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36, alignItems: 'center', gap: 8,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 16 },
    }),
  },
  icon:      { fontSize: 36, marginBottom: 4 },
  title:     { fontSize: 18, fontWeight: '800', color: '#111827' },
  planPill:  { backgroundColor: '#F0FDF4', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, fontSize: 13, color: '#15803D', fontWeight: '700', overflow: 'hidden' },
  steps:     { width: '100%', gap: 10, marginTop: 6 },
  stepRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNum:   { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  stepNumTxt:{ fontSize: 12, fontWeight: '700', color: '#fff' },
  stepTxt:   { flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 },
  proceedBtn:{ width: '100%', height: 52, borderRadius: 26, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  proceedBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cancelBtn: { paddingVertical: 10 },
  cancelBtnTxt: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
});

// ── Confirm card styles ────────────────────────────────────────────────────────
const c = StyleSheet.create({
  card: {
    backgroundColor: '#F0FDF4', borderRadius: 16, padding: 18,
    marginBottom: 20, borderWidth: 1.5, borderColor: '#86EFAC',
    gap: 12,
  },
  headerRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  icon:        { fontSize: 28 },
  title:       { fontSize: 15, fontWeight: '700', color: '#14532D' },
  sub:         { fontSize: 12, color: '#166534', marginTop: 2 },
  detail:      { backgroundColor: '#DCFCE7', borderRadius: 10, padding: 12, gap: 4 },
  detailLine:  { fontSize: 12, color: '#374151' },
  detailVal:   { fontWeight: '700', color: '#111827' },
  detailRef:   { fontWeight: '600', color: '#6B7280', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  confirmBtn:  { height: 50, borderRadius: 25, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' },
  confirmBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  discardBtn:  { alignItems: 'center', paddingVertical: 6 },
  discardBtnTxt: { fontSize: 12, color: '#9CA3AF', textDecorationLine: 'underline' },
});

// ── Screen styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:     { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:   { padding: 20 },

  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn:   { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 22, color: '#2D3436' },
  navTitle:  { fontSize: 16, fontWeight: '700', color: '#2D3436' },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10, marginTop: 6 },

  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  statusCardIcon:  { fontSize: 28 },
  statusCardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  statusCardSub:   { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  plansRow:          { flexDirection: 'row', gap: 10, marginBottom: 16 },
  planCard:          { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 2, borderColor: '#F0E0E6', backgroundColor: '#FFFAFA', position: 'relative' },
  planCardActive:    { borderColor: Colors.primary, backgroundColor: '#FFF0F3' },
  planCardHighlight: { borderColor: Colors.primary },
  planBadge:         { backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginBottom: 6 },
  planBadgeText:     { fontSize: 9, color: '#fff', fontWeight: '700', letterSpacing: 0.3 },
  planLabel:         { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 4 },
  planLabelActive:   { color: Colors.primary },
  planPrice:         { fontSize: 20, fontWeight: '800', color: '#2D3436' },
  planPriceActive:   { color: Colors.primary },
  planPer:           { fontSize: 10, color: '#A0A0A0', marginTop: 2, textAlign: 'center' },
  planNote:          { fontSize: 10, color: Colors.primary, fontWeight: '600', textAlign: 'center', marginTop: 5, lineHeight: 14 },
  planCheck:         { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  planCheckText:     { fontSize: 10, color: '#fff', fontWeight: '700' },

  benefitsList:    { marginBottom: 18 },
  benefitRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  benefitIconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFF0F3', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  benefitIcon:     { fontSize: 15 },
  benefitText:     { flex: 1, fontSize: 13, color: '#444', fontWeight: '500' },

  primaryBtn:        { height: 52, borderRadius: 26, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 10, elevation: 4 },
  primaryBtnLoading: { opacity: 0.7 },
  primaryBtnText:    { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
  secureNote:        { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginBottom: 8 },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 20 },

  boostCard: {
    flexDirection: 'row', gap: 12, backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#FCD34D', marginBottom: 14,
  },
  boostCardIcon:  { fontSize: 32 },
  boostCardTitle: { fontSize: 14, fontWeight: '700', color: '#92400E', marginBottom: 6 },
  boostBenefit:   { fontSize: 12, color: '#78350F', lineHeight: 20 },

  boostBtn:     { height: 52, borderRadius: 26, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center', elevation: 3 },
  boostBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
