import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, Image, Dimensions, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import Colors from 'src/constants/Colors';
import { Spacing, Radius } from 'src/constants/layout';
import { FontSize, FontWeight } from 'src/constants/topography';
import AppStatusBar from 'src/component/common/AppStatusBar';
import { CommunityAPI } from 'services/ApiServices';
import { uploadProfilePicture, uploadVideo } from 'src/utils/uploadImage';

const SCREEN_W  = Dimensions.get('window').width;
const PREVIEW_W = SCREEN_W - Spacing.lg * 2;
const PREVIEW_H = Math.round(PREVIEW_W * (16 / 9));

export default function CreatePostScreen({ navigation }) {
  const [media,     setMedia]     = useState(null); // { uri, type }
  const [caption,   setCaption]   = useState('');
  const [uploading, setUploading] = useState(false);

  const pickMedia = async (type) => {
    const options = {
      mediaTypes: type === 'video'
        ? ImagePicker.MediaTypeOptions.Videos
        : ImagePicker.MediaTypeOptions.Images,
      allowsEditing: type === 'video',
      quality: 0.85,
      ...(type === 'video' && { videoMaxDuration: 60 }),
    };
    try {
      const result = await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets?.[0]) {
        setMedia({ uri: result.assets[0].uri, type });
      }
    } catch {
      Alert.alert('Error', 'Could not open media library. Please try again.');
    }
  };

  const handlePost = async () => {
    if (!media) { Alert.alert('Add media', 'Please pick a photo or video first.'); return; }
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
      Alert.alert(err.status === 403 ? 'Subscription Required' : 'Post Failed', msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppStatusBar theme="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeTxt}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        <TouchableOpacity
          onPress={handlePost}
          style={[styles.postBtn, (!media || uploading) && styles.postBtnDisabled]}
          disabled={!media || uploading}
        >
          {uploading
            ? <ActivityIndicator color={Colors.white} size="small" />
            : <Text style={styles.postBtnTxt}>Post</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {media ? (
          <View style={styles.previewBox}>
            {media.type === 'video' ? (
              <Video
                key={media.uri}
                source={{ uri: media.uri }}
                style={styles.preview}
                resizeMode={ResizeMode.COVER}
                useNativeControls
                shouldPlay
                isLooping
                isMuted={false}
              />
            ) : (
              <Image
                key={media.uri}
                source={{ uri: media.uri }}
                style={styles.preview}
                resizeMode="cover"
              />
            )}
            <TouchableOpacity style={styles.changeMedia} onPress={() => setMedia(null)}>
              <Text style={styles.changeMediaTxt}>Change</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.mediaPicker}>
            <Text style={styles.mediaTitle}>Add Photo or Video</Text>
            <Text style={styles.mediaHint}>Videos up to 60 seconds work best</Text>
            <View style={styles.mediaButtons}>
              <TouchableOpacity style={styles.mediaBtn} onPress={() => pickMedia('video')} activeOpacity={0.8}>
                <Text style={styles.mediaBtnIcon}>🎬</Text>
                <Text style={styles.mediaBtnTxt}>Video</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaBtn} onPress={() => pickMedia('image')} activeOpacity={0.8}>
                <Text style={styles.mediaBtnIcon}>🖼️</Text>
                <Text style={styles.mediaBtnTxt}>Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.captionBox}>
          <TextInput
            style={styles.captionInput}
            placeholder="Add a caption... (optional)"
            placeholderTextColor={Colors.textLight}
            value={caption}
            onChangeText={setCaption}
            maxLength={300}
            multiline
          />
          <Text style={styles.charCount}>{caption.length}/300</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTxt}>⏱  This post will disappear after 24 hours</Text>
          <Text style={styles.infoTxt}>👁  Other members can view your profile from this post</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: Platform.OS === 'android' ? 44 : 52,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    backgroundColor: Colors.white,
  },
  closeBtn:        { padding: 4, width: 36 },
  closeTxt:        { fontSize: 18, color: Colors.text },
  headerTitle:     { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  postBtn:         { backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full },
  postBtnDisabled: { opacity: 0.4 },
  postBtnTxt:      { color: Colors.white, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },

  content: { padding: Spacing.lg, paddingBottom: 40, gap: Spacing.lg },

  previewBox: {
    width:  PREVIEW_W,
    height: PREVIEW_H,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: '#111',
    alignSelf: 'center',
  },
  preview:        { width: PREVIEW_W, height: PREVIEW_H },
  changeMedia:    {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full,
  },
  changeMediaTxt: { color: '#fff', fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  mediaPicker: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.xl, alignItems: 'center',
    borderWidth: 2, borderColor: '#F3F4F6', borderStyle: 'dashed',
    gap: Spacing.sm,
  },
  mediaTitle:   { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  mediaHint:    { fontSize: FontSize.sm, color: Colors.textSecondary },
  mediaButtons: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  mediaBtn: {
    flex: 1, backgroundColor: '#F9FAFB', borderRadius: Radius.md,
    paddingVertical: Spacing.lg, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  mediaBtnIcon: { fontSize: 28 },
  mediaBtnTxt:  { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },

  captionBox: {
    backgroundColor: Colors.white, borderRadius: Radius.md,
    borderWidth: 1, borderColor: '#E5E7EB', padding: Spacing.md,
  },
  captionInput: { fontSize: FontSize.base, color: Colors.text, minHeight: 80, lineHeight: 22 },
  charCount:    { fontSize: FontSize.xs, color: Colors.textLight, textAlign: 'right', marginTop: 4 },

  infoBox: { gap: 6 },
  infoTxt: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
});
