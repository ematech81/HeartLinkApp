
/**
 * HeartLink — Image Upload Utility
 * Uploads directly to Cloudinary (unsigned preset).
 */

const CLOUDINARY_CLOUD_NAME   = 'dz4hyzn6l';
const CLOUDINARY_UPLOAD_PRESET = 'heartlink_unsigned';
const CLOUDINARY_URL           = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
const CLOUDINARY_DELETE_URL    = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`;

// ─────────────────────────────────────────────────────────────────────────────
// Upload a single image — used for profile picture
// ─────────────────────────────────────────────────────────────────────────────
export const uploadProfilePicture = async (uri, folder = 'heartlink/profiles') => {
  try {
    const ext      = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    const formData = new FormData();
    formData.append('file', { uri, type: mimeType, name: `profile_${Date.now()}.${ext}` });
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);

    const response = await fetch(CLOUDINARY_URL, {
      method: 'POST',
      body:   formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Upload failed');
    }

    const data = await response.json();
    console.log(`✅ [Upload] Profile picture: ${data.secure_url}`);
    return data.secure_url;

  } catch (error) {
    console.error('❌ [Upload] Profile picture error:', error.message);
    throw new Error('Failed to upload image. Please try again.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Upload multiple gallery photos (up to 6)
// Supports selecting multiple at once
// Returns array of Cloudinary URLs
// ─────────────────────────────────────────────────────────────────────────────
export const uploadPhotos = async (uris, folder = 'heartlink/photos', onProgress = null) => {
  const MAX_PHOTOS = 6;
  const limited    = uris.slice(0, MAX_PHOTOS);
  const urls       = [];

  for (let i = 0; i < limited.length; i++) {
    try {
      const uri      = limited[i];
      const ext      = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

      const formData = new FormData();
      formData.append('file', { uri, type: mimeType, name: `photo_${Date.now()}_${i}.${ext}` });
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', folder);

      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body:   formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Upload failed');
      }

      const data = await response.json();
      urls.push(data.secure_url);
      console.log(`✅ [Upload] Photo ${i + 1}/${limited.length}: ${data.secure_url}`);

      if (onProgress) onProgress(i + 1, limited.length);

    } catch (err) {
      console.error(`❌ [Upload] Photo ${i + 1} failed:`, err.message);
      // Continue uploading remaining photos even if one fails
    }
  }

  if (urls.length === 0) throw new Error('All photo uploads failed. Please try again.');
  return urls;
};

// ─────────────────────────────────────────────────────────────────────────────
// Delete a photo from a local array by index
// Note: Cloudinary unsigned presets cannot delete — deletion requires backend
// This just removes the URL from the local array and returns the updated list
// ─────────────────────────────────────────────────────────────────────────────
export const deletePhoto = async (currentPhotos, index) => {
  try {
    if (index < 0 || index >= currentPhotos.length) {
      throw new Error('Invalid photo index.');
    }
    const updated = currentPhotos.filter((_, i) => i !== index);
    console.log(`✅ [Upload] Photo at index ${index} removed`);
    return updated;
  } catch (error) {
    console.error('❌ [Upload] Delete error:', error.message);
    throw new Error('Could not delete photo.');
  }
};


// Add this export at the bottom of uploadImage.js
export const uploadVideo = async (uri, folder = 'heartlink/videos') => {
  try {
    const ext      = uri.split('.').pop()?.toLowerCase() || 'mp4';
    const mimeType = ext === 'mov' ? 'video/quicktime' : 'video/mp4';

    const formData = new FormData();
    formData.append('file', { uri, type: mimeType, name: `video_${Date.now()}.${ext}` });
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);
    formData.append('resource_type', 'video');

    // Use video upload URL
    const VIDEO_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;

    const response = await fetch(VIDEO_URL, {
      method: 'POST',
      body:   formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Video upload failed');
    }

    const data = await response.json();
    console.log(`✅ [Upload] Video: ${data.secure_url}`);
    return data.secure_url;

  } catch (error) {
    console.error('❌ [Upload] Video error:', error.message);
    throw new Error('Failed to upload video. Please try again.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Check if a string is already a remote URL
// ─────────────────────────────────────────────────────────────────────────────
export const isRemoteUrl = (uri) =>
  typeof uri === 'string' && (uri.startsWith('http://') || uri.startsWith('https://'));



