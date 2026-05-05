

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, Image, Dimensions,
  Platform, KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import Colors from 'src/constants/Colors';
import { Spacing, Radius } from 'src/constants/layout';
import { FontSize, FontWeight } from 'src/constants/topography';
import AppStatusBar from 'src/component/common/AppStatusBar';
import { CommunityAPI } from 'services/ApiServices';
import { uploadProfilePicture, uploadVideo } from 'src/utils/uploadImage';

// ── Compute preview dimensions ONCE at module level ───────────────────────────
// Never use Spacing.lg here — it may be undefined and produce NaN
const SCREEN_W  = Dimensions.get('window').width;
const SIDE_PAD  = 32; // 16px each side — safe hardcoded fallback
const PREVIEW_W = SCREEN_W - SIDE_PAD;
const PREVIEW_H = Math.round(PREVIEW_W * (4 / 5)); // 4:5 portrait ratio

export default function CreatePostScreen({ navigation }) {
  const [media,     setMedia]     = useState(null);
  const [caption,   setCaption]   = useState('');
  const [uploading, setUploading] = useState(false);
  const videoRef = useRef(null);

  // ── Pick image ──────────────────────────────────────────────────────────────
  const pickImage = async () => {
    try {
      // Always request permission first
      const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permResult.status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Please allow photo library access in your device Settings.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,   // ← false prevents URI stripping on iOS
        quality: 0.9,
      });

      console.log('🖼 Image picker result:', JSON.stringify(result, null, 2));

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert('Error', 'No image URI found. Please try again.');
        return;
      }

      console.log('✅ Image URI:', asset.uri);
      setMedia({ uri: asset.uri, type: 'image' });

    } catch (err) {
      console.error('pickImage error:', err);
      Alert.alert('Error', 'Could not open photo library.');
    }
  };

  // ── Pick video ──────────────────────────────────────────────────────────────
  const pickVideo = async () => {
    try {
      const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permResult.status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Please allow photo library access in your device Settings.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,   // ← false is safer for URI stability
        videoMaxDuration: 60,
        quality: 0.85,
      });

      console.log('🎬 Video picker result:', JSON.stringify(result, null, 2));

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert('Error', 'No video URI found. Please try again.');
        return;
      }

      console.log('✅ Video URI:', asset.uri);
      setMedia({ uri: asset.uri, type: 'video' });

    } catch (err) {
      console.error('pickVideo error:', err);
      Alert.alert('Error', 'Could not open video library.');
    }
  };

  // ── Post ────────────────────────────────────────────────────────────────────
  const handlePost = async () => {
    if (!media) {
      Alert.alert('Add media', 'Please pick a photo or video first.');
      return;
    }
    setUploading(true);
    try {
      let mediaUrl;
      if (media.type === 'video') {
        mediaUrl = await uploadVideo(media.uri, 'heartlink/community');
      } else {
        mediaUrl = await uploadProfilePicture(media.uri, 'heartlink/community');
      }
      await CommunityAPI.createPost({
        mediaUrl,
        mediaType: media.type,
        caption:   caption.trim(),
      });
      Alert.alert('Posted!', 'Your post is live for 24 hours.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const msg = err.message || 'Failed to post. Please try again.';
      Alert.alert(
        err.status === 403 ? 'Subscription Required' : 'Post Failed',
        msg,
      );
    } finally {
      setUploading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <AppStatusBar theme="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.closeBtn}
        >
          <Text style={styles.closeTxt}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        <TouchableOpacity
          onPress={handlePost}
          style={[
            styles.postBtn,
            (!media || uploading) && styles.postBtnDisabled,
          ]}
          disabled={!media || uploading}
        >
          {uploading ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.postBtnTxt}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Media section ───────────────────────────────────────────── */}
          {media ? (
            // ── PREVIEW ────────────────────────────────────────────────────
            <View style={styles.previewWrapper}>
              <View style={styles.previewBox}>
                {media.type === 'image' ? (
                  <Image
                    // key forces remount when URI changes
                    key={media.uri}
                    source={{ uri: media.uri }}
                    style={styles.previewMedia}
                    resizeMode="cover"
                    onLoad={() => console.log('✅ Image preview loaded')}
                    onError={(e) => {
                      console.error('❌ Image preview error:', e.nativeEvent.error);
                      Alert.alert('Preview Error', 'Could not display image. URI: ' + media.uri);
                    }}
                  />
                ) : (
                  <Video
                    key={media.uri}
                    ref={videoRef}
                    source={{ uri: media.uri }}
                    style={styles.previewMedia}
                    resizeMode={ResizeMode.COVER}
                    useNativeControls
                    shouldPlay={false}
                    isLooping={false}
                    onLoad={() => console.log('✅ Video preview loaded')}
                    onError={(err) => {
                      console.error('❌ Video preview error:', err);
                    }}
                  />
                )}
              </View>

              {/* Change / Remove buttons */}
              <View style={styles.previewActions}>
                <TouchableOpacity
                  style={styles.previewActionBtn}
                  onPress={() => setMedia(null)}
                >
                  <Text style={styles.previewActionTxt}>🗑  Remove</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.previewActionBtn, styles.previewActionBtnAlt]}
                  onPress={media.type === 'image' ? pickImage : pickVideo}
                >
                  <Text style={[styles.previewActionTxt, { color: Colors.primary }]}>
                    ↺  Change
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // ── PICKER PLACEHOLDER ──────────────────────────────────────────
            <View style={styles.mediaPicker}>
              <Text style={styles.mediaPickerEmoji}>📸</Text>
              <Text style={styles.mediaTitle}>Add Photo or Video</Text>
              <Text style={styles.mediaHint}>Videos up to 60 seconds</Text>
              <View style={styles.mediaButtons}>
                <TouchableOpacity
                  style={styles.mediaBtn}
                  onPress={pickVideo}
                  activeOpacity={0.8}
                >
                  <Text style={styles.mediaBtnIcon}>🎬</Text>
                  <Text style={styles.mediaBtnTxt}>Video</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.mediaBtn}
                  onPress={pickImage}
                  activeOpacity={0.8}
                >
                  <Text style={styles.mediaBtnIcon}>🖼️</Text>
                  <Text style={styles.mediaBtnTxt}>Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Caption ─────────────────────────────────────────────────── */}
          <View style={styles.captionBox}>
            <TextInput
              style={styles.captionInput}
              placeholder="Add a caption... (optional)"
              placeholderTextColor={Colors.textLight}
              value={caption}
              onChangeText={setCaption}
              maxLength={300}
              multiline
              scrollEnabled={false}
            />
            <Text style={styles.charCount}>{caption.length}/300</Text>
          </View>

          {/* ── Info ────────────────────────────────────────────────────── */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTxt}>
              ⏱  This post will disappear after 24 hours
            </Text>
            <Text style={styles.infoTxt}>
              👁  Other members can view your profile from this post
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'android' ? 44 : 52,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: Colors.white,
  },
  closeBtn:        { padding: 4, width: 36 },
  closeTxt:        { fontSize: 18, color: Colors.text },
  headerTitle:     { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  postBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    minWidth: 60,
    alignItems: 'center',
  },
  postBtnDisabled: { opacity: 0.4 },
  postBtnTxt: { color: Colors.white, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },

  content: {
    padding: Spacing.lg,
    paddingBottom: 60,
    gap: Spacing.lg,
  },

  // ── Preview ──────────────────────────────────────────────────────────────────
  previewWrapper: {
    width: PREVIEW_W,
    alignSelf: 'center',
    gap: 10,
  },
  previewBox: {
    // ✅ KEY FIX: explicit numeric width + height — no percentages
    width:           PREVIEW_W,
    height:          PREVIEW_H,
    borderRadius:    16,
    backgroundColor: '#1a1a1a',
    // ✅ overflow hidden clips the border radius on the image/video
    overflow:        'hidden',
  },
  // ✅ KEY FIX: previewMedia MUST match the parent's exact pixel size
  // Using '100%' inside ScrollView on Android causes the blank/dark issue
  previewMedia: {
    width:  PREVIEW_W,
    height: PREVIEW_H,
  },

  previewActions: {
    flexDirection: 'row',
    gap: 10,
  },
  previewActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
  },
  previewActionBtnAlt: {
    backgroundColor: '#EFF6FF',
  },
  previewActionTxt: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#EF4444',
  },

  // ── Picker placeholder ───────────────────────────────────────────────────────
  mediaPicker: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    gap: Spacing.sm,
    minHeight: 220,
    justifyContent: 'center',
  },
  mediaPickerEmoji: { fontSize: 40, marginBottom: 4 },
  mediaTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  mediaHint: { fontSize: FontSize.sm, color: Colors.textSecondary },
  mediaButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
    width: '100%',
  },
  mediaBtn: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mediaBtnIcon: { fontSize: 28 },
  mediaBtnTxt: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },

  // ── Caption ──────────────────────────────────────────────────────────────────
  captionBox: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: Spacing.md,
  },
  captionInput: {
    fontSize: FontSize.base,
    color: Colors.text,
    minHeight: 80,
    lineHeight: 22,
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    textAlign: 'right',
    marginTop: 4,
  },

  // ── Info ─────────────────────────────────────────────────────────────────────
  infoBox: { gap: 6 },
  infoTxt: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});