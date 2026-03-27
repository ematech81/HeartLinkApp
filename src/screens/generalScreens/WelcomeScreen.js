import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from 'src/constants/Colors';
import { FontSize, FontWeight } from 'src/constants/topography';
import { Radius, Spacing } from 'src/constants/layout';
import { Routes } from 'src/constants/appConstants';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.88;
const CARD_HEIGHT = height * 0.42;

export default function WelcomeScreen({ navigation }) {
  // Fade + slide animations
  const logoAnim   = useRef(new Animated.Value(0)).current;
  const titleAnim  = useRef(new Animated.Value(0)).current;
  const cardAnim   = useRef(new Animated.Value(40)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const btnAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.spring(logoAnim,    { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      Animated.timing(titleAnim,   { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(cardAnim,    { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
      Animated.timing(btnAnim,     { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={['#FFE4EA', '#FFF0F3', '#FFFFFF']}
      locations={[0, 0.45, 1]}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Top section */}
      <View style={styles.topSection}>
        {/* App Icon */}
        <Animated.View style={[styles.iconWrapper, { opacity: logoAnim, transform: [{ scale: logoAnim }] }]}>
          <LinearGradient
            colors={[Colors.primaryLight, Colors.primary]}
            style={styles.iconCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Heart icon */}
            <Text style={styles.iconHeart}>♥</Text>
            {/* Link badge */}
            <View style={styles.linkBadge}>
              <Text style={styles.linkIcon}>🔗</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Title */}
        <Animated.View style={{ opacity: titleAnim }}>
          <Text style={styles.appName}>HeartLink</Text>
          <Text style={styles.tagline}>Connect heart to heart.</Text>
        </Animated.View>
      </View>

      {/* Hero card */}
      <Animated.View
        style={[
          styles.card,
          {
            opacity: cardOpacity,
            transform: [{ translateY: cardAnim }],
          },
        ]}
      >
        {/* Placeholder image — replace Image source with your asset */}
        <Image
          source={ require('../../media/images/onbord1.png')}
          style={styles.cardImage}
          resizeMode="cover"
        />

        {/* Matches nearby badge */}
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>Matches nearby</Text>
        </View>
      </Animated.View>

      {/* Bottom section */}
      <Animated.View style={[styles.bottomSection, { opacity: btnAnim }]}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => navigation.replace(Routes.ONBOARDING)}
          style={styles.btnWrapper}
        >
          <LinearGradient
            colors={[Colors.primaryLight, Colors.primary]}
            style={styles.getStartedBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Terms */}
        <Text style={styles.terms}>
          By tapping "Get Started", you agree to our{'\n'}
          <Text style={styles.termsLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>.
        </Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: Spacing.lg,
  },

  // ── Top ──────────────────────────────────────────────────────────────────────
  topSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },

  iconWrapper: {
    marginBottom: Spacing.md,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  iconHeart: {
    fontSize: 44,
    color: Colors.white,
  },
  linkBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  linkIcon: {
    fontSize: 16,
  },

  appName: {
    fontSize: FontSize['4xl'],
    fontWeight: FontWeight.extrabold,
    color: '#1B2141',
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: 6,
  },
  tagline: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.regular,
    color: '#5A6580',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // ── Hero Card ─────────────────────────────────────────────────────────────────
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    marginBottom: Spacing.xl,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: 7,
    borderRadius: Radius.full,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  badgeDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.success,
  },
  badgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#1B2141',
  },

  // ── Bottom ────────────────────────────────────────────────────────────────────
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 'auto',
  },
  btnWrapper: {
    width: '100%',
    marginBottom: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  getStartedBtn: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: Radius.full,
    alignItems: 'center',
  },
  getStartedText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    letterSpacing: 0.3,
  },

  terms: {
    fontSize: FontSize.sm,
    color: '#8A92A6',
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
});