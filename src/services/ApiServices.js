import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKeys } from 'src/constants/appConstants';
import { ApiIPAddress } from 'utils/apiIPAdrees';

// export const ApiIPAddress = 'http://10.182.223.155:5000/api';

const PROD_URL = 'https://heartlinkappbackend-production.up.railway.app/api';

const BASE_URL = __DEV__
  ? ApiIPAddress   // local IP for emulator/simulator dev testing
  : PROD_URL;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor ───────────────────────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(StorageKeys.AUTH_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${JSON.parse(token)}`;
    }
    // Log every outgoing request
    console.log(`📤 [API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    if (config.data) {
      const safeData = { ...config.data, password: config.data.password ? '***' : undefined };
      console.log('📦 [API] Payload:', JSON.stringify(safeData));
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ──────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    console.log(`✅ [API] ${response.status} ${response.config.url}`);
    return response.data;
  },
  async (error) => {
    // Log the RAW error so we always know the real cause
    console.log('❌ [API] Error:', {
      url:     error.config?.url,
      status:  error.response?.status,
      data:    error.response?.data,
      message: error.message,
    });

    const status  = error.response?.status;
    const message = error.response?.data?.message || error.message || 'Something went wrong.';

    // Auto-clear session on 401
    if (status === 401) {
      await AsyncStorage.multiRemove([StorageKeys.AUTH_TOKEN, StorageKeys.USER]);
    }

    // Return the REAL message — don't remap here. Also spread the rest of
    // the response body (e.g. requiresEmailVerification, email on the
    // login/register "please verify" responses) so callers that need more
    // than just the message can read it directly, instead of pattern-
    // matching on message text.
    const { success: _s, message: _m, ...extra } = error.response?.data || {};
    return Promise.reject({ message, status, ...extra });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Auth Endpoints
// ─────────────────────────────────────────────────────────────────────────────
export const AuthAPI = {
  register:       (data)            => api.post('/auth/register', data),
  login:          (data)            => api.post('/auth/login', data),
  googleAuth:     (accessToken)     => api.post('/auth/google', { accessToken }),
  getMe:          ()                => api.get('/auth/me'),
  sendOtp:        (phone)           => api.post('/auth/send-otp', { phone }),
  verifyOtp:      (phone, otp)      => api.post('/auth/verify-otp', { phone, otp }),
  verifyEmailOtp: (email, otp)      => api.post('/auth/verify-email-otp', { email, otp }),
  resendEmailOtp: (email)           => api.post('/auth/resend-email-otp', { email }),
  forgotPassword: (email)           => api.post('/auth/forgot-password', { email }),
  resetPassword:  (token, password) => api.post('/auth/reset-password', { token, password }),
};

// ─────────────────────────────────────────────────────────────────────────────
// User Endpoints
// ─────────────────────────────────────────────────────────────────────────────
export const UserAPI = {
  search:          (params)  => api.get('/users/search', { params }),
  getById:         (id)      => api.get(`/users/${id}`),
  updateProfile:   (data)    => api.put('/users/profile', data),
  savePushToken:   (token)   => api.put('/users/push-token', { pushToken: token }),
  // Call on logout so a shared/reset device stops receiving this user's
  // notifications after they sign out. DELETE body goes via config.data.
  removePushToken: (token)   => api.delete('/users/push-token', { data: { pushToken: token } }),
  blockUser:       (userId)  => api.post(`/users/${userId}/block`),
  unblockUser:     (userId)  => api.delete(`/users/${userId}/block`),
  getBlockedUsers: ()        => api.get('/users/blocked'),
  reportUser:    (userId, reason, description) =>
    api.post(`/users/${userId}/report`, { reason, description }),
  // Self-service account deletion. `password` is only checked server-side
  // for local (email/phone+password) accounts — Google-only accounts pass
  // undefined and just need `confirm: true`. Axios sends a DELETE body via
  // `config.data`, not a second positional arg like POST.
  deleteAccount: (password) =>
    api.delete('/users/me', { data: { password, confirm: true } }),
  // NOTE: these previously pointed at '/profile/photos', which doesn't exist
  // on the backend (the real routes are under /upload — see uploadRoutes.js)
  // and had no caller anywhere in the app. Fixed to the real paths; still
  // unused pending a photo-management screen wiring these up.
  uploadPhoto:   (formData) =>
    api.post('/upload/photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deletePhoto: (index) => api.delete(`/upload/photos/${index}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Match Endpoints
// ─────────────────────────────────────────────────────────────────────────────
export const MatchAPI = {
  likeUser:   (userId, isSuperLike = false) => api.post(`/matches/like/${userId}`, { isSuperLike }),
  passUser:   (userId)  => api.post(`/matches/pass/${userId}`),
  getMatches: ()        => api.get('/matches'),
  getLikes:   ()        => api.get('/matches/likes'),
  removeLike: (likeId)  => api.delete(`/matches/likes/${likeId}`),
  unmatch:    (matchId) => api.delete(`/matches/${matchId}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Message Endpoints
// ─────────────────────────────────────────────────────────────────────────────
export const MessageAPI = {
  getConversations: ()                    => api.get('/messages/conversations'),
  getMessages:      (userId, page = 1)    => api.get(`/messages/${userId}`, { params: { page } }),
  sendMessage:      (receiverId, content) => api.post(`/messages/${receiverId}`, { content }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Payment Endpoints
// ─────────────────────────────────────────────────────────────────────────────
// NOTE: /payment/subscribe, /payment/boost, and /payment/run-expiry are admin-only
// on the backend (they bypass KoraPay entirely) — intentionally not exposed here.
export const PaymentAPI = {
  initializePayment: (plan)       => api.post('/payment/initialize', { plan }),
  // Plan is looked up server-side from the Transaction record created at
  // initialize time — not sent here, so a client can't claim a plan it
  // didn't actually pay for.
  verifyPayment:  (reference)          => api.post('/payment/verify', { reference }),
  getTopProfiles: ()                   => api.get('/payment/top-profiles'),
  getStatus:      ()                   => api.get('/payment/status'),
};

// ─────────────────────────────────────────────────────────────────────────────
// Community Endpoints
// ─────────────────────────────────────────────────────────────────────────────
export const CommunityAPI = {
  getFeed:       (page = 1, limit = 10) => api.get('/community/feed', { params: { page, limit } }),
  createPost:    (data)                 => api.post('/community/posts', data),
  toggleLike:    (postId)               => api.post(`/community/posts/${postId}/like`),
  recordView:    (postId)               => api.post(`/community/posts/${postId}/view`),
  deletePost:    (postId)               => api.delete(`/community/posts/${postId}`),
  getMyPosts:    ()                     => api.get('/community/posts/mine'),
  getUserPosts:  (userId)               => api.get(`/community/posts/user/${userId}`),
};

export default api;





// /**
//  * HeartLink API Service
//  * Axios instance wired to the Node.js backend.
//  */

// import axios from 'axios';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { StorageKeys } from 'src/constants/appConstants';
// import { ApiIPAddress } from 'utils/apiIPAdrees';

// // ── Base URL ──────────────────────────────────────────────────────────────────
// // Android emulator  → 10.0.2.2
// // iOS simulator     → localhost
// // Physical device   → your machine's local IP e.g. 192.168.1.x
// const BASE_URL = __DEV__
//   ? ApiIPAddress
//   : 'https://api.heartlink.app/api';

// // ── Axios instance ────────────────────────────────────────────────────────────
// const api = axios.create({
//   baseURL: BASE_URL,
//   timeout: 15000,
//   headers: { 'Content-Type': 'application/json' },
// });


// // ── Request interceptor ───────────────────────────────────────────────────────
// api.interceptors.request.use(
//   async (config) => {
//     const token = await AsyncStorage.getItem(StorageKeys.AUTH_TOKEN);
//     if (token) {
//       config.headers.Authorization = `Bearer ${JSON.parse(token)}`;
//     }
//     // Log every outgoing request
//     console.log(`📤 [API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
//     if (config.data) {
//       const safeData = { ...config.data, password: config.data.password ? '***' : undefined };
//       console.log('📦 [API] Payload:', JSON.stringify(safeData));
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );
 
// // ── Response interceptor ──────────────────────────────────────────────────────
// api.interceptors.response.use(
//   (response) => {
//     console.log(`✅ [API] ${response.status} ${response.config.url}`);
//     return response.data;
//   },
//   async (error) => {
//     // Log the RAW error so we always know the real cause
//     console.log('❌ [API] Error:', {
//       url:     error.config?.url,
//       status:  error.response?.status,
//       data:    error.response?.data,
//       message: error.message,
//     });
 
//     const status  = error.response?.status;
//     const message = error.response?.data?.message || error.message || 'Something went wrong.';
 
//     // Auto-clear session on 401
//     if (status === 401) {
//       await AsyncStorage.multiRemove([StorageKeys.AUTH_TOKEN, StorageKeys.USER]);
//     }
 
//     // Return the REAL message — don't remap here
//     return Promise.reject({ message, status });
//   }
// );
 
// // ─────────────────────────────────────────────────────────────────────────────
// // Auth Endpoints
// // ─────────────────────────────────────────────────────────────────────────────
// export const AuthAPI = {
//   register:       (data)            => api.post('/auth/register', data),
//   login:          (data)            => api.post('/auth/login', data),
//   getMe:          ()                => api.get('/auth/me'),
//   sendOtp:        (phone)           => api.post('/auth/send-otp', { phone }),
//   verifyOtp:      (phone, otp)      => api.post('/auth/verify-otp', { phone, otp }),
//   forgotPassword: (email)           => api.post('/auth/forgot-password', { email }),
//   resetPassword:  (token, password) => api.post('/auth/reset-password', { token, password }),
// };
 
// // ─────────────────────────────────────────────────────────────────────────────
// // User Endpoints
// // ─────────────────────────────────────────────────────────────────────────────
// export const UserAPI = {
//   search:        (params)  => api.get('/users/search', { params }),
//   getById:       (id)      => api.get(`/users/${id}`),
//   updateProfile: (data)    => api.put('/profile', data),
//   blockUser:     (userId)  => api.post(`/users/${userId}/block`),
//   reportUser:    (userId, reason, description) =>
//     api.post(`/users/${userId}/report`, { reason, description }),
//   uploadPhoto:   (formData) =>
//     api.post('/profile/photos', formData, {
//       headers: { 'Content-Type': 'multipart/form-data' },
//     }),
//   deletePhoto: (photoId) => api.delete(`/profile/photos/${photoId}`),
// };
 
// // ─────────────────────────────────────────────────────────────────────────────
// // Match Endpoints
// // ─────────────────────────────────────────────────────────────────────────────
// export const MatchAPI = {
//   likeUser:   (userId)  => api.post(`/matches/like/${userId}`),
//   passUser:   (userId)  => api.post(`/matches/pass/${userId}`),
//   getMatches: ()        => api.get('/matches'),
//   unmatch:    (matchId) => api.delete(`/matches/${matchId}`),
// };
 
// // ─────────────────────────────────────────────────────────────────────────────
// // Message Endpoints
// // ─────────────────────────────────────────────────────────────────────────────
// export const MessageAPI = {
//   getConversations: ()                    => api.get('/messages/conversations'),
//   getMessages:      (userId, page = 1)    => api.get(`/messages/${userId}`, { params: { page } }),
//   sendMessage:      (receiverId, content) => api.post(`/messages/${receiverId}`, { content }),
// };
 
// export default api;
 