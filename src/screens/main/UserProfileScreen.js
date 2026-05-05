import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Dimensions,
  StatusBar, Alert, Platform, FlatList, Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from 'src/constants/Colors';
import { Spacing, Radius } from 'src/constants/layout';
import { FontSize, FontWeight } from 'src/constants/topography';
import { Routes } from 'src/constants/appConstants';
import { UserAPI, MatchAPI, PaymentAPI } from 'services/ApiServices';
import UpgradeModal from 'src/components/UpgradeModal';
import { useAuth } from 'src/store/authStore';
import { uploadProfilePicture, uploadPhotos, deletePhoto, uploadVideo } from 'src/utils/uploadImage';
import { Video, ResizeMode } from 'expo-av';

const { width: W, height: H } = Dimensions.get('window');
const HERO_H     = W * 1.38;
const THUMB_SIZE = (W - Spacing.lg * 2 - Spacing.sm * 2) / 3; // 3 per row
const MAX_PHOTOS = 6;

const getAge       = (dob) => !dob ? null : Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));
const capitalize   = (str) => str ? str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';
const isRemoteUrl  = (uri) => typeof uri === 'string' && (uri.startsWith('http://') || uri.startsWith('https://'));

// ── Info pill ─────────────────────────────────────────────────────────────────
function InfoPill({ icon, value }) {
  if (!value) return null;
  return (
    <View style={styles.pill}>
      <Text style={styles.pillIcon}>{icon}</Text>
      <Text style={styles.pillText}>{value}</Text>
    </View>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}


// ── Video Manager ─────────────────────────────────────────────────────────────

export function VideoManager({ videoUrl, onVideoChange, isOwner = false, onFullScreen }) {
  const [uploading, setUploading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);

  const pickAndUploadVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes:       ['videos'],
        allowsEditing:    true,
        videoMaxDuration: 30,
        quality:          0.8,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      if (asset.duration && asset.duration > 31000) {
        Alert.alert('Too Long', 'Please select a video under 30 seconds.');
        return;
      }

      setUploading(true);
      const url = await uploadVideo(asset.uri);
      onVideoChange(url);
      Alert.alert('Done! 🎉', 'Your intro video has been uploaded.');
    } catch (err) {
      Alert.alert('Upload Failed', err.message || 'Could not upload video.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteVideo = () => {
    Alert.alert('Remove Video', 'Are you sure you want to remove your intro video?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onVideoChange(null) },
    ]);
  };

  const togglePlay = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <View style={videoStyles.container}>
      {videoUrl ? (
        <View style={videoStyles.preview}>
          {/* Playable video */}
          <View style={videoStyles.videoWrapper}>
            <Video
              ref={videoRef}
              source={{ uri: videoUrl }}
              style={videoStyles.video}
              resizeMode={ResizeMode.COVER}
              isLooping
              onPlaybackStatusUpdate={(status) => {
                if (status.isLoaded) setIsPlaying(status.isPlaying);
              }}
            />
            {/* Play/pause overlay — tap opens fullscreen for non-owners */}
            <TouchableOpacity
              style={videoStyles.playOverlay}
              onPress={onFullScreen ? onFullScreen : togglePlay}
              activeOpacity={0.8}
            >
              {!isPlaying && (
                <View style={videoStyles.playCircle}>
                  <Text style={videoStyles.playIcon}>▶</Text>
                </View>
              )}
              {onFullScreen && (
                <View style={videoStyles.fullscreenHint}>
                  <Text style={videoStyles.fullscreenHintText}>⛶  Tap to view fullscreen</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {isOwner && (
            <View style={videoStyles.actions}>
              <TouchableOpacity style={videoStyles.changeBtn} onPress={pickAndUploadVideo} disabled={uploading}>
                {uploading
                  ? <ActivityIndicator size="small" color={Colors.primary} />
                  : <Text style={videoStyles.changeBtnText}>🔄  Change Video</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity style={videoStyles.deleteBtn} onPress={handleDeleteVideo}>
                <Text style={videoStyles.deleteBtnText}>🗑️  Remove</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        isOwner && (
          <TouchableOpacity style={videoStyles.uploadBox} onPress={pickAndUploadVideo} disabled={uploading} activeOpacity={0.8}>
            {uploading ? (
              <>
                <ActivityIndicator color={Colors.primary} />
                <Text style={videoStyles.uploadingText}>Uploading video...</Text>
              </>
            ) : (
              <>
                <Text style={videoStyles.uploadIcon}>🎬</Text>
                <Text style={videoStyles.uploadTitle}>Add Intro Video</Text>
                <Text style={videoStyles.uploadSub}>Max 30 seconds • MP4 or MOV</Text>
              </>
            )}
          </TouchableOpacity>
        )
      )}
    </View>
  );
}


const videoStyles = StyleSheet.create({
  container:     { marginBottom: Spacing.sm },
  preview:       { gap: Spacing.sm },
  videoWrapper:  { width: '100%', height: 220, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: '#000' },
  video:         { width: '100%', height: '100%' },
  playOverlay:   { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playCircle:    { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  playIcon:      { fontSize: 28, color: '#fff', marginLeft: 4 },
  actions:       { flexDirection: 'row', gap: Spacing.sm },
  changeBtn:     { flex: 1, paddingVertical: 12, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', backgroundColor: '#FFF0F3' },
  changeBtnText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
  deleteBtn:     { flex: 1, paddingVertical: 12, borderRadius: Radius.full, borderWidth: 1.5, borderColor: '#EF4444', alignItems: 'center', backgroundColor: '#FEF2F2' },
  deleteBtnText: { fontSize: FontSize.sm, color: '#EF4444', fontWeight: FontWeight.semibold },
  uploadBox:     { width: '100%', height: 160, borderRadius: Radius.lg, borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', backgroundColor: '#FFF0F3', alignItems: 'center', justifyContent: 'center', gap: 8 },
  uploadIcon:    { fontSize: 40 },
  uploadTitle:   { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.primary },
  uploadSub:     { fontSize: FontSize.sm, color: Colors.textSecondary },
  uploadingText: { fontSize: FontSize.sm, color: Colors.primary, marginTop: 8 },
  fullscreenHint: { position: 'absolute', bottom: 8, left: 0, right: 0, alignItems: 'center' },
  fullscreenHintText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' },
});



// ══════════════════════════════════════════════════════════════════════════════
// Photo Manager — reusable in ProfileScreen too
// ══════════════════════════════════════════════════════════════════════════════
export function PhotoManager({ photos, onPhotosChange, isOwner = false }) {
  const [uploading, setUploading] = useState(false);
  const [deletingIdx, setDeletingIdx] = useState(null);

  const pickAndUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes:    ['images'],
        allowsEditing: true,
        aspect:        [4, 5],
        quality:       0.85,
        allowsMultipleSelection: false,
      });

      if (result.canceled || !result.assets?.length) return;

      const uri = result.assets[0].uri;
      setUploading(true);

      const newUrls = await uploadPhotos([uri], 'heartlink/photos');
      onPhotosChange([...photos, ...newUrls]);

    } catch (err) {
      Alert.alert('Upload Failed', err.message || 'Could not upload photo.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (index) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingIdx(index);
            try {
              const safePhotos = Array.isArray(photos) ? photos : [];
              const updated = await deletePhoto(safePhotos, index);
              onPhotosChange(updated);
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not delete photo.');
            } finally {
              setDeletingIdx(null);
            }
          },
        },
      ]
    );
  };

  const canAdd = photos.length < MAX_PHOTOS;

  return (
    <View>
      <View style={styles.thumbGrid}>
        {/* Existing photos */}
        {photos.map((uri, i) => (
          <View key={i} style={styles.thumbWrapper}>
            <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
            {isOwner && (
              <TouchableOpacity
                style={styles.thumbDelete}
                onPress={() => handleDelete(i)}
                disabled={deletingIdx === i}
              >
                {deletingIdx === i
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.thumbDeleteText}>✕</Text>
                }
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Add photo slot */}
        {isOwner && canAdd && (
          <TouchableOpacity
            style={styles.thumbAdd}
            onPress={pickAndUpload}
            disabled={uploading}
          >
            {uploading
              ? <ActivityIndicator color={Colors.primary} />
              : (
                <>
                  <Text style={styles.thumbAddIcon}>+</Text>
                  <Text style={styles.thumbAddText}>Add Photo</Text>
                </>
              )
            }
          </TouchableOpacity>
        )}
      </View>

      {/* Count indicator */}
      <Text style={styles.photoCount}>
        {photos.length} / {MAX_PHOTOS} photos
        {isOwner && photos.length < MAX_PHOTOS && (
          <Text style={styles.photoCountHint}>  •  Tap + to add more</Text>
        )}
      </Text>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Screen
// ══════════════════════════════════════════════════════════════════════════════
export default function UserProfileScreen({ navigation, route }) {
  const insets       = useSafeAreaInsets();
  const { user: me, updateUser, logout } = useAuth();

  const paramProfile = route?.params?.profile ?? null;
  const userId       = route?.params?.userId  ?? paramProfile?._id ?? paramProfile?.id;

  const [profile,        setProfile]        = useState(paramProfile);
  const [loading,        setLoading]        = useState(!paramProfile);
  const [liking,         setLiking]         = useState(false);
  const [photoIndex,     setPhotoIndex]     = useState(0);
  const [error,          setError]          = useState(null);
  const [changingPfp,    setChangingPfp]    = useState(false);
  const [showUpgrade,    setShowUpgrade]    = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const isOwner = me?._id === (profile?._id || profile?.id)
               || me?.id  === (profile?._id || profile?.id);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (paramProfile) { setProfile(paramProfile); setLoading(false); return; }
    if (!userId)      { setError('User not found.'); setLoading(false); return; }

    UserAPI.getById(userId)
      .then((data) => { if (data?.user) setProfile(data.user); else setError('Not found.'); })
      .catch((err)  => setError(err?.message || 'Failed to load.'))
      .finally(()   => setLoading(false));
  }, [userId]);

  // ── Change profile picture ────────────────────────────────────────────────
  const handleChangeProfilePicture = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes:    ['images'],
        allowsEditing: true,
        aspect:        [4, 5],
        quality:       0.85,
      });

      if (result.canceled || !result.assets?.length) return;

      setChangingPfp(true);
      const url = await uploadProfilePicture(result.assets[0].uri);

      // Update local state
      setProfile((prev) => ({ ...prev, profilePicture: url }));

      // Update auth store if this is the logged-in user
      if (isOwner) updateUser({ profilePicture: url });

      Alert.alert('Updated!', 'Your profile picture has been updated.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not update profile picture.');
    } finally {
      setChangingPfp(false);
    }
  };

  // ── Gallery photos changed ────────────────────────────────────────────────
  // ✅ Fixed — saves to backend so it persists on reload
const handlePhotosChange = async (newPhotos) => {
  setProfile((prev) => ({ ...prev, photos: newPhotos }));
  if (isOwner) {
    updateUser({ photos: newPhotos });
    try {
      await UserAPI.updateProfile({ photos: newPhotos });
      console.log('✅ Photos saved to backend');
    } catch (err) {
      console.log('❌ Failed to save photos:', err.message);
    }
  }
};

// ✅ Fixed — saves to backend so it persists on reload
const handleVideoChange = async (url) => {
  setProfile((prev) => ({ ...prev, introVideo: url }));
  if (isOwner) {
    updateUser({ introVideo: url });
    try {
      await UserAPI.updateProfile({ introVideo: url });
      console.log('✅ Video saved to backend');
    } catch (err) {
      console.log('❌ Failed to save video:', err.message);
    }
  }
};




  // ── Like ──────────────────────────────────────────────────────────────────
  const handleLike = async () => {
    if (!profile || liking || isOwner) return;
    setLiking(true);
    try {
      const id  = profile._id || profile.id;
      const res = await MatchAPI.likeUser(id, false);
      if (res?.match) {
        navigation.replace('MatchScreen', { matchedUser: profile, matchId: res.match._id });
      } else {
        Alert.alert('Liked! ❤️', `You liked ${profile.name}`);
      }
    } catch (err) {
      Alert.alert('Error', err?.message || 'Something went wrong.');
    } finally {
      setLiking(false);
    }
  };

  const handleMessage = () => {
    navigation.navigate(Routes.CHAT, {
      userId:     profile._id || profile.id,
      userName:   profile.name,
      userAvatar: allMedia[0] || null,
    });
  };

  const isSubActive = () => me?.isSubscribed &&
    (!me.subscriptionExpiry || new Date(me.subscriptionExpiry) > new Date());

  const handleReport = () => {
    if (!isSubActive()) { setShowUpgrade(true); return; }
    setShowReportModal(true);
  };

  const submitReport = async (reason) => {
    setShowReportModal(false);
    try {
      await UserAPI.reportUser(profile._id || profile.id, reason);
      Alert.alert('Reported', 'Thank you. We will review this profile shortly.');
    } catch {
      Alert.alert('Error', 'Could not submit report. Please try again.');
    }
  };

  const handleBlock = () => {
    if (!isSubActive()) { setShowUpgrade(true); return; }
    const uid = profile._id || profile.id;
    Alert.alert('Block User', `Block ${profile.name}? They won't be able to see or message you.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          try {
            await UserAPI.blockUser(uid);
            Alert.alert('Blocked', `${profile.name} has been blocked.`);
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'Could not block this user. Try again.');
          }
        },
      },
    ]);
  };

  // ── Loading / error ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="dark-content" />
        <Text style={{ fontSize: 48 }}>😕</Text>
        <Text style={styles.errorTitle}>Profile unavailable</Text>
        <Text style={styles.errorSub}>{error || 'Could not load this profile.'}</Text>
        <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.goBackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Build media list ──────────────────────────────────────────────────────
  const allMedia = [
    profile.profilePicture,
    ...(Array.isArray(profile.photos) ? profile.photos : []),
    ...(profile.introVideo ? [{ type: 'video', uri: profile.introVideo }] : []),
  ].filter(Boolean);
  
  if (allMedia.length === 0) {
    allMedia.push(
      `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'User')}&size=600&background=FF4D6D&color=fff`
    );
  }
 
  // ✅ Replace with allMedia
  const displayMedia  = allMedia[photoIndex] || allMedia[0];
  const age           = profile.age || getAge(profile.dateOfBirth);
  const galleryPhotos = Array.isArray(profile.photos) ? profile.photos : [];

  const renderHeroMedia = ({ item }) => {
    if (item?.type === 'video') {
      return (
        <View style={{ width: W, height: HERO_H, backgroundColor: '#000' }}>
          <Video
            source={{ uri: item.uri }}
            style={{ width: W, height: HERO_H }}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            isLooping
            useNativeControls
          />
          <View style={{ position: 'absolute', top: 16, right: 60, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>🎬 Intro Video</Text>
          </View>
        </View>
      );
    }
    return <Image source={{ uri: item }} style={styles.heroImage} resizeMode="cover" />;
  };


  const onPhotoScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    setPhotoIndex(idx);
  };

  return (
    <View style={[styles.container, ]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* ── Swipeable photo carousel ───────────────────────────────── */}
        <View style={styles.heroContainer}>
          <FlatList
            data={allMedia}
            renderItem={renderHeroMedia}
            keyExtractor={(_, i) => i.toString()}
            horizontal pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onPhotoScroll}
            scrollEventThrottle={16}
            bounces={false}
          />

          {/* Photo count badge */}
          {allMedia.length > 1 && (
            <View style={styles.photoBadge}>
              <Text style={styles.photoBadgeText}>{photoIndex + 1} / {allMedia.length}</Text>
            </View>
          )}

          {/* Dot indicators — bottom center */}
          {allMedia.length > 1 && (
            <View style={styles.dotsRow}>
              {allMedia.map((_, i) => (
                <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />
              ))}
            </View>
          )}

          {/* Back button */}
          <TouchableOpacity style={[styles.backCircle, { top: insets.top + 12 }]} onPress={() => navigation.goBack()}>
            <Text style={styles.backCircleText}>←</Text>
          </TouchableOpacity>

          {/* Change profile pic — owner only */}
          {isOwner && (
            <TouchableOpacity
              style={[styles.reportCircle, { top: insets.top + 12 }]}
              onPress={handleChangeProfilePicture}
              disabled={changingPfp}
            >
              {changingPfp
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.reportCircleText}>📷</Text>
              }
            </TouchableOpacity>
          )}

          {/* Owner: change photo hint */}
          {isOwner && (
            <View style={styles.ownerHint}>
              <Text style={styles.ownerHintText}>📷  Tap to change profile picture</Text>
            </View>
          )}
        </View>

        {/* ── Identity below photo ────────────────────────────────────── */}
        <View style={styles.identityBlock}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText}>
              {profile.name}
              {age ? <Text style={styles.ageText}>,  {age}</Text> : null}
            </Text>
            {profile.isOnline && <View style={styles.onlineDot} />}
            {profile.isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            )}
          </View>
          {!!profile.profession && <Text style={styles.professionText}>💼  {profile.profession}</Text>}
          {(profile.city || profile.country) && (
            <Text style={styles.locationText}>
              📍  {[profile.city, profile.country].filter(Boolean).join(', ')}
            </Text>
          )}
        </View>

        {/* ── Action buttons (only for other users) ──────────────────── */}
        {!isOwner && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.btnPass} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Text style={styles.btnPassIcon}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnMessage} onPress={handleMessage} activeOpacity={0.8}>
              <Text style={styles.btnMessageIcon}>💬</Text>
              <Text style={styles.btnMessageText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnLike} onPress={handleLike} disabled={liking} activeOpacity={0.8}>
              {liking
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnLikeIcon}>♥</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* ── Content ──────────────────────────────────────────────────── */}
        <View style={styles.content}>

          {/* Bio */}
          {!!profile.bio && (
            <Section title="About">
              <Text style={styles.bioText}>{profile.bio}</Text>
            </Section>
          )}

          {/* Details */}
          <Section title="Details">
            <View style={styles.pillsWrap}>
              {age                      && <InfoPill icon="🎂" value={`${age} years old`} />}
              {profile.height           && <InfoPill icon="📏" value={`${profile.height} cm`} />}
              {profile.education        && <InfoPill icon="🎓" value={capitalize(profile.education)} />}
              {profile.religion         && <InfoPill icon="🙏" value={capitalize(profile.religion)} />}
              {profile.drink            && <InfoPill icon="🍷" value={capitalize(profile.drink)} />}
              {profile.smoke            && <InfoPill icon="🚬" value={capitalize(profile.smoke)} />}
              {profile.relationshipType && <InfoPill icon="💑" value={capitalize(profile.relationshipType)} />}
              {profile.lookingFor       && <InfoPill icon="🔍" value={`Looking for: ${capitalize(profile.lookingFor)}`} />}
            </View>
          </Section>

          {/* Interests */}
          {profile.interests?.length > 0 && (
            <Section title="Interests">
              <View style={styles.interestsWrap}>
                {profile.interests.map((item, i) => (
                  <View key={i} style={styles.interestChip}>
                    <Text style={styles.interestText}>{item}</Text>
                  </View>
                ))}
              </View>
            </Section>
          )}

          {/* ── Intro Video ── */}
          {(profile.introVideo || isOwner) && (
            <Section title="Intro Video">
              <VideoManager
                videoUrl={profile.introVideo}
                onVideoChange={handleVideoChange}
                isOwner={isOwner}
                onFullScreen={!isOwner && profile.introVideo ? () => setShowVideoModal(true) : undefined}
              />
            </Section>
          )}

          {/* ── Report & Block (non-owner only) ─────────────────────── */}
          {!isOwner && (
            <View style={styles.dangerRow}>
              <TouchableOpacity style={styles.reportBtn} onPress={handleReport} activeOpacity={0.8}>
                <Text style={styles.reportBtnText}>⚑  Report User</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.blockBtn} onPress={handleBlock} activeOpacity={0.8}>
                <Text style={styles.blockBtnText}>🚫  Block User</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Logout (owner only) ──────────────────────────────────── */}
          {isOwner && (
            <View style={styles.logoutSection}>
              <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.85}>
                <Text style={styles.logoutText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Fullscreen video modal ─────────────────────────────────────── */}
      <Modal
        visible={showVideoModal}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowVideoModal(false)}
      >
        <View style={styles.videoModalContainer}>
          <Video
            source={{ uri: profile.introVideo }}
            style={styles.videoModalPlayer}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping
            useNativeControls
          />
          <TouchableOpacity style={[styles.videoModalClose, { top: insets.top + 12 }]} onPress={() => setShowVideoModal(false)}>
            <Text style={styles.videoModalCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Report modal ──────────────────────────────────────────────── */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowReportModal(false)}
      >
        <TouchableOpacity
          style={reportStyles.backdrop}
          activeOpacity={1}
          onPress={() => setShowReportModal(false)}
        />
        <View style={reportStyles.sheet}>
          {/* Header */}
          <View style={reportStyles.header}>
            <Text style={reportStyles.title}>Report Profile</Text>
            <TouchableOpacity
              style={reportStyles.closeBtn}
              onPress={() => setShowReportModal(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={reportStyles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={reportStyles.subtitle}>Why are you reporting this profile?</Text>

          {/* Reason options */}
          {[
            { reason: 'fake',          label: '🚫  Fake Profile',       desc: 'This profile seems to be fake or impersonating someone.' },
            { reason: 'inappropriate', label: '⚠️  Inappropriate',       desc: 'Contains offensive or inappropriate content.' },
            { reason: 'spam',          label: '📢  Spam',                desc: 'Sending spam or promotional messages.' },
            { reason: 'harassment',    label: '😡  Harassment',          desc: 'Harassing or threatening behaviour.' },
          ].map(({ reason, label, desc }) => (
            <TouchableOpacity
              key={reason}
              style={reportStyles.optionRow}
              onPress={() => submitReport(reason)}
              activeOpacity={0.75}
            >
              <View style={reportStyles.optionTextWrap}>
                <Text style={reportStyles.optionLabel}>{label}</Text>
                <Text style={reportStyles.optionDesc}>{desc}</Text>
              </View>
              <Text style={reportStyles.optionArrow}>›</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={reportStyles.cancelBtn} onPress={() => setShowReportModal(false)}>
            <Text style={reportStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Upgrade modal ─────────────────────────────────────────────── */}
      <UpgradeModal visible={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.background },
  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: Colors.background, padding: Spacing.lg },
  loadingText: { fontSize: FontSize.base, color: Colors.textSecondary },
  errorTitle:  { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  errorSub:    { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  goBackBtn:   { marginTop: 12, backgroundColor: Colors.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: Radius.full },
  goBackText:  { color: '#fff', fontWeight: FontWeight.semibold, fontSize: FontSize.base },

  // Hero
  heroContainer: { width: W, height: HERO_H, backgroundColor: '#f0f0f0' },
  heroImage:     { width: W, height: HERO_H },
  photoBadge:    { position: 'absolute', bottom: 14, right: 16, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  photoBadgeText:{ fontSize: FontSize.xs, color: '#fff', fontWeight: FontWeight.semibold },
  dotsRow:       { position: 'absolute', bottom: 46, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot:           { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive:     { width: 16, backgroundColor: '#fff' },
  backCircle:    { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  backCircleText:{ fontSize: 18, color: '#fff', fontWeight: FontWeight.bold },
  reportCircle:  { position: 'absolute', right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  reportCircleText:{ fontSize: 16, color: '#fff' },
  ownerHint:     { position: 'absolute', bottom: 14, left: 16, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  ownerHintText: { fontSize: FontSize.xs, color: '#fff' },

  // Identity
  identityBlock: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  nameRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  nameText:      { fontSize: 28, fontWeight: FontWeight.extrabold, color: Colors.text, letterSpacing: -0.5 },
  ageText:       { fontSize: 24, fontWeight: FontWeight.regular, color: Colors.textSecondary },
  onlineDot:     { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2ECC71', borderWidth: 2, borderColor: '#fff' },
  verifiedBadge: { backgroundColor: Colors.primary, paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
  verifiedText:  { color: '#fff', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  professionText:{ fontSize: FontSize.md, color: Colors.text, fontWeight: FontWeight.medium, marginBottom: 4 },
  locationText:  { fontSize: FontSize.base, color: Colors.textSecondary },

  // Actions (non-owner only)
  actionRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.lg },
  btnPass:       { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 }, android: { elevation: 2 } }) },
  btnPassIcon:   { fontSize: 20, color: '#A0A0A0', fontWeight: FontWeight.bold },
  btnLike:       { width: 58, height: 58, borderRadius: 29, backgroundColor: '#FF4B7A', alignItems: 'center', justifyContent: 'center', ...Platform.select({ ios: { shadowColor: '#FF4B7A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 }, android: { elevation: 6 } }) },
  btnLikeIcon:   { fontSize: 28, color: '#fff' },
  btnMessage:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFF0F3', paddingVertical: 14, borderRadius: Radius.full, borderWidth: 1.5, borderColor: '#FF4B7A' },
  btnMessageIcon:{ fontSize: 18 },
  btnMessageText:{ fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: '#FF4B7A' },

  // Content
  content:       { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  section:       { marginBottom: Spacing.lg },
  sectionTitle:  { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.sm },
  bioText:       { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 24 },
  noPhotosText:  { fontSize: FontSize.sm, color: Colors.textLight, fontStyle: 'italic' },

  // Pills
  pillsWrap:  { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  pill:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F9FAFB', borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  pillIcon:   { fontSize: 14 },
  pillText:   { fontSize: FontSize.sm, color: Colors.text, fontWeight: FontWeight.medium },

  // Interests
  interestsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  interestChip:  { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: '#FFF0F3', borderWidth: 1, borderColor: '#FF4B7A' },
  interestText:  { fontSize: FontSize.sm, color: '#FF4B7A', fontWeight: FontWeight.medium },

  // Photo manager grid
  thumbGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  thumbWrapper: { position: 'relative', width: THUMB_SIZE, height: THUMB_SIZE },
  thumb:        { width: '100%', height: '100%', borderRadius: Radius.md, backgroundColor: '#f0f0f0' },
  thumbDelete:  {
    position: 'absolute', top: 4, right: 4,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  thumbDeleteText: { color: '#fff', fontSize: 12, fontWeight: FontWeight.bold },
  thumbAdd:     {
    width: THUMB_SIZE, height: THUMB_SIZE,
    borderRadius: Radius.md,
    borderWidth: 2, borderColor: Colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF0F3', gap: 4,
  },
  thumbAddIcon: { fontSize: 28, color: Colors.primary, fontWeight: FontWeight.bold },
  thumbAddText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.medium },
  photoCount:   { fontSize: FontSize.xs, color: Colors.textLight, marginTop: Spacing.sm },
  photoCountHint: { color: Colors.primary },

  // Logout (owner)
  logoutSection: { marginTop: Spacing.lg, marginBottom: Spacing.xl },
  logoutBtn:     { backgroundColor: '#FEF2F2', paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  logoutText:    { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: '#EF4444' },

  // Report / Block row
  dangerRow:   { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, marginBottom: Spacing.lg },
  reportBtn:   { flex: 1, paddingVertical: 14, borderRadius: Radius.full, borderWidth: 1.5, borderColor: '#F59E0B', alignItems: 'center', backgroundColor: '#FFFBEB' },
  reportBtnText: { fontSize: FontSize.sm, color: '#B45309', fontWeight: FontWeight.semibold },
  blockBtn:    { flex: 1, paddingVertical: 14, borderRadius: Radius.full, borderWidth: 1.5, borderColor: '#EF4444', alignItems: 'center', backgroundColor: '#FEF2F2' },
  blockBtnText:  { fontSize: FontSize.sm, color: '#EF4444', fontWeight: FontWeight.semibold },

  // Fullscreen video modal
  videoModalContainer: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  videoModalPlayer:    { width: W, height: H },
  videoModalClose:     { position: 'absolute', right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  videoModalCloseText: { color: '#fff', fontSize: 18, fontWeight: FontWeight.bold },
});

// ── Report modal styles ───────────────────────────────────────────────────────
const reportStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 20 },
    }),
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 6,
  },
  title:    { fontSize: 18, fontWeight: FontWeight.bold, color: '#2D3436' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { fontSize: 14, color: '#636E72', fontWeight: FontWeight.bold },
  subtitle:  { fontSize: 13, color: '#888', marginBottom: 16 },

  optionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  optionTextWrap: { flex: 1 },
  optionLabel:    { fontSize: 15, fontWeight: FontWeight.semibold, color: '#2D3436', marginBottom: 2 },
  optionDesc:     { fontSize: 12, color: '#A0A0A0' },
  optionArrow:    { fontSize: 22, color: '#C0C0C0', marginLeft: 8 },

  cancelBtn: {
    marginTop: 14, paddingVertical: 14, borderRadius: 28,
    backgroundColor: '#F3F4F6', alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: FontWeight.semibold, color: '#636E72' },
});