/**
 * HeartLink Auth Service
 * Handles token storage, session init, and user persistence.
 */

import { StorageKeys } from 'src/constants/appConstants';
import StorageService from './storageServices';
// import { AuthAPI } from './ApiService';
// import StorageService from './storageServices';

const AuthService = {
  /**
   * Persist token + user after login/register.
   */
  saveSession: async (token, user) => {
    await StorageService.set(StorageKeys.AUTH_TOKEN, token);
    await StorageService.set(StorageKeys.USER, user);
  },

  /**
   * Clear all auth data (logout).
   */
  clearSession: async () => {
    await StorageService.multiRemove([
      StorageKeys.AUTH_TOKEN,
      StorageKeys.USER,
      StorageKeys.REFRESH_TOKEN,
    ]);
  },

  /**
   * Load saved token + user from storage.
   * Returns null if not found.
   */
  loadSession: async () => {
    const [token, user] = await Promise.all([
      StorageService.get(StorageKeys.AUTH_TOKEN),
      StorageService.get(StorageKeys.USER),
    ]);
    if (!token || !user) return null;
    return { token, user };
  },

  /**
   * Verify the stored token is still valid by pinging /auth/me.
   */
  validateSession: async () => {
    try {
      const data = await AuthAPI.getMe();
      return data?.user || null;
    } catch {
      return null;
    }
  },

  /**
   * Check if onboarding has been seen.
   */
  hasSeenOnboarding: async () => {
    return StorageService.has(StorageKeys.ONBOARDING_SEEN);
  },

  markOnboardingSeen: async () => {
    await StorageService.set(StorageKeys.ONBOARDING_SEEN, true);
  },
};

export default AuthService;