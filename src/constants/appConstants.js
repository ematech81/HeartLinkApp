/**
 * HeartLink App Constants
 */

// ─── Navigation Route Names ───────────────────────────────────────────────────
export const Routes = {
  // Auth Stack
  SPLASH: 'Splash',
  ONBOARDING: 'Onboarding',
  LOGIN: 'Login',
  REGISTER: 'Register',
  OTP: 'OTP',
  VERIFY_EMAIL: 'VerifyEmail',
  FORGOT_PASSWORD: 'ForgotPassword',
  RESET_PASSWORD: 'ResetPassword',

  // Main App (Tab Navigator)
  MAIN: 'Main',
  WELCOME: 'Welcome',  
  HOME: 'Home',
  DISCOVER: 'Discover',
  MATCHES: 'Matches',
  MESSAGES: 'Messages',
  PROFILE: 'Profile',
  LIKES:   'Likes',

  COMMUNITY:     'Community',
  CREATE_POST:   'CreatePost',
  SUBSCRIPTION:  'Subscription',

  // Modals / Stack Screens
  USER_PROFILE: 'UserProfile',
  CHAT: 'Chat',
  EDIT_PROFILE: 'EditProfile',
  SETTINGS: 'Settings',
  NOTIFICATIONS: 'Notifications',
};

// ─── AsyncStorage Keys ────────────────────────────────────────────────────────
export const StorageKeys = {
  AUTH_TOKEN: '@heartlink/auth_token',
  REFRESH_TOKEN: '@heartlink/refresh_token',
  USER: '@heartlink/user',
  ONBOARDING_SEEN: '@heartlink/onboarding_seen',
  THEME: '@heartlink/theme',
  NOTIFICATIONS_ENABLED: '@heartlink/notifications_enabled',
};

// ─── API Config ───────────────────────────────────────────────────────────────
export const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:5000/api'   // Android emulator → localhost
  : 'https://api.heartlink.app/api';

export const API_TIMEOUT = 15000; // 15 seconds

// ─── Validation Rules ─────────────────────────────────────────────────────────
export const Validation = {
  minPasswordLength: 8,
  maxBioLength: 500,
  maxPhotos: 6,
  minAge: 18,
  maxAge: 80,
  otpLength: 6,
};

// ─── Gender Options ───────────────────────────────────────────────────────────
export const GenderOptions = [
  { label: 'Male', value: 'male', icon: '👨' },
  { label: 'Female', value: 'female', icon: '👩' },
];

// ─── Relationship Type Options ────────────────────────────────────────────────
export const RelationshipTypes = [
  { label: 'Single', value: 'single', icon: '🙋' },
  { label: 'Single Mother', value: 'single_mother', icon: '👩‍👧' },
  { label: 'Single Father', value: 'single_father', icon: '👨‍👦' },
];

// ─── Onboarding Slides ────────────────────────────────────────────────────────
export const OnboardingSlides = [
  {
    id: '1',
    title: 'Meet Singles Globally',
    subtitle: 'Connect with thousands of singles from every corner of the world. Love has no borders.',
    icon: '🌍',
  },
  {
    id: '2',
    title: 'Build Meaningful\nRelationships',
    subtitle: 'Go beyond swipes. Match, message, and truly get to know someone who complements your life.',
    icon: '💬',
  },
  {
    id: '3',
    title: 'Safe & Verified\nProfiles',
    subtitle: 'Every profile is moderated. Verified badges, block and report tools keep your experience safe.',
    icon: '✅',
  },
];

// ─── Misc ─────────────────────────────────────────────────────────────────────
export const APP_NAME = 'HeartLink';
export const SUPPORT_EMAIL = 'support@heartlink.app';