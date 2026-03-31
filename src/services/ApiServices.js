import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKeys } from 'src/constants/appConstants';
import { ApiIPAddress } from 'utils/apiIPAdrees';

// export const ApiIPAddress = 'http://10.182.223.155:5000/api';

const BASE_URL = __DEV__
  ? ApiIPAddress
  : 'https://api.heartlink.app/api';

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

    // Return the REAL message — don't remap here
    return Promise.reject({ message, status });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Auth Endpoints
// ─────────────────────────────────────────────────────────────────────────────
export const AuthAPI = {
  register:       (data)            => api.post('/auth/register', data),
  login:          (data)            => api.post('/auth/login', data),
  getMe:          ()                => api.get('/auth/me'),
  sendOtp:        (phone)           => api.post('/auth/send-otp', { phone }),
  verifyOtp:      (phone, otp)      => api.post('/auth/verify-otp', { phone, otp }),
  forgotPassword: (email)           => api.post('/auth/forgot-password', { email }),
  resetPassword:  (token, password) => api.post('/auth/reset-password', { token, password }),
};

// ─────────────────────────────────────────────────────────────────────────────
// User Endpoints
// ─────────────────────────────────────────────────────────────────────────────
export const UserAPI = {
  search:        (params)  => api.get('/users/search', { params }),
  getById:       (id)      => api.get(`/users/${id}`),
  updateProfile: (data)    => api.put('/users/profile', data),
  savePushToken: (token)   => api.put('/users/push-token', { pushToken: token }),
  blockUser:     (userId)  => api.post(`/users/${userId}/block`),
  reportUser:    (userId, reason, description) =>
    api.post(`/users/${userId}/report`, { reason, description }),
  uploadPhoto:   (formData) =>
    api.post('/profile/photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deletePhoto: (photoId) => api.delete(`/profile/photos/${photoId}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Match Endpoints
// ─────────────────────────────────────────────────────────────────────────────
export const MatchAPI = {
  likeUser:   (userId, isSuperLike = false) => api.post(`/matches/like/${userId}`, { isSuperLike }),
  passUser:   (userId)  => api.post(`/matches/pass/${userId}`),
  getMatches: ()        => api.get('/matches'),
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
 