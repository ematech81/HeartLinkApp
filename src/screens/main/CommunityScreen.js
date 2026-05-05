import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, ActivityIndicator, Image, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused, useFocusEffect } from '@react-navigation/native';
import Colors from 'src/constants/Colors';
import { FontSize, FontWeight } from 'src/constants/topography';
import { Spacing, Radius } from 'src/constants/layout';
import { Routes } from 'src/constants/appConstants';
import { CommunityAPI } from 'services/ApiServices';
import { useAuth } from 'src/store/authStore';
import UpgradeModal from 'src/components/UpgradeModal';
import AppStatusBar from 'src/component/common/AppStatusBar';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const NUDGE_DATE_KEY = '@heartlink/community_nudge_date';
const SCROLL_KEY     = '@heartlink/community_scroll_count';

// ── Helpers ───────────────────────────────────────────────────────────────────
const daysSince = (dateStr) => {
  if (!dateStr) return Infinity;
  return (Date.now() - new Date(dateStr)) / 86400000;
};

// ── Countdown timer ───────────────────────────────────────────────────────────
function CountdownBadge({ timeLeft }) {
  const hours   = Math.floor(timeLeft / 3600000);
  const minutes = Math.floor((timeLeft % 3600000) / 60000);
  const label   = hours > 0 ? `${hours}h left` : `${minutes}m left`;
  const urgent  = hours < 2;
  return (
    <View style={[s.countdownBadge, urgent && s.countdownBadgeUrgent]}>
      <Text style={s.countdownTxt}>⏱ {label}</Text>
    </View>
  );
}

// ── Expiry urgency strip (own posts near expiry) ───────────────────────────────
function ExpiryUrgencyStrip({ timeLeft, onUpgrade }) {
  const hours = Math.floor(timeLeft / 3600000);
  if (hours >= 3) return null;
  const mins  = Math.floor((timeLeft % 3600000) / 60000);
  const label = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  return (
    <View style={s.expiryStrip}>
      <Text style={s.expiryStripTxt}>⏳ Your post disappears in {label}</Text>
      <TouchableOpacity style={s.expiryStripBtn} onPress={onUpgrade} activeOpacity={0.85}>
        <Text style={s.expiryStripBtnTxt}>Go Premium</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Own-post analytics bar ────────────────────────────────────────────────────
function AnalyticsBar({ viewCount, isBoosted, onBoost, onDelete }) {
  return (
    <View style={s.analyticsBar}>
      <View style={s.analyticsLeft}>
        <Text style={s.analyticsStat}>👁 {viewCount || 0} views</Text>
        {!isBoosted && (
          <TouchableOpacity style={s.analyticsBoostBtn} onPress={onBoost} activeOpacity={0.85}>
            <Text style={s.analyticsBoostTxt}>⚡ Boost to reach 1,000+</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity onPress={onDelete} activeOpacity={0.75} style={s.analyticsDeleteBtn}>
        <Text style={s.analyticsDeleteTxt}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Single post card ──────────────────────────────────────────────────────────
function PostCard({ item, isVisible, onLike, onViewProfile, onMessage, onDelete, onUpgrade, isOwn, isBoosted }) {
  const videoRef   = useRef(null);
  const [liked, setLiked]         = useState(item.isLiked);
  const [likeCount, setLikeCount] = useState(item.likeCount || 0);
  const [liking, setLiking]       = useState(false);

  useEffect(() => {
    if (!videoRef.current || item.mediaType !== 'video') return;
    if (isVisible) {
      videoRef.current.playAsync().catch(() => {});
    } else {
      videoRef.current.pauseAsync().catch(() => {});
    }
  }, [isVisible]);

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => newLiked ? c + 1 : c - 1);
    try {
      await onLike(item._id);
    } catch {
      setLiked(!newLiked);
      setLikeCount((c) => newLiked ? c - 1 : c + 1);
    } finally {
      setLiking(false);
    }
  };

  return (
    <View style={s.card}>
      {/* Media */}
      {item.mediaType === 'video' ? (
        <Video
          ref={videoRef}
          source={{ uri: item.mediaUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          isLooping
          isMuted={false}
          shouldPlay={isVisible}
        />
      ) : (
        <Image source={{ uri: item.mediaUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}

      {/* Gradient overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent', 'transparent', 'rgba(0,0,0,0.75)']}
        locations={[0, 0.2, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Expiry urgency (own near-expired posts) */}
      {isOwn && (
        <View style={s.expiryStripWrap}>
          <ExpiryUrgencyStrip timeLeft={item.timeLeft} onUpgrade={onUpgrade} />
        </View>
      )}

      {/* Top: author info + countdown */}
      <View style={s.topRow}>
        <TouchableOpacity style={s.authorRow} onPress={() => onViewProfile(item.author?._id)} activeOpacity={0.85}>
          <Image
            source={{ uri: item.author?.profilePicture || 'https://via.placeholder.com/40' }}
            style={s.avatar}
          />
          <View>
            <View style={s.nameRow}>
              <Text style={s.authorName}>{item.author?.name || 'User'}</Text>
              {item.author?.isVerified && <Text style={s.blueTick}> ✔</Text>}
            </View>
            {item.author?.city ? (
              <Text style={s.authorLocation}>📍 {item.author.city}</Text>
            ) : null}
          </View>
        </TouchableOpacity>
        <CountdownBadge timeLeft={item.timeLeft} />
      </View>

      {/* Prompt badge */}
      {item.prompt ? (
        <View style={s.promptBadge}>
          <Text style={s.promptBadgeTxt}>"{item.prompt}"</Text>
        </View>
      ) : null}

      {/* Bottom: caption + actions */}
      <View style={s.bottomRow}>
        <View style={s.captionArea}>
          {item.caption ? (
            <Text style={s.caption} numberOfLines={3}>{item.caption}</Text>
          ) : null}
        </View>

        {/* Action buttons */}
        <View style={s.actions}>
          {isOwn ? (
            // analytics inline (view count only — full bar below)
            <View style={s.actionBtn}>
              <Text style={s.actionIcon}>👁</Text>
              <Text style={s.actionCount}>{item.viewCount || 0}</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity style={s.actionBtn} onPress={handleLike} activeOpacity={0.8}>
                <Text style={[s.actionIcon, liked && s.likedIcon]}>{liked ? '❤️' : '🤍'}</Text>
                <Text style={s.actionCount}>{likeCount}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn} onPress={() => onViewProfile(item.author?._id)} activeOpacity={0.8}>
                <Text style={s.actionIcon}>👤</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn} onPress={() => onMessage(item)} activeOpacity={0.8}>
                <Text style={s.actionIcon}>💬</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Analytics bar — own posts only */}
      {isOwn && (
        <AnalyticsBar
          viewCount={item.viewCount}
          isBoosted={isBoosted}
          onBoost={onUpgrade}
          onDelete={() => onDelete(item._id)}
        />
      )}

      {/* View count for non-owners */}
      {!isOwn && (
        <View style={s.viewCountBadge}>
          <Text style={s.viewCountTxt}>👁 {item.viewCount || 0}</Text>
        </View>
      )}
    </View>
  );
}

// ── Nudge card (feed header) ──────────────────────────────────────────────────
function NudgeCard({ type, onPost, onUpgrade, onDismiss }) {
  const config = {
    first_post: {
      icon: '✨',
      title: 'Show your vibe today',
      body: 'People who post get up to 3× more matches 🔥',
      cta: 'Create your first post',
      action: onPost,
      bg: '#FFF1F3',
      border: '#FECDD3',
      ctaColor: Colors.primary,
    },
    passive: {
      icon: '👀',
      title: 'You\'ve seen amazing vibes…',
      body: 'Now show yours! Post a photo or video to get noticed.',
      cta: 'Post now',
      action: onPost,
      bg: '#F0FDF4',
      border: '#86EFAC',
      ctaColor: '#16A34A',
    },
    inactive: {
      icon: '👀',
      title: 'It\'s been a while',
      body: 'Post again to stay visible and get more matches.',
      cta: 'Post again',
      action: onPost,
      bg: '#FFF7ED',
      border: '#FCD34D',
      ctaColor: '#B45309',
    },
    non_boosted: {
      icon: '🚀',
      title: 'Boost your visibility',
      body: 'You\'re already posting — boost your profile to appear at the top and get 3× more matches.',
      cta: 'Boost My Profile',
      action: onUpgrade,
      bg: '#F5F3FF',
      border: '#C4B5FD',
      ctaColor: '#7C3AED',
    },
  }[type];

  if (!config) return null;

  return (
    <View style={[s.nudgeCard, { backgroundColor: config.bg, borderColor: config.border }]}>
      <TouchableOpacity style={s.nudgeDismiss} onPress={onDismiss} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Text style={s.nudgeDismissTxt}>✕</Text>
      </TouchableOpacity>
      <Text style={s.nudgeIcon}>{config.icon}</Text>
      <Text style={s.nudgeTitle}>{config.title}</Text>
      <Text style={s.nudgeBody}>{config.body}</Text>
      <TouchableOpacity
        style={[s.nudgeCta, { backgroundColor: config.ctaColor }]}
        onPress={config.action}
        activeOpacity={0.85}
      >
        <Text style={s.nudgeCtaTxt}>{config.cta}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Empty feed ────────────────────────────────────────────────────────────────
function EmptyFeed({ isBoosted, onPost, onUpgrade }) {
  if (isBoosted) {
    return (
      <View style={s.emptyContainer}>
        <Text style={s.emptyIcon}>✨</Text>
        <Text style={s.emptyTitle}>Show your vibe today</Text>
        <Text style={s.emptySub}>
          People who post get up to 3× more matches 🔥{'\n'}
          Be the first to share your personality.
        </Text>
        <TouchableOpacity style={s.emptyBtn} onPress={onPost} activeOpacity={0.85}>
          <Text style={s.emptyBtnTxt}>Create your first post</Text>
        </TouchableOpacity>
        <Text style={s.emptySocialProof}>Top profiles post daily · Show personality before matching</Text>
      </View>
    );
  }
  return (
    <View style={s.emptyContainer}>
      <Text style={s.emptyIcon}>🎬</Text>
      <Text style={s.emptyTitle}>Show your personality</Text>
      <Text style={s.emptySub}>
        Posting in Community helps you get more matches.{'\n'}
        Subscribe to unlock posting and all premium features.
      </Text>
      <TouchableOpacity style={[s.emptyBtn, { backgroundColor: Colors.primary }]} onPress={onUpgrade} activeOpacity={0.85}>
        <Text style={s.emptyBtnTxt}>Subscribe to Post</Text>
      </TouchableOpacity>
      <Text style={s.emptySocialProof}>Members who post get 3× more matches 🔥</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function CommunityScreen({ navigation }) {
  const insets    = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { user }  = useAuth();

  const [posts,        setPosts]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [page,         setPage]         = useState(1);
  const [hasMore,      setHasMore]      = useState(true);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [showUpgrade,  setShowUpgrade]  = useState(false);

  // Nudge state
  const [nudgeType,    setNudgeType]    = useState(null);
  const [myPostCount,  setMyPostCount]  = useState(null); // null = not fetched yet

  const isSubscribed = !!(user?.isSubscribed && (!user.subscriptionExpiry || new Date(user.subscriptionExpiry) > new Date()));
  const isBoosted    = !!(user?.isBoosted    && new Date(user?.boostExpiry) > new Date());
  const canPost      = isSubscribed; // boost = visibility only; subscription required to post

  // ── Fetch feed ──────────────────────────────────────────────────────────────
  const fetchFeed = useCallback(async (pageNum = 1, refresh = false) => {
    if (refresh) setRefreshing(true);
    else if (pageNum === 1) setLoading(true);
    try {
      const data = await CommunityAPI.getFeed(pageNum, 10);
      if (refresh || pageNum === 1) {
        setPosts(data.posts || []);
      } else {
        setPosts((prev) => [...prev, ...(data.posts || [])]);
      }
      setHasMore(data.hasMore || false);
      setPage(pageNum);
    } catch (err) {
      console.log('❌ [Community] fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Determine which nudge to show (max 1 per day) ──────────────────────────
  const checkNudge = useCallback(async () => {
    if (!canPost) {
      // Non-subscribers see the upgrade nudge in the banner — no extra card needed
      return;
    }
    try {
      // Throttle: only show once per calendar day
      const lastNudgeDate = await AsyncStorage.getItem(NUDGE_DATE_KEY);
      const today         = new Date().toDateString();
      if (lastNudgeDate === today) return;

      // Fetch my posts
      const data = await CommunityAPI.getMyPosts();
      const mine = data.posts || [];
      setMyPostCount(mine.length);

      if (mine.length === 0) {
        setNudgeType('first_post');
      } else {
        const lastPost     = mine[0]; // API returns sorted by newest
        const lastPostDate = lastPost?.createdAt;
        if (daysSince(lastPostDate) >= 3) {
          setNudgeType('inactive');
        } else {
          // Track scroll count to trigger passive nudge
          const raw   = await AsyncStorage.getItem(SCROLL_KEY);
          const count = parseInt(raw || '0', 10);
          if (count >= 5) setNudgeType('passive');
        }
      }
    } catch {
      // Silently fail — nudges are non-critical
    }
  }, [canPost]);

  // Refresh feed every time this screen comes into focus (covers return from CreatePost).
  // Use refresh=true to avoid a full loading screen on re-entry.
  useFocusEffect(
    useCallback(() => { fetchFeed(1, true); }, [fetchFeed])
  );
  useEffect(() => { checkNudge(); }, [checkNudge]);

  // Record view when a post becomes visible
  useEffect(() => {
    const post = posts[visibleIndex];
    if (post && isFocused) {
      CommunityAPI.recordView(post._id).catch(() => {});

      // Increment scroll count for passive nudge
      AsyncStorage.getItem(SCROLL_KEY).then((raw) => {
        const next = (parseInt(raw || '0', 10) + 1).toString();
        AsyncStorage.setItem(SCROLL_KEY, next);
        if (parseInt(next, 10) >= 5 && !nudgeType && canPost && myPostCount !== null && myPostCount > 0) {
          setNudgeType('passive');
        }
      });
    }
  }, [visibleIndex, isFocused]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) setVisibleIndex(viewableItems[0].index ?? 0);
  }).current;

  const dismissNudge = async () => {
    setNudgeType(null);
    await AsyncStorage.setItem(NUDGE_DATE_KEY, new Date().toDateString());
    await AsyncStorage.setItem(SCROLL_KEY, '0');
  };

  const handleLike   = (postId) => CommunityAPI.toggleLike(postId);
  const handleDelete = (postId) => {
    Alert.alert('Delete Post', 'Remove this post permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await CommunityAPI.deletePost(postId);
          setPosts((prev) => prev.filter((p) => p._id !== postId));
        },
      },
    ]);
  };

  const handleViewProfile = (userId) => {
    if (userId) navigation.navigate(Routes.USER_PROFILE, { userId });
  };

  const handleMessage = (post) => {
    if (post.author?._id) {
      navigation.navigate(Routes.CHAT, {
        userId:   post.author._id,
        userName: post.author.name,
        avatar:   post.author.profilePicture,
      });
    }
  };

  const handleCreatePost = () => {
    if (!canPost) { setShowUpgrade(true); return; }
    navigation.navigate(Routes.CREATE_POST);
  };

  const renderItem = useCallback(({ item, index }) => {
    const isOwn = item.author?._id === user?._id;
    return (
      <PostCard
        item={item}
        isVisible={index === visibleIndex && isFocused}
        isOwn={isOwn}
        isBoosted={isBoosted}  // keeps boost-specific AnalyticsBar CTA
        onLike={handleLike}
        onViewProfile={handleViewProfile}
        onMessage={handleMessage}
        onDelete={handleDelete}
        onUpgrade={() => setShowUpgrade(true)}
      />
    );
  }, [visibleIndex, isFocused, user, isBoosted]);

  const renderFooter = () =>
    hasMore ? <ActivityIndicator color={Colors.primary} style={{ padding: 20 }} /> : null;

  // Feed header — nudge card for boosted users, upgrade banner for non-boosted
  const renderHeader = () => {
    if (nudgeType) {
      return (
        <NudgeCard
          type={nudgeType}
          onPost={handleCreatePost}
          onUpgrade={() => setShowUpgrade(true)}
          onDismiss={dismissNudge}
        />
      );
    }
    return null;
  };

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <AppStatusBar theme="light" />
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={s.loadingTxt}>Loading community...</Text>
      </View>
    );
  }

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <AppStatusBar theme="light" />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Community</Text>
          <Text style={s.headerSub}>Show your personality, find better matches</Text>
        </View>
        <TouchableOpacity style={s.createBtn} onPress={handleCreatePost} activeOpacity={0.85}>
          <Text style={s.createBtnTxt}>+ Post</Text>
        </TouchableOpacity>
      </View>

      {/* Subscribe banner — shown to non-subscribers who can't post yet */}
      {!canPost && (
        <TouchableOpacity style={s.boostBanner} onPress={() => setShowUpgrade(true)} activeOpacity={0.85}>
          <Text style={s.boostBannerTxt}>
            ✨  Subscribe to unlock posting · Members who post get 3× more matches
          </Text>
        </TouchableOpacity>
      )}

      {/* Feed */}
      {posts.length === 0 ? (
        <EmptyFeed isBoosted={canPost} onPost={handleCreatePost} onUpgrade={() => setShowUpgrade(true)} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToAlignment="start"
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onEndReached={() => { if (hasMore) fetchFeed(page + 1); }}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          onRefresh={() => fetchFeed(1, true)}
          refreshing={refreshing}
          getItemLayout={(_, index) => ({
            length: SCREEN_H,
            offset: SCREEN_H * index,
            index,
          })}
        />
      )}

      <UpgradeModal visible={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingTxt:       { color: Colors.textSecondary, fontSize: FontSize.sm },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerTitle:   { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  headerSub:     { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  createBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.md,
    paddingVertical: 8, borderRadius: Radius.full,
  },
  createBtnTxt: { color: Colors.white, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },

  boostBanner: {
    backgroundColor: '#FFF1F3', paddingVertical: 10, paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: '#FECDD3',
  },
  boostBannerTxt: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold, textAlign: 'center' },

  // ── Post card ────────────────────────────────────────────────────────────────
  card: { width: SCREEN_W, height: SCREEN_H, backgroundColor: '#111' },

  topRow: {
    position: 'absolute', top: 16, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
  },
  authorRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar:         { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: Colors.white },
  nameRow:        { flexDirection: 'row', alignItems: 'center' },
  authorName:     { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.base, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  blueTick:       { color: '#3B82F6', fontWeight: FontWeight.bold },
  authorLocation: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.xs, marginTop: 1 },

  countdownBadge:       { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  countdownBadgeUrgent: { backgroundColor: 'rgba(239,68,68,0.8)' },
  countdownTxt:         { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  promptBadge:    { position: 'absolute', bottom: 200, left: 16, right: 70, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8, borderLeftWidth: 3, borderLeftColor: Colors.primary },
  promptBadgeTxt: { color: Colors.white, fontSize: FontSize.sm, fontStyle: 'italic', lineHeight: 18 },

  bottomRow:   { position: 'absolute', bottom: 130, left: 0, right: 0, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16 },
  captionArea: { flex: 1, paddingRight: 12 },
  caption:     { color: Colors.white, fontSize: FontSize.sm, lineHeight: 20, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },

  actions:     { gap: 20, alignItems: 'center', paddingBottom: 4 },
  actionBtn:   { alignItems: 'center', gap: 4 },
  actionIcon:  { fontSize: 28 },
  likedIcon:   { fontSize: 28 },
  actionCount: { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  viewCountBadge: { position: 'absolute', bottom: 90, left: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  viewCountTxt:   { color: Colors.white, fontSize: FontSize.xs },

  // ── Expiry urgency strip ─────────────────────────────────────────────────────
  expiryStripWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  expiryStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(239,68,68,0.9)',
    paddingHorizontal: 14, paddingVertical: 8,
  },
  expiryStripTxt:    { color: '#fff', fontSize: FontSize.xs, fontWeight: FontWeight.semibold, flex: 1 },
  expiryStripBtn:    { backgroundColor: '#fff', borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5, marginLeft: 10 },
  expiryStripBtnTxt: { color: '#DC2626', fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  // ── Analytics bar ─────────────────────────────────────────────────────────────
  analyticsBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  analyticsLeft:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  analyticsStat:      { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  analyticsBoostBtn:  { backgroundColor: '#F59E0B', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  analyticsBoostTxt:  { color: '#fff', fontSize: 10, fontWeight: FontWeight.bold },
  analyticsDeleteBtn: { padding: 4 },
  analyticsDeleteTxt: { fontSize: 20 },

  // ── Nudge card ────────────────────────────────────────────────────────────────
  nudgeCard: {
    marginHorizontal: 16, marginVertical: 12,
    borderRadius: Radius.lg, borderWidth: 1.5,
    padding: Spacing.lg, alignItems: 'center', gap: 6,
    position: 'relative',
  },
  nudgeDismiss:    { position: 'absolute', top: 10, right: 12 },
  nudgeDismissTxt: { fontSize: 14, color: '#9CA3AF' },
  nudgeIcon:       { fontSize: 32 },
  nudgeTitle:      { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#111827', textAlign: 'center' },
  nudgeBody:       { fontSize: FontSize.sm, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  nudgeCta: {
    marginTop: 8, borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl, paddingVertical: 12,
  },
  nudgeCtaTxt: { color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.sm },

  // ── Empty feed ────────────────────────────────────────────────────────────────
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: Colors.background, padding: Spacing.xl },
  emptyIcon:      { fontSize: 56 },
  emptyTitle:     { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text, textAlign: 'center' },
  emptySub:       { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  emptyBtn:       { backgroundColor: '#F59E0B', borderRadius: Radius.full, paddingVertical: 14, paddingHorizontal: Spacing.xl, marginTop: 4 },
  emptyBtnTxt:    { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.base },
  emptySocialProof: { fontSize: FontSize.xs, color: Colors.textLight, textAlign: 'center', marginTop: 6 },
});
