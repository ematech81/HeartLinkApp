/**
 * HeartLink Theme
 * Colors (light/dark) and cross-platform font definitions.
 */

import { Platform } from 'react-native';

const tintColorLight = '#FF4D6D';
const tintColorDark = '#FF6B88';

export const Colors = {
  light: {
    text: '#1F2937',
    background: '#FFFFFF',
    backgroundGradientStart: '#FFF0F3',
    backgroundGradientEnd: '#FFFFFF',
    tint: tintColorLight,
    icon: '#6B7280',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorLight,
    card: '#FFFFFF',
    border: '#F3F4F6',
    placeholder: '#D1D5DB',
    inputBackground: '#F9FAFB',
  },
  dark: {
    text: '#F9FAFB',
    background: '#111827',
    backgroundGradientStart: '#1F1015',
    backgroundGradientEnd: '#111827',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    card: '#1F2937',
    border: '#374151',
    placeholder: '#4B5563',
    inputBackground: '#1F2937',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});