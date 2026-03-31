import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from 'src/constants/Colors';
import { Routes } from 'src/constants/appConstants';
import { useAuth } from 'src/store/authStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const AVATAR_SIZE = 120;

// ── Fallback couple image ─────────────────────────────────────────────────────
const COUPLE_IMAGE = require('../../media/images/matchCouple.jpeg');

// ── Floating Heart Component ─────────────────────────────────────────────────
function FloatingHeart({ delay, startX, size, duration }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      translateY.setValue(0);
      opacity.setValue(0);
      translateX.setValue(0);
      rotate.setValue(0);

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, { toValue: -(SCREEN_HEIGHT * 0.4), duration: duration || 4000, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.8, duration: 600, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: (duration || 4000) - 600, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(translateX, { toValue: 30,  duration: (duration || 4000) / 3, useNativeDriver: true }),
            Animated.timing(translateX, { toValue: -20, duration: (duration || 4000) / 3, useNativeDriver: true }),
            Animated.timing(translateX, { toValue: 10,  duration: (duration || 4000) / 3, useNativeDriver: true }),
          ]),
          Animated.timing(rotate, { toValue: 1, duration: duration || 4000, useNativeDriver: true }),
        ]),
      ]).start(() => animate());
    };
    animate();
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['-20deg', '20deg'] });

  return (
    <Animated.Text
      style={[styles.floatingHeart, { left: startX, fontSize: size, opacity, transform: [{ translateY }, { translateX }, { rotate: spin }] }]}
    >
      💕
    </Animated.Text>
  );
}

// ── Sparkle Component ────────────────────────────────────────────────────────
function Sparkle({ delay, x, y }) {
  const scale   = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      scale.setValue(0);
      opacity.setValue(0);

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.sequence([
            Animated.timing(scale,   { toValue: 1.2, duration: 400, useNativeDriver: true }),
            Animated.timing(scale,   { toValue: 0,   duration: 400, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.delay(200),
            Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]),
        ]),
      ]).start(() => animate());
    };
    animate();
  }, []);

  return (
    <Animated.Text style={[styles.sparkle, { left: x, top: y, opacity, transform: [{ scale }] }]}>
      ✨
    </Animated.Text>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── MatchScreen Component ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function MatchScreen({ navigation, route }) {
    const insets   = useSafeAreaInsets();
    const { user } = useAuth();
  
    const matchedUser = route?.params?.matchedUser ?? null;
    const matchId     = route?.params?.matchId     ?? null;
  
    // ── 1. ALL hooks first (useRef, useEffect) ────────────────────────────
    const titleScale            = useRef(new Animated.Value(0)).current;
    const titleOpacity          = useRef(new Animated.Value(0)).current;
    const subtitleOpacity       = useRef(new Animated.Value(0)).current;
    const avatarLeftX           = useRef(new Animated.Value(-100)).current;
    const avatarRightX          = useRef(new Animated.Value(100)).current;
    const avatarOpacity         = useRef(new Animated.Value(0)).current;
    const heartBadgeScale       = useRef(new Animated.Value(0)).current;
    const coupleImageOpacity    = useRef(new Animated.Value(0)).current;
    const coupleImageTranslateY = useRef(new Animated.Value(40)).current;
    const buttonsOpacity        = useRef(new Animated.Value(0)).current;
    const buttonsTranslateY     = useRef(new Animated.Value(30)).current;
    const heartPulse            = useRef(new Animated.Value(1)).current;
  
    // ── Guard — go back if no matchedUser ─────────────────────────────────
    useEffect(() => {
        if (!matchedUser) { navigation.goBack(); }
      }, [matchedUser]);
  

    // ── Animation — only runs when matchedUser exists ─────────────────────
    useEffect(() => {
      if (!matchedUser) return; // skip animation if no data
      
      Animated.sequence([
        Animated.parallel([
          Animated.spring(titleScale,  { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
          Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
        Animated.timing(subtitleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.parallel([
          Animated.spring(avatarLeftX,  { toValue: 0, friction: 6, tension: 50, useNativeDriver: true }),
          Animated.spring(avatarRightX, { toValue: 0, friction: 6, tension: 50, useNativeDriver: true }),
          Animated.timing(avatarOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        Animated.spring(heartBadgeScale, { toValue: 1, friction: 3, tension: 80, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(coupleImageOpacity,    { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.spring(coupleImageTranslateY, { toValue: 0, friction: 6,   useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(buttonsOpacity,    { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(buttonsTranslateY, { toValue: 0, friction: 6,   useNativeDriver: true }),
        ]),
      ]).start();
  
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(heartPulse, { toValue: 1.25, duration: 600, useNativeDriver: true }),
          Animated.timing(heartPulse, { toValue: 1,    duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }, [matchedUser]); // ← depends on matchedUser
  
    // ── NOW safe to return null ────────────────────────────────────────────
    if (!matchedUser) return null;

    // ── 3. Regular variables AFTER the early return ───────────────────────
    const myAvatar = user?.profilePicture
      || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'You')}&background=FF4D6D&color=fff&size=200`;
  
    const theirAvatar = matchedUser.profilePicture
      || matchedUser.photos?.[0]
      || `https://ui-avatars.com/api/?name=${encodeURIComponent(matchedUser.name || 'Match')}&background=FF4D6D&color=fff&size=200`;


  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSendMessage = () => {
    navigation.replace(Routes.CHAT, {
      userId:     matchedUser._id || matchedUser.id,
      userName:   matchedUser.name,
      userAvatar: theirAvatar,
      matchId,
    });
  };
  
  const handleKeepDiscovering = () => navigation.navigate(Routes.HOME);
  const handleClose           = () => navigation.navigate(Routes.HOME);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF5F7" />

      {/* ── Floating Hearts ─────────────────────────────────────────────── */}
      <FloatingHeart delay={0}    startX={SCREEN_WIDTH * 0.1}  size={18} duration={5000} />
      <FloatingHeart delay={800}  startX={SCREEN_WIDTH * 0.8}  size={14} duration={4500} />
      <FloatingHeart delay={1600} startX={SCREEN_WIDTH * 0.5}  size={20} duration={5500} />
      <FloatingHeart delay={2400} startX={SCREEN_WIDTH * 0.25} size={16} duration={4000} />
      <FloatingHeart delay={3200} startX={SCREEN_WIDTH * 0.65} size={12} duration={4800} />
      <FloatingHeart delay={1200} startX={SCREEN_WIDTH * 0.4}  size={15} duration={5200} />

      {/* ── Sparkles ────────────────────────────────────────────────────── */}
      <Sparkle delay={500}  x={SCREEN_WIDTH * 0.15} y={SCREEN_HEIGHT * 0.12} />
      <Sparkle delay={1500} x={SCREEN_WIDTH * 0.75} y={SCREEN_HEIGHT * 0.08} />
      <Sparkle delay={2500} x={SCREEN_WIDTH * 0.85} y={SCREEN_HEIGHT * 0.25} />
      <Sparkle delay={3500} x={SCREEN_WIDTH * 0.05} y={SCREEN_HEIGHT * 0.3}  />
      <Sparkle delay={2000} x={SCREEN_WIDTH * 0.6}  y={SCREEN_HEIGHT * 0.18} />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>HeartLink</Text>
        <View style={styles.closeBtnPlaceholder} />
      </View>

      {/* ── "It's a Match!" Title ───────────────────────────────────────── */}
      <Animated.View style={[styles.titleContainer, { opacity: titleOpacity, transform: [{ scale: titleScale }] }]}>
        <Text style={styles.matchTitle}>
          <Text style={styles.matchHeart}>💕 </Text>
          It's a Match!
        </Text>
      </Animated.View>

      {/* ── Subtitle ────────────────────────────────────────────────────── */}
      <Animated.View style={{ opacity: subtitleOpacity }}>
        <Text style={styles.subtitle}>
          You and{' '}
          <Text style={styles.subtitleName}>{matchedUser.name}</Text>
          {' '}have liked each other.
        </Text>
      </Animated.View>

      {/* ── Avatars ──────────────────────────────────────────────────────── */}
      <View style={styles.avatarsSection}>
        {/* Current user */}
        <Animated.View style={[styles.avatarWrapper, styles.avatarLeft, { opacity: avatarOpacity, transform: [{ translateX: avatarLeftX }] }]}>
          <View style={styles.avatarGlow}>
            <Image source={{ uri: myAvatar }} style={styles.avatarImage} />
          </View>
          <Text style={styles.avatarName}>{user?.name?.split(' ')[0] || 'You'}</Text>
        </Animated.View>

        {/* Heart badge */}
        <Animated.View style={[styles.heartBadge, { transform: [{ scale: Animated.multiply(heartBadgeScale, heartPulse) }] }]}>
          <View style={styles.heartBadgeInner}>
            <Text style={styles.heartBadgeIcon}>♥</Text>
          </View>
        </Animated.View>

        {/* Matched user */}
        <Animated.View style={[styles.avatarWrapper, styles.avatarRight, { opacity: avatarOpacity, transform: [{ translateX: avatarRightX }] }]}>
          <View style={styles.avatarGlow}>
            <Image source={{ uri: theirAvatar }} style={styles.avatarImage} />
          </View>
          <Text style={styles.avatarName}>{matchedUser.name}</Text>
        </Animated.View>
      </View>

      {/* ── Couple Photo ─────────────────────────────────────────────────── */}
      <Animated.View style={[styles.coupleImageContainer, { opacity: coupleImageOpacity, transform: [{ translateY: coupleImageTranslateY }] }]}>
      <Image source={COUPLE_IMAGE} style={styles.coupleImage} resizeMode="cover" />

        <View style={styles.coupleOverlay} />
        <View style={styles.compatBadge}>
          <Text style={styles.compatIcon}>🔥</Text>
          <Text style={styles.compatText}>Great Match!</Text>
        </View>
      </Animated.View>

      {/* ── Action Buttons ──────────────────────────────────────────────── */}
      <Animated.View style={[styles.buttonsContainer, { opacity: buttonsOpacity, transform: [{ translateY: buttonsTranslateY }], paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.messageBtn} onPress={handleSendMessage} activeOpacity={0.85}>
          <Text style={styles.messageBtnIcon}>💬</Text>
          <Text style={styles.messageBtnText}>Send a Message</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.discoverBtn} onPress={handleKeepDiscovering} activeOpacity={0.7}>
          <Text style={styles.discoverBtnText}>Keep Discovering</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── Styles (original preserved exactly) ──────────────────────────────────────
const styles = StyleSheet.create({
  container:              { flex: 1, backgroundColor: '#FFF5F7' },
  floatingHeart:          { position: 'absolute', bottom: 60, zIndex: 0 },
  sparkle:                { position: 'absolute', fontSize: 16, zIndex: 0 },
  header:                 { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, zIndex: 10 },
  closeBtn:               { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF0F3', alignItems: 'center', justifyContent: 'center', ...Platform.select({ ios: { shadowColor: '#FF4B7A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }, android: { elevation: 2 } }) },
  closeIcon:              { fontSize: 18, fontWeight: '600', color: '#666' },
  headerTitle:            { fontSize: 20, fontWeight: '700', color: '#FF4B7A', letterSpacing: 0.5 },
  closeBtnPlaceholder:    { width: 40 },
  titleContainer:         { alignItems: 'center', marginTop: 8, zIndex: 10 },
  matchTitle:             { fontSize: 36, fontWeight: '800', color: '#2D3436', textAlign: 'center', letterSpacing: -0.5 },
  matchHeart:             { fontSize: 32 },
  subtitle:               { fontSize: 16, color: '#888', textAlign: 'center', marginTop: 8, paddingHorizontal: 40, lineHeight: 22, zIndex: 10 },
  subtitleName:           { fontWeight: '700', color: '#FF4B7A' },
  avatarsSection:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 20, zIndex: 10 },
  avatarWrapper:          { alignItems: 'center' },
  avatarLeft:             { marginRight: -16 },
  avatarRight:            { marginLeft: -16 },
  avatarGlow:             { width: AVATAR_SIZE + 8, height: AVATAR_SIZE + 8, borderRadius: (AVATAR_SIZE + 8) / 2, backgroundColor: '#FFE4EC', alignItems: 'center', justifyContent: 'center', ...Platform.select({ ios: { shadowColor: '#FF4B7A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 }, android: { elevation: 6 } }) },
  avatarImage:            { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, borderWidth: 3, borderColor: '#FFFFFF' },
  avatarName:             { marginTop: 8, fontSize: 14, fontWeight: '600', color: '#555' },
  heartBadge:             { position: 'absolute', zIndex: 20, alignSelf: 'center', top: AVATAR_SIZE / 2 - 22 },
  heartBadgeInner:        { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FF4B7A', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', ...Platform.select({ ios: { shadowColor: '#FF4B7A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 }, android: { elevation: 8 } }) },
  heartBadgeIcon:         { fontSize: 20, color: '#FFFFFF' },
  coupleImageContainer:   { flex: 1, marginHorizontal: 24, marginBottom: 8, borderRadius: 24, overflow: 'hidden', zIndex: 10, ...Platform.select({ ios: { shadowColor: '#FF4B7A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20 }, android: { elevation: 10 } }) },
  coupleImage:            { width: '100%', height: '100%', borderRadius: 24 },
  coupleOverlay:          { ...StyleSheet.absoluteFillObject, borderRadius: 24, backgroundColor: 'rgba(255, 75, 122, 0.05)' },
  compatBadge:            { position: 'absolute', top: 16, right: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 }, android: { elevation: 4 } }) },
  compatIcon:             { fontSize: 14 },
  compatText:             { fontSize: 13, fontWeight: '700', color: '#FF4B7A' },
  buttonsContainer:       { paddingHorizontal: 24, paddingTop: 12, zIndex: 10 },
  messageBtn:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF4B7A', paddingVertical: 16, borderRadius: 16, gap: 10, ...Platform.select({ ios: { shadowColor: '#FF4B7A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12 }, android: { elevation: 6 } }) },
  messageBtnIcon:         { fontSize: 18 },
  messageBtnText:         { fontSize: 17, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
  discoverBtn:            { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, marginTop: 12, borderWidth: 2, borderColor: '#FFB8CC', backgroundColor: '#FFF5F7' },
  discoverBtnText:        { fontSize: 16, fontWeight: '600', color: '#FF4B7A', letterSpacing: 0.3 },
});