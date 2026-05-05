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

const { width: SCREEN_W } = Dimensions.get('window');
const NUDGE_DATE_KEY = '@heartlink/community_nudge_date';

// Group flat post array by author, preserving recency order of first appearance
function groupByAuthor(posts) {
  const map = new Map();
  for (const post of posts) {
    const aid = post.author?._id;
    if (!aid) continue;
    if (!map.has(aid)) map.set(aid, { author: post.author, posts: [] });
    map.get(aid).posts.push(post);
  }
  return Array.from(map.values());
}

// ── Single media slide (one post) ────────────────────────────────────────────
function PostSlide({ post, isVisible, height }) {
  const H = height || Dimensions.get('window').height;
  const [paused, setPaused] = useState(false);

  // Reset to playing when this slide scrolls off screen
  useEffect(() => {
    if (!isVisible) setPaused(false);
  }, [isVisible]);

  const hrs     = Math.floor((post.timeLeft || 0) / 3600000);
  const min     = Math.floor(((post.timeLeft || 0) % 3600000) / 60000);
  const urgent  = hrs < 2;
  const timeLabel = hrs > 0 ? `${hrs}h ${min}m` : `${min}m`;

  return (
    <View style={{ width: SCREEN_W, height: H, backgroundColor: '#000' }}>
      {post.mediaType === 'video' ? (
        <Video
          source={{ uri: post.mediaUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          isLooping
          isMuted={false}
          shouldPlay={isVisible && !paused}
        />
      ) : (
        <Image
          source={{ uri: post.mediaUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}

      {/* Gradient overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'transparent', 'transparent', 'rgba(0,0,0,0.72)']}
        locations={[0, 0.22, 0.55, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Countdown — top right */}
      <View style={[s.countdownBadge, urgent && s.countdownUrgent]}>
        <Text style={s.countdownTxt}>⏱ {timeLabel}</Text>
      </View>

      {/* Prompt — center-left */}
      {!!post.prompt && (
        <View style={s.promptBadge}>
          <Text style={s.promptTxt} numberOfLines={2}>"{post.prompt}"</Text>
        </View>
      )}

      {/* Caption — bottom-left above the action area */}
      {!!post.caption && (
        <View style={s.captionWrap}>
          <Text style={s.captionTxt} numberOfLines={3}>{post.caption}</Text>
        </View>
      )}

      {/* Play / Pause toggle — videos only */}
      {post.mediaType === 'video' && (
        <TouchableOpacity
          style={s.playPauseBtn}
          onPress={() => setPaused((p) => !p)}
          activeOpacity={0.8}
        >
          <Text style={s.playPauseIcon}>{paused ? '▶️' : '⏸️'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Profile block (one author, horizontal carousel of their posts) ────────────
function ProfileBlock({
  group, height, isActiveBlock, isFocused,
  currentUserId, isSubscribed,
  onLike, onMessage, onViewProfile, onDelete, onUpgrade,
}) {
  const H = height || Dimensions.get('window').height;
  const { author, posts } = group;
  const isOwn = author?._id === currentUserId;

  const [activeIdx, setActiveIdx] = useState(0);
  const [likeMap,   setLikeMap]   = useState(() => {
    const m = {};
    posts.forEach((p) => { m[p._id] = { liked: !!p.isLiked, count: p.likeCount || 0 }; });
    return m;
  });

  const viewCfg  = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewCh = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) setActiveIdx(viewableItems[0].index ?? 0);
  }).current;

  const currentPost  = posts[activeIdx] || posts[0];
  const curLike      = likeMap[currentPost?._id] || {};

  const handleLike = async (postId) => {
    const cur     = likeMap[postId] || {};
    const newLiked = !cur.liked;
    setLikeMap((prev) => ({
      ...prev,
      [postId]: { liked: newLiked, count: (cur.count || 0) + (newLiked ? 1 : -1) },
    }));
    try { await onLike(postId); } catch {
      setLikeMap((prev) => ({
        ...prev,
        [postId]: { liked: !newLiked, count: (cur.count || 0) + (newLiked ? -1 : 1) },
      }));
    }
  };

  const handleMessage = () => {
    if (!isSubscribed) { onUpgrade(); return; }
    onMessage(currentPost);
  };

  const handleDelete = () => {
    Alert.alert('Delete Post', 'Remove this post permanently?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(currentPost._id) },
    ]);
  };

  return (
    <View style={{ width: SCREEN_W, height: H }}>
      {/* Horizontal post carousel */}
      <FlatList
        data={posts}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item._id}
        renderItem={({ item, index }) => (
          <PostSlide
            post={item}
            height={H}
            isVisible={isActiveBlock && index === activeIdx && isFocused}
          />
        )}
        onViewableItemsChanged={onViewCh}
        viewabilityConfig={viewCfg}
        getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
      />

      {/* ── Author row ── absolute top-left */}
      <View style={s.authorRow}>
        <TouchableOpacity style={s.authorInfo} onPress={() => onViewProfile(author?._id)} activeOpacity={0.85}>
          <Image
            source={{ uri: author?.profilePicture || 'https://via.placeholder.com/40' }}
            style={s.avatar}
          />
          <View>
            <View style={s.nameRow}>
              <Text style={s.authorName}>{author?.name || 'User'}</Text>
              {author?.isVerified && <Text style={s.verifiedTick}>✔</Text>}
            </View>
            {!!author?.city && <Text style={s.authorLoc}>📍 {author.city}</Text>}
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Horizontal dots ── absolute top-center (only when multiple posts) */}
      {posts.length > 1 && (
        <View style={s.dotsRow}>
          {posts.map((_, i) => (
            <View key={i} style={[s.dot, i === activeIdx && s.dotActive]} />
          ))}
        </View>
      )}

      {/* ── Action buttons ── absolute right side */}
      <View style={s.actionCol}>
        {isOwn ? (
          <>
            <View style={s.actionItem}>
              <Text style={s.actionIcon}>👁</Text>
              <Text style={s.actionCount}>{currentPost?.viewCount || 0}</Text>
            </View>
            <View style={s.actionItem}>
              <Text style={s.actionIcon}>{curLike.liked ? '❤️' : '🤍'}</Text>
              <Text style={s.actionCount}>{curLike.count || 0}</Text>
            </View>
            <TouchableOpacity style={s.actionItem} onPress={handleDelete} activeOpacity={0.75}>
              <Text style={[s.actionIcon, { fontSize: 22 }]}>🗑️</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={s.actionItem} onPress={() => handleLike(currentPost?._id)} activeOpacity={0.8}>
              <Text style={s.actionIcon}>{curLike.liked ? '❤️' : '🤍'}</Text>
              <Text style={s.actionCount}>{curLike.count || 0}</Text>
            </TouchableOpacity>
            <View style={s.actionItem}>
              <Text style={s.actionIcon}>👁</Text>
              <Text style={s.actionCount}>{currentPost?.viewCount || 0}</Text>
            </View>
            <TouchableOpacity style={s.actionItem} onPress={handleMessage} activeOpacity={0.8}>
              <Text style={s.actionIcon}>💬</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ── Expiry strip ── absolute top (own near-expiry posts) */}
      {isOwn && (() => {
        const hrs2 = Math.floor((currentPost?.timeLeft || 0) / 3600000);
        if (hrs2 >= 3) return null;
        const m2 = Math.floor(((currentPost?.timeLeft || 0) % 3600000) / 60000);
        return (
          <View style={s.expiryStrip}>
            <Text style={s.expiryTxt}>
              ⏳ Your post disappears in {hrs2 > 0 ? `${hrs2}h ${m2}m` : `${m2}m`}
            </Text>
          </View>
        );
      })()}
    </View>
  );
}

// ── Empty feed ────────────────────────────────────────────────────────────────
function EmptyFeed({ canPost, onPost, onUpgrade }) {
  if (canPost) {
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

  const [groups,      setGroups]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [activeIdx,   setActiveIdx]   = useState(0);
  const [nudgeType,   setNudgeType]   = useState(null);
  const [feedH,       setFeedH]       = useState(null);

  const isSubscribed = !!(user?.isSubscribed && (!user.subscriptionExpiry || new Date(user.subscriptionExpiry) > new Date()));
  const canPost      = isSubscribed;

  // ── Fetch feed ──────────────────────────────────────────────────────────────
  const fetchFeed = useCallback(async (pageNum = 1, refresh = false) => {
    if (refresh) setRefreshing(true);
    else if (pageNum === 1) setLoading(true);
    try {
      const data = await CommunityAPI.getFeed(pageNum, 20);
      const raw  = data.posts || [];
      if (refresh || pageNum === 1) {
        setGroups(groupByAuthor(raw));
      } else {
        setGroups((prev) => {
          // Merge new posts into existing groups or add new groups
          const map = new Map(prev.map((g) => [g.author._id, g]));
          for (const post of raw) {
            const aid = post.author?._id;
            if (!aid) continue;
            if (map.has(aid)) {
              map.get(aid).posts.push(post);
            } else {
              map.set(aid, { author: post.author, posts: [post] });
            }
          }
          return Array.from(map.values());
        });
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

  // ── Nudge check ─────────────────────────────────────────────────────────────
  const checkNudge = useCallback(async () => {
    if (!canPost) return;
    try {
      const lastDate = await AsyncStorage.getItem(NUDGE_DATE_KEY);
      if (lastDate === new Date().toDateString()) return;
      const data = await CommunityAPI.getMyPosts();
      const mine = data.posts || [];
      if (mine.length === 0) {
        setNudgeType('first_post');
      } else {
        const daysSince = (Date.now() - new Date(mine[0]?.createdAt)) / 86400000;
        if (daysSince >= 3) {
          setNudgeType('inactive');
        } else {
          setNudgeType(null); // recently posted — dismiss any lingering nudge
        }
      }
    } catch {}
  }, [canPost]);

  useFocusEffect(useCallback(() => {
    fetchFeed(1, true);
    checkNudge();
  }, [fetchFeed, checkNudge]));

  // Record view when active profile changes
  useEffect(() => {
    const group = groups[activeIdx];
    if (group?.posts?.[0] && isFocused) {
      CommunityAPI.recordView(group.posts[0]._id).catch(() => {});
    }
  }, [activeIdx, isFocused, groups]);

  const viewCfg    = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewChange = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) setActiveIdx(viewableItems[0].index ?? 0);
  }).current;

  const handleLike   = (postId) => CommunityAPI.toggleLike(postId);
  const handleDelete = async (postId) => {
    try {
      await CommunityAPI.deletePost(postId);
      setGroups((prev) => {
        const updated = prev
          .map((g) => ({ ...g, posts: g.posts.filter((p) => p._id !== postId) }))
          .filter((g) => g.posts.length > 0);
        return updated;
      });
    } catch {
      Alert.alert('Error', 'Could not delete post. Please try again.');
    }
  };
  const handleViewProfile = (userId) => {
    if (userId) navigation.navigate(Routes.USER_PROFILE, { userId });
  };
  const handleMessage = (post) => {
    if (post?.author?._id) {
      navigation.navigate(Routes.CHAT, {
        userId:      post.author._id,
        userName:    post.author.name,
        userAvatar:  post.author.profilePicture,
      });
    }
  };
  const handleCreatePost = () => {
    if (!canPost) { setShowUpgrade(true); return; }
    navigation.navigate(Routes.CREATE_POST);
  };
  const dismissNudge = async () => {
    setNudgeType(null);
    await AsyncStorage.setItem(NUDGE_DATE_KEY, new Date().toDateString());
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

      {/* ── Fixed header ─────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Community</Text>
          <Text style={s.headerSub}>Show your personality, find better matches</Text>
        </View>
        <TouchableOpacity style={s.createBtn} onPress={handleCreatePost} activeOpacity={0.85}>
          <Text style={s.createBtnTxt}>+ Post</Text>
        </TouchableOpacity>
      </View>

      {/* ── Subscribe banner (non-subscribers only) ──────────────────────── */}
      {!canPost && (
        <TouchableOpacity style={s.subBanner} onPress={() => setShowUpgrade(true)} activeOpacity={0.85}>
          <Text style={s.subBannerTxt}>
            ✨  Subscribe to unlock posting · Members get 3× more matches
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Nudge card (subscribers only) ────────────────────────────────── */}
      {nudgeType && canPost && (
        <View style={s.nudgeCard}>
          <TouchableOpacity style={s.nudgeDismiss} onPress={dismissNudge} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Text style={s.nudgeDismissTxt}>✕</Text>
          </TouchableOpacity>
          <Text style={s.nudgeTitle}>
            {nudgeType === 'first_post' ? '✨ Show your vibe today' : '👀 It\'s been a while'}
          </Text>
          <Text style={s.nudgeBody}>
            {nudgeType === 'first_post'
              ? 'People who post get up to 3× more matches 🔥'
              : 'Post again to stay visible and get more matches.'}
          </Text>
          <TouchableOpacity style={s.nudgeCta} onPress={handleCreatePost} activeOpacity={0.85}>
            <Text style={s.nudgeCtaTxt}>
              {nudgeType === 'first_post' ? 'Create your first post' : 'Post again'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Feed ─────────────────────────────────────────────────────────── */}
      <View
        style={{ flex: 1 }}
        onLayout={(e) => setFeedH(e.nativeEvent.layout.height)}
      >
        {!feedH ? null : groups.length === 0 ? (
          <EmptyFeed canPost={canPost} onPost={handleCreatePost} onUpgrade={() => setShowUpgrade(true)} />
        ) : (
          <FlatList
            data={groups}
            keyExtractor={(g) => g.author?._id || Math.random().toString()}
            renderItem={({ item, index }) => (
              <ProfileBlock
                group={item}
                height={feedH}
                isActiveBlock={index === activeIdx}
                isFocused={isFocused}
                currentUserId={user?._id}
                isSubscribed={isSubscribed}
                onLike={handleLike}
                onMessage={handleMessage}
                onViewProfile={handleViewProfile}
                onDelete={handleDelete}
                onUpgrade={() => setShowUpgrade(true)}
              />
            )}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            decelerationRate="fast"
            onViewableItemsChanged={onViewChange}
            viewabilityConfig={viewCfg}
            onEndReached={() => { if (hasMore) fetchFeed(page + 1); }}
            onEndReachedThreshold={0.5}
            onRefresh={() => fetchFeed(1, true)}
            refreshing={refreshing}
            getItemLayout={(_, i) => ({ length: feedH, offset: feedH * i, index: i })}
          />
        )}
      </View>

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
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  headerSub:   { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  createBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.md,
    paddingVertical: 8, borderRadius: Radius.full,
  },
  createBtnTxt: { color: Colors.white, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },

  // ── Subscribe banner ─────────────────────────────────────────────────────────
  subBanner: {
    backgroundColor: '#FFF1F3', paddingVertical: 10, paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: '#FECDD3',
  },
  subBannerTxt: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold, textAlign: 'center' },

  // ── Nudge card ────────────────────────────────────────────────────────────────
  nudgeCard: {
    backgroundColor: '#FFF1F3', borderBottomWidth: 1, borderBottomColor: '#FECDD3',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    alignItems: 'center', gap: 4, position: 'relative',
  },
  nudgeDismiss:    { position: 'absolute', top: 10, right: 14 },
  nudgeDismissTxt: { fontSize: 13, color: '#9CA3AF' },
  nudgeTitle:      { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text },
  nudgeBody:       { fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'center' },
  nudgeCta: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl, paddingVertical: 8, marginTop: 4,
  },
  nudgeCtaTxt: { color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.xs },

  // ── Post slide ────────────────────────────────────────────────────────────────
  countdownBadge: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  countdownUrgent: { backgroundColor: 'rgba(239,68,68,0.82)' },
  countdownTxt:    { color: '#fff', fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  promptBadge: {
    position: 'absolute',
    top: '38%',
    left: 16, right: 72,
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 8,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  promptTxt: { color: '#fff', fontSize: FontSize.sm, fontStyle: 'italic', lineHeight: 18 },

  captionWrap: {
    position: 'absolute', bottom: 90, left: 16, right: 72,
  },
  captionTxt: {
    color: '#fff', fontSize: FontSize.sm, lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },

  // ── Profile block ─────────────────────────────────────────────────────────────
  authorRow: {
    position: 'absolute', top: 16, left: 16, right: 72,
    flexDirection: 'row', alignItems: 'center',
  },
  authorInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:     { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#fff' },
  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  authorName: {
    color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.base,
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  verifiedTick: { color: '#60A5FA', fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  authorLoc:    { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.xs, marginTop: 1 },

  dotsRow: {
    position: 'absolute', top: 72, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 5,
  },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff', marginTop: -1 },

  // ── Action buttons (right side) ───────────────────────────────────────────────
  actionCol: {
    position: 'absolute', right: 12, bottom: 100,
    alignItems: 'center', gap: 22,
  },
  actionItem: { alignItems: 'center', gap: 3 },
  actionIcon: { fontSize: 30 },
  actionCount: { color: '#fff', fontSize: 11, fontWeight: FontWeight.semibold },

  // ── Play / Pause button ───────────────────────────────────────────────────────
  playPauseBtn: {
    position: 'absolute', bottom: 110, left: 16,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 24,
    width: 48, height: 48, alignItems: 'center', justifyContent: 'center',
  },
  playPauseIcon: { fontSize: 22 },

  // ── Expiry strip ──────────────────────────────────────────────────────────────
  expiryStrip: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.88)',
    paddingVertical: 6,
  },
  expiryTxt: { color: '#fff', fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  // ── Empty feed ────────────────────────────────────────────────────────────────
  emptyContainer:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: Colors.background, padding: Spacing.xl },
  emptyIcon:       { fontSize: 56 },
  emptyTitle:      { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text, textAlign: 'center' },
  emptySub:        { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  emptyBtn:        { backgroundColor: '#F59E0B', borderRadius: Radius.full, paddingVertical: 14, paddingHorizontal: Spacing.xl, marginTop: 4 },
  emptyBtnTxt:     { color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.base },
  emptySocialProof:{ fontSize: FontSize.xs, color: Colors.textLight, textAlign: 'center', marginTop: 6 },
});
