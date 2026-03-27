import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Platform,
  PanResponder,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from 'src/constants/Colors';
import { UserAPI, MatchAPI } from 'services/ApiServices';
import { useAuth } from 'src/store/authStore';
import * as AuthSession from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH   = SCREEN_WIDTH - 48;
const CARD_HEIGHT  = SCREEN_HEIGHT * 0.62;
const SWIPE_THRESHOLD    = SCREEN_WIDTH * 0.25; // how far to swipe before action
const SWIPE_OUT_DURATION = 250;                 // ms for card to fly off screen
 
// ── Swipe direction labels ─────────────────────────────────────────────────────
const Direction = { LEFT: 'left', RIGHT: 'right', UP: 'up' };
 
// ══════════════════════════════════════════════════════════════════════════════
// ── Single Card Component ─────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function ProfileCard({ profile, isTop, onSwipe }) {
  const position  = useRef(new Animated.ValueXY()).current;
  const swipeAnim = useRef(new Animated.Value(0)).current; // tracks horizontal drag
 
  // ── Reset position when a new top card appears ───────────────────────────
  useEffect(() => {
    if (isTop) {
      position.setValue({ x: 0, y: 0 });
      swipeAnim.setValue(0);
    }
  }, [isTop, profile.id]);
 
  // ── PanResponder ─────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isTop,
      onMoveShouldSetPanResponder:  () => isTop,
 
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
        swipeAnim.setValue(gesture.dx);
      },
 
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          flyOut(Direction.RIGHT);
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          flyOut(Direction.LEFT);
        } else if (gesture.dy < -SWIPE_THRESHOLD) {
          flyOut(Direction.UP);
        } else {
          // Snap back to center
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            friction: 5,
          }).start();
          swipeAnim.setValue(0);
        }
      },
    })
  ).current;
 
  const flyOut = (direction) => {
    let toValue = { x: 0, y: 0 };
    if (direction === Direction.RIGHT) toValue = { x: SCREEN_WIDTH * 1.5, y: 0 };
    if (direction === Direction.LEFT)  toValue = { x: -SCREEN_WIDTH * 1.5, y: 0 };
    if (direction === Direction.UP)    toValue = { x: 0, y: -SCREEN_HEIGHT };
 
    Animated.timing(position, {
      toValue,
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false,
    }).start(() => onSwipe(direction, profile));
  };
 
  // ── Derived animated styles ───────────────────────────────────────────────
  const rotate = swipeAnim.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-8deg', '0deg', '8deg'],
    extrapolate: 'clamp',
  });
 
  const likeOpacity = swipeAnim.interpolate({
    inputRange: [0, SCREEN_WIDTH * 0.15],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
 
  const nopeOpacity = swipeAnim.interpolate({
    inputRange: [-SCREEN_WIDTH * 0.15, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
 
  const superLikeOpacity = position.y.interpolate({
    inputRange: [-SCREEN_HEIGHT * 0.15, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
 
  const cardStyle = isTop
    ? { transform: [...position.getTranslateTransform(), { rotate }] }
    : {};
 
  const imageUri = profile.profilePicture
    || profile.photos?.[0]
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&size=400&background=FF4D6D&color=fff`;
 
  return (
    <Animated.View
      style={[styles.card, cardStyle, !isTop && styles.cardBehind]}
      {...(isTop ? panResponder.panHandlers : {})}
    >
      <Image
        source={{ uri: imageUri }}
        style={styles.cardImage}
        resizeMode="cover"
      />
 
      {/* LIKE stamp */}
      {isTop && (
        <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}>
          <Text style={styles.stampText}>LIKE</Text>
        </Animated.View>
      )}
 
      {/* NOPE stamp */}
      {isTop && (
        <Animated.View style={[styles.stamp, styles.stampNope, { opacity: nopeOpacity }]}>
          <Text style={[styles.stampText, styles.stampTextNope]}>NOPE</Text>
        </Animated.View>
      )}
 
      {/* SUPER LIKE stamp */}
      {isTop && (
        <Animated.View style={[styles.stamp, styles.stampSuper, { opacity: superLikeOpacity }]}>
          <Text style={[styles.stampText, styles.stampTextSuper]}>SUPER</Text>
        </Animated.View>
      )}
 
      {/* User info overlay */}
      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.userName}>
            {profile.name}, {profile.age || calculateAge(profile.dateOfBirth)}
          </Text>
          {profile.isOnline && <View style={styles.onlineDot} />}
        </View>
 
        <View style={styles.locationRow}>
          <Text style={styles.locationPin}>📍</Text>
          <Text style={styles.locationText}>
            {profile.city}, {profile.country}
          </Text>
        </View>
 
        {profile.profession && (
          <View style={styles.locationRow}>
            <Text style={styles.locationPin}>💼</Text>
            <Text style={styles.locationText}>{profile.profession}</Text>
          </View>
        )}
 
        {profile.interests?.length > 0 && (
          <View style={styles.interestsRow}>
            {profile.interests.slice(0, 3).map((interest, i) => (
              <View key={i} style={styles.interestBadge}>
                <Text style={styles.interestText}>{interest}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
}
 
// ── Helper: calculate age ─────────────────────────────────────────────────────
const calculateAge = (dob) => {
  if (!dob) return '';
  return Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));
};
 
// ══════════════════════════════════════════════════════════════════════════════
// ── HomeScreen ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function HomeScreen({ navigation }) {
  const insets              = useSafeAreaInsets();
  const { user }            = useAuth();
  const [activeTab, setActiveTab] = useState('nearby');
  const [profiles,  setProfiles]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [page,      setPage]      = useState(1);
  const [noMore,    setNoMore]    = useState(false);
  // Track if city filter was dropped during retry — keep consistent across pages
  const cityFilterDropped = React.useRef(false);
 
  // Ref to top card for programmatic swipe from buttons
  const topCardRef = useRef(null);
  const programmaticPosition = useRef(new Animated.ValueXY()).current;
 
  // ── Fetch profiles ──────────────────────────────────────────────────────
  const fetchProfiles = useCallback(async (pageNum = 1, tab = activeTab) => {
    if (noMore && pageNum > 1) return;
    setLoading(pageNum === 1);
 
    // Reset city-dropped flag on fresh fetch
    if (pageNum === 1) cityFilterDropped.current = false;
 
    try {
      // Build params — respect cityFilterDropped across all pages
      const params = { page: pageNum, limit: 10 };
      if (user?.lookingFor && user.lookingFor !== 'both') params.gender = user.lookingFor;
      if (tab === 'nearby' && user?.city && !cityFilterDropped.current) {
        params.city = user.city;
      }
 
      console.log('🔍 [HomeScreen] Fetching params:', params);
      const data = await UserAPI.search(params);
      const newProfiles = data.users || [];
      console.log(`👥 [HomeScreen] Got ${newProfiles.length} real profiles`);
 
      if (newProfiles.length === 0) {
        // If we used city filter and got nothing — drop it and retry
        if (params.city && pageNum === 1) {
          console.log('🔄 [HomeScreen] No results with city filter, retrying without...');
          cityFilterDropped.current = true;
          const retryParams = { page: 1, limit: 10 };
          if (params.gender) retryParams.gender = params.gender;
          const retry = await UserAPI.search(retryParams);
          const retryProfiles = retry.users || [];
          console.log(`👥 [HomeScreen] Retry got ${retryProfiles.length} profiles`);
          if (retryProfiles.length > 0) {
            setProfiles(retryProfiles);
            setLoading(false);
            return;
          }
        }
        // Truly no more profiles
        if (__DEV__ && pageNum === 1 && profiles.length === 0) {
          console.log('🧪 Using dummy profiles (no real users found)');
          setProfiles(DUMMY_PROFILES);
        } else {
          setNoMore(true);
        }
      } else {
        setProfiles((prev) =>
          pageNum === 1 ? newProfiles : [...prev, ...newProfiles]
        );
      }
    } catch (err) {
      console.log('❌ [HomeScreen] Fetch error:', err.message);
      if (__DEV__ && pageNum === 1) setProfiles(DUMMY_PROFILES);
    } finally {
      setLoading(false);
    }
  }, [activeTab, user, noMore, profiles.length]);
 
  useEffect(() => {
    fetchProfiles(1, activeTab);
  }, [activeTab]);
 
  // ── Handle swipe completion ─────────────────────────────────────────────
  const handleSwipe = async (direction, profile) => {
    // Remove card from stack
    setProfiles((prev) => prev.filter((p) => p._id !== profile._id && p.id !== profile.id));
 
    // Load more when running low — only if we have real profiles
    const hasRealProfiles = profiles.some(p => {
      const id = p._id || p.id;
      return id && id.length === 24 && /^[a-f0-9]+$/i.test(id);
    });
    if (profiles.length <= 3 && !noMore && hasRealProfiles) {
      const nextPage = page + 1;
      fetchProfiles(nextPage, activeTab);
      setPage(nextPage);
    }
 
    // Skip API calls for dummy profiles (non-ObjectId ids)
    const id = profile._id || profile.id;
    const isRealProfile = id && id.length === 24 && /^[a-f0-9]+$/i.test(id);
 
    if (!isRealProfile) {
      console.log('🧪 [HomeScreen] Skipping API call for dummy profile');
      return;
    }
 
    // API calls for real profiles only
    try {
      if (direction === Direction.RIGHT || direction === Direction.UP) {
        const data = await MatchAPI.likeUser(id);
        if (data?.match) {
          navigation.navigate('MatchScreen', {
            matchedUser: profile,
            matchId: data.match._id,
          });
        }
      } else if (direction === Direction.LEFT) {
        await MatchAPI.passUser(id);
      }
    } catch (err) {
      console.log('Swipe API error:', err.message);
    }
  };
 
  // ── Programmatic swipe from buttons ────────────────────────────────────
  const swipeProgrammatic = (direction) => {
    if (profiles.length === 0) return;
    const profile = profiles[0];
    handleSwipe(direction, profile);
  };
 
  // ── Tab switch ──────────────────────────────────────────────────────────
  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setProfiles([]);
    setPage(1);
    setNoMore(false);
  };
 
  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
 
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn}>
          <Text style={styles.heartIcon}>♥</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>HeartLink</Text>
        <TouchableOpacity style={styles.filterBtn}>
          <Text style={styles.filterIcon}>☰</Text>
        </TouchableOpacity>
      </View>
 
      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <View style={styles.tabContainer}>
        {['nearby', 'global'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => handleTabSwitch(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.tabDivider} />
 
      {/* ── Card Stack ──────────────────────────────────────────────────── */}
      <View style={styles.cardWrapper}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Finding matches...</Text>
          </View>
        ) : profiles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>💔</Text>
            <Text style={styles.emptyTitle}>No more profiles</Text>
            <Text style={styles.emptySubtitle}>Check back later or expand your search</Text>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => { setNoMore(false); setPage(1); fetchProfiles(1, activeTab); }}
            >
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Background decorative card */}
            <View style={styles.bgCard} />
 
            {/* Render up to 3 cards — only top one is interactive */}
            {profiles.slice(0, 3).reverse().map((profile, index, arr) => {
              const isTop = index === arr.length - 1;
              return (
                <ProfileCard
                  key={profile._id || profile.id}
                  profile={profile}
                  isTop={isTop}
                  onSwipe={handleSwipe}
                />
              );
            })}
          </>
        )}
      </View>
 
      {/* ── Action Buttons ──────────────────────────────────────────────── */}
      <View style={styles.actionsRow}>
        {/* Dislike */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnSmall]}
          onPress={() => swipeProgrammatic(Direction.LEFT)}
          activeOpacity={0.7}
        >
          <Text style={styles.dislikeIcon}>✕</Text>
        </TouchableOpacity>
 
        {/* Super Like */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnSmall]}
          onPress={() => swipeProgrammatic(Direction.UP)}
          activeOpacity={0.7}
        >
          <Text style={styles.superLikeIcon}>★</Text>
        </TouchableOpacity>
 
        {/* Like */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnLarge]}
          onPress={() => swipeProgrammatic(Direction.RIGHT)}
          activeOpacity={0.7}
        >
          <Text style={styles.likeIcon}>♥</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
 
// ── Dummy profiles for development fallback ───────────────────────────────────
const DUMMY_PROFILES = [
  {
    id: '1', name: 'Sarah', dateOfBirth: '1999-01-01',
    city: 'New York', country: 'USA',
    interests: ['Photography', 'Travel', 'Yoga'], isOnline: true,
    profession: 'Photographer',
    profilePicture: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
  },
  {
    id: '2', name: 'Emma', dateOfBirth: '1997-06-15',
    city: 'Brooklyn', country: 'USA',
    interests: ['Music', 'Cooking', 'Art'], isOnline: false,
    profession: 'Chef',
    profilePicture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
  },
  {
    id: '3', name: 'Olivia', dateOfBirth: '2000-03-20',
    city: 'Manhattan', country: 'USA',
    interests: ['Dancing', 'Tech', 'Reading'], isOnline: true,
    profession: 'Software Engineer',
    profilePicture: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
  },
];
 
// ── Styles (original preserved + additions) ───────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerIconBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  heartIcon: { fontSize: 24, color: '#FF4B7A' },
  headerTitle: {
    fontSize: 22, fontWeight: '700',
    color: '#2D3436', letterSpacing: 0.5,
  },
  filterBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#FFE4EC',
    alignItems: 'center', justifyContent: 'center',
  },
  filterIcon: { fontSize: 18, color: '#FF4B7A' },
 
  tabContainer: {
    flexDirection: 'row', justifyContent: 'center',
    paddingHorizontal: 20, gap: 32, marginTop: 4,
  },
  tab: {
    paddingVertical: 10, paddingHorizontal: 8,
    borderBottomWidth: 3, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#FF4B7A' },
  tabText: { fontSize: 16, fontWeight: '500', color: '#A0A0A0' },
  tabTextActive: { color: '#2D3436', fontWeight: '600' },
  tabDivider: {
    height: 1, backgroundColor: '#F0E0E6', marginHorizontal: 20,
  },
 
  cardWrapper: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24, marginTop: 8,
  },
  bgCard: {
    position: 'absolute',
    width: CARD_WIDTH, height: CARD_HEIGHT,
    backgroundColor: '#FFE4EC',
    borderRadius: 24,
    transform: [{ rotate: '-4deg' }],
    opacity: 0.6,
  },
  card: {
    position: 'absolute',
    width: CARD_WIDTH, height: CARD_HEIGHT,
    borderRadius: 24, overflow: 'hidden',
    backgroundColor: '#FFD6E4',
    ...Platform.select({
      ios: {
        shadowColor: '#FF4B7A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15, shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  cardBehind: {
    transform: [{ scale: 0.97 }],
    opacity: 0.85,
  },
  cardImage: { width: '100%', height: '100%' },
 
  // ── Stamps ──────────────────────────────────────────────────────────────
  stamp: {
    position: 'absolute',
    top: 48,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 3,
  },
  stampLike: {
    left: 24,
    borderColor: '#2ECC71',
    transform: [{ rotate: '-15deg' }],
  },
  stampNope: {
    right: 24,
    borderColor: '#E74C3C',
    transform: [{ rotate: '15deg' }],
  },
  stampSuper: {
    alignSelf: 'center',
    left: CARD_WIDTH / 2 - 55,
    borderColor: '#3498DB',
    transform: [{ rotate: '0deg' }],
  },
  stampText: {
    fontSize: 24, fontWeight: '800',
    color: '#2ECC71', letterSpacing: 2,
  },
  stampTextNope: { color: '#E74C3C' },
  stampTextSuper: { color: '#3498DB' },
 
  userInfo: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingBottom: 20, paddingTop: 40,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: {
    fontSize: 30, fontWeight: '700', color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  onlineDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#2ECC71', borderWidth: 2, borderColor: '#FFFFFF', marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4,
  },
  locationPin: { fontSize: 14 },
  locationText: { fontSize: 14, color: '#FFFFFFDD', fontWeight: '500' },
  interestsRow: {
    flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap',
  },
  interestBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  interestText: { fontSize: 13, color: '#FFFFFF', fontWeight: '500' },
 
  actionsRow: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 20,
    paddingVertical: 20, paddingBottom: 12,
  },
  actionBtn: {
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1, shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  actionBtnSmall: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF',
  },
  actionBtnLarge: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: '#FF4B7A',
  },
  dislikeIcon: { fontSize: 22, fontWeight: '700', color: '#A0A0A0' },
  superLikeIcon: { fontSize: 24, color: '#5B9BD5' },
  likeIcon: { fontSize: 28, color: '#FFFFFF' },
 
  // ── Loading & Empty states ─────────────────────────────────────────────
  loadingContainer: {
    alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  loadingText: { fontSize: 16, color: Colors.textSecondary },
 
  emptyContainer: {
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#2D3436' },
  emptySubtitle: { fontSize: 15, color: '#A0A0A0', textAlign: 'center' },
  refreshBtn: {
    marginTop: 8, backgroundColor: '#FF4B7A',
    paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24,
  },
  refreshText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
});





// const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// const CARD_WIDTH   = SCREEN_WIDTH - 48;
// const CARD_HEIGHT  = SCREEN_HEIGHT * 0.62;
// const SWIPE_THRESHOLD    = SCREEN_WIDTH * 0.25; // how far to swipe before action
// const SWIPE_OUT_DURATION = 250;                 // ms for card to fly off screen
 
// // ── Swipe direction labels ─────────────────────────────────────────────────────
// const Direction = { LEFT: 'left', RIGHT: 'right', UP: 'up' };



 
// // ══════════════════════════════════════════════════════════════════════════════
// // ── Single Card Component ─────────────────────────────────────────────────────
// // ══════════════════════════════════════════════════════════════════════════════
// function ProfileCard({ profile, isTop, onSwipe }) {
//   const position  = useRef(new Animated.ValueXY()).current;
//   const swipeAnim = useRef(new Animated.Value(0)).current; // tracks horizontal drag
 
//   // ── Reset position when a new top card appears ───────────────────────────
//   useEffect(() => {
//     if (isTop) {
//       position.setValue({ x: 0, y: 0 });
//       swipeAnim.setValue(0);
//     }
//   }, [isTop, profile.id]);
 
//   // ── PanResponder ─────────────────────────────────────────────────────────
//   const panResponder = useRef(
//     PanResponder.create({
//       onStartShouldSetPanResponder: () => isTop,
//       onMoveShouldSetPanResponder:  () => isTop,
 
//       onPanResponderMove: (_, gesture) => {
//         position.setValue({ x: gesture.dx, y: gesture.dy });
//         swipeAnim.setValue(gesture.dx);
//       },
 
//       onPanResponderRelease: (_, gesture) => {
//         if (gesture.dx > SWIPE_THRESHOLD) {
//           flyOut(Direction.RIGHT);
//         } else if (gesture.dx < -SWIPE_THRESHOLD) {
//           flyOut(Direction.LEFT);
//         } else if (gesture.dy < -SWIPE_THRESHOLD) {
//           flyOut(Direction.UP);
//         } else {
//           // Snap back to center
//           Animated.spring(position, {
//             toValue: { x: 0, y: 0 },
//             useNativeDriver: false,
//             friction: 5,
//           }).start();
//           swipeAnim.setValue(0);
//         }
//       },
//     })
//   ).current;
 
//   const flyOut = (direction) => {
//     let toValue = { x: 0, y: 0 };
//     if (direction === Direction.RIGHT) toValue = { x: SCREEN_WIDTH * 1.5, y: 0 };
//     if (direction === Direction.LEFT)  toValue = { x: -SCREEN_WIDTH * 1.5, y: 0 };
//     if (direction === Direction.UP)    toValue = { x: 0, y: -SCREEN_HEIGHT };
 
//     Animated.timing(position, {
//       toValue,
//       duration: SWIPE_OUT_DURATION,
//       useNativeDriver: false,
//     }).start(() => onSwipe(direction, profile));
//   };
 
//   // ── Derived animated styles ───────────────────────────────────────────────
//   const rotate = swipeAnim.interpolate({
//     inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
//     outputRange: ['-8deg', '0deg', '8deg'],
//     extrapolate: 'clamp',
//   });
 
//   const likeOpacity = swipeAnim.interpolate({
//     inputRange: [0, SCREEN_WIDTH * 0.15],
//     outputRange: [0, 1],
//     extrapolate: 'clamp',
//   });
 
//   const nopeOpacity = swipeAnim.interpolate({
//     inputRange: [-SCREEN_WIDTH * 0.15, 0],
//     outputRange: [1, 0],
//     extrapolate: 'clamp',
//   });
 
//   const superLikeOpacity = position.y.interpolate({
//     inputRange: [-SCREEN_HEIGHT * 0.15, 0],
//     outputRange: [1, 0],
//     extrapolate: 'clamp',
//   });
 
//   const cardStyle = isTop
//     ? { transform: [...position.getTranslateTransform(), { rotate }] }
//     : {};
 
//   const imageUri = profile.profilePicture
//     || profile.photos?.[0]
//     || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&size=400&background=FF4D6D&color=fff`;
 
//   return (
//     <Animated.View
//       style={[styles.card, cardStyle, !isTop && styles.cardBehind]}
//       {...(isTop ? panResponder.panHandlers : {})}
//     >
//       <Image
//         source={{ uri: imageUri }}
//         style={styles.cardImage}
//         resizeMode="cover"
//       />
 
//       {/* LIKE stamp */}
//       {isTop && (
//         <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}>
//           <Text style={styles.stampText}>LIKE</Text>
//         </Animated.View>
//       )}
 
//       {/* NOPE stamp */}
//       {isTop && (
//         <Animated.View style={[styles.stamp, styles.stampNope, { opacity: nopeOpacity }]}>
//           <Text style={[styles.stampText, styles.stampTextNope]}>NOPE</Text>
//         </Animated.View>
//       )}
 
//       {/* SUPER LIKE stamp */}
//       {isTop && (
//         <Animated.View style={[styles.stamp, styles.stampSuper, { opacity: superLikeOpacity }]}>
//           <Text style={[styles.stampText, styles.stampTextSuper]}>SUPER</Text>
//         </Animated.View>
//       )}
 
//       {/* User info overlay */}
//       <View style={styles.userInfo}>
//         <View style={styles.nameRow}>
//           <Text style={styles.userName}>
//             {profile.name}, {profile.age || calculateAge(profile.dateOfBirth)}
//           </Text>
//           {profile.isOnline && <View style={styles.onlineDot} />}
//         </View>
 
//         <View style={styles.locationRow}>
//           <Text style={styles.locationPin}>📍</Text>
//           <Text style={styles.locationText}>
//             {profile.city}, {profile.country}
//           </Text>
//         </View>
 
//         {profile.profession && (
//           <View style={styles.locationRow}>
//             <Text style={styles.locationPin}>💼</Text>
//             <Text style={styles.locationText}>{profile.profession}</Text>
//           </View>
//         )}
 
//         {profile.interests?.length > 0 && (
//           <View style={styles.interestsRow}>
//             {profile.interests.slice(0, 3).map((interest, i) => (
//               <View key={i} style={styles.interestBadge}>
//                 <Text style={styles.interestText}>{interest}</Text>
//               </View>
//             ))}
//           </View>
//         )}
//       </View>
//     </Animated.View>
//   );
// }
 
// // ── Helper: calculate age ─────────────────────────────────────────────────────
// const calculateAge = (dob) => {
//   if (!dob) return '';
//   return Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));
// };
 
// // ══════════════════════════════════════════════════════════════════════════════
// // ── HomeScreen ────────────────────────────────────────────────────────────────
// // ══════════════════════════════════════════════════════════════════════════════
// export default function HomeScreen({ navigation }) {
//   const insets              = useSafeAreaInsets();
//   const { user }            = useAuth();
//   const [activeTab, setActiveTab] = useState('nearby');
//   const [profiles,  setProfiles]  = useState([]);
//   const [loading,   setLoading]   = useState(true);
//   const [page,      setPage]      = useState(1);
//   const [noMore,    setNoMore]    = useState(false);
 
//   // Ref to top card for programmatic swipe from buttons
//   const topCardRef = useRef(null);
//   const programmaticPosition = useRef(new Animated.ValueXY()).current;
 
//   // ── Fetch profiles ──────────────────────────────────────────────────────
//   const fetchProfiles = useCallback(async (pageNum = 1, tab = activeTab) => {
//     if (noMore && pageNum > 1) return;
//     setLoading(pageNum === 1);
//     try {
//       const params = {
//         page,
//         limit: 10,
//         // Exclude users already swiped — backend will handle this later
//         ...(user?.lookingFor && user.lookingFor !== 'both' && { gender: user.lookingFor }),
//         ...(tab === 'nearby' && user?.city && { city: user.city }),
//       };

//       console.log(AuthSession.makeRedirectUri());
      
// // Clear everything
// const clearAllStorage = async () => {
//   try {
//     await AsyncStorage.clear();
//     console.log('✅ AsyncStorage cleared successfully');
//   } catch (error) {
//     console.error('❌ Failed to clear AsyncStorage:', error);
//   }
// };
 
 
//       const data = await UserAPI.search(params);
//       const newProfiles = data.users || [];
 
//       if (newProfiles.length === 0) {
//         if (__DEV__ && pageNum === 1) {
//           // Show dummy data in development when no real users exist yet
//           setProfiles(DUMMY_PROFILES);
//         } else {
//           setNoMore(true);
//         }
//       } else {
//         setProfiles((prev) =>
//           pageNum === 1 ? newProfiles : [...prev, ...newProfiles]
//         );
//       }
//     } catch (err) {
//       console.log('❌ [HomeScreen] Fetch error:', err.message);
//       if (__DEV__) setProfiles(DUMMY_PROFILES);
//     } finally {
//       setLoading(false);
//     }
//   }, [activeTab, user, page]);
 
//   useEffect(() => {
//     fetchProfiles(1, activeTab);
//   }, [activeTab]);
 
//   // ── Handle swipe completion ─────────────────────────────────────────────
//   const handleSwipe = async (direction, profile) => {
//     // Remove card from stack
//     setProfiles((prev) => prev.filter((p) => p._id !== profile._id && p.id !== profile.id));
 
//     // Load more when running low
//     if (profiles.length <= 3 && !noMore) {
//       fetchProfiles(page + 1, activeTab);
//       setPage((p) => p + 1);
//     }
 
//     // API calls
//     try {
//       const id = profile._id || profile.id;
//       if (direction === Direction.RIGHT || direction === Direction.UP) {
//         const data = await MatchAPI.likeUser(id);
//         if (data?.match) {
//           // It's a match!
//           Alert.alert(
//             "It's a Match! 🎉",
//             `You and ${profile.name} liked each other!`,
//             [
//               { text: 'Keep Swiping', style: 'cancel' },
//               { text: 'Send Message', onPress: () => navigation.navigate('Chat', { userId: id, userName: profile.name }) },
//             ]
//           );
//         }
//       } else if (direction === Direction.LEFT) {
//         await MatchAPI.passUser(id);
//       }
//     } catch (err) {
//       console.log('Swipe API error:', err.message);
//     }
//   };
 
//   // ── Programmatic swipe from buttons ────────────────────────────────────
//   const swipeProgrammatic = (direction) => {
//     if (profiles.length === 0) return;
//     const profile = profiles[0];
//     handleSwipe(direction, profile);
//   };
 
//   // ── Tab switch ──────────────────────────────────────────────────────────
//   const handleTabSwitch = (tab) => {
//     setActiveTab(tab);
//     setProfiles([]);
//     setPage(1);
//     setNoMore(false);
//   };
 
//   // ─────────────────────────────────────────────────────────────────────────
//   // Render
//   // ─────────────────────────────────────────────────────────────────────────
//   return (
//     <View style={[styles.container, { paddingTop: insets.top }]}>
//       <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
 
//       {/* ── Header ──────────────────────────────────────────────────────── */}
//       <View style={styles.header}>
//         <TouchableOpacity style={styles.headerIconBtn}>
//           <Text style={styles.heartIcon}>♥</Text>
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>HeartLink</Text>
//         <TouchableOpacity style={styles.filterBtn}>
//           <Text style={styles.filterIcon}>☰</Text>
//         </TouchableOpacity>
//       </View>
 
//       {/* ── Tabs ────────────────────────────────────────────────────────── */}
//       <View style={styles.tabContainer}>
//         {['nearby', 'global'].map((tab) => (
//           <TouchableOpacity
//             key={tab}
//             style={[styles.tab, activeTab === tab && styles.tabActive]}
//             onPress={() => handleTabSwitch(tab)}
//           >
//             <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
//               {tab.charAt(0).toUpperCase() + tab.slice(1)}
//             </Text>
//           </TouchableOpacity>
//         ))}
//       </View>
//       <View style={styles.tabDivider} />
 
//       {/* ── Card Stack ──────────────────────────────────────────────────── */}
//       <View style={styles.cardWrapper}>
//         {loading ? (
//           <View style={styles.loadingContainer}>
//             <ActivityIndicator size="large" color={Colors.primary} />
//             <Text style={styles.loadingText}>Finding matches...</Text>
//           </View>
//         ) : profiles.length === 0 ? (
//           <View style={styles.emptyContainer}>
//             <Text style={styles.emptyEmoji}>💔</Text>
//             <Text style={styles.emptyTitle}>No more profiles</Text>
//             <Text style={styles.emptySubtitle}>Check back later or expand your search</Text>
//             <TouchableOpacity
//               style={styles.refreshBtn}
//               onPress={() => { setNoMore(false); setPage(1); fetchProfiles(1, activeTab); }}
//             >
//               <Text style={styles.refreshText}>Refresh</Text>
//             </TouchableOpacity>
//           </View>
//         ) : (
//           <>
//             {/* Background decorative card */}
//             <View style={styles.bgCard} />
 
//             {/* Render up to 3 cards — only top one is interactive */}
//             {profiles.slice(0, 3).reverse().map((profile, index, arr) => {
//               const isTop = index === arr.length - 1;
//               return (
//                 <ProfileCard
//                   key={profile._id || profile.id}
//                   profile={profile}
//                   isTop={isTop}
//                   onSwipe={handleSwipe}
//                 />
//               );
//             })}
//           </>
//         )}
//       </View>
 
//       {/* ── Action Buttons ──────────────────────────────────────────────── */}
//       <View style={styles.actionsRow}>
//         {/* Dislike */}
//         <TouchableOpacity
//           style={[styles.actionBtn, styles.actionBtnSmall]}
//           onPress={() => swipeProgrammatic(Direction.LEFT)}
//           activeOpacity={0.7}
//         >
//           <Text style={styles.dislikeIcon}>✕</Text>
//         </TouchableOpacity>
 
//         {/* Super Like */}
//         <TouchableOpacity
//           style={[styles.actionBtn, styles.actionBtnSmall]}
//           onPress={() => swipeProgrammatic(Direction.UP)}
//           activeOpacity={0.7}
//         >
//           <Text style={styles.superLikeIcon}>★</Text>
//         </TouchableOpacity>
 
//         {/* Like */}
//         <TouchableOpacity
//           style={[styles.actionBtn, styles.actionBtnLarge]}
//           onPress={() => swipeProgrammatic(Direction.RIGHT)}
//           activeOpacity={0.7}
//         >
//           <Text style={styles.likeIcon}>♥</Text>
//         </TouchableOpacity>
//       </View>

// <TouchableOpacity style={{width: 44, height: 44, borderRadius: 12,
//     backgroundColor: '#3edf08',
//     alignItems: 'center', justifyContent: 'center',}} onPress={clearAllStorage}>
//   <Text style={{fontSize: 18, fontWeight: 'bold'}}>Clear Storage</Text>
// </TouchableOpacity>
//     </View>
//   );
// }
 
// // ── Dummy profiles for development fallback ───────────────────────────────────
// const DUMMY_PROFILES = [
//   {
//     id: '1', name: 'Sarah', dateOfBirth: '1999-01-01',
//     city: 'New York', country: 'USA',
//     interests: ['Photography', 'Travel', 'Yoga'], isOnline: true,
//     profession: 'Photographer',
//     profilePicture: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
//   },
//   {
//     id: '2', name: 'Emma', dateOfBirth: '1997-06-15',
//     city: 'Brooklyn', country: 'USA',
//     interests: ['Music', 'Cooking', 'Art'], isOnline: false,
//     profession: 'Chef',
//     profilePicture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
//   },
//   {
//     id: '3', name: 'Olivia', dateOfBirth: '2000-03-20',
//     city: 'Manhattan', country: 'USA',
//     interests: ['Dancing', 'Tech', 'Reading'], isOnline: true,
//     profession: 'Software Engineer',
//     profilePicture: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
//   },
// ];
 
// // ── Styles (original preserved + additions) ───────────────────────────────────
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#FFF5F7',
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 20,
//     paddingVertical: 12,
//   },
//   headerIconBtn: {
//     width: 40, height: 40,
//     alignItems: 'center', justifyContent: 'center',
//   },
//   heartIcon: { fontSize: 24, color: '#FF4B7A' },
//   headerTitle: {
//     fontSize: 22, fontWeight: '700',
//     color: '#2D3436', letterSpacing: 0.5,
//   },
//   filterBtn: {
//     width: 44, height: 44, borderRadius: 12,
//     backgroundColor: '#FFE4EC',
//     alignItems: 'center', justifyContent: 'center',
//   },
//   filterIcon: { fontSize: 18, color: '#FF4B7A' },
 
//   tabContainer: {
//     flexDirection: 'row', justifyContent: 'center',
//     paddingHorizontal: 20, gap: 32, marginTop: 4,
//   },
//   tab: {
//     paddingVertical: 10, paddingHorizontal: 8,
//     borderBottomWidth: 3, borderBottomColor: 'transparent',
//   },
//   tabActive: { borderBottomColor: '#FF4B7A' },
//   tabText: { fontSize: 16, fontWeight: '500', color: '#A0A0A0' },
//   tabTextActive: { color: '#2D3436', fontWeight: '600' },
//   tabDivider: {
//     height: 1, backgroundColor: '#F0E0E6', marginHorizontal: 20,
//   },
 
//   cardWrapper: {
//     flex: 1, alignItems: 'center', justifyContent: 'center',
//     paddingHorizontal: 24, marginTop: 8,
//   },
//   bgCard: {
//     position: 'absolute',
//     width: CARD_WIDTH, height: CARD_HEIGHT,
//     backgroundColor: '#FFE4EC',
//     borderRadius: 24,
//     transform: [{ rotate: '-4deg' }],
//     opacity: 0.6,
//   },
//   card: {
//     position: 'absolute',
//     width: CARD_WIDTH, height: CARD_HEIGHT,
//     borderRadius: 24, overflow: 'hidden',
//     backgroundColor: '#FFD6E4',
//     ...Platform.select({
//       ios: {
//         shadowColor: '#FF4B7A',
//         shadowOffset: { width: 0, height: 8 },
//         shadowOpacity: 0.15, shadowRadius: 16,
//       },
//       android: { elevation: 8 },
//     }),
//   },
//   cardBehind: {
//     transform: [{ scale: 0.97 }],
//     opacity: 0.85,
//   },
//   cardImage: { width: '100%', height: '100%' },
 
//   // ── Stamps ──────────────────────────────────────────────────────────────
//   stamp: {
//     position: 'absolute',
//     top: 48,
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 8,
//     borderWidth: 3,
//   },
//   stampLike: {
//     left: 24,
//     borderColor: '#2ECC71',
//     transform: [{ rotate: '-15deg' }],
//   },
//   stampNope: {
//     right: 24,
//     borderColor: '#E74C3C',
//     transform: [{ rotate: '15deg' }],
//   },
//   stampSuper: {
//     alignSelf: 'center',
//     left: CARD_WIDTH / 2 - 55,
//     borderColor: '#3498DB',
//     transform: [{ rotate: '0deg' }],
//   },
//   stampText: {
//     fontSize: 24, fontWeight: '800',
//     color: '#2ECC71', letterSpacing: 2,
//   },
//   stampTextNope: { color: '#E74C3C' },
//   stampTextSuper: { color: '#3498DB' },
 
//   userInfo: {
//     position: 'absolute', bottom: 0, left: 0, right: 0,
//     paddingHorizontal: 20, paddingBottom: 20, paddingTop: 40,
//     backgroundColor: 'rgba(0,0,0,0.25)',
//     borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
//   },
//   nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
//   userName: {
//     fontSize: 30, fontWeight: '700', color: '#FFFFFF',
//     textShadowColor: 'rgba(0,0,0,0.3)',
//     textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
//   },
//   onlineDot: {
//     width: 12, height: 12, borderRadius: 6,
//     backgroundColor: '#2ECC71', borderWidth: 2, borderColor: '#FFFFFF', marginTop: 4,
//   },
//   locationRow: {
//     flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4,
//   },
//   locationPin: { fontSize: 14 },
//   locationText: { fontSize: 14, color: '#FFFFFFDD', fontWeight: '500' },
//   interestsRow: {
//     flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap',
//   },
//   interestBadge: {
//     backgroundColor: 'rgba(255,255,255,0.25)',
//     paddingHorizontal: 14, paddingVertical: 6,
//     borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
//   },
//   interestText: { fontSize: 13, color: '#FFFFFF', fontWeight: '500' },
 
//   actionsRow: {
//     flexDirection: 'row', justifyContent: 'center',
//     alignItems: 'center', gap: 20,
//     paddingVertical: 20, paddingBottom: 12,
//   },
//   actionBtn: {
//     alignItems: 'center', justifyContent: 'center',
//     ...Platform.select({
//       ios: {
//         shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
//         shadowOpacity: 0.1, shadowRadius: 8,
//       },
//       android: { elevation: 4 },
//     }),
//   },
//   actionBtnSmall: {
//     width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF',
//   },
//   actionBtnLarge: {
//     width: 68, height: 68, borderRadius: 34, backgroundColor: '#FF4B7A',
//   },
//   dislikeIcon: { fontSize: 22, fontWeight: '700', color: '#A0A0A0' },
//   superLikeIcon: { fontSize: 24, color: '#5B9BD5' },
//   likeIcon: { fontSize: 28, color: '#FFFFFF' },
 
//   // ── Loading & Empty states ─────────────────────────────────────────────
//   loadingContainer: {
//     alignItems: 'center', justifyContent: 'center', gap: 16,
//   },
//   loadingText: { fontSize: 16, color: Colors.textSecondary },
 
//   emptyContainer: {
//     alignItems: 'center', justifyContent: 'center', gap: 12,
//   },
//   emptyEmoji: { fontSize: 64 },
//   emptyTitle: { fontSize: 22, fontWeight: '700', color: '#2D3436' },
//   emptySubtitle: { fontSize: 15, color: '#A0A0A0', textAlign: 'center' },
//   refreshBtn: {
//     marginTop: 8, backgroundColor: '#FF4B7A',
//     paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24,
//   },
//   refreshText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
// });