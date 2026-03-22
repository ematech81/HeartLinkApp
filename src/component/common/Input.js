/**
 * HeartLink Input Component
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Colors from 'src/constants/Colors';
import { Radius } from 'src/constants/layout';
import { FontSize, FontWeight } from 'src/constants/topography';


export default function Input({
  label,
  placeholder,
  value,
  onChangeText,
  onBlur,
  error,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  multiline = false,
  numberOfLines = 1,
  leftIcon,
  rightIcon,
  editable = true,
  style,
  inputStyle,
  maxLength,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isSecure = secureTextEntry && !showPassword;

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.focused,
          error && styles.errorBorder,
          !editable && styles.disabled,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        <TextInput
          style={[
            styles.input,
            leftIcon && styles.inputWithLeft,
            (rightIcon || secureTextEntry) && styles.inputWithRight,
            multiline && styles.multiline,
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={Colors.textLight}
          value={value}
          onChangeText={onChangeText}
          onBlur={(e) => { setIsFocused(false); onBlur?.(e); }}
          onFocus={() => setIsFocused(true)}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          editable={editable}
          maxLength={maxLength}
        />

        {secureTextEntry && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={() => setShowPassword((s) => !s)}
          >
            <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        )}

        {rightIcon && !secureTextEntry && (
          <View style={styles.rightIcon}>{rightIcon}</View>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  focused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  errorBorder: {
    borderColor: '#EF4444',
  },
  disabled: {
    opacity: 0.6,
    backgroundColor: '#F3F4F6',
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: FontSize.base,
    color: Colors.text,
  },
  inputWithLeft: {
    paddingLeft: 6,
  },
  inputWithRight: {
    paddingRight: 6,
  },
  multiline: {
    textAlignVertical: 'top',
    paddingTop: 12,
    minHeight: 80,
  },
  leftIcon: {
    paddingLeft: 12,
  },
  rightIcon: {
    paddingRight: 12,
  },
  eyeIcon: {
    fontSize: 16,
  },
  error: {
    fontSize: FontSize.xs,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 2,
  },
});