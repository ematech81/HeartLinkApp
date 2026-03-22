/**
 * HeartLink Auth Store
 * React Context + useReducer for global auth state.
 * No third-party state library required.
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AuthAPI } from 'services/ApiServices';
import AuthService from 'services/authService';
import SocketService from 'services/socketService';


// ─── State shape ──────────────────────────────────────────────────────────────
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,        // true while checking stored session on app start
  error: null,
};

// ─── Actions ──────────────────────────────────────────────────────────────────
const Actions = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  UPDATE_USER: 'UPDATE_USER',
  SET_ERROR: 'SET_ERROR',
};

function reducer(state, action) {
  switch (action.type) {
    case Actions.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case Actions.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case Actions.LOGOUT:
      return { ...initialState, isLoading: false };
    case Actions.UPDATE_USER:
      return { ...state, user: { ...state.user, ...action.payload } };
    case Actions.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // On mount: restore session from storage
  useEffect(() => {
    (async () => {
      const session = await AuthService.loadSession();
      if (session) {
        const freshUser = await AuthService.validateSession();
        if (freshUser) {
          dispatch({ type: Actions.LOGIN_SUCCESS, payload: { token: session.token, user: freshUser } });
          await SocketService.connect();
          SocketService.goOnline(freshUser._id);
        } else {
          await AuthService.clearSession();
          dispatch({ type: Actions.SET_LOADING, payload: false });
        }
      } else {
        dispatch({ type: Actions.SET_LOADING, payload: false });
      }
    })();
  }, []);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const login = async (credentials) => {
    dispatch({ type: Actions.SET_LOADING, payload: true });
    try {
      const data = await AuthAPI.login(credentials);
      await AuthService.saveSession(data.token, data.user);
      dispatch({ type: Actions.LOGIN_SUCCESS, payload: { token: data.token, user: data.user } });
      await SocketService.connect();
      SocketService.goOnline(data.user._id);
      return { success: true };
    } catch (err) {
      dispatch({ type: Actions.SET_ERROR, payload: err.message });
      return { success: false, message: err.message };
    }
  };

  const register = async (userData) => {
    dispatch({ type: Actions.SET_LOADING, payload: true });
    try {
      const data = await AuthAPI.register(userData);
      await AuthService.saveSession(data.token, data.user);
      dispatch({ type: Actions.LOGIN_SUCCESS, payload: { token: data.token, user: data.user } });
      return { success: true };
    } catch (err) {
      dispatch({ type: Actions.SET_ERROR, payload: err.message });
      return { success: false, message: err.message };
    }
  };

  const logout = async () => {
    SocketService.disconnect();
    await AuthService.clearSession();
    dispatch({ type: Actions.LOGOUT });
  };

  const updateUser = (updates) => {
    dispatch({ type: Actions.UPDATE_USER, payload: updates });
    // Persist updated user
    AuthService.saveSession(state.token, { ...state.user, ...updates });
  };

  const clearError = () => dispatch({ type: Actions.SET_ERROR, payload: null });

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateUser, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};