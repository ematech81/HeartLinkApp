import React, {
  useState, useEffect, useCallback, useRef, useImperativeHandle,
} from 'react';
import {
  View, Text, Image, StyleSheet, Dimensions,
  TouchableOpacity, ActivityIndicator, StatusBar,
  Platform, Animated, PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { UserAPI, MatchAPI } from 'services/ApiServices';
import { useAuth } from 'src/store/authStore';
import { Routes } from 'src/constants/appConstants';
import UpgradeModal from 'src/components/UpgradeModal';

const { width: W, height: H } = Dimensions.get('window');

const SWIPE_THRESHOLD = W * 0.28;

const getAge    = (dob) => !dob ? '' : Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));
const isMongoId = (id)  => typeof id === 'string' && id.length === 24 && /^[a-f0-9]+$/i.test(id);

const DUMMY = [
  { id: 'd1', name: 'Sarah',  dateOfBirth: '1999-05-10', city: 'Lagos',         country: 'Nigeria', profession: 'Photographer', interests: ['Travel', 'Yoga'],   isOnline: true,  profilePicture: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800' },
  { id: 'd2', name: 'Emma',   dateOfBirth: '1997-08-22', city: 'Abuja',         country: 'Nigeria', profession: 'Chef',         interests: ['Cooking', 'Music'], isOnline: false, profilePicture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800' },
  { id: 'd3', name: 'Olivia', dateOfBirth: '2000-01-15', city: 'Port Harcourt', country: 'Nigeria', profession: 'Engineer',     interests: ['Tech', 'Dancing'],  isOnline: true,  profilePicture: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800' },
];

// ── Swipeable Card ─────────────────────────────────────────────────────────────
const SwipeCard = React.forwardRef(function SwipeCard(
  { profile, onSwipeLeft, onSwipeRight, onSwipeSuper, onTap, isTop, showBoostBadge },
  ref,
) {
  const position  = useRef(new Animated.ValueXY()).current;
  const superAnim = useRef(new Animated.Value(0)).current;

  // Keep latest props in a ref so PanResponder closure never goes stale
  const live = useRef({ onSwipeLeft, onSwipeRight, onSwipeSuper, onTap, isTop, profile });
  live.current = { onSwipeLeft, onSwipeRight, onSwipeSuper, onTap, isTop, profile };

  const avatar = profile.profilePicture || profile.photos?.[0]
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&size=800&background=FF4D6D&color=fff`;
  const age = profile.age || getAge(profile.dateOfBirth);

  // ── Interpolated values ──────────────────────────────────────────────────
  const rotate = position.x.interpolate({
    inputRange: [-W / 2, 0, W / 2],
    outputRange: ['-20deg', '0deg', '20deg'],
    extrapolate: 'clamp',
  });
  const likeOpacity = position.x.interpolate({
    inputRange: [20, W * 0.3],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const nopeOpacity = position.x.interpolate({
    inputRange: [-W * 0.3, -20],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // ── Swipe-out helper (stable via ref — safe to call from PanResponder) ───
  const doSwipeOut = useRef((direction) => {
    if (direction === 'up') {
      // Flash SUPER stamp, then fly card upward
      Animated.timing(superAnim, { toValue: 1, duration: 100, useNativeDriver: true }).start();
      Animated.timing(position, {
        toValue: { x: 0, y: -H * 1.5 },
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        position.setValue({ x: 0, y: 0 });
        superAnim.setValue(0);
        live.current.onSwipeSuper?.();
      });
      return;
    }
    const x = direction === 'right' ? W * 1.5 : -W * 1.5;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: 280,
      useNativeDriver: true,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      if (direction === 'right') live.current.onSwipeRight();
      else                       live.current.onSwipeLeft();
    });
  }).current;

  // ── Expose imperative swipe methods to parent ────────────────────────────
  useImperativeHandle(ref, () => ({
    swipeLeft:  () => doSwipeOut('left'),
    swipeRight: () => doSwipeOut('right'),
    swipeUp:    () => doSwipeOut('up'),
  }));

  // ── PanResponder ─────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: ()      => live.current.isTop,
      onMoveShouldSetPanResponder:  (_, g)  => live.current.isTop && (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3),
      onPanResponderMove:   (_, g) => position.setValue({ x: g.dx, y: g.dy }),
      onPanResponderRelease: (_, g) => {
        // Tap detection: barely moved → treat as tap
        if (Math.abs(g.dx) < 5 && Math.abs(g.dy) < 5) {
          live.current.onTap(live.current.profile);
          Animated.spring(position, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: true }).start();
          return;
        }
        if      (g.dx >  SWIPE_THRESHOLD) doSwipeOut('right');
        else if (g.dx < -SWIPE_THRESHOLD) doSwipeOut('left');
        else Animated.spring(position, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: true }).start();
      },
    })
  ).current;

  const cardStyle = isTop
    ? { transform: [...position.getTranslateTransform(), { rotate }] }
    : { transform: [{ scale: 0.96 }], opacity: 0.85 };

  return (
    <Animated.View
      style={[styles.card, cardStyle]}
      {...(isTop ? panResponder.panHandlers : {})}
    >
      <Image source={{ uri: avatar }} style={styles.cardImage} resizeMode="cover" />

      {/* LIKE stamp */}
      <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}>
        <Text style={[styles.stampText, { color: '#2ECC71', borderColor: '#2ECC71' }]}>LIKE</Text>
      </Animated.View>

      {/* NOPE stamp */}
      <Animated.View style={[styles.stamp, styles.stampNope, { opacity: nopeOpacity }]}>
        <Text style={[styles.stampText, { color: '#E74C3C', borderColor: '#E74C3C' }]}>NOPE</Text>
      </Animated.View>

      {/* SUPER stamp */}
      <Animated.View style={[styles.stamp, styles.stampSuper, { opacity: superAnim }]}>
        <Text style={[styles.stampText, { color: '#3498DB', borderColor: '#3498DB' }]}>SUPER</Text>
      </Animated.View>

      {/* Bottom info overlay */}
      <View style={styles.cardOverlay}>
        <View style={styles.nameRow}>
          <Text style={styles.cardName}>{profile.name?.split(' ')[0]}</Text>
          {age ? <Text style={styles.cardAge}> {age}</Text> : null}
          {showBoostBadge && (profile.isVerified || profile.isBoosted) && (
            <Text style={styles.verifiedBadge}>✔</Text>
          )}
          {profile.isOnline && <View style={styles.onlineDot} />}
        </View>
        {profile.profession && (
          <Text style={styles.cardSub}>💼 {profile.profession}</Text>
        )}
        <Text style={styles.cardSub}>
          📍 {[profile.city, profile.country].filter(Boolean).join(', ')}
        </Text>
        {profile.distanceKm && (
          <Text style={styles.cardSub}>📏 {profile.distanceKm}</Text>
        )}
        {profile.interests?.length > 0 && (
          <View style={styles.tagsRow}>
            {profile.interests.slice(0, 3).map((t, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{t}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
export default function HomeScreen({ navigation }) {
  const insets   = useSafeAreaInsets();
  const { user } = useAuth();

  const [showUpgrade, setShowUpgrade] = useState(false);

  // ── Fix 6: default tab is 'top' ─────────────────────────────────────────
  const [tab,          setTab]          = useState('top');
  const [profiles,     setProfiles]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [noMore,       setNoMore]       = useState(false);
  const [page,         setPage]         = useState(1);
  const [userLocation, setUserLocation] = useState(null);

  const profilesRef = useRef(profiles);
  const noMoreRef   = useRef(noMore);
  const pageRef     = useRef(page);
  const tabRef      = useRef(tab);
  const locationRef = useRef(userLocation);
  const fetchIdRef  = useRef(0);
  const topCardRef  = useRef(null);   // ← imperative ref for top SwipeCard

  useEffect(() => { profilesRef.current = profiles;     }, [profiles]);
  useEffect(() => { noMoreRef.current   = noMore;       }, [noMore]);
  useEffect(() => { pageRef.current     = page;         }, [page]);
  useEffect(() => { tabRef.current      = tab;          }, [tab]);
  useEffect(() => { locationRef.current = userLocation; }, [userLocation]);

  // ── Location ──────────────────────────────────────────────────────────────
  useEffect(() => { requestLocation(); }, []);

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch (err) {
      console.log('📍 Location error:', err.message);
    }
  };

  // ── Build params ──────────────────────────────────────────────────────────
  const buildParams = useCallback((pageNum, currentTab, location) => {
    const params = { page: pageNum, limit: 10, tab: currentTab };
    if (user?.lookingFor && user.lookingFor !== 'both') params.gender = user.lookingFor;
    if (currentTab === 'nearby' && location) {
      params.lat = location.lat; params.lng = location.lng; params.radius = 100;
    }
    return params;
  }, [user]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchProfiles = useCallback(async (pageNum = 1, currentTab = tab, location = userLocation, reset = true) => {
    if (noMoreRef.current && pageNum > 1) return;
    const fetchId = ++fetchIdRef.current;
    if (reset) setLoading(true);
    try {
      const params  = buildParams(pageNum, currentTab, location);
      const data    = await UserAPI.search(params);
      if (fetchId !== fetchIdRef.current) return;
      const fetched = data.users || [];
      if (fetched.length === 0 && pageNum === 1) {
        if (__DEV__) setProfiles(DUMMY); else setNoMore(true);
      } else if (fetched.length === 0) {
        setNoMore(true);
      } else {
        setProfiles((prev) => reset ? fetched : [...prev, ...fetched]);
        setNoMore(!data.hasMore);
      }
      setPage(pageNum);
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return;
      if (__DEV__ && reset) setProfiles(DUMMY);
    } finally {
      if (fetchId === fetchIdRef.current && reset) setLoading(false);
    }
  }, [tab, userLocation, buildParams]);

  useEffect(() => {
    setProfiles([]); setPage(1); setNoMore(false);
    fetchProfiles(1, tab, userLocation, true);
  }, [tab, userLocation]);

  // ── Execute action (API + advance card) ───────────────────────────────────
  const executeAction = useCallback(async (type, profile) => {
    setProfiles((prev) => {
      const rest = prev.slice(1);
      const realCount = rest.filter(p => isMongoId(p._id || p.id)).length;
      if (rest.length <= 2 && !noMoreRef.current && realCount > 0) {
        const nextPage = pageRef.current + 1;
        setPage(nextPage);
        fetchProfiles(nextPage, tabRef.current, locationRef.current, false);
      }
      return rest;
    });

    const id = profile._id || profile.id;
    if (!isMongoId(id)) return;

    try {
      if (type === 'like' || type === 'super') {
        const res = await MatchAPI.likeUser(id, type === 'super');
        if (res?.match) {
          navigation.navigate('MatchScreen', { matchedUser: profile, matchId: res.match._id });
        }
      } else if (type === 'nope') {
        await MatchAPI.passUser(id);
      }
    } catch (err) {
      console.log('❌ Action error:', err.message);
    }
  }, [fetchProfiles, navigation]);

  // ── Button presses — drive the card via imperative ref ────────────────────
  const handleButtonAction = (type) => {
    const top = profilesRef.current[0];
    if (!top) return;
    if (type === 'nope')  topCardRef.current?.swipeLeft();
    if (type === 'like')  topCardRef.current?.swipeRight();
    if (type === 'super') topCardRef.current?.swipeUp();
  };

  // ── Send message from swipe deck ──────────────────────────────────────────
  const handleSendMessage = () => {
    const top = profilesRef.current[0];
    if (!top) return;
    const subActive = user?.isSubscribed &&
      (!user.subscriptionExpiry || new Date(user.subscriptionExpiry) > new Date());
    if (!subActive) {
      setShowUpgrade(true);
      return;
    }
    const id     = top._id || top.id;
    const isReal = typeof id === 'string' && id.length === 24 && /^[a-f0-9]+$/i.test(id);
    if (!isReal) return;
    navigation.navigate(Routes.CHAT, {
      userId:     id,
      userName:   top.name,
      userAvatar: top.profilePicture || top.photos?.[0],
    });
  };

  const switchTab = (t) => {
    if (t === tab) return;
    setTab(t); setProfiles([]); setPage(1); setNoMore(false);
  };

  const topProfile  = profiles[0];
  const nextProfile = profiles[1];

  const TABS       = ['top', 'nearby', 'global', ];
  const TAB_LABELS = {top: 'Top Profiles' , nearby: 'Nearby', global: 'Global', };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Card stack ──────────────────────────────────────────────────── */}
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
              {tab === 'nearby' ? 'No one nearby — try Global' : 'Check back later'}
            </Text>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => { setNoMore(false); setPage(1); fetchProfiles(1, tab, userLocation, true); }}
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
          <>
            {/* Back card (peek) */}
            {nextProfile && (
              <SwipeCard
                key={nextProfile._id || nextProfile.id || 'next'}
                profile={nextProfile}
                isTop={false}
                showBoostBadge={tab === 'top'}
                onSwipeLeft={() => {}}
                onSwipeRight={() => {}}
                onSwipeSuper={() => {}}
                onTap={() => {}}
              />
            )}
            {/* Top swipeable card */}
            {topProfile && (
              <SwipeCard
                ref={topCardRef}
                key={topProfile._id || topProfile.id || 'top'}
                profile={topProfile}
                isTop={true}
                showBoostBadge={tab === 'top'}
                onSwipeLeft={() => executeAction('nope', topProfile)}
                onSwipeRight={() => executeAction('like', topProfile)}
                onSwipeSuper={() => executeAction('super', topProfile)}
                onTap={(p) => {
                  const id = p._id || p.id;
                  if (isMongoId(id)) navigation.navigate(Routes.USER_PROFILE, { userId: id, profile: p });
                }}
              />
            )}
          </>
        )}

        {/* ── Header overlay (on top of cards) ──────────────────────────── */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => navigation.navigate(Routes.PROFILE)}
            activeOpacity={0.8}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>

          <View style={styles.tabRow}>
            {TABS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                onPress={() => switchTab(t)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {TAB_LABELS[t]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* ── Action buttons ───────────────────────────────────────────────── */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={[styles.actionBtn, styles.btnMd]} onPress={() => handleButtonAction('nope')} activeOpacity={0.8}>
          <Text style={styles.iconNope}>✕</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.btnMd]} onPress={() => handleButtonAction('super')} activeOpacity={0.8}>
          <Text style={styles.iconSuper}>★</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.btnLg]} onPress={() => handleButtonAction('like')} activeOpacity={0.8}>
          <Text style={styles.iconLike}>♥</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.btnMsg]} onPress={handleSendMessage} activeOpacity={0.8}>
          <Text style={styles.iconMsg}>💬</Text>
        </TouchableOpacity>
      </View>

      <UpgradeModal
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onSuccess={() => setShowUpgrade(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: '#1a1a1a' },
  cardArea: { flex: 1 },

  card: {
    position: 'absolute',
    width:    W,
    height:   '100%',
    backgroundColor: '#222',
  },
  cardImage: { width: '100%', height: '100%' },

  // ── Stamps ────────────────────────────────────────────────────────────────
  stamp:      { position: 'absolute', top: 140, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 3 },
  stampLike:  { left: 20,  transform: [{ rotate: '-15deg' }] },
  stampNope:  { right: 20, transform: [{ rotate: '15deg'  }] },
  stampSuper: { alignSelf: 'center', left: W / 2 - 70, transform: [{ rotate: '-5deg' }] },
  stampText:  { fontSize: 26, fontWeight: '900', letterSpacing: 2 },

  // ── Fix 5: dark overlay behind profile info ───────────────────────────────
  cardOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingBottom: 24, paddingTop: 10,
    backgroundColor: 'rgba(0,0,0,0.50)',
  },
  nameRow:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  cardName:     { fontSize: 30, fontWeight: '800', color: '#fff' },
  cardAge:      { fontSize: 28, fontWeight: '400', color: '#fff' },
  verifiedBadge:{ fontSize: 18, color: '#3498DB', marginLeft: 6 },
  onlineDot:    { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2ECC71', borderWidth: 2, borderColor: '#fff', marginLeft: 8 },
  cardSub:      { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  tagsRow:      { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  tag:          { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  tagText:      { fontSize: 12, color: '#fff', fontWeight: '500' },

  // ── Fix 4: header overlay — higher opacity ─────────────────────────────
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  menuBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  menuIcon:     { fontSize: 18, color: '#fff' },
  tabRow:       { flex: 1, flexDirection: 'row', gap: 6 },
  tabBtn:       { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)' },
  tabBtnActive: { backgroundColor: '#FF4B7A' },
  tabText:      { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  tabTextActive:{ color: '#fff' },

  // ── Fix 3: smaller action bar ─────────────────────────────────────────────
  actions: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 16, paddingTop: 8, backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 12 },
    }),
  },
  actionBtn: {
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  btnMd:    { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#F0E0E6' },
  btnLg:    { width: 62, height: 62, borderRadius: 31, backgroundColor: '#FF4B7A' },
  btnMsg:   { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#F0E0E6' },
  iconNope: { fontSize: 22, fontWeight: '700', color: '#E74C3C' },
  iconSuper:{ fontSize: 20, color: '#3498DB' },
  iconLike: { fontSize: 28, color: '#fff' },
  iconMsg:  { fontSize: 20 },

  // ── Empty / loading states ────────────────────────────────────────────────
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  centerText:   { fontSize: 15, color: '#aaa', marginTop: 8 },
  emptyTitle:   { fontSize: 22, fontWeight: '700', color: '#fff' },
  emptySubtitle:{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', paddingHorizontal: 32 },
  refreshBtn:   { marginTop: 8, backgroundColor: '#FF4B7A', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24 },
  refreshText:  { color: '#fff', fontWeight: '600', fontSize: 15 },
});
