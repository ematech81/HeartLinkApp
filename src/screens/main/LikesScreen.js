import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Image, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, StatusBar, Dimensions, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MatchAPI, PaymentAPI } from 'services/ApiServices';
import { Routes } from 'src/constants/appConstants';
import { useAuth } from 'src/store/authStore';
import UpgradeModal from 'src/components/UpgradeModal';

const { width: W } = Dimensions.get('window');
const PAD    = 12;
const GAP    = 6;
const CARD_W = (W - PAD * 2 - GAP * 2) / 3;
const CARD_H = CARD_W * 1.45;

const getAge = (dob) =>
  !dob ? '' : Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));

// ── Dev-mode dummy data ────────────────────────────────────────────────────────
const DUMMY_LIKES = [
  { _id: 'l1', sender: { _id: 'u1', name: 'Amara',  dateOfBirth: '1999-04-10', city: 'Lagos',   isOnline: true,  profilePicture: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400' }},
  { _id: 'l2', sender: { _id: 'u2', name: 'Fatima', dateOfBirth: '1997-11-05', city: 'Abuja',   isOnline: false, profilePicture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400' }},
  { _id: 'l3', sender: { _id: 'u3', name: 'Chioma', dateOfBirth: '2000-07-18', city: 'Enugu',   isOnline: true,  profilePicture: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400' }},
  { _id: 'l4', sender: { _id: 'u4', name: 'Ada',    dateOfBirth: '1998-02-28', city: 'Lagos',   isOnline: false, profilePicture: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400' }},
  { _id: 'l5', sender: { _id: 'u5', name: 'Kemi',   dateOfBirth: '1996-09-14', city: 'Ibadan',  isOnline: true,  profilePicture: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400' }},
  { _id: 'l6', sender: { _id: 'u6', name: 'Grace',  dateOfBirth: '2001-03-07', city: 'Port Harcourt', isOnline: false, profilePicture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400' }},
  { _id: 'l7', sender: { _id: 'u7', name: 'Ngozi',  dateOfBirth: '1995-12-20', city: 'Kaduna',  isOnline: true,  profilePicture: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400' }},
  { _id: 'l8', sender: { _id: 'u8', name: 'Halima', dateOfBirth: '1998-08-03', city: 'Kano',    isOnline: false, profilePicture: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400' }},
];

const DUMMY_TOP = [
  { _id: 't1', name: 'Zara',    dateOfBirth: '1998-06-12', city: 'Lagos',   isBoosted: true, isVerified: true, profilePicture: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400' },
  { _id: 't2', name: 'Sophia',  dateOfBirth: '1996-01-20', city: 'Abuja',   isBoosted: true, isVerified: true, profilePicture: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400' },
  { _id: 't3', name: 'Tolu',    dateOfBirth: '1999-08-15', city: 'Enugu',   isBoosted: true, isVerified: true, profilePicture: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400' },
  { _id: 't4', name: 'Daniela', dateOfBirth: '1997-03-28', city: 'Benin City', isBoosted: true, isVerified: true, profilePicture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400' },
  { _id: 't5', name: 'Rukayat', dateOfBirth: '2000-11-10', city: 'Ilorin', isBoosted: true,  isVerified: true, profilePicture: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400' },
];

// ── Mini profile card (3-column grid) ─────────────────────────────────────────
function MiniCard({ profile, badge, onPress, onUnlike, unliking }) {
  const avatar = profile.profilePicture || profile.photos?.[0]
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'User')}&size=200&background=FF4D6D&color=fff`;
  const name = profile.name?.split(' ')[0] || '';
  const age  = getAge(profile.dateOfBirth);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Image source={{ uri: avatar }} style={styles.cardImg} />

      {/* Dark info overlay */}
      <View style={styles.cardOverlay}>
        <Text style={styles.cardName} numberOfLines={1}>
          {name}{age ? `, ${age}` : ''}
        </Text>
        {profile.city ? (
          <Text style={styles.cardCity} numberOfLines={1}>📍 {profile.city}</Text>
        ) : null}
      </View>

      {/* Badge: ♥ for likes, ✔ (blue) for boosted */}
      {badge === 'like' && (
        <View style={[styles.badge, styles.badgeLike]}>
          <Text style={styles.badgeText}>♥</Text>
        </View>
      )}
      {badge === 'boost' && (
        <View style={[styles.badge, styles.badgeBoost]}>
          <Text style={styles.badgeText}>✔</Text>
        </View>
      )}

      {/* Online dot */}
      {profile.isOnline && <View style={styles.onlineDot} />}

      {/* Unlike button — only shown on likes tab */}
      {onUnlike && (
        <TouchableOpacity
          style={styles.unlikeBtn}
          onPress={onUnlike}
          disabled={unliking}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          {unliking
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.unlikeBtnText}>✕</Text>
          }
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function LikesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [activeTab,    setActiveTab]    = useState('likes');
  const [likes,        setLikes]        = useState([]);
  const [topProfiles,  setTopProfiles]  = useState([]);
  const [loadingLikes, setLoadingLikes] = useState(true);
  const [loadingTop,   setLoadingTop]   = useState(false);
  const [topFetched,   setTopFetched]   = useState(false);
  const [unlikingId,   setUnlikingId]   = useState(null);
  const [showUpgrade,  setShowUpgrade]  = useState(false);

  // ── Fetch who liked me ────────────────────────────────────────────────────
  const fetchLikes = useCallback(async () => {
    try {
      const data = await MatchAPI.getLikes();
      const list = data.likes || [];
      setLikes(list.length > 0 ? list : __DEV__ ? DUMMY_LIKES : []);
    } catch {
      if (__DEV__) setLikes(DUMMY_LIKES);
    } finally {
      setLoadingLikes(false);
    }
  }, []);

  // ── Fetch boosted top profiles ────────────────────────────────────────────
  const fetchTopProfiles = useCallback(async () => {
    setLoadingTop(true);
    try {
      const data = await PaymentAPI.getTopProfiles();
      const list = data.users || [];
      setTopProfiles(list.length > 0 ? list : __DEV__ ? DUMMY_TOP : []);
    } catch {
      if (__DEV__) setTopProfiles(DUMMY_TOP);
    } finally {
      setLoadingTop(false);
      setTopFetched(true);
    }
  }, []);

  useEffect(() => { fetchLikes(); }, []);

  // ── Unlike (dismiss) a like ───────────────────────────────────────────────
  const handleUnlike = useCallback((likeId) => {
    const isSubActive = user?.isSubscribed &&
      (!user.subscriptionExpiry || new Date(user.subscriptionExpiry) > new Date());
    if (!isSubActive) { setShowUpgrade(true); return; }

    Alert.alert('Remove Like', 'Remove this profile from your likes list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setUnlikingId(likeId);
          try {
            await MatchAPI.removeLike(likeId);
            setLikes((prev) => prev.filter((l) => l._id !== likeId));
          } catch {
            Alert.alert('Error', 'Could not remove this like. Try again.');
          } finally {
            setUnlikingId(null);
          }
        },
      },
    ]);
  }, [user]);

  // ── Tab switch — lazy-load top profiles on first visit ────────────────────
  const switchTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'top' && !topFetched) fetchTopProfiles();
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const isLikesTab   = activeTab === 'likes';
  const currentData  = isLikesTab ? likes : topProfiles;
  const loading      = isLikesTab ? loadingLikes : loadingTop;

  // ── Render a single card ──────────────────────────────────────────────────
  const renderItem = useCallback(({ item }) => {
    const profile = isLikesTab ? (item.sender || item) : item;
    const id      = profile._id;
    // likeId is the Like document id (item._id) when on likes tab
    const likeId  = isLikesTab ? item._id : null;
    return (
      <MiniCard
        profile={profile}
        badge={isLikesTab ? 'like' : 'boost'}
        onPress={() => navigation.navigate(Routes.USER_PROFILE, { userId: id, profile })}
        onUnlike={isLikesTab ? () => handleUnlike(likeId) : undefined}
        unliking={unlikingId === likeId}
      />
    );
  }, [isLikesTab, navigation, handleUnlike, unlikingId]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isLikesTab ? 'Who Liked You' : 'Top Profiles'}
        </Text>
        <Text style={styles.headerSub}>
          {isLikesTab
            ? (likes.length > 0 ? `${likes.length} ${likes.length === 1 ? 'person' : 'people'} liked your profile` : 'No likes yet')
            : 'Boosted profiles near you'
          }
        </Text>
      </View>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => switchTab('likes')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'likes' && styles.tabTextActive]}>
            ❤️  Likes
          </Text>
          {activeTab === 'likes' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => switchTab('top')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'top' && styles.tabTextActive]}>
            ⚡  Top Profiles
          </Text>
          {activeTab === 'top' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
      </View>
      <View style={styles.tabDivider} />

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF4B7A" />
          <Text style={styles.loadingText}>
            {isLikesTab ? 'Finding your likes...' : 'Loading top profiles...'}
          </Text>
        </View>
      ) : currentData.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>{isLikesTab ? '💝' : '⚡'}</Text>
          <Text style={styles.emptyTitle}>
            {isLikesTab ? 'No likes yet' : 'No boosted profiles'}
          </Text>
          <Text style={styles.emptySub}>
            {isLikesTab
              ? 'Complete your profile to attract more matches!'
              : 'Be the first to boost your profile and get noticed!'
            }
          </Text>
          {!isLikesTab && (
            <TouchableOpacity style={styles.boostBtn} onPress={() => navigation.navigate(Routes.PROFILE)}>
              <Text style={styles.boostBtnText}>⚡  Boost My Profile</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item._id || item.sender?._id}
          renderItem={renderItem}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      )}

      <UpgradeModal visible={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF5F7' },

  header:      { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#2D3436' },
  headerSub:   { fontSize: 13, color: '#A0A0A0', marginTop: 2 },

  tabsRow:       { flexDirection: 'row', paddingHorizontal: 12 },
  tabBtn:        { flex: 1, alignItems: 'center', paddingVertical: 10, position: 'relative' },
  tabText:       { fontSize: 14, fontWeight: '600', color: '#A0A0A0' },
  tabTextActive: { color: '#FF4B7A' },
  tabUnderline:  {
    position: 'absolute', bottom: 0, left: 20, right: 20,
    height: 3, backgroundColor: '#FF4B7A', borderRadius: 2,
  },
  tabDivider: { height: 1, backgroundColor: '#F0E0E6', marginBottom: 6 },

  grid: { paddingHorizontal: PAD, paddingTop: 8, paddingBottom: 24 },
  row:  { gap: GAP, marginBottom: GAP },

  // ── Mini card ──────────────────────────────────────────────────────────────
  card: {
    width: CARD_W, height: CARD_H,
    borderRadius: 12, overflow: 'hidden',
    backgroundColor: '#ddd',
  },
  cardImg: { width: '100%', height: '100%' },
  cardOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.48)',
    paddingHorizontal: 6, paddingVertical: 6,
  },
  cardName: { fontSize: 11, fontWeight: '700', color: '#fff' },
  cardCity: { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 1 },

  badge: {
    position: 'absolute', top: 6, right: 6,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeLike:  { backgroundColor: '#FF4B7A' },
  badgeBoost: { backgroundColor: '#3498DB' },
  badgeText:  { fontSize: 10, color: '#fff', fontWeight: '700' },

  onlineDot: {
    position: 'absolute', top: 6, left: 6,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#2ECC71', borderWidth: 1.5, borderColor: '#fff',
  },

  unlikeBtn: {
    position: 'absolute', bottom: 6, right: 6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  unlikeBtnText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // ── States ─────────────────────────────────────────────────────────────────
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 14, color: '#A0A0A0', marginTop: 8 },
  emptyIcon:   { fontSize: 52 },
  emptyTitle:  { fontSize: 20, fontWeight: '700', color: '#2D3436' },
  emptySub:    { fontSize: 13, color: '#A0A0A0', textAlign: 'center', paddingHorizontal: 40 },
  boostBtn:    {
    marginTop: 12, backgroundColor: '#3498DB',
    paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24,
  },
  boostBtnText:{ color: '#fff', fontWeight: '700', fontSize: 14 },
});
