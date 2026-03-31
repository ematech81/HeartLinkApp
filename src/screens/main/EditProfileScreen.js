
import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator,
  StatusBar, Alert, Platform, Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from 'src/constants/Colors';
import { Spacing, Radius } from 'src/constants/layout';
import { FontSize, FontWeight } from 'src/constants/topography';
import { UserAPI } from 'services/ApiServices';
import { useAuth } from 'src/store/authStore';
import {
  uploadProfilePicture,
  uploadPhotos,
  deletePhoto,
  uploadVideo,
} from 'src/utils/uploadImage';

const MAX_PHOTOS = 6;

const INTEREST_SUGGESTIONS = [
  'Travel', 'Music', 'Movies', 'Cooking', 'Sports',
  'Reading', 'Gaming', 'Fitness', 'Art', 'Dancing',
  'Photography', 'Fashion', 'Tech', 'Nature', 'Foodie',
  'Hiking', 'Yoga', 'Jazz', 'Philanthropy', 'Coffee',
];

const RELIGION_OPTIONS     = ['Christianity', 'Islam', 'Hinduism', 'Buddhism', 'Agnostic', 'Atheist', 'Other'];
const RELATIONSHIP_OPTIONS = ['Single', 'Single Mother', 'Single Father'];
const EDUCATION_OPTIONS    = ['High School', 'Diploma', 'Bachelors', 'Masters', 'PhD', 'Vocational', 'None'];

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, right }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right}
    </View>
  );
}

// ── Field label ───────────────────────────────────────────────────────────────
function FieldLabel({ label }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

// ── Dropdown selector ─────────────────────────────────────────────────────────
function DropdownField({ label, value, options, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.fieldGroup}>
      <FieldLabel label={label} />
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setOpen(!open)}
        activeOpacity={0.8}
      >
        <Text style={styles.dropdownValue}>{value || 'Select...'}</Text>
        <Text style={styles.dropdownArrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownMenu}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.dropdownItem, value === opt && styles.dropdownItemActive]}
              onPress={() => { onSelect(opt); setOpen(false); }}
            >
              <Text style={[styles.dropdownItemText, value === opt && styles.dropdownItemTextActive]}>
                {opt}
              </Text>
              {value === opt && <Text style={styles.dropdownCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function EditProfileScreen({ navigation }) {
  const insets         = useSafeAreaInsets();
  const { user, updateUser, logout } = useAuth();

  // ── Form state ────────────────────────────────────────────────────────────
  const [name,         setName]         = useState(user?.name         || '');
  const [bio,          setBio]          = useState(user?.bio          || '');
  const [profession,   setProfession]   = useState(user?.profession   || '');
  const [city,         setCity]         = useState(user?.city         || '');
  const [country,      setCountry]      = useState(user?.country      || '');
  const [religion,     setReligion]     = useState(user?.religion     || '');
  const [education,    setEducation]    = useState(user?.education    || '');
  const [relationshipType, setRelationshipType] = useState(user?.relationshipType || '');
  const [interests,    setInterests]    = useState(user?.interests    || []);
  const [isProfileHidden, setIsProfileHidden] = useState(user?.isProfileHidden || false);
  const [newInterest,  setNewInterest]  = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ── Media state ───────────────────────────────────────────────────────────
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || null);
  const [photos,         setPhotos]         = useState(user?.photos         || []);
  const [introVideo,     setIntroVideo]     = useState(user?.introVideo      || null);

  // ── Upload states ─────────────────────────────────────────────────────────
  const [savingProfile,   setSavingProfile]   = useState(false);
  const [changingPfp,     setChangingPfp]     = useState(false);
  const [uploadingPhoto,  setUploadingPhoto]  = useState(false);
  const [deletingIdx,     setDeletingIdx]     = useState(null);
  const [uploadingVideo,  setUploadingVideo]  = useState(false);

  // ── Change profile picture ─────────────────────────────────────────────────
  const handleChangeProfilePic = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85,
      });
      if (result.canceled || !result.assets?.length) return;

      setChangingPfp(true);
      const url = await uploadProfilePicture(result.assets[0].uri);
      setProfilePicture(url);
      await UserAPI.updateProfile({ profilePicture: url });
      updateUser({ profilePicture: url });
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setChangingPfp(false);
    }
  };

  // ── Add gallery photo ──────────────────────────────────────────────────────
  const handleAddPhoto = async () => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('Limit Reached', `Max ${MAX_PHOTOS} photos allowed.`); return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.'); return;
      }
      const remaining = MAX_PHOTOS - photos.length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsMultipleSelection: true,
        selectionLimit: remaining, quality: 0.85,
      });
      if (result.canceled || !result.assets?.length) return;

      setUploadingPhoto(true);
      const uris    = result.assets.map((a) => a.uri);
      const newUrls = await uploadPhotos(uris, 'heartlink/photos');
      const updated = [...photos, ...newUrls];
      setPhotos(updated);
      await UserAPI.updateProfile({ photos: updated });
      updateUser({ photos: updated });
    } catch (err) {
      Alert.alert('Upload Failed', err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ── Delete gallery photo ───────────────────────────────────────────────────
  const handleDeletePhoto = (index) => {
    Alert.alert('Remove Photo', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          setDeletingIdx(index);
          try {
            const safePhotos = Array.isArray(photos) ? photos : [];
            const updated    = await deletePhoto(safePhotos, index);
            setPhotos(updated);
            await UserAPI.updateProfile({ photos: updated });
            updateUser({ photos: updated });
          } catch (err) {
            Alert.alert('Error', err.message);
          } finally {
            setDeletingIdx(null);
          }
        },
      },
    ]);
  };

  // ── Upload / change video ──────────────────────────────────────────────────
  const handleVideoUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.'); return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'], allowsEditing: true, videoMaxDuration: 30, quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      if (asset.duration && asset.duration > 31000) {
        Alert.alert('Too Long', 'Please select a video under 30 seconds.'); return;
      }

      setUploadingVideo(true);
      const url = await uploadVideo(asset.uri);
      setIntroVideo(url);
      await UserAPI.updateProfile({ introVideo: url });
      updateUser({ introVideo: url });
    } catch (err) {
      Alert.alert('Upload Failed', err.message);
    } finally {
      setUploadingVideo(false);
    }
  };

  // ── Remove video ──────────────────────────────────────────────────────────
  const handleRemoveVideo = () => {
    Alert.alert('Remove Video', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          setIntroVideo(null);
          await UserAPI.updateProfile({ introVideo: null });
          updateUser({ introVideo: null });
        },
      },
    ]);
  };

  // ── Interests ─────────────────────────────────────────────────────────────
  const addInterest = (interest) => {
    const trimmed = interest.trim();
    if (!trimmed || interests.includes(trimmed)) return;
    setInterests([...interests, trimmed]);
    setNewInterest('');
    setShowSuggestions(false);
  };

  const removeInterest = (interest) => {
    setInterests(interests.filter((i) => i !== interest));
  };

  const filteredSuggestions = INTEREST_SUGGESTIONS.filter(
    (s) => !interests.includes(s) &&
           s.toLowerCase().includes(newInterest.toLowerCase())
  );

  // ── Save profile ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Name cannot be empty.'); return; }

    setSavingProfile(true);
    try {
      const updates = {
        name:             name.trim(),
        bio:              bio.trim(),
        profession:       profession.trim(),
        city:             city.trim(),
        country:          country.trim(),
        religion:         religion?.toLowerCase() || undefined,
        education:        education?.toLowerCase().replace(/\s/g, '_') || undefined,
        relationshipType: relationshipType?.toLowerCase().replace(/\s/g, '_') || undefined,
        interests,
        isProfileHidden,
      };

      await UserAPI.updateProfile(updates);
      updateUser(updates);
      Alert.alert('Saved! ✅', 'Your profile has been updated.');
    } catch (err) {
      Alert.alert('Save Failed', err.message || 'Could not save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Render photo grid ─────────────────────────────────────────────────────
  const renderPhotoGrid = () => {
    const slots = Array(MAX_PHOTOS).fill(null);

    return (
      <View style={styles.photoGrid}>
        {slots.map((_, i) => {
          // Slot 0 = profile picture
          if (i === 0) {
            return (
              <TouchableOpacity
                key={0}
                style={styles.photoSlotMain}
                onPress={handleChangeProfilePic}
                disabled={changingPfp}
                activeOpacity={0.85}
              >
                {profilePicture ? (
                  <Image source={{ uri: profilePicture }} style={styles.photoSlotImage} />
                ) : (
                  <View style={styles.photoSlotEmpty}>
                    <Text style={styles.photoSlotPlus}>+</Text>
                  </View>
                )}
                {/* Edit badge */}
                <View style={styles.editBadge}>
                  {changingPfp
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.editBadgeText}>✎</Text>
                  }
                </View>
              </TouchableOpacity>
            );
          }

          // Slots 1–5 = gallery photos
          const photoIdx   = i - 1;
          const photoUrl   = photos[photoIdx];
          const isDeleting = deletingIdx === photoIdx;

          return (
            <TouchableOpacity
              key={i}
              style={styles.photoSlot}
              onPress={photoUrl ? () => handleDeletePhoto(photoIdx) : handleAddPhoto}
              disabled={uploadingPhoto || isDeleting}
              activeOpacity={0.85}
            >
              {photoUrl ? (
                <>
                  <Image source={{ uri: photoUrl }} style={styles.photoSlotImage} />
                  <View style={styles.deleteOverlay}>
                    {isDeleting
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.deleteIcon}>✕</Text>
                    }
                  </View>
                </>
              ) : (
                <View style={styles.photoSlotEmpty}>
                  {uploadingPhoto && i === photos.length + 1
                    ? <ActivityIndicator size="small" color={Colors.primary} />
                    : <Text style={styles.photoSlotPlus}>+</Text>
                  }
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.headerBack}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={savingProfile}
          activeOpacity={0.85}
        >
          {savingProfile
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.saveBtnText}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Photos ───────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader
            title="Photos"
            right={
              <Text style={styles.photoCount}>
                {1 + photos.length} / {MAX_PHOTOS} uploaded
              </Text>
            }
          />
          {renderPhotoGrid()}
          <Text style={styles.photoHint}>Tap a photo to remove it. Tap + to add.</Text>
        </View>

        {/* ── Video Introduction ───────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title="Video Introduction" />
          {introVideo ? (
            <View style={styles.videoPreview}>
              <Video
                source={{ uri: introVideo }}
                style={styles.video}
                resizeMode={ResizeMode.COVER}
                useNativeControls
                isLooping={false}
              />
              <View style={styles.videoActions}>
                <TouchableOpacity style={styles.videoChangeBtn} onPress={handleVideoUpload} disabled={uploadingVideo}>
                  {uploadingVideo
                    ? <ActivityIndicator size="small" color={Colors.primary} />
                    : <Text style={styles.videoChangeBtnText}>🔄  Change Video</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity style={styles.videoRemoveBtn} onPress={handleRemoveVideo}>
                  <Text style={styles.videoRemoveBtnText}>🗑️  Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.videoUploadBox}
              onPress={handleVideoUpload}
              disabled={uploadingVideo}
              activeOpacity={0.8}
            >
              {uploadingVideo ? (
                <>
                  <ActivityIndicator color={Colors.primary} />
                  <Text style={styles.videoUploadText}>Uploading video...</Text>
                </>
              ) : (
                <>
                  <View style={styles.videoUploadIcon}>
                    <Text style={styles.videoUploadIconText}>🎬</Text>
                  </View>
                  <Text style={styles.videoUploadTitle}>Add a 30s video intro</Text>
                  <Text style={styles.videoUploadSub}>MP4 or MOV • Max 30 seconds</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ── About You ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title="About You" />

          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <FieldLabel label="FULL NAME" />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor="#A0A0A0"
              autoCapitalize="words"
            />
          </View>

          {/* Bio */}
          <View style={styles.fieldGroup}>
            <FieldLabel label="BIO" />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={bio}
              onChangeText={setBio}
              placeholder="Write something about yourself..."
              placeholderTextColor="#A0A0A0"
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={styles.charCount}>{bio.length}/500</Text>
          </View>

          {/* Gender + Birthday row */}
          <View style={styles.fieldRow}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <FieldLabel label="GENDER" />
              <View style={styles.input}>
                <Text style={styles.readOnlyText}>{user?.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : '—'}</Text>
              </View>
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <FieldLabel label="BIRTHDAY" />
              <View style={styles.input}>
                <Text style={styles.readOnlyText}>
                  {user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('en-GB') : '—'}
                </Text>
              </View>
            </View>
          </View>

          {/* Location */}
          <View style={styles.fieldGroup}>
            <FieldLabel label="LOCATION" />
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                value={city}
                onChangeText={setCity}
                placeholder="City"
                placeholderTextColor="#A0A0A0"
                autoCapitalize="words"
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={country}
                onChangeText={setCountry}
                placeholder="Country"
                placeholderTextColor="#A0A0A0"
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Relationship Status */}
          <DropdownField
            label="RELATIONSHIP STATUS"
            value={relationshipType?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            options={RELATIONSHIP_OPTIONS}
            onSelect={(v) => setRelationshipType(v.toLowerCase().replace(/\s/g, '_'))}
          />

          {/* Profession */}
          <View style={styles.fieldGroup}>
            <FieldLabel label="PROFESSION" />
            <TextInput
              style={styles.input}
              value={profession}
              onChangeText={setProfession}
              placeholder="e.g. Doctor, Engineer, Teacher..."
              placeholderTextColor="#A0A0A0"
              autoCapitalize="words"
            />
          </View>

          {/* Religion */}
          <DropdownField
            label="RELIGION"
            value={religion?.charAt(0).toUpperCase() + religion?.slice(1)}
            options={RELIGION_OPTIONS}
            onSelect={(v) => setReligion(v.toLowerCase())}
          />

          {/* Education */}
          <DropdownField
            label="EDUCATION"
            value={education?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            options={EDUCATION_OPTIONS}
            onSelect={(v) => setEducation(v.toLowerCase().replace(/\s/g, '_'))}
          />
        </View>

        {/* ── Interests & Hobbies ───────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader
            title="Interests & Hobbies"
            right={
              <TouchableOpacity onPress={() => setShowSuggestions(!showSuggestions)}>
                <Text style={styles.addInterestBtn}>Add +</Text>
              </TouchableOpacity>
            }
          />

          {/* Current interests */}
          <View style={styles.interestsWrap}>
            {interests.map((interest) => (
              <TouchableOpacity
                key={interest}
                style={styles.interestChip}
                onPress={() => removeInterest(interest)}
              >
                <Text style={styles.interestChipText}>{interest}</Text>
                <Text style={styles.interestRemove}> ×</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Add interest input */}
          {showSuggestions && (
            <View style={styles.addInterestBox}>
              <TextInput
                style={styles.addInterestInput}
                value={newInterest}
                onChangeText={setNewInterest}
                placeholder="Type an interest..."
                placeholderTextColor="#A0A0A0"
                onSubmitEditing={() => addInterest(newInterest)}
                returnKeyType="done"
                autoFocus
              />
              {/* Suggestions */}
              {filteredSuggestions.length > 0 && (
                <View style={styles.suggestionsBox}>
                  {filteredSuggestions.slice(0, 6).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={styles.suggestionItem}
                      onPress={() => addInterest(s)}
                    >
                      <Text style={styles.suggestionText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Privacy ───────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title="Privacy" />
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Hide my profile</Text>
              <Text style={styles.toggleSub}>Other users won't see you in search results</Text>
            </View>
            <Switch
              value={isProfileHidden}
              onValueChange={setIsProfileHidden}
              trackColor={{ false: '#E5E7EB', true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* ── Logout ───────────────────────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.85}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        {/* Footer note */}
        <Text style={styles.footerNote}>
          Your profile information is visible to other users on HeartLink. Please review our Privacy Policy.
        </Text>
      </ScrollView>
    </View>
  );
}

const PHOTO_SIZE = 100;

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F9FAFB' },
  scroll:       { paddingBottom: 48 },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerBackBtn:{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerBack:   { fontSize: 22, color: Colors.text, fontWeight: FontWeight.bold },
  headerTitle:  { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  saveBtn:      { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 9, borderRadius: Radius.full, minWidth: 68, alignItems: 'center' },
  saveBtnText:  { color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.base },

  // Sections
  section:      { backgroundColor: '#fff', marginTop: 12, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  photoCount:   { fontSize: FontSize.sm, color: Colors.textSecondary },

  // Photo grid
  photoGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoSlotMain:{ width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: Radius.md, overflow: 'hidden', position: 'relative', borderWidth: 2, borderColor: Colors.primary },
  photoSlot:    { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: Radius.md, overflow: 'hidden', position: 'relative' },
  photoSlotImage:{ width: '100%', height: '100%' },
  photoSlotEmpty:{ width: '100%', height: '100%', backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  photoSlotPlus: { fontSize: 28, color: Colors.primary, fontWeight: FontWeight.bold },
  editBadge:    { position: 'absolute', bottom: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  editBadgeText:{ color: '#fff', fontSize: 12 },
  deleteOverlay:{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  deleteIcon:   { color: '#fff', fontSize: 11, fontWeight: FontWeight.bold },
  photoHint:    { fontSize: FontSize.xs, color: Colors.textLight, marginTop: Spacing.sm },

  // Video
  videoPreview:     { borderRadius: Radius.lg, overflow: 'hidden', gap: Spacing.sm },
  video:            { width: '100%', height: 200, backgroundColor: '#000', borderRadius: Radius.lg },
  videoActions:     { flexDirection: 'row', gap: Spacing.sm },
  videoChangeBtn:   { flex: 1, paddingVertical: 12, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', backgroundColor: '#FFF0F3' },
  videoChangeBtnText:{ fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
  videoRemoveBtn:   { flex: 1, paddingVertical: 12, borderRadius: Radius.full, borderWidth: 1.5, borderColor: '#EF4444', alignItems: 'center', backgroundColor: '#FEF2F2' },
  videoRemoveBtnText:{ fontSize: FontSize.sm, color: '#EF4444', fontWeight: FontWeight.semibold },
  videoUploadBox:   { height: 180, borderRadius: Radius.lg, borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed', backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', gap: 8 },
  videoUploadIcon:  { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  videoUploadIconText:{ fontSize: 26 },
  videoUploadTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  videoUploadSub:   { fontSize: FontSize.sm, color: Colors.textSecondary },
  videoUploadText:  { fontSize: FontSize.sm, color: Colors.primary, marginTop: 8 },

  // Form fields
  fieldGroup:   { marginBottom: Spacing.md },
  fieldLabel:   { fontSize: 11, fontWeight: FontWeight.bold, color: Colors.textSecondary, letterSpacing: 0.8, marginBottom: 6 },
  fieldRow:     { flexDirection: 'row', gap: Spacing.sm },
  inputRow:     { flexDirection: 'row' },
  input:        { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 12, fontSize: FontSize.base, color: Colors.text },
  inputMultiline:{ height: 110, textAlignVertical: 'top', paddingTop: 12 },
  charCount:    { fontSize: FontSize.xs, color: Colors.textLight, textAlign: 'right', marginTop: 4 },
  readOnlyText: { fontSize: FontSize.base, color: Colors.textSecondary },

  // Dropdown
  dropdown:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 12 },
  dropdownValue:    { fontSize: FontSize.base, color: Colors.text },
  dropdownArrow:    { fontSize: 12, color: Colors.textSecondary },
  dropdownMenu:     { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: Radius.md, marginTop: 4, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }, android: { elevation: 4 } }) },
  dropdownItem:     { paddingHorizontal: Spacing.md, paddingVertical: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  dropdownItemActive:{ backgroundColor: '#FFF0F3' },
  dropdownItemText: { fontSize: FontSize.base, color: Colors.text },
  dropdownItemTextActive:{ color: Colors.primary, fontWeight: FontWeight.semibold },
  dropdownCheck:    { fontSize: 14, color: Colors.primary },

  // Interests
  interestsWrap:    { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  interestChip:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFE4EC', paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: '#FFB8CC' },
  interestChipText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },
  interestRemove:   { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.bold },
  addInterestBtn:   { fontSize: FontSize.base, color: Colors.primary, fontWeight: FontWeight.semibold },
  addInterestBox:   { marginTop: Spacing.sm },
  addInterestInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 12, fontSize: FontSize.base, color: Colors.text },
  suggestionsBox:   { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: Radius.md, marginTop: 4, overflow: 'hidden' },
  suggestionItem:   { paddingHorizontal: Spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  suggestionText:   { fontSize: FontSize.base, color: Colors.text },

  // Privacy toggle
  toggleRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleInfo:   { flex: 1, marginRight: Spacing.md },
  toggleLabel:  { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  toggleSub:    { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },

  // Logout
  logoutBtn:    { backgroundColor: '#FEF2F2', paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  logoutText:   { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: '#EF4444' },

  // Footer
  footerNote:   { fontSize: FontSize.xs, color: Colors.textLight, textAlign: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
});



