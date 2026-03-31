import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, Image, StyleSheet, Dimensions,
  TouchableOpacity, ActivityIndicator, StatusBar,
  Platform, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import Colors from 'src/constants/Colors';
import { UserAPI, MatchAPI } from 'services/ApiServices';
import { useAuth } from 'src/store/authStore';
import { Routes } from 'src/constants/appConstants';

const { width: W, height: H } = Dimensions.get('window');
const CARD_W = W - 48;
const CARD_H = H * 0.58;

const getAge    = (dob) => !dob ? '' : Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));
const isMongoId = (id)  => typeof id === 'string' && id.length === 24 && /^[a-f0-9]+$/i.test(id);

const DUMMY = [
  { id: 'd1', name: 'Sarah',  dateOfBirth: '1999-05-10', city: 'New York',  country: 'USA', profession: 'Photographer', interests: ['Travel', 'Yoga'],    isOnline: true,  profilePicture: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800' },
  { id: 'd2', name: 'Emma',   dateOfBirth: '1997-08-22', city: 'Brooklyn',  country: 'USA', profession: 'Chef',          interests: ['Cooking', 'Music'],  isOnline: false, profilePicture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800' },
  { id: 'd3', name: 'Olivia', dateOfBirth: '2000-01-15', city: 'Manhattan', country: 'USA', profession: 'Engineer',      interests: ['Tech', 'Dancing'],   isOnline: true,  profilePicture: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800' },
];

// ── Profile Card ──────────────────────────────────────────────────────────────
function ProfileCard({ profile, onPress, actionAnim, actionType }) {
  const avatar = profile.profilePicture || profile.photos?.[0]
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&size=400&background=FF4D6D&color=fff`;
  const age = profile.age || getAge(profile.dateOfBirth);

  const likeOpacity  = actionType === 'like'  ? actionAnim : 0;
  const nopeOpacity  = actionType === 'nope'  ? actionAnim : 0;
  const superOpacity = actionType === 'super' ? actionAnim : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(profile)} activeOpacity={0.97}>
      <Image source={{ uri: avatar }} style={styles.cardImage} resizeMode="cover" />

      <Animated.View style={[styles.stamp, styles.stampLike,  { opacity: likeOpacity  }]}>
        <Text style={[styles.stampText, { color: '#2ECC71', borderColor: '#2ECC71' }]}>LIKE</Text>
      </Animated.View>
      <Animated.View style={[styles.stamp, styles.stampNope,  { opacity: nopeOpacity  }]}>
        <Text style={[styles.stampText, { color: '#E74C3C', borderColor: '#E74C3C' }]}>NOPE</Text>
      </Animated.View>
      <Animated.View style={[styles.stamp, styles.stampSuper, { opacity: superOpacity }]}>
        <Text style={[styles.stampText, { color: '#3498DB', borderColor: '#3498DB' }]}>SUPER</Text>
      </Animated.View>

      <View style={styles.cardOverlay}>
        <View style={styles.nameRow}>
          <Text style={styles.cardName}>{profile.name}{age ? `, ${age}` : ''}</Text>
          {profile.isOnline && <View style={styles.onlineDot} />}
        </View>
        {profile.profession && <Text style={styles.cardSub}>💼 {profile.profession}</Text>}
        <Text style={styles.cardSub}>📍 {profile.city}, {profile.country}</Text>
        {profile.distanceKm && <Text style={styles.cardSub}>📏 {profile.distanceKm}</Text>}
        {profile.interests?.length > 0 && (
          <View style={styles.tagsRow}>
            {profile.interests.slice(0, 3).map((t, i) => (
              <View key={i} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.tapHint}>
        <Text style={styles.tapHintText}>Tap to view full profile</Text>
      </View>
    </TouchableOpacity>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function HomeScreen({ navigation }) {
  const insets   = useSafeAreaInsets();
  const { user } = useAuth();

  const [tab,         setTab]         = useState('nearby');
  const [profiles,    setProfiles]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [noMore,      setNoMore]      = useState(false);
  const [page,        setPage]        = useState(1);
  const [actionAnim]                  = useState(new Animated.Value(0));
  const [actionType,  setActionType]  = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // Use refs to always have latest values without stale closures
  const profilesRef   = useRef(profiles);
  const noMoreRef     = useRef(noMore);
  const pageRef       = useRef(page);
  const tabRef        = useRef(tab);
  const locationRef   = useRef(userLocation);
  const fetchIdRef = useRef(0);

  useEffect(() => { profilesRef.current  = profiles;     }, [profiles]);
  useEffect(() => { noMoreRef.current    = noMore;       }, [noMore]);
  useEffect(() => { pageRef.current      = page;         }, [page]);
  useEffect(() => { tabRef.current       = tab;          }, [tab]);
  useEffect(() => { locationRef.current  = userLocation; }, [userLocation]);

  // ── Request location ──────────────────────────────────────────────────────
  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('📍 Location permission denied — using country-based search');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      console.log('📍 Location obtained:', loc.coords.latitude, loc.coords.longitude);
    } catch (err) {
      console.log('📍 Location error:', err.message);
    }
  };

  // ── Build search params ───────────────────────────────────────────────────
  const buildParams = useCallback((pageNum, currentTab, location) => {
    const params = { page: pageNum, limit: 10, tab: currentTab };
    if (user?.lookingFor && user.lookingFor !== 'both') params.gender = user.lookingFor;
    if (currentTab === 'nearby' && location) {
      params.lat    = location.lat;
      params.lng    = location.lng;
      params.radius = 100;
    }
    return params;
  }, [user]);

  // ── Fetch profiles ────────────────────────────────────────────────────────
  const fetchProfiles = useCallback(async (pageNum = 1, currentTab = tab, location = userLocation, reset = true) => {
    if (noMoreRef.current && pageNum > 1) return;
  
    // Generate unique ID for this fetch — ignore results from older fetches
    const fetchId = ++fetchIdRef.current;
  
    if (reset) setLoading(true);
  
    try {
      const params  = buildParams(pageNum, currentTab, location);
      console.log('🔍 [Home] Fetching:', params);
      const data    = await UserAPI.search(params);
  
      // Ignore if a newer fetch has started
      if (fetchId !== fetchIdRef.current) {
        console.log('🔍 [Home] Stale fetch ignored');
        return;
      }
  
      const fetched = data.users || [];
      console.log(`👥 [Home] Got ${fetched.length} real profiles`);
  
      if (fetched.length === 0 && pageNum === 1) {
        if (__DEV__) { setProfiles(DUMMY); }
        else setNoMore(true);
      } else if (fetched.length === 0) {
        setNoMore(true);
      } else {
        setProfiles((prev) => reset ? fetched : [...prev, ...fetched]);
        setNoMore(!data.hasMore);
      }
      setPage(pageNum);
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return;
      console.log('❌ [Home] Fetch error:', err.message);
      if (__DEV__ && reset) setProfiles(DUMMY);
    } finally {
      if (fetchId === fetchIdRef.current) {
        if (reset) setLoading(false);
      }
    }
  }, [tab, userLocation, buildParams]);

  // ── Re-fetch when tab or location changes ─────────────────────────────────
  useEffect(() => {
    setProfiles([]);
    setPage(1);
    setNoMore(false);
    fetchProfiles(1, tab, userLocation, true);
  }, [tab, userLocation]);

  // ── Animate stamp then advance ────────────────────────────────────────────
  const animateAction = (type, callback) => {
    setActionType(type);
    actionAnim.setValue(0);
    Animated.sequence([
      Animated.timing(actionAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(300),
      Animated.timing(actionAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setActionType(null);
      callback();
    });
  };

  // ── Handle action — uses refs so never stale ──────────────────────────────
  const handleAction = (type) => {
    const currentProfiles = profilesRef.current;
    if (currentProfiles.length === 0) return;

    const profile = currentProfiles[0];

    animateAction(type, async () => {
      // Remove top card
      setProfiles((prev) => {
        const rest = prev.slice(1);

        // Load more when running low — only for real profiles
        const realCount = rest.filter(p => isMongoId(p._id || p.id)).length;
        if (rest.length <= 2 && !noMoreRef.current && realCount > 0) {
          const nextPage = pageRef.current + 1;
          setPage(nextPage);
          fetchProfiles(nextPage, tabRef.current, locationRef.current, false);
        }

        return rest;
      });

      // Skip API for dummy profiles
      const id = profile._id || profile.id;
      if (!isMongoId(id)) {
        console.log('🧪 Dummy profile — skipping API');
        return;
      }

      // API call
      try {
        if (type === 'like' || type === 'super') {
          const res = await MatchAPI.likeUser(id, type === 'super');
          console.log('💕 Like response:', JSON.stringify(res));
          if (res?.match) {
            navigation.navigate('MatchScreen', {
              matchedUser: profile,
              matchId:     res.match._id,
            });
          }
        } else {
          await MatchAPI.passUser(id);
          console.log('👎 Passed:', id);
        }
      } catch (err) {
        console.log('❌ Action API error:', err.message);
      }
    });
  };

  // ── Tap profile ───────────────────────────────────────────────────────────
  const handleTap = (profile) => {
    const id = profile._id || profile.id;
    if (!isMongoId(id)) return;
    navigation.navigate(Routes.USER_PROFILE, { userId: id, profile });
  };

  const switchTab = (t) => {
    if (t === tab) return;
    setTab(t);
    setProfiles([]);
    setPage(1);
    setNoMore(false);
  };

  const topProfile  = profiles[0];
  const nextProfile = profiles[1];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF5F7" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn}>
          <Text style={styles.heartIcon}>♥</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>HeartLink</Text>
        <TouchableOpacity style={styles.filterBtn}>
          <Text style={styles.filterIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['nearby', 'global'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => switchTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.tabDivider} />

      {/* Card area */}
      <View style={styles.cardArea}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#FF4B7A" />
            <Text style={styles.centerText}>Finding matches...</Text>
          </View>
        ) : profiles.length === 0 ? (
          <View style={styles.center}>
            <Text style={{ fontSize: 56 }}>💔</Text>
            <Text style={styles.emptyTitle}>No more profiles</Text>
            <Text style={styles.emptySubtitle}>
              {tab === 'nearby'
                ? 'No one nearby — try switching to Global'
                : 'Check back later or broaden your search'}
            </Text>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => {
                setNoMore(false);
                setPage(1);
                fetchProfiles(1, tab, userLocation, true);
              }}
            >
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
            {tab === 'nearby' && (
              <TouchableOpacity
                style={[styles.refreshBtn, { backgroundColor: '#5B9BD5', marginTop: 8 }]}
                onPress={() => switchTab('global')}
              >
                <Text style={styles.refreshText}>Try Global</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.stack}>
            <View style={styles.bgCard} />

            {nextProfile && (
              <View style={styles.backCard}>
                <Image
                  source={{ uri: nextProfile.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(nextProfile.name)}&background=FF4D6D&color=fff&size=400` }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              </View>
            )}

            {topProfile && (
              <ProfileCard
                key={topProfile._id || topProfile.id}
                profile={topProfile}
                onPress={handleTap}
                actionAnim={actionAnim}
                actionType={actionType}
              />
            )}

            {/* Arrow buttons */}
            <TouchableOpacity style={[styles.arrowBtn, styles.arrowLeft]}  onPress={() => handleAction('nope')} activeOpacity={0.7}>
              <Text style={styles.arrowLeftIcon}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.arrowBtn, styles.arrowRight]} onPress={() => handleAction('like')} activeOpacity={0.7}>
              <Text style={styles.arrowRightIcon}>♥</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottom buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, styles.btnSmall]} onPress={() => handleAction('nope')}  activeOpacity={0.8}>
          <Text style={styles.iconNope}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.btnSmall]} onPress={() => handleAction('super')} activeOpacity={0.8}>
          <Text style={styles.iconSuper}>★</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.btnLarge]} onPress={() => handleAction('like')}  activeOpacity={0.8}>
          <Text style={styles.iconLike}>♥</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: '#FFF5F7' },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  headerIconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  heartIcon:     { fontSize: 24, color: '#FF4B7A' },
  headerTitle:   { fontSize: 22, fontWeight: '700', color: '#2D3436', letterSpacing: 0.5 },
  filterBtn:     { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFE4EC', alignItems: 'center', justifyContent: 'center' },
  filterIcon:    { fontSize: 18, color: '#FF4B7A' },

  tabs:          { flexDirection: 'row', justifyContent: 'center', gap: 32, paddingHorizontal: 20 },
  tabBtn:        { paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabBtnActive:  { borderBottomColor: '#FF4B7A' },
  tabText:       { fontSize: 16, fontWeight: '500', color: '#A0A0A0' },
  tabTextActive: { color: '#2D3436', fontWeight: '600' },
  tabDivider:    { height: 1, backgroundColor: '#F0E0E6', marginHorizontal: 20, marginBottom: 4 },

  cardArea:      { flex: 1, paddingHorizontal: 24, paddingVertical: 8 },
  stack:         { flex: 1, alignItems: 'center', justifyContent: 'center' },

  bgCard:   { position: 'absolute', width: CARD_W, height: CARD_H, backgroundColor: '#FFE4EC', borderRadius: 24, transform: [{ rotate: '-4deg' }], opacity: 0.5 },
  backCard: { position: 'absolute', width: CARD_W, height: CARD_H, borderRadius: 24, overflow: 'hidden', backgroundColor: '#FFD6E4', transform: [{ scale: 0.96 }], opacity: 0.75, zIndex: 1 },

  card: { width: CARD_W, height: CARD_H, borderRadius: 24, overflow: 'hidden', backgroundColor: '#FFD6E4', zIndex: 5, ...Platform.select({ ios: { shadowColor: '#FF4B7A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16 }, android: { elevation: 10 } }) },
  cardImage:    { width: '100%', height: '100%' },
  stamp:        { position: 'absolute', top: 44, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 3 },
  stampLike:    { left: 20,  transform: [{ rotate: '-15deg' }] },
  stampNope:    { right: 20, transform: [{ rotate: '15deg'  }] },
  stampSuper:   { left: CARD_W / 2 - 46, top: 44 },
  stampText:    { fontSize: 22, fontWeight: '800', letterSpacing: 2 },
  cardOverlay:  { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 18, paddingBottom: 18, paddingTop: 40, backgroundColor: 'rgba(0,0,0,0.38)', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  nameRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName:     { fontSize: 26, fontWeight: '700', color: '#fff' },
  onlineDot:    { width: 11, height: 11, borderRadius: 6, backgroundColor: '#2ECC71', borderWidth: 2, borderColor: '#fff' },
  cardSub:      { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 3 },
  tagsRow:      { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  tag:          { backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  tagText:      { fontSize: 12, color: '#fff', fontWeight: '500' },
  tapHint:      { position: 'absolute', top: 14, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  tapHintText:  { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

  arrowBtn:      { position: 'absolute', top: '40%', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.85)', zIndex: 10 },
  arrowLeft:     { left: -14 },
  arrowRight:    { right: -14 },
  arrowLeftIcon: { fontSize: 18, color: '#E74C3C', fontWeight: '700' },
  arrowRightIcon:{ fontSize: 20, color: '#FF4B7A' },

  actions:       { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, paddingVertical: 16 },
  actionBtn:     { alignItems: 'center', justifyContent: 'center', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6 }, android: { elevation: 4 } }) },
  btnSmall:      { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  btnLarge:      { width: 68, height: 68, borderRadius: 34, backgroundColor: '#FF4B7A' },
  iconNope:      { fontSize: 22, fontWeight: '700', color: '#A0A0A0' },
  iconSuper:     { fontSize: 22, color: '#5B9BD5' },
  iconLike:      { fontSize: 28, color: '#fff' },

  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  centerText:    { fontSize: 15, color: '#888', marginTop: 8 },
  emptyTitle:    { fontSize: 22, fontWeight: '700', color: '#2D3436' },
  emptySubtitle: { fontSize: 14, color: '#A0A0A0', textAlign: 'center', paddingHorizontal: 32 },
  refreshBtn:    { marginTop: 8, backgroundColor: '#FF4B7A', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24 },
  refreshText:   { color: '#fff', fontWeight: '600', fontSize: 15 },
});