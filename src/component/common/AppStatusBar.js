import React from 'react';
import { StatusBar, View, Platform, StyleSheet } from 'react-native';
import Colors from 'src/constants/Colors';

/**
 * AppStatusBar
 *
 * A reusable StatusBar component that follows the app theme.
 *
 * @param {'light' | 'dark'} theme  - 'light' for screens with dark backgrounds,
 *                                    'dark' for screens with light backgrounds.
 *                                    Defaults to 'dark' (light background screens).
 * @param {string} backgroundColor  - Optional override for the status bar background.
 * @param {boolean} translucent     - Makes status bar translucent (default: false).
 *
 * @example
 * // On a white/light screen
 * <AppStatusBar theme="dark" />
 *
 * @example
 * // On a dark/gradient screen
 * <AppStatusBar theme="light" translucent />
 */
export default function AppStatusBar({
  theme = 'dark',
  backgroundColor,
  translucent = false,
}) {
  const isDark = theme === 'dark'; // dark theme = dark-content (for light screens)

  const barStyle = isDark ? 'dark-content' : 'light-content';

  const bgColor = backgroundColor
    ? backgroundColor
    : translucent
    ? 'transparent'
    : isDark
    ? Colors.background      // white background for dark-content screens
    : Colors.primary;        // primary color for light-content screens

  return (
    <StatusBar
      barStyle={barStyle}
      backgroundColor={bgColor}
      translucent={translucent}
      animated
    />
  );
}