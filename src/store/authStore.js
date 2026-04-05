
/**
 * HeartLink AuthStore
 * React Context + useReducer — no third-party state lib needed.
 * Wired to the Node.js/MongoDB backend via ApiServices.
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthAPI } from 'services/ApiServices';
import { StorageKeys } from 'src/constants/appConstants';
// ── Initial state ─────────────────────────────────────────────────────────────
const initialState = {
  user:            null,
  token:           null,
  isAuthenticated: false,
  isLoading:       false,  // ← false by default, only true during API calls
  isInitializing:  true,   // ← separate flag for app startup session check
  error:           null,
};
 
// ── Actions ───────────────────────────────────────────────────────────────────
const SET_LOADING       = 'SET_LOADING';
const SET_INITIALIZING  = 'SET_INITIALIZING';
const AUTH_SUCCESS      = 'AUTH_SUCCESS';
const LOGOUT            = 'LOGOUT';
const UPDATE_USER       = 'UPDATE_USER';
const SET_ERROR         = 'SET_ERROR';
 
function reducer(state, action) {
  switch (action.type) {
    case SET_LOADING:
      return { ...state, isLoading: action.payload };
    case SET_INITIALIZING:
      return { ...state, isInitializing: action.payload };
    case AUTH_SUCCESS:
      return {
        ...state,
        user:            action.payload.user,
        token:           action.payload.token,
        isAuthenticated: true,
        isLoading:       false,
        isInitializing:  false,
        error:           null,
      };
    case LOGOUT:
      return {
        ...initialState,
        isLoading:      false,
        isInitializing: false,
      };
    case UPDATE_USER:
      return { ...state, user: { ...state.user, ...action.payload } };
    case SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };
    default:
      return state;
  }
}
 
const AuthContext = createContext(null);
 
// ── Helpers ───────────────────────────────────────────────────────────────────
const saveSession = async (token, user) => {
  await AsyncStorage.setItem(StorageKeys.AUTH_TOKEN, JSON.stringify(token));
  await AsyncStorage.setItem(StorageKeys.USER, JSON.stringify(user));
};
 
const clearSession = async () => {
  await AsyncStorage.multiRemove([StorageKeys.AUTH_TOKEN, StorageKeys.USER]);
};
 
// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
 
  // ── Restore session on app start ──────────────────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [[, tokenRaw], [, userRaw]] = await AsyncStorage.multiGet([
          StorageKeys.AUTH_TOKEN,
          StorageKeys.USER,
        ]);
 
        const token = tokenRaw ? JSON.parse(tokenRaw) : null;
        const user  = userRaw  ? JSON.parse(userRaw)  : null;
 
        if (token && user) {
          try {
            // Validate with backend
            const data = await AuthAPI.getMe();
            dispatch({
              type: AUTH_SUCCESS,
              payload: { token, user: data.user },
            });
          } catch {
            // Token invalid/expired — clear and proceed as guest
            await clearSession();
            dispatch({ type: SET_INITIALIZING, payload: false });
          }
        } else {
          // No stored session — proceed as guest
          dispatch({ type: SET_INITIALIZING, payload: false });
        }
      } catch {
        // Storage error — proceed as guest
        dispatch({ type: SET_INITIALIZING, payload: false });
      }
    };
 
    restoreSession();
  }, []);
 
  // ── Register ──────────────────────────────────────────────────────────────
  const register = async (userData) => {
    dispatch({ type: SET_LOADING, payload: true });
    try {
      const data = await AuthAPI.register(userData);
      await saveSession(data.token, data.user);
      dispatch({ type: AUTH_SUCCESS, payload: { token: data.token, user: data.user } });
      return { success: true };
    } catch (err) {
      dispatch({ type: SET_ERROR, payload: err.message });
      dispatch({ type: SET_LOADING, payload: false });
      return { success: false, message: err.message };
    }
  };
 
  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (credentials) => {
    dispatch({ type: SET_LOADING, payload: true });
    try {
      const data = await AuthAPI.login(credentials);
      await saveSession(data.token, data.user);
      dispatch({ type: AUTH_SUCCESS, payload: { token: data.token, user: data.user } });
      return { success: true };
    } catch (err) {
      dispatch({ type: SET_ERROR, payload: err.message });
      dispatch({ type: SET_LOADING, payload: false });
      return { success: false, message: err.message };
    }
  };
 
  // ── Login with token (after OTP verify or Google new-user profile complete) ─
  const loginWithToken = async (token, user) => {
    await saveSession(token, user);
    dispatch({ type: AUTH_SUCCESS, payload: { token, user } });
  };

  // ── Google Sign-In ────────────────────────────────────────────────────────
  // Returns { success, isNewUser, token, user } so the caller can decide
  // whether to go home (existing) or to RegistrationScreen (new user).
  const googleLogin = async (idToken) => {
    dispatch({ type: SET_LOADING, payload: true });
    try {
      const data = await AuthAPI.googleAuth(idToken);
      if (!data.isNewUser) {
        // Existing user — save session and authenticate immediately
        await saveSession(data.token, data.user);
        dispatch({ type: AUTH_SUCCESS, payload: { token: data.token, user: data.user } });
      }
      // For new users we intentionally do NOT dispatch AUTH_SUCCESS yet —
      // the navigator must stay on the auth stack so RegistrationScreen is reachable.
      dispatch({ type: SET_LOADING, payload: false });
      return { success: true, isNewUser: !!data.isNewUser, token: data.token, user: data.user };
    } catch (err) {
      dispatch({ type: SET_ERROR, payload: err.message });
      dispatch({ type: SET_LOADING, payload: false });
      return { success: false, message: err.message };
    }
  };
 
  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    await clearSession();
    dispatch({ type: LOGOUT });
  };
 
  // ── Update user locally ───────────────────────────────────────────────────
  const updateUser = async (updates) => {
    // Read current user from AsyncStorage to avoid stale closure issues
    // (e.g. when called right after loginWithToken before re-render)
    const userRaw    = await AsyncStorage.getItem(StorageKeys.USER);
    const current    = userRaw ? JSON.parse(userRaw) : (state.user || {});
    const updated    = { ...current, ...updates };
    await AsyncStorage.setItem(StorageKeys.USER, JSON.stringify(updated));
    dispatch({ type: UPDATE_USER, payload: updates });
  };
 
  const clearError = () => dispatch({ type: SET_ERROR, payload: null });
 
  return (
    <AuthContext.Provider
      value={{
        ...state,
        register,
        login,
        googleLogin,
        loginWithToken,
        logout,
        updateUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
 
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};