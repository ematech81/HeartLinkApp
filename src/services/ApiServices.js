/**
 * HeartLink API Service
 * Axios instance with auth headers, token refresh, and error handling.
 */

import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT } from 'src/constants/appConstants';
import StorageService from './storageServices';
// import { API_BASE_URL, API_TIMEOUT } from 'src/constants/appConstants';
// import StorageService from './storageServices';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    const token = await StorageService.get(StorageKeys.AUTH_TOKEN);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Auto-logout on 401
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      await StorageService.remove(StorageKeys.AUTH_TOKEN);
      await StorageService.remove(StorageKeys.USER);
      // The auth store will react to missing token on next app launch
    }

    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong';

    return Promise.reject({ message, status: error.response?.status });
  }
);

// ─── Auth Endpoints ───────────────────────────────────────────────────────────
export const AuthAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  sendOtp: (phone) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (phone, otp) => api.post('/auth/verify-otp', { phone, otp }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
};

// ─── User / Profile Endpoints ─────────────────────────────────────────────────
export const UserAPI = {
  search: (params) => api.get('/users/search', { params }),
  getById: (id) => api.get(`/users/${id}`),
  updateProfile: (data) => api.put('/profile', data),
  uploadPhoto: (formData) =>
    api.post('/profile/photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deletePhoto: (photoId) => api.delete(`/profile/photos/${photoId}`),
  uploadVideo: (formData) =>
    api.post('/profile/video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  blockUser: (userId) => api.post(`/users/${userId}/block`),
  reportUser: (userId, reason, description) =>
    api.post(`/users/${userId}/report`, { reason, description }),
};

// ─── Match Endpoints ──────────────────────────────────────────────────────────
export const MatchAPI = {
  likeUser: (userId) => api.post(`/matches/like/${userId}`),
  passUser: (userId) => api.post(`/matches/pass/${userId}`),
  getMatches: () => api.get('/matches'),
  unmatch: (matchId) => api.delete(`/matches/${matchId}`),
};

// ─── Message Endpoints ────────────────────────────────────────────────────────
export const MessageAPI = {
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (userId, page = 1) =>
    api.get(`/messages/${userId}`, { params: { page } }),
  sendMessage: (receiverId, content) =>
    api.post(`/messages/${receiverId}`, { content }),
};

export default api;