/**
 * HeartLink Typography
 * Font sizes, weights, and line heights.
 */

import { Platform } from 'react-native';

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 34,
  '4xl': 42,
};

export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

export const LineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
};

export const LetterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1,
  widest: 2,
};

// Preset text styles (spread into StyleSheet)
export const TextStyles = {
  h1: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
  },
  h2: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
  },
  h3: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
  },
  h4: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  body: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.regular,
  },
  bodyMedium: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
  },
  caption: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.regular,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    letterSpacing: LetterSpacing.wide,
  },
  button: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    letterSpacing: LetterSpacing.wide,
  },
  buttonLarge: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    letterSpacing: LetterSpacing.wide,
  },
};