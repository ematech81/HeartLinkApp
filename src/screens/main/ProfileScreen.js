import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, StatusBar,
  Dimensions, FlatList, Platform,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from 'src/constants/Colors';
import { Spacing, Radius } from 'src/constants/layout';
import { FontSize, FontWeight } from 'src/constants/topography';
import { useAuth } from 'src/store/authStore';

const { width: W } = Dimensions.get('window');
const HERO_H = W * 1.05;

const getAge = (dob) =>
  !dob ? null : Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));

const capitalize = (str) =>
  str ? str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';

// ── Info card (Status / Profession) ──────────────────────────────────────────
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

// ══════════════════════════════════════════════════════════════════════════════
export default function ProfileScreen({ navigation }) {
  const insets       = useSafeAreaInsets();
  const { user }     = useAuth();

  const [activeTab,  setActiveTab]  = useState('about');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef(null);

  // Re-sync when coming back from EditProfileScreen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // user is already updated via updateUser() in EditProfileScreen
      // just reset photo index
      setPhotoIndex(0);
    });
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

  // Build media list — profile pic + gallery photos
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
    if (videoPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
    setVideoPlaying(!videoPlaying);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={{ width: 36 }} />
        <Text style={styles.headerTitle}>  {user?.name?.split(' ')[0]}'s Profile </Text>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => navigation.navigate('EditProfile')}
        >
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

          {/* Dot indicators */}
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
                  {[user.profession, user.city].filter(Boolean).join(' based in ')}
                </Text>
              )}
            </View>

            {/* Distance badge */}
            {user.distanceKm && (
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceBadgeText}>{user.distanceKm}</Text>
                <Text style={styles.distanceBadgeSub}>away</Text>
              </View>
            )}
          </View>

          {/* Edit Profile button */}
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.85}
          >
            <Text style={styles.editProfileBtnText}>✎  Edit Profile</Text>
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

            {/* Bio */}
            {!!user.bio && (
              <View style={styles.contentSection}>
                <SectionHeading icon="👤" title="Bio" />
                <Text style={styles.bioText}>{user.bio}</Text>
              </View>
            )}

            {/* 30-Second Intro Video */}
            {user.introVideo && (
              <View style={styles.contentSection}>
                <SectionHeading icon="🎬" title="30-Second Intro" />
                <TouchableOpacity
                  style={styles.videoWrapper}
                  onPress={toggleVideo}
                  activeOpacity={0.95}
                >
                  <Video
                    ref={videoRef}
                    source={{ uri: user.introVideo }}
                    style={styles.video}
                    resizeMode={ResizeMode.COVER}
                    isLooping={false}
                    onPlaybackStatusUpdate={(s) => {
                      if (s.isLoaded) setVideoPlaying(s.isPlaying);
                    }}
                  />
                  {/* Play/pause overlay */}
                  {!videoPlaying && (
                    <View style={styles.playOverlay}>
                      <View style={styles.playCircle}>
                        <Text style={styles.playIcon}>▶</Text>
                      </View>
                    </View>
                  )}
                  {/* Duration badge */}
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>0:30</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Status + Profession cards */}
            {(user.relationshipType || user.profession) && (
              <View style={styles.infoCardsRow}>
                {user.relationshipType && (
                  <InfoCard icon="👫" label="STATUS"     value={user.relationshipType} />
                )}
                {user.profession && (
                  <InfoCard icon="💼" label="PROFESSION" value={user.profession} />
                )}
              </View>
            )}

            {/* Interests */}
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

            {/* Location */}
            {(user.city || user.country) && (
              <View style={styles.contentSection}>
                <SectionHeading icon="📍" title="Location" />
                {/* Map placeholder */}
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

            {/* More details */}
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
          // Activity tab — placeholder for now
          <View style={styles.activityPlaceholder}>
            <Text style={styles.activityEmoji}>📊</Text>
            <Text style={styles.activityTitle}>Activity</Text>
            <Text style={styles.activitySub}>
              Your likes, matches, and profile views will appear here.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F9FAFB' },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: 12, backgroundColor: '#F9FAFB' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  menuBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  menuBtnText: { fontSize: 22, color: Colors.text, fontWeight: FontWeight.bold },

  // Hero
  heroContainer:{ width: W, height: HERO_H, backgroundColor: '#f0f0f0'},
  heroImage:    { width: W, height: HERO_H },
  dotsRow:      { position: 'absolute', bottom: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot:          { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive:    { width: 20, backgroundColor: '#fff' },

  // Identity
  identitySection: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: '#F9FAFB' },
  identityTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  identityLeft:    { flex: 1, marginRight: Spacing.md },
  nameRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  userName:        { fontSize: 28, fontWeight: FontWeight.extrabold, color: Colors.text, letterSpacing: -0.5 },
  verifiedIcon:    { width: 22, height: 22, borderRadius: 11, backgroundColor: '#3B82F6', color: '#fff', textAlign: 'center', lineHeight: 22, fontSize: 12, fontWeight: FontWeight.bold, overflow: 'hidden' },
  userProfession:  { fontSize: FontSize.base, color: Colors.primary, fontWeight: FontWeight.medium, lineHeight: 22 },

  distanceBadge:   { backgroundColor: '#FFF0F3', paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.lg, alignItems: 'center', borderWidth: 1, borderColor: '#FFB8CC' },
  distanceBadgeText:{ fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.primary },
  distanceBadgeSub: { fontSize: FontSize.xs, color: Colors.primary },

  editProfileBtn:  { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB', paddingVertical: 12, borderRadius: Radius.full, alignItems: 'center' },
  editProfileBtnText:{ fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },

  // Tabs
  tabsContainer: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: 4, backgroundColor: '#fff', borderRadius: Radius.full, padding: 4, borderWidth: 1, borderColor: '#F3F4F6' },
  tabBtn:        { flex: 1, paddingVertical: 10, borderRadius: Radius.full, alignItems: 'center' },
  tabBtnActive:  { backgroundColor: '#FFF0F3' },
  tabBtnText:    { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  tabBtnTextActive:{ color: Colors.primary, fontWeight: FontWeight.bold },

  // Content
  content:       { paddingHorizontal: Spacing.lg },
  contentSection:{ backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.lg, marginTop: Spacing.md },
  sectionHeading:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  sectionHeadingIcon: { fontSize: 18 },
  sectionHeadingText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text },
  bioText:       { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 24 },

  // Video
  videoWrapper:  { borderRadius: Radius.lg, overflow: 'hidden', position: 'relative' },
  video:         { width: '100%', height: 200, backgroundColor: '#000' },
  playOverlay:   { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playCircle:    { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  playIcon:      { fontSize: 22, color: '#fff', marginLeft: 4 },
  durationBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  durationText:  { fontSize: FontSize.xs, color: '#fff', fontWeight: FontWeight.semibold },

  // Info cards
  infoCardsRow:  { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  infoCard:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: '#F3F4F6' },
  infoCardIcon:  { fontSize: 22 },
  infoCardLabel: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.textSecondary, letterSpacing: 0.8 },
  infoCardValue: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, marginTop: 2 },

  // Interests
  interestsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  interestChip:  { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: '#F3F4F6' },
  interestText:  { fontSize: FontSize.sm, color: Colors.text, fontWeight: FontWeight.medium },

  // Location
  mapPlaceholder:{ height: 140, backgroundColor: '#FFE4EC', borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  mapPin:        { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  mapPinIcon:    { fontSize: 22 },
  locationLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },

  // Details grid
  detailsGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  detailItem:    { flex: 1, minWidth: '45%', backgroundColor: '#F9FAFB', borderRadius: Radius.md, padding: Spacing.md, gap: 4 },
  detailLabel:   { fontSize: FontSize.xs, color: Colors.textSecondary },
  detailValue:   { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },

  // Activity tab
  activityPlaceholder: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  activityEmoji: { fontSize: 52 },
  activityTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  activitySub:   { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 },

  // Bottom bar
  bottomBar:     { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingTop: 14, gap: Spacing.sm, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  messageBottomBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: Radius.full, backgroundColor: '#FFF0F3', borderWidth: 1.5, borderColor: Colors.primary },
  messageBottomIcon:{ fontSize: 18, color: Colors.primary },
  messageBottomText:{ fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.primary },
  likeBottomBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: Radius.full, backgroundColor: Colors.primary },
  likeBottomIcon:{ fontSize: 18, color: '#fff' },
  likeBottomText:{ fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
});