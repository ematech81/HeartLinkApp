/**
 * HeartLink ScreenWrapper
 * Handles SafeAreaView, StatusBar, KeyboardAvoidingView, and optional gradient bg.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import Colors from 'src/constants/Colors';


export default function ScreenWrapper({
  children,
  scroll = false,               // wrap children in ScrollView
  keyboardAvoiding = false,     // wrap in KeyboardAvoidingView
  backgroundColor = Colors.background,
  statusBarStyle = 'dark-content',
  statusBarColor = Colors.background,
  edges = true,                 // apply safe area padding
  contentContainerStyle,
  style,
  padded = true,                // add horizontal padding
}) {
  const content = (
    <View style={[styles.inner, padded && styles.padded, style]}>
      {children}
    </View>
  );

  const scrollable = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
    >
      {content}
    </ScrollView>
  ) : content;

  const wrapped = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {scrollable}
    </KeyboardAvoidingView>
  ) : scrollable;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }]}>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={statusBarColor}
        translucent={false}
      />
      {wrapped}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: 24,
  },
  scrollContent: {
    flexGrow: 1,
  },
});