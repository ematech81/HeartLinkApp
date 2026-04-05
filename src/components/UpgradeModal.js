/**
 * UpgradeModal
 *
 * Step-1: Show plan picker → user taps "Pay with Paystack"
 * Step-2: Backend initializes transaction → open PaystackWebView
 * Step-3: User pays → WebView detects callback → call /payment/verify
 * Step-4: Update auth store → show success
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ActivityIndicator, Alert, Platform, ScrollView,
} from 'react-native';
import { PaymentAPI } from 'services/ApiServices';
import { useAuth } from 'src/store/authStore';
import PaystackWebView from 'src/components/PaystackWebView';

const BENEFITS = [
  { icon: '♾️', text: 'Send unlimited messages to anyone' },
  { icon: '🚫', text: 'Block users who make you uncomfortable' },
  { icon: '🚨', text: 'Report inappropriate profiles' },
  { icon: '❤️', text: 'See who liked you instantly' },
  { icon: '⚡', text: 'Priority in search results' },
  { icon: '✔',  text: 'Verified member badge on your profile' },
];

const PLANS = [
  {
    id:        'monthly',
    label:     'Monthly',
    price:     '₦5,000',
    per:       '/ month',
    badge:     null,
    highlight: false,
  },
  {
    id:        'yearly',
    label:     'Yearly',
    price:     '₦20,000',
    per:       '/ year',
    badge:     '🔥 Best Value',
    highlight: true,
    note:      'Includes 1 week FREE profile boost!',
  },
];

export default function UpgradeModal({ visible, onClose, onSuccess }) {
  const { updateUser } = useAuth();

  const [loading,      setLoading]      = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  // Paystack checkout state
  const [paystackUrl, setPaystackUrl]   = useState(null);
  const [txReference,  setTxReference]  = useState(null);
  const [showPaystack, setShowPaystack] = useState(false);

  // ── Step 1: initialize transaction ────────────────────────────────────────
  const handlePayNow = async () => {
    setLoading(true);
    try {
      const data = await PaymentAPI.initializePayment(selectedPlan);
      setPaystackUrl(data.authorization_url);
      setTxReference(data.reference);
      setShowPaystack(true);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not start payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: WebView detected callback — verify with backend ───────────────
  const handlePaystackSuccess = async (reference) => {
    setShowPaystack(false);
    setLoading(true);
    try {
      const data = await PaymentAPI.verifyPayment(reference, selectedPlan);

      // Mirror the activated state into the local auth store
      await updateUser({
        isSubscribed:       data.subscriptionExpiry ? true : undefined,
        subscriptionExpiry: data.subscriptionExpiry || undefined,
        subscriptionPlan:   selectedPlan !== 'boost' ? selectedPlan : undefined,
        ...(data.boostExpiry ? { isBoosted: true, boostExpiry: data.boostExpiry, isVerified: true } : {}),
      });

      onClose();
      onSuccess?.();
      Alert.alert(
        '🎉 Payment Successful!',
        data.message || 'Your premium access is now active.',
        [{ text: 'Awesome!', style: 'default' }]
      );
    } catch (err) {
      Alert.alert(
        'Verification Failed',
        'Payment received but we could not confirm it yet. Please restart the app — your access will activate automatically.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePaystackCancel = () => {
    setShowPaystack(false);
    setPaystackUrl(null);
    setTxReference(null);
  };

  return (
    <>
      {/* ── Main plan-picker sheet ─────────────────────────────────────── */}
      <Modal
        visible={visible && !showPaystack}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
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
                  {plan.note && (
                    <Text style={styles.planNote}>{plan.note}</Text>
                  )}
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
              style={[styles.subscribeBtn, loading && styles.subscribeBtnLoading]}
              onPress={handlePayNow}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : (
                  <View style={styles.ctaInner}>
                    <Text style={styles.subscribeBtnText}>
                      Pay {PLANS.find((p) => p.id === selectedPlan)?.price} with Paystack
                    </Text>
                    <Text style={styles.ctaLock}>🔒</Text>
                  </View>
                )
              }
            </TouchableOpacity>

            <Text style={styles.priceNote}>Secure payment via Paystack · Cancel anytime</Text>

            <TouchableOpacity onPress={onClose} style={styles.laterBtn}>
              <Text style={styles.laterText}>Maybe Later</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Paystack checkout WebView ──────────────────────────────────── */}
      {showPaystack && paystackUrl && (
        <PaystackWebView
          visible={showPaystack}
          authorizationUrl={paystackUrl}
          reference={txReference}
          onSuccess={handlePaystackSuccess}
          onCancel={handlePaystackCancel}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position:  'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    paddingTop: 12,
    maxHeight: '92%',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.12, shadowRadius: 16 },
      android: { elevation: 24 },
    }),
  },
  handle: { width: 44, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', alignSelf: 'center', marginBottom: 16 },

  crown:    { fontSize: 40, textAlign: 'center', marginBottom: 6 },
  title:    { fontSize: 22, fontWeight: '800', color: '#2D3436', textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 4, marginBottom: 18, lineHeight: 19, paddingHorizontal: 10 },

  // ── Plan cards ─────────────────────────────────────────────────────────────
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

  // ── Benefits ───────────────────────────────────────────────────────────────
  benefitsList:    { marginBottom: 18 },
  benefitRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  benefitIconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFF0F3', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  benefitIcon:     { fontSize: 15 },
  benefitText:     { flex: 1, fontSize: 13, color: '#444', fontWeight: '500' },

  // ── CTA ────────────────────────────────────────────────────────────────────
  subscribeBtn: {
    height: 52, borderRadius: 26,
    backgroundColor: '#FF4B7A', alignItems: 'center', justifyContent: 'center',
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

  laterBtn:  { alignSelf: 'center', paddingVertical: 12 },
  laterText: { fontSize: 13, color: '#A0A0A0', fontWeight: '500' },
});
