import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Image, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from 'src/constants/Colors';
import { Spacing, Radius } from 'src/constants/layout';
import { FontSize, FontWeight } from 'src/constants/topography';
import { Routes } from 'src/constants/appConstants';
import { MatchAPI } from 'services/ApiServices';
import { timeAgo } from 'src/utils/dateUtils';

// ── Dummy data for dev ────────────────────────────────────────────────────────
const DUMMY_MATCHES = [
  { matchId: 'm1', matchedAt: new Date(Date.now() - 2 * 60000), user: { _id: 'd1', name: 'Sarah Jenkins',   profession: 'Photographer', profilePicture: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300', isOnline: true  } },
  { matchId: 'm2', matchedAt: new Date(Date.now() - 60 * 60000), user: { _id: 'd2', name: 'Emma Rodriguez', profession: 'Chef',          profilePicture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300', isOnline: false } },
  { matchId: 'm3', matchedAt: new Date(Date.now() - 3 * 3600000), user: { _id: 'd3', name: 'Olivia Chen',   profession: 'Engineer',      profilePicture: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300', isOnline: true  } },
];

// ── Match card ────────────────────────────────────────────────────────────────
// function MatchCard({ item, onMessage, onViewProfile }) {
//   const { user, matchedAt } = item;
//   const avatar = user.profilePicture
//     || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=FF4D6D&color=fff&size=200`;


function MatchCard({ item, onMessage, onViewProfile }) {
  const { user, matchedAt } = item;

  // ← Add this guard
  if (!user) return null;

  const avatar = user.profilePicture
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=FF4D6D&color=fff&size=200`

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onViewProfile(item)}
      activeOpacity={0.85}
    >
      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        <Image source={{ uri: avatar }} style={styles.avatar} />
        {user.isOnline && <View style={styles.onlineDot} />}
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{user.name}</Text>
        {user.profession && (
          <Text style={styles.cardProfession}>💼 {user.profession}</Text>
        )}
        <Text style={styles.cardTime}>Matched {timeAgo(matchedAt)}</Text>
      </View>

      {/* Message button */}
      <TouchableOpacity
        style={styles.msgBtn}
        onPress={() => onMessage(item)}
        activeOpacity={0.8}
      >
        <Text style={styles.msgBtnIcon}>💬</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function MatchesScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [matches,   setMatches]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch matches ───────────────────────────────────────────────────────
  const fetchMatches = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await MatchAPI.getMatches();
      setMatches(data.matches?.length > 0 ? data.matches : __DEV__ ? DUMMY_MATCHES : []);
    } catch (err) {
      console.log('❌ [MatchesScreen] Fetch error:', err.message);
      if (__DEV__) setMatches(DUMMY_MATCHES);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchMatches(); }, []);

  // ── Navigate to chat ────────────────────────────────────────────────────
  const openChat = (item) => {
    navigation.navigate(Routes.CHAT, {
      userId:     item.user._id,
      userName:   item.user.name,
      userAvatar: item.user.profilePicture,
      matchId:    item.matchId,
    });
  };

  // ── Navigate to profile ─────────────────────────────────────────────────
  const openProfile = (item) => {
    navigation.navigate(Routes.USER_PROFILE, {
      userId:  item.user._id,
      profile: item.user,
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF5F7" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Matches</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{matches.length}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.centerText}>Loading your matches...</Text>
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>💔</Text>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptySubtitle}>
            Keep swiping! Your matches will appear here.
          </Text>
          <TouchableOpacity
            style={styles.discoverBtn}
            onPress={() => navigation.navigate(Routes.HOME)}
          >
            <Text style={styles.discoverBtnText}>Start Discovering</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.matchId}
          renderItem={({ item }) => (
            <MatchCard
              item={item}
              onMessage={openChat}
              onViewProfile={openProfile}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchMatches(true)}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          ListHeaderComponent={
            <Text style={styles.listHeader}>
              {matches.length} {matches.length === 1 ? 'person' : 'people'} liked you back ♥
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: '#FFF5F7' },

  // Header
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: 14, gap: 10 },
  headerTitle: { fontSize: 24, fontWeight: FontWeight.bold, color: '#2D3436' },
  headerBadge: { backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  headerBadgeText: { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  // List
  list:        { paddingHorizontal: Spacing.lg, paddingBottom: 24 },
  listHeader:  { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md, marginTop: 4 },
  separator:   { height: 1, backgroundColor: '#F3F4F6' },

  // Card
  card:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: Spacing.md, backgroundColor: '#FFF5F7' },
  avatarWrapper: { position: 'relative' },
  avatar:      { width: 64, height: 64, borderRadius: 32, borderWidth: 2.5, borderColor: '#FF4B7A' },
  onlineDot:   { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#2ECC71', borderWidth: 2, borderColor: '#fff' },
  cardInfo:    { flex: 1, gap: 3 },
  cardName:    { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#2D3436' },
  cardProfession: { fontSize: FontSize.sm, color: Colors.textSecondary },
  cardTime:    { fontSize: FontSize.xs, color: '#A0A0A0' },
  msgBtn:      { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFE4EC', alignItems: 'center', justifyContent: 'center' },
  msgBtnIcon:  { fontSize: 20 },

  // States
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: Spacing.lg },
  centerText:  { fontSize: FontSize.base, color: Colors.textSecondary },
  emptyEmoji:  { fontSize: 64 },
  emptyTitle:  { fontSize: 22, fontWeight: FontWeight.bold, color: '#2D3436' },
  emptySubtitle: { fontSize: FontSize.base, color: '#A0A0A0', textAlign: 'center', lineHeight: 22 },
  discoverBtn: { marginTop: 8, backgroundColor: '#FF4B7A', paddingHorizontal: 32, paddingVertical: 14, borderRadius: Radius.full },
  discoverBtnText: { color: '#fff', fontWeight: FontWeight.semibold, fontSize: FontSize.base },
});