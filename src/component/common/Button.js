/**
 * HeartLink Button Component
 * Variants: primary | secondary | outline | ghost
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import Colors from 'src/constants/Colors';
import { Radius, Shadows } from 'src/constants/layout';
import { FontSize, FontWeight } from 'src/constants/topography';

export default function Button({
  title,
  onPress,
  variant = 'primary',   // 'primary' | 'secondary' | 'outline' | 'ghost'
  size = 'md',           // 'sm' | 'md' | 'lg'
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
}) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        styles[`variant_${variant}`],
        styles[`size_${size}`],
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? Colors.white : Colors.primary}
          size="small"
        />
      ) : (
        <View style={styles.row}>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Text
            style={[
              styles.text,
              styles[`text_${variant}`],
              styles[`textSize_${size}`],
              textStyle,
            ]}
          >
            {title}
          </Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconLeft: { marginRight: 8 },
  iconRight: { marginLeft: 8 },

  // Variants
  variant_primary: {
    backgroundColor: Colors.primary,
    ...Shadows.primary,
  },
  variant_secondary: {
    backgroundColor: Colors.backgroundGradientStart,
  },
  variant_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
  },

  // Sizes
  size_sm: { paddingVertical: 10, paddingHorizontal: 20 },
  size_md: { paddingVertical: 14, paddingHorizontal: 28 },
  size_lg: { paddingVertical: 18, paddingHorizontal: 36 },

  // Text base
  text: {
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.3,
  },
  text_primary:   { color: Colors.white },
  text_secondary: { color: Colors.primary },
  text_outline:   { color: Colors.primary },
  text_ghost:     { color: Colors.primary },

  // Text sizes
  textSize_sm: { fontSize: FontSize.sm },
  textSize_md: { fontSize: FontSize.base },
  textSize_lg: { fontSize: FontSize.md },

  disabled: { opacity: 0.5 },
});