import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, StatusBar,
  Dimensions, FlatList, Platform, Modal, Alert,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from 'src/constants/Colors';
import { Spacing, Radius } from 'src/constants/layout';
import { FontSize, FontWeight } from 'src/constants/topography';
import { useAuth } from 'src/store/authStore';
import { PaymentAPI } from 'services/ApiServices';
import PaystackWebView from 'src/components/PaystackWebView';

const { width: W } = Dimensions.get('window');
const HERO_H = W * 1.05;

const getAge = (dob) =>
  !dob ? null : Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));

const capitalize = (str) =>
  str ? str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';

const stillActive = (expiry) => expiry && new Date(expiry) > new Date();

// ── Info card ─────────────────────────────────────────────────────────────────
function InfoCard({ icon, label, value }) {
  if (!value) return null;
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoCardIcon}>{icon}</Text>
      <View>
        <Text style={styles.infoCardLabel}>{label}</Text>
        <Text style={styles.infoCardValue}>{capitalize(value)}</Text>
      </View>
    </View>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHeading({ icon, title }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionHeadingIcon}>{icon}</Text>
      <Text style={styles.sectionHeadingText}>{title}</Text>
    </View>
  );
}

// ── Boost Modal ───────────────────────────────────────────────────────────────
function BoostModal({ visible, onClose, onBoost, loading, alreadyBoosted, boostExpiry }) {
  const daysLeft = boostExpiry
    ? Math.ceil((new Date(boostExpiry) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={boostStyles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={boostStyles.sheet}>
        <View style={boostStyles.handle} />

        <Text style={boostStyles.icon}>⚡</Text>
        <Text style={boostStyles.title}>Boost Your Profile</Text>

        {alreadyBoosted && daysLeft > 0 ? (
          <View style={boostStyles.activeRow}>
            <Text style={boostStyles.activeBadge}>⚡ Active — {daysLeft} day{daysLeft !== 1 ? 's' : ''} left</Text>
          </View>
        ) : null}

        <View style={boostStyles.benefitsBox}>
          {[
            '📍 Appear at the top of search results',
            '💙 Blue verified badge on your profile',
            '👀 Get 10× more profile views',
            '🔥 Featured in Top Profiles across the app',
          ].map((line, i) => (
            <Text key={i} style={boostStyles.benefitLine}>{line}</Text>
          ))}
        </View>

        <View style={boostStyles.priceRow}>
          <Text style={boostStyles.price}>₦3,000</Text>
          <Text style={boostStyles.pricePer}> / week</Text>
        </View>

        <TouchableOpacity
          style={[boostStyles.boostBtn, loading && { opacity: 0.7 }]}
          onPress={onBoost}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={boostStyles.boostBtnText}>
                {alreadyBoosted ? '⚡  Boost Again' : '⚡  Boost Now — ₦3,000'}
              </Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} style={boostStyles.cancelBtn}>
          <Text style={boostStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const boostStyles = StyleSheet.create({
  backdrop:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 28, paddingTop: 12,
    alignItems: 'center',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.12, shadowRadius: 16 }, android: { elevation: 24 } }),
  },
  handle:    { width: 44, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', marginBottom: 20 },
  icon:      { fontSize: 44, marginBottom: 6 },
  title:     { fontSize: 22, fontWeight: '800', color: '#2D3436', marginBottom: 12 },
  activeRow: { marginBottom: 10 },
  activeBadge: { backgroundColor: '#EBF8FF', color: '#3498DB', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, fontWeight: '700', fontSize: 13 },
  benefitsBox: { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 14, padding: 16, marginBottom: 18, gap: 8 },
  benefitLine: { fontSize: 14, color: '#444', lineHeight: 22 },
  priceRow:  { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  price:     { fontSize: 30, fontWeight: '800', color: '#3498DB' },
  pricePer:  { fontSize: 15, color: '#888' },
  boostBtn: {
    width: '100%', height: 52, borderRadius: 26, backgroundColor: '#3498DB',
    alignItems: 'center', justifyContent: 'center', marginTop: 14,
    ...Platform.select({ ios: { shadowColor: '#3498DB', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10 }, android: { elevation: 6 } }),
  },
  boostBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  cancelBtn:    { marginTop: 12, paddingVertical: 8 },
  cancelText:   { fontSize: 14, color: '#A0A0A0' },
});

// ══════════════════════════════════════════════════════════════════════════════
export default function ProfileScreen({ navigation }) {
  const insets           = useSafeAreaInsets();
  const { user, updateUser } = useAuth();

  const [activeTab,    setActiveTab]    = useState('about');
  const [photoIndex,   setPhotoIndex]   = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [showBoost,    setShowBoost]    = useState(false);
  const [boostLoading, setBoostLoading] = useState(false);
  const videoRef = useRef(null);

  // Paystack checkout state for boost
  const [boostPaystackUrl,  setBoostPaystackUrl]  = useState(null);
  const [boostTxRef,        setBoostTxRef]        = useState(null);
  const [showBoostPaystack, setShowBoostPaystack] = useState(false);

  // Pending confirm (shown after WebView closes manually)
  const [boostPendingRef,   setBoostPendingRef]   = useState(null);
  const [boostConfirming,   setBoostConfirming]   = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => setPhotoIndex(0));
    return unsubscribe;
  }, [navigation]);

  if (!user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const age = user.age || getAge(user.dateOfBirth);
  const isBoosted     = !!(user.isBoosted    && stillActive(user.boostExpiry));
  const isSubscribed  = !!(user.isSubscribed && stillActive(user.subscriptionExpiry));

  const allMedia = [
    user.profilePicture,
    ...(Array.isArray(user.photos) ? user.photos : []),
  ].filter(Boolean);

  if (allMedia.length === 0) {
    allMedia.push(
      `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=600&background=FF4D6D&color=fff`
    );
  }

  const onPhotoScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    setPhotoIndex(idx);
  };

  const toggleVideo = async () => {
    if (!videoRef.current) return;
    if (videoPlaying) await videoRef.current.pauseAsync();
    else              await videoRef.current.playAsync();
    setVideoPlaying(!videoPlaying);
  };

  // Step 1: Show pre-payment info (BoostModal already shows benefits — Alert is enough here)
  const handleBoost = () => {
    setShowBoost(false);
    Alert.alert(
      '💳 How Boost Payment Works',
      '1. Paystack checkout will open.\n2. Complete your ₦3,000 payment.\n3. Tap "I\'ve Completed Payment" to return.\n4. Tap "Confirm Payment" to activate your boost.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setShowBoost(true) },
        { text: 'Proceed →', onPress: startBoostPayment },
      ]
    );
  };

  // Step 2: Initialize Paystack transaction for boost
  const startBoostPayment = async () => {
    setBoostLoading(true);
    try {
      const data = await PaymentAPI.initializePayment('boost');
      setBoostPaystackUrl(data.authorization_url);
      setBoostTxRef(data.reference);
      setBoostPendingRef(data.reference);
      setShowBoostPaystack(true);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not start payment. Please try again.');
    } finally {
      setBoostLoading(false);
    }
  };

  // Step 3a: WebView auto-detected callback
  const handleBoostPaystackSuccess = async (reference) => {
    setShowBoostPaystack(false);
    setBoostPaystackUrl(null);
    setBoostTxRef(null);
    verifyBoost(reference);
  };

  // Step 3b: User manually closed WebView — keep pendingRef for confirm card
  const handleBoostPaystackCancel = () => {
    setShowBoostPaystack(false);
    setBoostPaystackUrl(null);
    setBoostTxRef(null);
    // boostPendingRef kept — confirm card appears in profile header
  };

  // Step 4: Verify and activate boost
  const verifyBoost = async (reference) => {
    setBoostConfirming(true);
    try {
      const data = await PaymentAPI.verifyPayment(reference, 'boost');
      await updateUser({ isBoosted: true, boostExpiry: data.boostExpiry, isVerified: true });
      setBoostPendingRef(null);
      Alert.alert('⚡ Profile Boosted!', 'Your profile is now featured at the top for 7 days.', [{ text: 'Awesome!' }]);
    } catch (err) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('not completed') || msg.includes('mismatch')) {
        Alert.alert('Payment Not Found', 'If you completed the payment, wait a moment and tap Confirm again.');
      } else {
        Alert.alert('Verification Failed', err.message || 'Could not verify. Please try again.');
      }
    } finally {
      setBoostConfirming(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{user?.name?.split(' ')[0]}'s Profile</Text>

        <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('EditProfile')}>
          <Text style={styles.menuBtnText}>⋮</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* ── Photo carousel ──────────────────────────────────────── */}
        <View style={styles.heroContainer}>
          <FlatList
            data={allMedia}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.heroImage} resizeMode="cover" />
            )}
            keyExtractor={(_, i) => i.toString()}
            horizontal pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onPhotoScroll}
            scrollEventThrottle={16}
            bounces={false}
          />
          {allMedia.length > 1 && (
            <View style={styles.dotsRow}>
              {allMedia.map((_, i) => (
                <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* ── Identity ─────────────────────────────────────────────── */}
        <View style={styles.identitySection}>
          <View style={styles.identityTop}>
            <View style={styles.identityLeft}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>
                  {user.name}{age ? `, ${age}` : ''}
                </Text>
                {user.isVerified && (
                  <Text style={styles.verifiedIcon}>✓</Text>
                )}
              </View>
              {(user.profession || user.city) && (
                <Text style={styles.userProfession}>
                  {[user.profession, user.city].filter(Boolean).join(' · ')}
                </Text>
              )}
              {/* Subscription / Boost status pills */}
              <View style={styles.statusPills}>
                {isSubscribed && (
                  <View style={[styles.statusPill, styles.pillSub]}>
                    <Text style={styles.pillText}>👑 Premium</Text>
                  </View>
                )}
                {isBoosted && (
                  <View style={[styles.statusPill, styles.pillBoost]}>
                    <Text style={styles.pillText}>⚡ Boosted</Text>
                  </View>
                )}
              </View>
            </View>

            {user.distanceKm && (
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceBadgeText}>{user.distanceKm}</Text>
                <Text style={styles.distanceBadgeSub}>away</Text>
              </View>
            )}
          </View>

          {/* ── Boost confirm card ───────────────────────────────── */}
          {boostPendingRef && (
            <View style={styles.boostConfirmCard}>
              <Text style={styles.boostConfirmTitle}>✅ Payment Completed?</Text>
              <Text style={styles.boostConfirmSub}>Tap below to activate your 7-day boost instantly.</Text>
              <TouchableOpacity
                style={[styles.boostConfirmBtn, boostConfirming && { opacity: 0.7 }]}
                onPress={() => verifyBoost(boostPendingRef)}
                disabled={boostConfirming}
                activeOpacity={0.85}
              >
                {boostConfirming
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.boostConfirmBtnTxt}>Confirm Boost Payment</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setBoostPendingRef(null)} style={{ paddingTop: 6 }}>
                <Text style={styles.boostConfirmDiscard}>I did not complete payment</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Edit Profile — prominent ─────────────────────────── */}
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.85}
          >
            <Text style={styles.editProfileBtnText}>✎  Edit Profile</Text>
          </TouchableOpacity>

          {/* ── Premium / Subscription button ────────────────────── */}
          <TouchableOpacity
            style={styles.premiumBtn}
            onPress={() => navigation.navigate('Subscription')}
            activeOpacity={0.85}
          >
            <Text style={styles.premiumBtnText}>
              {isSubscribed ? '👑  Manage Subscription' : '👑  Go Premium'}
            </Text>
          </TouchableOpacity>

          {/* ── Boost button ─────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.boostProfileBtn}
            onPress={() => setShowBoost(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.boostProfileBtnText}>
              {isBoosted ? '⚡  Boost Again' : '⚡  Boost Your Account'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── About / Activity tabs ─────────────────────────────────── */}
        <View style={styles.tabsContainer}>
          {['about', 'activity'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'about' ? (
          <View style={styles.content}>
            {!!user.bio && (
              <View style={styles.contentSection}>
                <SectionHeading icon="👤" title="Bio" />
                <Text style={styles.bioText}>{user.bio}</Text>
              </View>
            )}

            {user.introVideo && (
              <View style={styles.contentSection}>
                <SectionHeading icon="🎬" title="30-Second Intro" />
                <TouchableOpacity style={styles.videoWrapper} onPress={toggleVideo} activeOpacity={0.95}>
                  <Video
                    ref={videoRef}
                    source={{ uri: user.introVideo }}
                    style={styles.video}
                    resizeMode={ResizeMode.COVER}
                    isLooping={false}
                    onPlaybackStatusUpdate={(s) => { if (s.isLoaded) setVideoPlaying(s.isPlaying); }}
                  />
                  {!videoPlaying && (
                    <View style={styles.playOverlay}>
                      <View style={styles.playCircle}>
                        <Text style={styles.playIcon}>▶</Text>
                      </View>
                    </View>
                  )}
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>0:30</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {(user.relationshipType || user.profession) && (
              <View style={styles.infoCardsRow}>
                {user.relationshipType && <InfoCard icon="👫" label="STATUS"     value={user.relationshipType} />}
                {user.profession       && <InfoCard icon="💼" label="PROFESSION" value={user.profession} />}
              </View>
            )}

            {user.interests?.length > 0 && (
              <View style={styles.contentSection}>
                <SectionHeading icon="♥" title="Interests" />
                <View style={styles.interestsWrap}>
                  {user.interests.map((item, i) => (
                    <View key={i} style={styles.interestChip}>
                      <Text style={styles.interestText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {(user.city || user.country) && (
              <View style={styles.contentSection}>
                <SectionHeading icon="📍" title="Location" />
                <View style={styles.mapPlaceholder}>
                  <View style={styles.mapPin}>
                    <Text style={styles.mapPinIcon}>📍</Text>
                  </View>
                </View>
                <Text style={styles.locationLabel}>
                  {[user.city, user.country].filter(Boolean).join(', ')}
                  {user.distanceKm ? ` • ${user.distanceKm}` : ''}
                </Text>
              </View>
            )}

            {(user.education || user.religion || user.drink || user.smoke) && (
              <View style={styles.contentSection}>
                <SectionHeading icon="ℹ️" title="More Details" />
                <View style={styles.detailsGrid}>
                  {user.education && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>🎓 Education</Text>
                      <Text style={styles.detailValue}>{capitalize(user.education)}</Text>
                    </View>
                  )}
                  {user.religion && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>🙏 Religion</Text>
                      <Text style={styles.detailValue}>{capitalize(user.religion)}</Text>
                    </View>
                  )}
                  {user.drink && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>🍷 Drinks</Text>
                      <Text style={styles.detailValue}>{capitalize(user.drink)}</Text>
                    </View>
                  )}
                  {user.smoke && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>🚬 Smokes</Text>
                      <Text style={styles.detailValue}>{capitalize(user.smoke)}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.activityPlaceholder}>
            <Text style={styles.activityEmoji}>📊</Text>
            <Text style={styles.activityTitle}>Activity</Text>
            <Text style={styles.activitySub}>
              Your likes, matches, and profile views will appear here.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Boost Modal ───────────────────────────────────────────── */}
      <BoostModal
        visible={showBoost}
        onClose={() => setShowBoost(false)}
        onBoost={handleBoost}
        loading={boostLoading}
        alreadyBoosted={isBoosted}
        boostExpiry={user.boostExpiry}
      />

      {/* ── Paystack checkout for boost ────────────────────────────── */}
      {showBoostPaystack && boostPaystackUrl && (
        <PaystackWebView
          visible={showBoostPaystack}
          authorizationUrl={boostPaystackUrl}
          reference={boostTxRef}
          onSuccess={handleBoostPaystackSuccess}
          onCancel={handleBoostPaystackCancel}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F9FAFB' },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: 12, backgroundColor: '#F9FAFB',
  },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#FFF0F3' },
  backArrow:   { fontSize: 22, color: Colors.primary, fontWeight: FontWeight.bold },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  menuBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  menuBtnText: { fontSize: 22, color: Colors.text, fontWeight: FontWeight.bold },

  // ── Hero ───────────────────────────────────────────────────────────────────
  heroContainer: { width: W, height: HERO_H, backgroundColor: '#f0f0f0' },
  heroImage:     { width: W, height: HERO_H },
  dotsRow:       { position: 'absolute', bottom: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot:           { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive:     { width: 20, backgroundColor: '#fff' },

  // ── Identity ───────────────────────────────────────────────────────────────
  identitySection: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: '#F9FAFB' },
  identityTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  identityLeft:    { flex: 1, marginRight: Spacing.md },
  nameRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  userName:        { fontSize: 28, fontWeight: FontWeight.extrabold, color: Colors.text, letterSpacing: -0.5 },
  verifiedIcon:    { width: 22, height: 22, borderRadius: 11, backgroundColor: '#3B82F6', color: '#fff', textAlign: 'center', lineHeight: 22, fontSize: 12, fontWeight: FontWeight.bold, overflow: 'hidden' },
  userProfession:  { fontSize: FontSize.base, color: Colors.primary, fontWeight: FontWeight.medium, lineHeight: 22 },

  statusPills:  { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  statusPill:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pillSub:      { backgroundColor: '#FFF0F3', borderWidth: 1, borderColor: '#FFB8CC' },
  pillBoost:    { backgroundColor: '#EBF8FF', borderWidth: 1, borderColor: '#90CDF4' },
  pillText:     { fontSize: 11, fontWeight: '700', color: '#444' },

  distanceBadge:    { backgroundColor: '#FFF0F3', paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.lg, alignItems: 'center', borderWidth: 1, borderColor: '#FFB8CC' },
  distanceBadgeText:{ fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.primary },
  distanceBadgeSub: { fontSize: FontSize.xs, color: Colors.primary },

  // ── Edit Profile — prominent ───────────────────────────────────────────────
  editProfileBtn: {
    backgroundColor: Colors.primary, paddingVertical: 14,
    borderRadius: Radius.full, alignItems: 'center', marginBottom: 10,
    ...Platform.select({
      ios:     { shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 5 },
    }),
  },
  editProfileBtnText: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

  // ── Premium button ─────────────────────────────────────────────────────────
  premiumBtn: {
    backgroundColor: '#FFF7ED', borderWidth: 2, borderColor: '#F59E0B',
    paddingVertical: 13, borderRadius: Radius.full, alignItems: 'center',
    marginBottom: 10,
  },
  premiumBtnText: { fontSize: 15, fontWeight: '700', color: '#B45309' },

  // ── Boost button ───────────────────────────────────────────────────────────
  boostProfileBtn: {
    backgroundColor: '#EBF8FF', borderWidth: 2, borderColor: '#3498DB',
    paddingVertical: 13, borderRadius: Radius.full, alignItems: 'center',
  },
  boostProfileBtnText: { fontSize: 15, fontWeight: '700', color: '#3498DB' },

  // ── Boost confirm card ─────────────────────────────────────────────────────
  boostConfirmCard: {
    backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14,
    marginHorizontal: Spacing.lg, marginBottom: 10,
    borderWidth: 1.5, borderColor: '#86EFAC', alignItems: 'center', gap: 6,
  },
  boostConfirmTitle:   { fontSize: 14, fontWeight: '700', color: '#14532D' },
  boostConfirmSub:     { fontSize: 12, color: '#166534', textAlign: 'center' },
  boostConfirmBtn:     { backgroundColor: '#16A34A', borderRadius: 22, paddingVertical: 11, paddingHorizontal: 24, marginTop: 4 },
  boostConfirmBtnTxt:  { color: '#fff', fontWeight: '700', fontSize: 13 },
  boostConfirmDiscard: { fontSize: 11, color: '#9CA3AF', textDecorationLine: 'underline' },

  // ── Tabs ───────────────────────────────────────────────────────────────────
  tabsContainer: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: 4, marginTop: Spacing.sm, backgroundColor: '#fff', borderRadius: Radius.full, padding: 4, borderWidth: 1, borderColor: '#F3F4F6' },
  tabBtn:        { flex: 1, paddingVertical: 10, borderRadius: Radius.full, alignItems: 'center' },
  tabBtnActive:  { backgroundColor: '#FFF0F3' },
  tabBtnText:    { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  tabBtnTextActive: { color: Colors.primary, fontWeight: FontWeight.bold },

  // ── Content ────────────────────────────────────────────────────────────────
  content:        { paddingHorizontal: Spacing.lg },
  contentSection: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.lg, marginTop: Spacing.md },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  sectionHeadingIcon: { fontSize: 18 },
  sectionHeadingText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text },
  bioText: { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 24 },

  // ── Video ──────────────────────────────────────────────────────────────────
  videoWrapper:  { borderRadius: Radius.lg, overflow: 'hidden', position: 'relative' },
  video:         { width: '100%', height: 200, backgroundColor: '#000' },
  playOverlay:   { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playCircle:    { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  playIcon:      { fontSize: 22, color: '#fff', marginLeft: 4 },
  durationBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  durationText:  { fontSize: FontSize.xs, color: '#fff', fontWeight: FontWeight.semibold },

  // ── Info cards ─────────────────────────────────────────────────────────────
  infoCardsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  infoCard:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: '#F3F4F6' },
  infoCardIcon: { fontSize: 22 },
  infoCardLabel:{ fontSize: 10, fontWeight: FontWeight.bold, color: Colors.textSecondary, letterSpacing: 0.8 },
  infoCardValue:{ fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, marginTop: 2 },

  // ── Interests ──────────────────────────────────────────────────────────────
  interestsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  interestChip:  { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: '#F3F4F6' },
  interestText:  { fontSize: FontSize.sm, color: Colors.text, fontWeight: FontWeight.medium },

  // ── Location ───────────────────────────────────────────────────────────────
  mapPlaceholder: { height: 140, backgroundColor: '#FFE4EC', borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  mapPin:         { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  mapPinIcon:     { fontSize: 22 },
  locationLabel:  { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },

  // ── Details grid ───────────────────────────────────────────────────────────
  detailsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  detailItem:   { flex: 1, minWidth: '45%', backgroundColor: '#F9FAFB', borderRadius: Radius.md, padding: Spacing.md, gap: 4 },
  detailLabel:  { fontSize: FontSize.xs, color: Colors.textSecondary },
  detailValue:  { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },

  // ── Activity tab ───────────────────────────────────────────────────────────
  activityPlaceholder: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  activityEmoji: { fontSize: 52 },
  activityTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  activitySub:   { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
});
