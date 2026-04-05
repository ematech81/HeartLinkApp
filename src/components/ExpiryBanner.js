/**
 * ExpiryBanner
 *
 * A dismissible top banner shown when:
 *  - Subscription expires in <= 3 days
 *  - Boost expires in <= 1 day
 *
 * Usage:
 *   <ExpiryBanner
 *     showSubWarning={showSubExpiryWarning}
 *     showBoostWarning={showBoostExpiryWarning}
 *     subDaysLeft={subDaysLeft}
 *     boostDaysLeft={boostDaysLeft}
 *     onRenewSub={() => navigation.navigate('Profile')}
 *   />
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Animated,
} from 'react-native';

export default function ExpiryBanner({
  showSubWarning,
  showBoostWarning,
  subDaysLeft,
  boostDaysLeft,
  onRenewSub,
}) {
  const [dismissed, setDismissed] = useState(false);
  const opacity = React.useRef(new Animated.Value(0)).current;

  const visible = !dismissed && (showSubWarning || showBoostWarning);

  useEffect(() => {
    // Reset dismiss when the warning flags change
    setDismissed(false);
  }, [showSubWarning, showBoostWarning]);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue:  visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!showSubWarning && !showBoostWarning) return null;
  if (dismissed) return null;

  // Prefer subscription warning over boost warning
  const isSubWarning = showSubWarning;
  const days         = isSubWarning ? subDaysLeft : boostDaysLeft;
  const label        = isSubWarning
    ? `👑 Premium expires in ${days} day${days !== 1 ? 's' : ''}! Renew to keep messaging.`
    : `⚡ Profile boost expires in ${days} day${days !== 1 ? 's' : ''}!`;

  return (
    <Animated.View style={[styles.banner, { opacity }]}>
      <TouchableOpacity
        style={styles.inner}
        onPress={isSubWarning ? onRenewSub : undefined}
        activeOpacity={isSubWarning ? 0.8 : 1}
      >
        <Text style={styles.text} numberOfLines={2}>{label}</Text>
        {isSubWarning && <Text style={styles.renewText}>Renew →</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.closeBtn} onPress={() => setDismissed(true)}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999,
    backgroundColor: '#FF4B7A',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 8 },
    }),
  },
  inner:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  text:       { flex: 1, fontSize: 12, color: '#fff', fontWeight: '600', lineHeight: 17 },
  renewText:  { fontSize: 12, color: '#fff', fontWeight: '800' },
  closeBtn:   { padding: 4, marginLeft: 6 },
  closeText:  { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
});
