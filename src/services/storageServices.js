/**
 * HeartLink Storage Service
 * Typed AsyncStorage wrapper with JSON support and error handling.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const StorageService = {
  /**
   * Store a value. Objects/arrays are automatically JSON-stringified.
   */
  set: async (key, value) => {
    try {
      const serialized =
        typeof value === 'object' ? JSON.stringify(value) : String(value);
      await AsyncStorage.setItem(key, serialized);
    } catch (error) {
      console.error(`[Storage] set error for key "${key}":`, error);
    }
  },

  /**
   * Retrieve a value. JSON is auto-parsed.
   */
  get: async (key) => {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw === null) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return raw; // Return as plain string if not JSON
      }
    } catch (error) {
      console.error(`[Storage] get error for key "${key}":`, error);
      return null;
    }
  },

  /**
   * Remove a single key.
   */
  remove: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`[Storage] remove error for key "${key}":`, error);
    }
  },

  /**
   * Remove multiple keys at once.
   */
  multiRemove: async (keys) => {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('[Storage] multiRemove error:', error);
    }
  },

  /**
   * Clear all app storage (use with caution).
   */
  clear: async () => {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('[Storage] clear error:', error);
    }
  },

  /**
   * Check if a key exists.
   */
  has: async (key) => {
    try {
      const val = await AsyncStorage.getItem(key);
      return val !== null;
    } catch {
      return false;
    }
  },
};

export default StorageService;