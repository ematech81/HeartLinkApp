import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Animated,
  TouchableOpacity,
  Dimensions,
  Image, 
} from 'react-native';
import { StatusBar } from 'react-native-web';
import AuthService from 'services/authService';
import AppStatusBar from 'src/component/common/AppStatusBar';
import { Routes } from 'src/constants/appConstants';
import Colors from 'src/constants/Colors';
import { Radius, Spacing,  Shadows } from 'src/constants/layout';
import { FontSize, FontWeight } from 'src/constants/topography';

const { width, height } = Dimensions.get('window');
const SLIDES = [
  {
    id: '1',
    image: require('../../media/images/firstSlide.jpeg'),
    title: 'Find Your Perfect\nMatch Globally',
    subtitle: 'Connect with diverse people from across the globe and build meaningful relationships that transcend borders.',
  },
  {
    id: '2',
    image: require('../../media/images/secondSlide.jpeg'),
    title: 'Build Meaningful\nRelationships',
    subtitle: 'Go beyond swipes. Match, chat, and truly get to know someone who complements your life.',
  },
  {
    id: '3',
    image: require('../../media/images/thirdSlide.jpeg'),
    title: 'Safe & Verified\nProfiles',
    subtitle: 'Every profile is moderated. Verified badges, block and report tools keep your experience safe.',
  },
];
// ─── Dot indicator ────────────────────────────────────────────────────────────
function DotIndicator({ count, activeIndex, scrollX }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: count }).map((_, i) => {
        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [10, 28, 10],
          extrapolate: 'clamp',
        });
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.35, 1, 0.35],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={i}
            style={[dotStyles.dot, { width: dotWidth, opacity }]}
          />
        );
      })}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OnboardingScreen({ navigation }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const isLast = activeIndex === SLIDES.length - 1;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems[0]) setActiveIndex(viewableItems[0].index);
  }).current;

  const goNext = async () => {
    if (!isLast) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      await AuthService.markOnboardingSeen();
      navigation.replace(Routes.LOGIN);
    }
  };

  const skip = async () => {
    await AuthService.markOnboardingSeen();
    navigation.replace(Routes.LOGIN);
  };

  const renderSlide = ({ item }) => (
    <View style={styles.slide}>
      {/* Full-width image — no horizontal padding */}
      <Image source={item.image} style={styles.image} resizeMode="cover" />

      {/* Text content */}
      <View style={styles.textBlock}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar/>
      {/* <AppStatusBar theme="dark" /> */}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={skip}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.closeBtn}
        >
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>HeartLink</Text>

        {/* Spacer to balance close button */}
        <View style={styles.headerSpacer} />
      </View>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        scrollEventThrottle={16}
        style={styles.flatList}
      />

      {/* Footer */}
      <View style={styles.footer}>
        {/* Dots */}
        <DotIndicator
          count={SLIDES.length}
          activeIndex={activeIndex}
          scrollX={scrollX}
        />

        {/* Next button */}
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextText}>
            {isLast ? 'Get Started' : 'Next'}{' '}
            <Text style={styles.nextArrow}>→</Text>
          </Text>
        </TouchableOpacity>

        {/* Skip */}
        <TouchableOpacity onPress={skip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const IMAGE_HEIGHT = height * 0.46;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: Colors.background,;l
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: 0.2,
  },
  headerSpacer: {
    width: 36,
  },

  // ── Slides ───────────────────────────────────────────────────────────────────
  flatList: {
    flexGrow: 0,
  },
  slide: {
    width,
  },
  image: {
    width,
    height: IMAGE_HEIGHT,
  },
  textBlock: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize['2xl'] + 2,
    fontWeight: FontWeight.extrabold,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 7,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.sm,
  },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  nextBtn: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  nextText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    letterSpacing: 0.2,
  },
  nextArrow: {
    fontSize: FontSize.md,
  },
  skipBtn: {
    paddingVertical:0,
    marginBottom:10,
    // backgroundColor: '#0000'
  },
  skipText: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
});