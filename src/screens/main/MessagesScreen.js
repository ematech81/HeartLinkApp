import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Image, StyleSheet, FlatList,
  TouchableOpacity, TextInput, Dimensions,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from 'src/constants/Colors';
import { Spacing, Radius } from 'src/constants/layout';
import { FontSize, FontWeight } from 'src/constants/topography';
import { Routes } from 'src/constants/appConstants';
import { MatchAPI, MessageAPI } from 'services/ApiServices';
import { useAuth } from 'src/store/authStore';
import { timeAgo } from 'src/utils/dateUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TABS = ['All', 'Unread', 'Matches'];

// ── Dummy data for development ────────────────────────────────────────────────
const DUMMY_MATCHES = [
  { matchId: '1', user: { _id: '1', name: 'Sarah',  profilePicture: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=200', isOnline: true }},
  { matchId: '2', user: { _id: '2', name: 'David',  profilePicture: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200', isOnline: false }},
  { matchId: '3', user: { _id: '3', name: 'Elena',  profilePicture: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200', isOnline: false }},
  { matchId: '4', user: { _id: '4', name: 'Mark',   profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200', isOnline: true }},
];

const DUMMY_CONVERSATIONS = [
  {
    matchId: '1',
    user: { _id: '1', name: 'Sarah Jenkins', profilePicture: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=200' },
    lastMessage: { content: 'That sounds like a plan! See you then. ✨', createdAt: new Date(Date.now() - 2 * 60000), isRead: true, isMine: false },
    unreadCount: 0,
    isActive: true,
  },
  {
    matchId: '2',
    user: { _id: '2', name: 'David Chen', profilePicture: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200' },
    lastMessage: { content: 'Did you see the new restaurant update?', createdAt: new Date(Date.now() - 60 * 60000), isRead: false, isMine: false },
    unreadCount: 2,
    isActive: false,
  },
  {
    matchId: '3',
    user: { _id: '3', name: 'Elena Rodriguez', profilePicture: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200' },
    lastMessage: { content: "I'm free this weekend if you want to...", createdAt: new Date(Date.now() - 3 * 60 * 60000), isRead: true, isMine: true },
    unreadCount: 0,
    isActive: false,
  },
];

// ── Story avatar (top matches row) ─────────────────────────────────────────────
function StoryAvatar({ match, onPress }) {
  const { user } = match;
  const avatar = user.profilePicture
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=FF4D6D&color=fff&size=100`;

  return (
    <TouchableOpacity style={storyStyles.container} onPress={() => onPress(match)} activeOpacity={0.8}>
      <View style={[storyStyles.ring, user.isOnline && storyStyles.ringActive]}>
        <Image source={{ uri: avatar }} style={storyStyles.avatar} />
        {user.isOnline && <View style={storyStyles.onlineDot} />}
      </View>
      <Text style={storyStyles.name} numberOfLines={1}>
        {user.name.split(' ')[0]}
      </Text>
    </TouchableOpacity>
  );
}

const storyStyles = StyleSheet.create({
  container: { alignItems: 'center', marginRight: Spacing.md, width: 70 },
  ring: {
    width: 68, height: 68, borderRadius: 34,
    borderWidth: 2.5, borderColor: '#E5E7EB',
    padding: 2, position: 'relative',
  },
  ringActive: { borderColor: '#FF4B7A' },
  avatar: { width: '100%', height: '100%', borderRadius: 30 },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#2ECC71', borderWidth: 2, borderColor: '#FFFFFF',
  },
  name: { fontSize: FontSize.xs, color: '#555', marginTop: 6, fontWeight: FontWeight.medium, textAlign: 'center' },
});

// ── Conversation row ───────────────────────────────────────────────────────────
function ConversationRow({ item, onPress }) {
  const { user, lastMessage, unreadCount, isActive } = item;
  const avatar = user.profilePicture
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=FF4D6D&color=fff&size=100`;

  return (
    <TouchableOpacity
      style={[convStyles.row, isActive && convStyles.rowActive]}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      {/* Active bar */}
      {isActive && <View style={convStyles.activeBar} />}

      <Image source={{ uri: avatar }} style={convStyles.avatar} />

      <View style={convStyles.content}>
        <View style={convStyles.topRow}>
          <Text style={[convStyles.name, unreadCount > 0 && convStyles.nameUnread]}>
            {user.name}
          </Text>
          <Text style={[convStyles.time, unreadCount > 0 && convStyles.timeUnread]}>
            {lastMessage ? timeAgo(lastMessage.createdAt) : ''}
          </Text>
        </View>
        <View style={convStyles.bottomRow}>
          {lastMessage?.isMine && (
            <Text style={convStyles.checkmarks}>
              {lastMessage.isRead ? '✓✓ ' : '✓ '}
            </Text>
          )}
          <Text
            style={[convStyles.preview, unreadCount > 0 && convStyles.previewUnread]}
            numberOfLines={1}
          >
            {lastMessage?.content || 'Say hello! 👋'}
          </Text>
          {unreadCount > 0 && (
            <View style={convStyles.badge}>
              <Text style={convStyles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const convStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    backgroundColor: Colors.white, position: 'relative',
  },
  rowActive: { backgroundColor: '#FFF0F3' },
  activeBar: {
    position: 'absolute', left: 0, top: 8, bottom: 8,
    width: 4, backgroundColor: '#FF4B7A', borderRadius: 2,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, marginRight: Spacing.md },
  content: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: '#2D3436' },
  nameUnread: { fontWeight: FontWeight.bold },
  time: { fontSize: FontSize.xs, color: '#A0A0A0' },
  timeUnread: { color: '#FF4B7A', fontWeight: FontWeight.semibold },
  bottomRow: { flexDirection: 'row', alignItems: 'center' },
  checkmarks: { fontSize: FontSize.xs, color: '#FF4B7A' },
  preview: { flex: 1, fontSize: FontSize.base, color: '#888', lineHeight: 20 },
  previewUnread: { color: '#2D3436', fontWeight: FontWeight.medium },
  badge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#FF4B7A', alignItems: 'center', justifyContent: 'center', marginLeft: Spacing.sm,
  },
  badgeText: { fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── MessagesScreen ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function MessagesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [activeTab,      setActiveTab]      = useState('All');
  const [matches,        setMatches]        = useState([]);
  const [conversations,  setConversations]  = useState([]);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [showSearch,     setShowSearch]     = useState(false);
  const [loading,        setLoading]        = useState(true);

  // ── Fetch data ────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [matchData, convData] = await Promise.all([
        MatchAPI.getMatches(),
        MessageAPI.getConversations(),
      ]);
      setMatches(matchData.matches    || DUMMY_MATCHES);
      setConversations(convData.conversations || DUMMY_CONVERSATIONS);
    } catch (err) {
      console.log('Messages fetch error:', err.message);
      // Use dummy data in development
      if (__DEV__) {
        setMatches(DUMMY_MATCHES);
        setConversations(DUMMY_CONVERSATIONS);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

  // ── Filter conversations by tab ───────────────────────────────────────────
  const filtered = conversations.filter((c) => {
    const matchesSearch = searchQuery
      ? c.user.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    if (!matchesSearch) return false;
    if (activeTab === 'Unread') return c.unreadCount > 0;
    if (activeTab === 'Matches') return !c.lastMessage;
    return true;
  });

  // ── Navigate to chat ──────────────────────────────────────────────────────
  const openChat = (item) => {
    navigation.navigate(Routes.CHAT, {
      userId:    item.user._id,
      userName:  item.user.name,
      userAvatar: item.user.profilePicture,
      matchId:   item.matchId,
    });
  };

    const handleGoback = () => {
      // Go back to Home tab
      navigation.navigate(Routes.HOME);
    };

  const openChatFromStory = (match) => {
    navigation.navigate(Routes.CHAT, {
      userId:    match.user._id,
      userName:  match.user.name,
      userAvatar: match.user.profilePicture,
      matchId:   match.matchId,
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF5F7" />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={handleGoback}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        {showSearch ? (
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages..."
            placeholderTextColor="#A0A0A0"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        ) : (
          <Text style={styles.headerTitle}>Messages</Text>
        )}

        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => { setShowSearch((s) => !s); setSearchQuery(''); }}
        >
          <Text style={styles.searchIcon}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <View style={styles.tabsRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={styles.tabBtn}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
            {activeTab === tab && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.tabDivider} />

      {loading ? (
        <ActivityIndicator color="#FF4B7A" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.matchId}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* ── Story-style matches row ─────────────────────────────── */}
              {matches.length > 0 && (
                <View style={styles.storiesSection}>
                  <FlatList
                    data={matches}
                    keyExtractor={(m) => m.matchId}
                    renderItem={({ item }) => (
                      <StoryAvatar match={item} onPress={openChatFromStory} />
                    )}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.storiesList}
                  />
                </View>
              )}
              <View style={styles.divider} />
            </>
          }
          renderItem={({ item }) => (
            <ConversationRow item={item} onPress={openChat} />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'Unread'
                  ? 'No unread messages'
                  : 'Start matching to begin conversations!'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },

  // ── Header ─────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: 12,
    backgroundColor: Colors.white,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 22, color: '#FF4B7A', fontWeight: FontWeight.bold },
  headerTitle: { fontSize: 22, fontWeight: FontWeight.bold, color: '#1A1A1A' },
  searchIcon: { fontSize: 20 },
  searchInput: {
    flex: 1, marginHorizontal: Spacing.sm,
    backgroundColor: '#F5F5F5', borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    fontSize: FontSize.base, color: '#1A1A1A',
  },

  // ── Tabs ───────────────────────────────────────────────────────────────
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
  },
  tabBtn: { marginRight: Spacing.xl, paddingVertical: 10, position: 'relative' },
  tabText: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: '#A0A0A0' },
  tabTextActive: { color: '#FF4B7A', fontWeight: FontWeight.bold },
  tabUnderline: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 3, backgroundColor: '#FF4B7A', borderRadius: 2,
  },
  tabDivider: { height: 1, backgroundColor: '#F0E0E6' },

  // ── Stories ────────────────────────────────────────────────────────────
  storiesSection: { backgroundColor: Colors.white, paddingVertical: Spacing.md },
  storiesList: { paddingHorizontal: Spacing.lg },
  divider: { height: 1, backgroundColor: '#F5F5F5' },

  // ── Conversation list ──────────────────────────────────────────────────
  separator: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 88 },

  // ── Empty ──────────────────────────────────────────────────────────────
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#2D3436' },
  emptySubtitle: { fontSize: FontSize.base, color: '#A0A0A0', textAlign: 'center', paddingHorizontal: 40 },
});