import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Colors from 'src/constants/Colors';
// import {  } from 'src/constants/Layout';
import { FontSize, FontWeight } from 'src/constants/topography';
import { Spacing, Radius, Shadows } from 'src/constants/layout';

/**
 * BackButton
 *
 * A reusable back button. Automatically calls navigation.goBack()
 * unless a custom onPress is provided.
 *
 * @param {'light' | 'dark'} theme  - 'light' for dark backgrounds (white icon),
 *                                    'dark' for light backgrounds (dark icon).
 *                                    Defaults to 'dark'.
 * @param {'icon' | 'text' | 'both'} variant - Display style. Defaults to 'both'.
 * @param {function} onPress        - Optional override for back action.
 * @param {string} label            - Custom label. Defaults to 'Back'.
 * @param {object} style            - Optional extra styles for the container.
 *
 * @example
 * // On a white screen
 * <BackButton />
 *
 * @example
 * // On a dark/gradient screen
 * <BackButton theme="light" />
 *
 * @example
 * // Icon only, custom action
 * <BackButton variant="icon" onPress={() => navigation.navigate(Routes.HOME)} />
 */
export default function BackButton({
  theme = 'dark',
  variant = 'both',
  onPress,
  label = 'Back',
  style,
}) {
  const navigation = useNavigation();
  const isLight = theme === 'light';

  const iconColor  = isLight ? Colors.white : Colors.text;
  const textColor  = isLight ? Colors.white : Colors.textSecondary;
  const bgColor    = isLight
    ? 'rgba(255,255,255,0.2)'
    : 'rgba(0,0,0,0.05)';

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[styles.container, style]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      {/* Arrow circle */}
      {(variant === 'icon' || variant === 'both') && (
        <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
          <Text style={[styles.arrow, { color: iconColor }]}>←</Text>
        </View>
      )}

      {/* Label */}
      {(variant === 'text' || variant === 'both') && (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontSize: FontSize.lg,
    lineHeight: FontSize.lg + 2,
    fontWeight: FontWeight.medium,
  },
  label: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
  },
});