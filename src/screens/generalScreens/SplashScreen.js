import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// import { FontSize } from 'src/constants/topography';
import Colors from 'src/constants/Colors';
import { Spacing } from 'src/constants/layout';
import { FontSize, FontWeight, LetterSpacing } from 'src/constants/topography';
import { Routes } from 'src/constants/appConstants';
import { useAuth } from 'src/store/authStore';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const { isAuthenticated } = useAuth();

  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(20)).current;
  const ringsScale = useRef(new Animated.Value(0.6)).current;
  const ringsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sequence: rings fade in → logo pops → tagline slides up
    Animated.sequence([
      Animated.parallel([
        Animated.timing(ringsOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(ringsScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(taglineY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();

    // Navigate after 2.8s
    const timer = setTimeout(() => {
      navigation.replace(isAuthenticated ? Routes.MAIN : Routes.ONBOARDING);
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={['#0D0720', '#2D1B4E', '#E8335A']}
      locations={[0, 0.55, 1]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Decorative rings */}
      <Animated.View
        style={[
          styles.ringsContainer,
          { opacity: ringsOpacity, transform: [{ scale: ringsScale }] },
        ]}
      >
        <View style={[styles.ring, styles.ring3]} />
        <View style={[styles.ring, styles.ring2]} />
        <View style={[styles.ring, styles.ring1]} />
      </Animated.View>

      {/* Logo mark */}
      <Animated.View
        style={[
          styles.logoContainer,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <View style={styles.logoInner}>
          <Text style={styles.logoHeart}>♥</Text>
        </View>
      </Animated.View>

      {/* App name + tagline */}
      <Animated.View
        style={[
          styles.textContainer,
          { opacity: taglineOpacity, transform: [{ translateY: taglineY }] },
        ]}
      >
        <Text style={styles.appName}>HeartLink</Text>
        <Text style={styles.tagline}>Where love finds its way</Text>
      </Animated.View>

      {/* Bottom dots */}
      <View style={styles.dotsRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, i === 1 && styles.dotActive]} />
        ))}
      </View>
    </LinearGradient>
  );
}

const RING_BASE = 180;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringsContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  ring1: { width: RING_BASE, height: RING_BASE },
  ring2: { width: RING_BASE * 1.6, height: RING_BASE * 1.6, borderColor: 'rgba(255,255,255,0.07)' },
  ring3: { width: RING_BASE * 2.3, height: RING_BASE * 2.3, borderColor: 'rgba(255,255,255,0.04)' },

  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: Spacing.lg,
    shadowColor: '#E8335A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  logoInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoHeart: {
    fontSize: 52,
    color: Colors.white,
  },

  textContainer: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  appName: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.bold,
    color: Colors.white,
    letterSpacing: LetterSpacing.wider,
  },
  tagline: {
    fontSize: FontSize.base,
    color: 'rgba(255,255,255,0.65)',
    marginTop: Spacing.xs,
    letterSpacing: LetterSpacing.wide,
  },

  dotsRow: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.white,
  },
});