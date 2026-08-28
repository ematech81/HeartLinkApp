// import React, {
//   useState, useEffect, useCallback, useRef, useImperativeHandle,
// } from 'react';
// import {
//   View, Text, Image, StyleSheet, Dimensions,
//   TouchableOpacity, ActivityIndicator, StatusBar,
//   Platform, Animated, PanResponder,
// } from 'react-native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import * as Location from 'expo-location';
// import { UserAPI, MatchAPI } from 'services/ApiServices';
// import { useAuth } from 'src/store/authStore';
// import { Routes } from 'src/constants/appConstants';
// import UpgradeModal from 'src/components/UpgradeModal';

// const { width: W, height: H } = Dimensions.get('window');

// const SWIPE_THRESHOLD = W * 0.28;

// const getAge    = (dob) => !dob ? '' : Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));
// const isMongoId = (id)  => typeof id === 'string' && id.length === 24 && /^[a-f0-9]+$/i.test(id);

// const DUMMY = [
//   { id: 'd1', name: 'Sarah',  dateOfBirth: '1999-05-10', city: 'Lagos',         country: 'Nigeria', profession: 'Photographer', interests: ['Travel', 'Yoga'],   isOnline: true,  profilePicture: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800' },
//   { id: 'd2', name: 'Emma',   dateOfBirth: '1997-08-22', city: 'Abuja',         country: 'Nigeria', profession: 'Chef',         interests: ['Cooking', 'Music'], isOnline: false, profilePicture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800' },
//   { id: 'd3', name: 'Olivia', dateOfBirth: '2000-01-15', city: 'Port Harcourt', country: 'Nigeria', profession: 'Engineer',     interests: ['Tech', 'Dancing'],  isOnline: true,  profilePicture: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800' },
// ];

// // ── Swipeable Card ─────────────────────────────────────────────────────────────
// const SwipeCard = React.forwardRef(function SwipeCard(
//   { profile, onSwipeLeft, onSwipeRight, onSwipeSuper, onTap, isTop, showBoostBadge },
//   ref,
// ) {
//   const position  = useRef(new Animated.ValueXY()).current;
//   const superAnim = useRef(new Animated.Value(0)).current;

//   // Keep latest props in a ref so PanResponder closure never goes stale
//   const live = useRef({ onSwipeLeft, onSwipeRight, onSwipeSuper, onTap, isTop, profile });
//   live.current = { onSwipeLeft, onSwipeRight, onSwipeSuper, onTap, isTop, profile };

//   const avatar = profile.profilePicture || profile.photos?.[0]
//     || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&size=800&background=FF4D6D&color=fff`;
//   const age = profile.age || getAge(profile.dateOfBirth);

//   // ── Interpolated values ──────────────────────────────────────────────────
//   const rotate = position.x.interpolate({
//     inputRange: [-W / 2, 0, W / 2],
//     outputRange: ['-20deg', '0deg', '20deg'],
//     extrapolate: 'clamp',
//   });
//   const likeOpacity = position.x.interpolate({
//     inputRange: [20, W * 0.3],
//     outputRange: [0, 1],
//     extrapolate: 'clamp',
//   });
//   const nopeOpacity = position.x.interpolate({
//     inputRange: [-W * 0.3, -20],
//     outputRange: [1, 0],
//     extrapolate: 'clamp',
//   });

//   // ── Swipe-out helper (stable via ref — safe to call from PanResponder) ───
//   const doSwipeOut = useRef((direction) => {
//     if (direction === 'up') {
//       // Flash SUPER stamp, then fly card upward
//       Animated.timing(superAnim, { toValue: 1, duration: 100, useNativeDriver: true }).start();
//       Animated.timing(position, {
//         toValue: { x: 0, y: -H * 1.5 },
//         duration: 300,
//         useNativeDriver: true,
//       }).start(() => {
//         position.setValue({ x: 0, y: 0 });
//         superAnim.setValue(0);
//         live.current.onSwipeSuper?.();
//       });
//       return;
//     }
//     const x = direction === 'right' ? W * 1.5 : -W * 1.5;
//     Animated.timing(position, {
//       toValue: { x, y: 0 },
//       duration: 280,
//       useNativeDriver: true,
//     }).start(() => {
//       position.setValue({ x: 0, y: 0 });
//       if (direction === 'right') live.current.onSwipeRight();
//       else                       live.current.onSwipeLeft();
//     });
//   }).current;

//   // ── Expose imperative swipe methods to parent ────────────────────────────
//   useImperativeHandle(ref, () => ({
//     swipeLeft:  () => doSwipeOut('left'),
//     swipeRight: () => doSwipeOut('right'),
//     swipeUp:    () => doSwipeOut('up'),
//   }));

//   // ── PanResponder ─────────────────────────────────────────────────────────
//   const panResponder = useRef(
//     PanResponder.create({
//       onStartShouldSetPanResponder: ()      => live.current.isTop,
//       onMoveShouldSetPanResponder:  (_, g)  => live.current.isTop && (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3),
//       onPanResponderMove:   (_, g) => position.setValue({ x: g.dx, y: g.dy }),
//       onPanResponderRelease: (_, g) => {
//         // Tap detection: barely moved → treat as tap
//         if (Math.abs(g.dx) < 5 && Math.abs(g.dy) < 5) {
//           live.current.onTap(live.current.profile);
//           Animated.spring(position, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: true }).start();
//           return;
//         }
//         if      (g.dx >  SWIPE_THRESHOLD) doSwipeOut('right');
//         else if (g.dx < -SWIPE_THRESHOLD) doSwipeOut('left');
//         else Animated.spring(position, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: true }).start();
//       },
//     })
//   ).current;

//   const cardStyle = isTop
//     ? { transform: [...position.getTranslateTransform(), { rotate }] }
//     : { transform: [{ scale: 0.96 }], opacity: 0.85 };

//   return (
//     <Animated.View
//       style={[styles.card, cardStyle]}
//       {...(isTop ? panResponder.panHandlers : {})}
//     >
//       <Image source={{ uri: avatar }} style={styles.cardImage} resizeMode="cover" />

//       {/* LIKE stamp */}
//       <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}>
//         <Text style={[styles.stampText, { color: '#2ECC71', borderColor: '#2ECC71' }]}>LIKE</Text>
//       </Animated.View>

//       {/* NOPE stamp */}
//       <Animated.View style={[styles.stamp, styles.stampNope, { opacity: nopeOpacity }]}>
//         <Text style={[styles.stampText, { color: '#E74C3C', borderColor: '#E74C3C' }]}>NOPE</Text>
//       </Animated.View>

//       {/* SUPER stamp */}
//       <Animated.View style={[styles.stamp, styles.stampSuper, { opacity: superAnim }]}>
//         <Text style={[styles.stampText, { color: '#3498DB', borderColor: '#3498DB' }]}>SUPER</Text>
//       </Animated.View>

//       {/* Bottom info overlay */}
//       <View style={styles.cardOverlay}>
//         <View style={styles.nameRow}>
//           <Text style={styles.cardName}>{profile.name?.split(' ')[0]}</Text>
//           {age ? <Text style={styles.cardAge}> {age}</Text> : null}
//           {showBoostBadge && (profile.isVerified || profile.isBoosted) && (
//             <Text style={styles.verifiedBadge}>✔</Text>
//           )}
//           {profile.isOnline && <View style={styles.onlineDot} />}
//         </View>
//         {profile.profession && (
//           <Text style={styles.cardSub}>💼 {profile.profession}</Text>
//         )}
//         <Text style={styles.cardSub}>
//           📍 {[profile.city, profile.country].filter(Boolean).join(', ')}
//         </Text>
//         {profile.distanceKm && (
//           <Text style={styles.cardSub}>📏 {profile.distanceKm}</Text>
//         )}
//         {profile.interests?.length > 0 && (
//           <View style={styles.tagsRow}>
//             {profile.interests.slice(0, 3).map((t, i) => (
//               <View key={i} style={styles.tag}>
//                 <Text style={styles.tagText}>{t}</Text>
//               </View>
//             ))}
//           </View>
//         )}
//       </View>
//     </Animated.View>
//   );
// });

// // ══════════════════════════════════════════════════════════════════════════════
// export default function HomeScreen({ navigation }) {
//   const insets   = useSafeAreaInsets();
//   const { user } = useAuth();

//   const [showUpgrade, setShowUpgrade] = useState(false);

//   // ── Fix 6: default tab is 'top' ─────────────────────────────────────────
//   const [tab,          setTab]          = useState('top');
//   const [profiles,     setProfiles]     = useState([]);
//   const [loading,      setLoading]      = useState(true);
//   const [noMore,       setNoMore]       = useState(false);
//   const [page,         setPage]         = useState(1);
//   const [userLocation, setUserLocation] = useState(null);

//   const profilesRef = useRef(profiles);
//   const noMoreRef   = useRef(noMore);
//   const pageRef     = useRef(page);
//   const tabRef      = useRef(tab);
//   const locationRef = useRef(userLocation);
//   const fetchIdRef  = useRef(0);
//   const topCardRef  = useRef(null);   // ← imperative ref for top SwipeCard

//   useEffect(() => { profilesRef.current = profiles;     }, [profiles]);
//   useEffect(() => { noMoreRef.current   = noMore;       }, [noMore]);
//   useEffect(() => { pageRef.current     = page;         }, [page]);
//   useEffect(() => { tabRef.current      = tab;          }, [tab]);
//   useEffect(() => { locationRef.current = userLocation; }, [userLocation]);

//   // ── Location ──────────────────────────────────────────────────────────────
//   useEffect(() => { requestLocation(); }, []);

//   const requestLocation = async () => {
//     try {
//       const { status } = await Location.requestForegroundPermissionsAsync();
//       if (status !== 'granted') return;
//       const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
//       setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
//     } catch (err) {
//       console.log('📍 Location error:', err.message);
//     }
//   };

//   // ── Build params ──────────────────────────────────────────────────────────
//   const buildParams = useCallback((pageNum, currentTab, location) => {
//     const params = { page: pageNum, limit: 10, tab: currentTab };
//     if (user?.lookingFor && user.lookingFor !== 'both') params.gender = user.lookingFor;
//     if (currentTab === 'nearby' && location) {
//       params.lat = location.lat; params.lng = location.lng; params.radius = 100;
//     }
//     return params;
//   }, [user]);

//   // ── Fetch ─────────────────────────────────────────────────────────────────
//   const fetchProfiles = useCallback(async (pageNum = 1, currentTab = tab, location = userLocation, reset = true) => {
//     if (noMoreRef.current && pageNum > 1) return;
//     const fetchId = ++fetchIdRef.current;
//     if (reset) setLoading(true);
//     try {
//       const params  = buildParams(pageNum, currentTab, location);
//       const data    = await UserAPI.search(params);
//       if (fetchId !== fetchIdRef.current) return;
//       const fetched = data.users || [];
//       if (fetched.length === 0 && pageNum === 1) {
//         if (__DEV__) setProfiles(DUMMY); else setNoMore(true);
//       } else if (fetched.length === 0) {
//         setNoMore(true);
//       } else {
//         setProfiles((prev) => reset ? fetched : [...prev, ...fetched]);
//         setNoMore(!data.hasMore);
//       }
//       setPage(pageNum);
//     } catch (err) {
//       if (fetchId !== fetchIdRef.current) return;
//       if (__DEV__ && reset) setProfiles(DUMMY);
//     } finally {
//       if (fetchId === fetchIdRef.current && reset) setLoading(false);
//     }
//   }, [tab, userLocation, buildParams]);

//   useEffect(() => {
//     setProfiles([]); setPage(1); setNoMore(false);
//     fetchProfiles(1, tab, userLocation, true);
//   }, [tab, userLocation]);

//   // ── Execute action (API + advance card) ───────────────────────────────────
//   const executeAction = useCallback(async (type, profile) => {
//     setProfiles((prev) => {
//       const rest = prev.slice(1);
//       const realCount = rest.filter(p => isMongoId(p._id || p.id)).length;
//       if (rest.length <= 2 && !noMoreRef.current && realCount > 0) {
//         const nextPage = pageRef.current + 1;
//         setPage(nextPage);
//         fetchProfiles(nextPage, tabRef.current, locationRef.current, false);
//       }
//       return rest;
//     });

//     const id = profile._id || profile.id;
//     if (!isMongoId(id)) return;

//     try {
//       if (type === 'like' || type === 'super') {
//         const res = await MatchAPI.likeUser(id, type === 'super');
//         if (res?.match) {
//           navigation.navigate('MatchScreen', { matchedUser: profile, matchId: res.match._id });
//         }
//       } else if (type === 'nope') {
//         await MatchAPI.passUser(id);
//       }
//     } catch (err) {
//       console.log('❌ Action error:', err.message);
//     }
//   }, [fetchProfiles, navigation]);

//   // ── Button presses — drive the card via imperative ref ────────────────────
//   const handleButtonAction = (type) => {
//     const top = profilesRef.current[0];
//     if (!top) return;
//     if (type === 'nope')  topCardRef.current?.swipeLeft();
//     if (type === 'like')  topCardRef.current?.swipeRight();
//     if (type === 'super') topCardRef.current?.swipeUp();
//   };

//   // ── Send message from swipe deck ──────────────────────────────────────────
//   const handleSendMessage = () => {
//     const top = profilesRef.current[0];
//     if (!top) return;
//     const subActive = user?.isSubscribed &&
//       (!user.subscriptionExpiry || new Date(user.subscriptionExpiry) > new Date());
//     if (!subActive) {
//       setShowUpgrade(true);
//       return;
//     }
//     const id     = top._id || top.id;
//     const isReal = typeof id === 'string' && id.length === 24 && /^[a-f0-9]+$/i.test(id);
//     if (!isReal) return;
//     navigation.navigate(Routes.CHAT, {
//       userId:     id,
//       userName:   top.name,
//       userAvatar: top.profilePicture || top.photos?.[0],
//     });
//   };

//   const switchTab = (t) => {
//     if (t === tab) return;
//     setTab(t); setProfiles([]); setPage(1); setNoMore(false);
//   };

//   const topProfile  = profiles[0];
//   const nextProfile = profiles[1];

//   const TABS       = ['top', 'nearby', 'global', ];
//   const TAB_LABELS = {top: 'Top Profiles' , nearby: 'Nearby', global: 'Global', };

//   return (
//     <View style={styles.screen}>
//       <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

//       {/* ── Card stack ──────────────────────────────────────────────────── */}
//       <View style={styles.cardArea}>
//         {loading ? (
//           <View style={styles.center}>
//             <ActivityIndicator size="large" color="#FF4B7A" />
//             <Text style={styles.centerText}>Finding matches...</Text>
//           </View>
//         ) : profiles.length === 0 ? (
//           <View style={styles.center}>
//             <Text style={{ fontSize: 56 }}>💔</Text>
//             <Text style={styles.emptyTitle}>No more profiles</Text>
//             <Text style={styles.emptySubtitle}>
//               {tab === 'nearby' ? 'No one nearby — try Global' : 'Check back later'}
//             </Text>
//             <TouchableOpacity
//               style={styles.refreshBtn}
//               onPress={() => { setNoMore(false); setPage(1); fetchProfiles(1, tab, userLocation, true); }}
//             >
//               <Text style={styles.refreshText}>Refresh</Text>
//             </TouchableOpacity>
//             {tab === 'nearby' && (
//               <TouchableOpacity
//                 style={[styles.refreshBtn, { backgroundColor: '#5B9BD5', marginTop: 8 }]}
//                 onPress={() => switchTab('global')}
//               >
//                 <Text style={styles.refreshText}>Try Global</Text>
//               </TouchableOpacity>
//             )}
//           </View>
//         ) : (
//           <>
//             {/* Back card (peek) */}
//             {nextProfile && (
//               <SwipeCard
//                 key={nextProfile._id || nextProfile.id || 'next'}
//                 profile={nextProfile}
//                 isTop={false}
//                 showBoostBadge={tab === 'top'}
//                 onSwipeLeft={() => {}}
//                 onSwipeRight={() => {}}
//                 onSwipeSuper={() => {}}
//                 onTap={() => {}}
//               />
//             )}
//             {/* Top swipeable card */}
//             {topProfile && (
//               <SwipeCard
//                 ref={topCardRef}
//                 key={topProfile._id || topProfile.id || 'top'}
//                 profile={topProfile}
//                 isTop={true}
//                 showBoostBadge={tab === 'top'}
//                 onSwipeLeft={() => executeAction('nope', topProfile)}
//                 onSwipeRight={() => executeAction('like', topProfile)}
//                 onSwipeSuper={() => executeAction('super', topProfile)}
//                 onTap={(p) => {
//                   const id = p._id || p.id;
//                   if (isMongoId(id)) navigation.navigate(Routes.USER_PROFILE, { userId: id, profile: p });
//                 }}
//               />
//             )}
//           </>
//         )}

//         {/* ── Header overlay (on top of cards) ──────────────────────────── */}
//         <View style={[styles.header, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
//           <TouchableOpacity
//             style={styles.menuBtn}
//             onPress={() => navigation.navigate(Routes.PROFILE)}
//             activeOpacity={0.8}
//           >
//             <Text style={styles.menuIcon}>☰</Text>
//           </TouchableOpacity>

//           <View style={styles.tabRow}>
//             {TABS.map((t) => (
//               <TouchableOpacity
//                 key={t}
//                 style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
//                 onPress={() => switchTab(t)}
//                 activeOpacity={0.8}
//               >
//                 <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
//                   {TAB_LABELS[t]}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </View>
//       </View>

//       {/* ── Action buttons ───────────────────────────────────────────────── */}
//       <View style={[styles.actions, { paddingBottom: insets.bottom + 8 }]}>
//         <TouchableOpacity style={[styles.actionBtn, styles.btnMd]} onPress={() => handleButtonAction('nope')} activeOpacity={0.8}>
//           <Text style={styles.iconNope}>✕</Text>
//         </TouchableOpacity>

//         <TouchableOpacity style={[styles.actionBtn, styles.btnMd]} onPress={() => handleButtonAction('super')} activeOpacity={0.8}>
//           <Text style={styles.iconSuper}>★</Text>
//         </TouchableOpacity>

//         <TouchableOpacity style={[styles.actionBtn, styles.btnLg]} onPress={() => handleButtonAction('like')} activeOpacity={0.8}>
//           <Text style={styles.iconLike}>♥</Text>
//         </TouchableOpacity>

//         <TouchableOpacity style={[styles.actionBtn, styles.btnMsg]} onPress={handleSendMessage} activeOpacity={0.8}>
//           <Text style={styles.iconMsg}>💬</Text>
//         </TouchableOpacity>
//       </View>

//       <UpgradeModal
//         visible={showUpgrade}
//         onClose={() => setShowUpgrade(false)}
//         onSuccess={() => setShowUpgrade(false)}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   screen:   { flex: 1, backgroundColor: '#1a1a1a' },
//   cardArea: { flex: 1 },

//   card: {
//     position: 'absolute',
//     width:    W,
//     height:   '100%',
//     backgroundColor: '#222',
//   },
//   cardImage: { width: '100%', height: '100%' },

//   // ── Stamps ────────────────────────────────────────────────────────────────
//   stamp:      { position: 'absolute', top: 140, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 3 },
//   stampLike:  { left: 20,  transform: [{ rotate: '-15deg' }] },
//   stampNope:  { right: 20, transform: [{ rotate: '15deg'  }] },
//   stampSuper: { alignSelf: 'center', left: W / 2 - 70, transform: [{ rotate: '-5deg' }] },
//   stampText:  { fontSize: 26, fontWeight: '900', letterSpacing: 2 },

//   // ── Fix 5: dark overlay behind profile info ───────────────────────────────
//   cardOverlay: {
//     position: 'absolute', bottom: 0, left: 0, right: 0,
//     paddingHorizontal: 20, paddingBottom: 24, paddingTop: 10,
//     backgroundColor: 'rgba(0,0,0,0.50)',
//   },
//   nameRow:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
//   cardName:     { fontSize: 30, fontWeight: '800', color: '#fff' },
//   cardAge:      { fontSize: 28, fontWeight: '400', color: '#fff' },
//   verifiedBadge:{ fontSize: 18, color: '#3498DB', marginLeft: 6 },
//   onlineDot:    { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2ECC71', borderWidth: 2, borderColor: '#fff', marginLeft: 8 },
//   cardSub:      { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
//   tagsRow:      { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
//   tag:          { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
//   tagText:      { fontSize: 12, color: '#fff', fontWeight: '500' },

//   // ── Fix 4: header overlay — higher opacity ─────────────────────────────
//   header: {
//     position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
//     flexDirection: 'row', alignItems: 'center',
//     paddingHorizontal: 16, paddingBottom: 12,
//     backgroundColor: 'rgba(0,0,0,0.6)',
//   },
//   menuBtn: {
//     width: 40, height: 40, borderRadius: 20,
//     backgroundColor: 'rgba(255,255,255,0.2)',
//     alignItems: 'center', justifyContent: 'center',
//     marginRight: 10,
//   },
//   menuIcon:     { fontSize: 18, color: '#fff' },
//   tabRow:       { flex: 1, flexDirection: 'row', gap: 6 },
//   tabBtn:       { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)' },
//   tabBtnActive: { backgroundColor: '#FF4B7A' },
//   tabText:      { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
//   tabTextActive:{ color: '#fff' },

//   // ── Fix 3: smaller action bar ─────────────────────────────────────────────
//   actions: {
//     flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
//     gap: 16, paddingTop: 8, backgroundColor: '#fff',
//     borderTopLeftRadius: 24, borderTopRightRadius: 24,
//     ...Platform.select({
//       ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12 },
//       android: { elevation: 12 },
//     }),
//   },
//   actionBtn: {
//     alignItems: 'center', justifyContent: 'center',
//     ...Platform.select({
//       ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
//       android: { elevation: 4 },
//     }),
//   },
//   btnMd:    { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#F0E0E6' },
//   btnLg:    { width: 62, height: 62, borderRadius: 31, backgroundColor: '#FF4B7A' },
//   btnMsg:   { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#F0E0E6' },
//   iconNope: { fontSize: 22, fontWeight: '700', color: '#E74C3C' },
//   iconSuper:{ fontSize: 20, color: '#3498DB' },
//   iconLike: { fontSize: 28, color: '#fff' },
//   iconMsg:  { fontSize: 20 },

//   // ── Empty / loading states ────────────────────────────────────────────────
//   center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
//   centerText:   { fontSize: 15, color: '#aaa', marginTop: 8 },
//   emptyTitle:   { fontSize: 22, fontWeight: '700', color: '#fff' },
//   emptySubtitle:{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', paddingHorizontal: 32 },
//   refreshBtn:   { marginTop: 8, backgroundColor: '#FF4B7A', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24 },
//   refreshText:  { color: '#fff', fontWeight: '600', fontSize: 15 },
// });


import React, {
  useState, useEffect, useCallback, useRef, useImperativeHandle,
} from 'react';
import {
  View, Text, Image, StyleSheet, Dimensions,
  TouchableOpacity, ActivityIndicator, StatusBar,
  Platform, Animated, PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { UserAPI, MatchAPI } from 'services/ApiServices';
import { useAuth } from 'src/store/authStore';
import { Routes } from 'src/constants/appConstants';
import UpgradeModal from 'src/components/UpgradeModal';

const { width: W, height: H } = Dimensions.get('window');
const SWIPE_THRESHOLD = W * 0.28;

const getAge    = (dob) => !dob ? '' : Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));
const isMongoId = (id)  => typeof id === 'string' && id.length === 24 && /^[a-f0-9]+$/i.test(id);

const DUMMY = [
  { id: 'd1', name: 'Sarah',  dateOfBirth: '1999-05-10', city: 'Lagos',         country: 'Nigeria', profession: 'Photographer', interests: ['Travel', 'Yoga', 'Art'],      isOnline: true,  profilePicture: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800' },
  { id: 'd2', name: 'Emma',   dateOfBirth: '1997-08-22', city: 'Abuja',         country: 'Nigeria', profession: 'Chef',         interests: ['Cooking', 'Music', 'Dance'],  isOnline: false, profilePicture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800' },
  { id: 'd3', name: 'Olivia', dateOfBirth: '2000-01-15', city: 'Port Harcourt', country: 'Nigeria', profession: 'Engineer',     interests: ['Tech', 'Dancing', 'Coffee'],  isOnline: true,  profilePicture: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800' },
];

// Interest tag colour map
const TAG_COLOURS = [
  { bg: 'rgba(255,75,122,0.25)', border: 'rgba(255,75,122,0.5)',  text: '#FFB3C8' },
  { bg: 'rgba(99,179,237,0.25)', border: 'rgba(99,179,237,0.5)',  text: '#90CDF4' },
  { bg: 'rgba(154,117,252,0.25)',border: 'rgba(154,117,252,0.5)', text: '#D6BCFA' },
  { bg: 'rgba(72,187,120,0.25)', border: 'rgba(72,187,120,0.5)',  text: '#9AE6B4' },
  { bg: 'rgba(246,173,85,0.25)', border: 'rgba(246,173,85,0.5)',  text: '#FBD38D' },
];

// ─────────────────────────────────────────────────────────────────────────────
// SwipeCard
// ─────────────────────────────────────────────────────────────────────────────
const SwipeCard = React.forwardRef(function SwipeCard(
  { profile, onSwipeLeft, onSwipeRight, onSwipeSuper, onTap, isTop, showBoostBadge },
  ref,
) {
  const position  = useRef(new Animated.ValueXY()).current;
  const superAnim = useRef(new Animated.Value(0)).current;

  const live = useRef({ onSwipeLeft, onSwipeRight, onSwipeSuper, onTap, isTop, profile });
  live.current = { onSwipeLeft, onSwipeRight, onSwipeSuper, onTap, isTop, profile };

  const avatar = profile.profilePicture || profile.photos?.[0]
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&size=800&background=FF4D6D&color=fff`;
  const age = profile.age || getAge(profile.dateOfBirth);

  // ── Interpolations ────────────────────────────────────────────────────────
  const rotate = position.x.interpolate({
    inputRange: [-W / 2, 0, W / 2],
    outputRange: ['-18deg', '0deg', '18deg'],
    extrapolate: 'clamp',
  });
  const likeOpacity = position.x.interpolate({
    inputRange: [20, W * 0.3],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const nopeOpacity = position.x.interpolate({
    inputRange: [-W * 0.3, -20],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  // Back card scales up slightly as top card is dragged
  const backScale = position.x.interpolate({
    inputRange: [-W * 0.5, 0, W * 0.5],
    outputRange: [1, 0.95, 1],
    extrapolate: 'clamp',
  });

  const doSwipeOut = useRef((direction) => {
    if (direction === 'up') {
      Animated.timing(superAnim, { toValue: 1, duration: 100, useNativeDriver: true }).start();
      Animated.timing(position, {
        toValue: { x: 0, y: -H * 1.5 },
        duration: 320,
        useNativeDriver: true,
      }).start(() => {
        position.setValue({ x: 0, y: 0 });
        superAnim.setValue(0);
        live.current.onSwipeSuper?.();
      });
      return;
    }
    const x = direction === 'right' ? W * 1.5 : -W * 1.5;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      if (direction === 'right') live.current.onSwipeRight();
      else                       live.current.onSwipeLeft();
    });
  }).current;

  useImperativeHandle(ref, () => ({
    swipeLeft:  () => doSwipeOut('left'),
    swipeRight: () => doSwipeOut('right'),
    swipeUp:    () => doSwipeOut('up'),
  }));

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: ()     => live.current.isTop,
      onMoveShouldSetPanResponder:  (_, g) => live.current.isTop && (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3),
      onPanResponderMove:   (_, g) => position.setValue({ x: g.dx, y: g.dy }),
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) < 5 && Math.abs(g.dy) < 5) {
          live.current.onTap(live.current.profile);
          Animated.spring(position, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: true }).start();
          return;
        }
        if      (g.dx >  SWIPE_THRESHOLD) doSwipeOut('right');
        else if (g.dx < -SWIPE_THRESHOLD) doSwipeOut('left');
        else Animated.spring(position, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: true }).start();
      },
    })
  ).current;

  const cardStyle = isTop
    ? { transform: [...position.getTranslateTransform(), { rotate }] }
    : { transform: [{ scale: 0.95 }] };

  return (
    <Animated.View
      style={[styles.card, cardStyle]}
      {...(isTop ? panResponder.panHandlers : {})}
    >
      {/* Full-bleed photo */}
      <Image source={{ uri: avatar }} style={styles.cardImage} resizeMode="cover" />

      {/* Cinematic gradient overlay — two layered views */}
      <View style={styles.gradientOverlayTop} />
      <View style={styles.gradientOverlayBottom} />

      {/* LIKE stamp */}
      <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}>
        <Text style={[styles.stampText, { color: '#2ECC71', borderColor: '#2ECC71' }]}>LIKE</Text>
      </Animated.View>

      {/* NOPE stamp */}
      <Animated.View style={[styles.stamp, styles.stampNope, { opacity: nopeOpacity }]}>
        <Text style={[styles.stampText, { color: '#FF4B7A', borderColor: '#FF4B7A' }]}>NOPE</Text>
      </Animated.View>

      {/* SUPER stamp */}
      <Animated.View style={[styles.stamp, styles.stampSuper, { opacity: superAnim }]}>
        <Text style={[styles.stampText, { color: '#63B3ED', borderColor: '#63B3ED' }]}>SUPER</Text>
      </Animated.View>

      {/* ── Profile info ── */}
      <View style={styles.cardInfo}>

        {/* Name + age row */}
        <View style={styles.nameRow}>
          <Text style={styles.cardName}>
            {profile.name?.split(' ')[0]}
          </Text>
          {age ? (
            <View style={styles.agePill}>
              <Text style={styles.agePillText}>{age}</Text>
            </View>
          ) : null}
          {showBoostBadge && (profile.isVerified || profile.isBoosted) && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>✓</Text>
            </View>
          )}
          {profile.isOnline && (
            <View style={styles.onlineWrap}>
              <View style={styles.onlineDot} />
            </View>
          )}
        </View>

        {/* Profession */}
        {profile.profession ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>💼</Text>
            <Text style={styles.infoText}>{profile.profession}</Text>
          </View>
        ) : null}

        {/* Location */}
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📍</Text>
          <Text style={styles.infoText}>
            {[profile.city, profile.country].filter(Boolean).join(', ')}
            {profile.distanceKm ? `  ·  ${profile.distanceKm}` : ''}
          </Text>
        </View>

        {/* Interest tags */}
        {profile.interests?.length > 0 && (
          <View style={styles.tagsRow}>
            {profile.interests.slice(0, 3).map((tag, i) => {
              const c = TAG_COLOURS[i % TAG_COLOURS.length];
              return (
                <View key={i} style={[styles.tag, { backgroundColor: c.bg, borderColor: c.border }]}>
                  <Text style={[styles.tagText, { color: c.text }]}>{tag}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </Animated.View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// HomeScreen
// ─────────────────────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const insets   = useSafeAreaInsets();
  const { user } = useAuth();

  const [showUpgrade, setShowUpgrade] = useState(false);
  const [tab,          setTab]        = useState('nearby');
  const [profiles,     setProfiles]   = useState([]);
  const [loading,      setLoading]    = useState(true);
  const [noMore,       setNoMore]     = useState(false);
  const [page,         setPage]       = useState(1);
  const [userLocation, setUserLocation] = useState(null);

  const profilesRef = useRef(profiles);
  const noMoreRef   = useRef(noMore);
  const pageRef     = useRef(page);
  const tabRef      = useRef(tab);
  const locationRef = useRef(userLocation);
  const fetchIdRef  = useRef(0);
  const topCardRef  = useRef(null);

  useEffect(() => { profilesRef.current = profiles;     }, [profiles]);
  useEffect(() => { noMoreRef.current   = noMore;       }, [noMore]);
  useEffect(() => { pageRef.current     = page;         }, [page]);
  useEffect(() => { tabRef.current      = tab;          }, [tab]);
  useEffect(() => { locationRef.current = userLocation; }, [userLocation]);

  useEffect(() => { requestLocation(); }, []);

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch (err) {
      console.log('📍 Location error:', err.message);
    }
  };

  const buildParams = useCallback((pageNum, currentTab, location) => {
    const params = { page: pageNum, limit: 10, tab: currentTab };
    if (user?.lookingFor && user.lookingFor !== 'both') params.gender = user.lookingFor;
    if (currentTab === 'nearby' && location) {
      params.lat = location.lat; params.lng = location.lng; params.radius = 100;
    }
    return params;
  }, [user]);

  const fetchProfiles = useCallback(async (pageNum = 1, currentTab = tab, location = userLocation, reset = true) => {
    if (noMoreRef.current && pageNum > 1) return;
    const fetchId = ++fetchIdRef.current;
    if (reset) setLoading(true);
    try {
      const params  = buildParams(pageNum, currentTab, location);
      const data    = await UserAPI.search(params);
      if (fetchId !== fetchIdRef.current) return;
      const fetched = data.users || [];
      if (fetched.length === 0 && pageNum === 1) {
        if (__DEV__) setProfiles(DUMMY); else setNoMore(true);
      } else if (fetched.length === 0) {
        setNoMore(true);
      } else {
        setProfiles((prev) => reset ? fetched : [...prev, ...fetched]);
        setNoMore(!data.hasMore);
      }
      setPage(pageNum);
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return;
      if (__DEV__ && reset) setProfiles(DUMMY);
    } finally {
      if (fetchId === fetchIdRef.current && reset) setLoading(false);
    }
  }, [tab, userLocation, buildParams]);

  useEffect(() => {
    setProfiles([]); setPage(1); setNoMore(false);
    fetchProfiles(1, tab, userLocation, true);
  }, [tab, userLocation]);

  const executeAction = useCallback(async (type, profile) => {
    setProfiles((prev) => {
      const rest = prev.slice(1);
      const realCount = rest.filter(p => isMongoId(p._id || p.id)).length;
      if (rest.length <= 2 && !noMoreRef.current && realCount > 0) {
        const nextPage = pageRef.current + 1;
        setPage(nextPage);
        fetchProfiles(nextPage, tabRef.current, locationRef.current, false);
      }
      return rest;
    });

    const id = profile._id || profile.id;
    if (!isMongoId(id)) return;

    try {
      if (type === 'like' || type === 'super') {
        const res = await MatchAPI.likeUser(id, type === 'super');
        if (res?.match) {
          navigation.navigate('MatchScreen', { matchedUser: profile, matchId: res.match._id });
        }
      } else if (type === 'nope') {
        await MatchAPI.passUser(id);
      }
    } catch (err) {
      console.log('❌ Action error:', err.message);
    }
  }, [fetchProfiles, navigation]);

  const handleButtonAction = (type) => {
    const top = profilesRef.current[0];
    if (!top) return;
    if (type === 'nope')  topCardRef.current?.swipeLeft();
    if (type === 'like')  topCardRef.current?.swipeRight();
    if (type === 'super') topCardRef.current?.swipeUp();
  };

  const handleSendMessage = () => {
    const top = profilesRef.current[0];
    if (!top) return;
    const subActive = user?.isSubscribed &&
      (!user.subscriptionExpiry || new Date(user.subscriptionExpiry) > new Date());
    if (!subActive) { setShowUpgrade(true); return; }
    const id     = top._id || top.id;
    const isReal = typeof id === 'string' && id.length === 24 && /^[a-f0-9]+$/i.test(id);
    if (!isReal) return;
    navigation.navigate(Routes.CHAT, {
      userId:     id,
      userName:   top.name,
      userAvatar: top.profilePicture || top.photos?.[0],
    });
  };

  const switchTab = (t) => {
    if (t === tab) return;
    setTab(t); setProfiles([]); setPage(1); setNoMore(false);
  };

  const topProfile  = profiles[0];
  const nextProfile = profiles[1];

  const TABS       = ['top', 'nearby', 'global'];
  const TAB_LABELS = { top: '✦ Top', nearby: '📍 Nearby', global: '🌍 Global' };

  // ── User avatar pill (header left) ─────────────────────────────────────
  const myAvatar = user?.profilePicture || user?.photos?.[0];
  const myInitial = (user?.name || 'U')[0].toUpperCase();

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Card stack ──────────────────────────────────────────────────── */}
      <View style={styles.cardArea}>

        {loading ? (
          <View style={styles.center}>
            <View style={styles.loadingLogoWrap}>
              <Text style={styles.loadingLogo}>♥</Text>
            </View>
            <ActivityIndicator size="large" color="#FF4B7A" style={{ marginTop: 24 }} />
            <Text style={styles.centerText}>Finding your matches…</Text>
          </View>
        ) : profiles.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyIconWrap}>
              <Text style={styles.emptyIconText}>💔</Text>
            </View>
            <Text style={styles.emptyTitle}>You've seen everyone</Text>
            <Text style={styles.emptySubtitle}>
              {tab === 'nearby'
                ? 'Nobody nearby right now — try going global!'
                : 'New people are joining every day. Check back soon!'}
            </Text>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => { setNoMore(false); setPage(1); fetchProfiles(1, tab, userLocation, true); }}
            >
              <Text style={styles.refreshText}>↺  Refresh</Text>
            </TouchableOpacity>
            {tab === 'nearby' && (
              <TouchableOpacity
                style={[styles.refreshBtn, styles.refreshBtnAlt]}
                onPress={() => switchTab('global')}
              >
                <Text style={styles.refreshText}>🌍  Try Global</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {nextProfile && (
              <SwipeCard
                key={nextProfile._id || nextProfile.id || 'next'}
                profile={nextProfile}
                isTop={false}
                showBoostBadge={tab === 'top'}
                onSwipeLeft={() => {}}
                onSwipeRight={() => {}}
                onSwipeSuper={() => {}}
                onTap={() => {}}
              />
            )}
            {topProfile && (
              <SwipeCard
                ref={topCardRef}
                key={topProfile._id || topProfile.id || 'top'}
                profile={topProfile}
                isTop={true}
                showBoostBadge={tab === 'top'}
                onSwipeLeft={() => executeAction('nope', topProfile)}
                onSwipeRight={() => executeAction('like', topProfile)}
                onSwipeSuper={() => executeAction('super', topProfile)}
                onTap={(p) => {
                  const id = p._id || p.id;
                  if (isMongoId(id)) navigation.navigate(Routes.USER_PROFILE, { userId: id, profile: p });
                }}
              />
            )}
          </>
        )}

        {/* ── Header overlay ──────────────────────────────────────────── */}
        <View
          style={[styles.header, { paddingTop: insets.top + 6 }]}
          pointerEvents="box-none"
        >
          {/* My avatar → navigate to profile */}
          <TouchableOpacity
            style={styles.myAvatarBtn}
            onPress={() => navigation.navigate(Routes.PROFILE)}
            activeOpacity={0.85}
          >
            {myAvatar
              ? <Image source={{ uri: myAvatar }} style={styles.myAvatarImg} />
              : (
                <View style={styles.myAvatarFallback}>
                  <Text style={styles.myAvatarInitial}>{myInitial}</Text>
                </View>
              )}
            {/* Active ring */}
            <View style={styles.myAvatarRing} />
          </TouchableOpacity>

          {/* Filter / notification icon */}
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => navigation.navigate(Routes.PROFILE)}
            activeOpacity={0.85}
          >
            <Text style={styles.filterIcon}>⚙︎</Text>
          </TouchableOpacity>
        </View>

        {/* ── Tab pills — centred below header ────────────────────────── */}
        {!loading && (
          <View
            style={[styles.tabRowWrap, { top: insets.top + 58 }]}
            pointerEvents="box-none"
          >
            <View style={styles.tabPillBar}>
              {TABS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tabPill, tab === t && styles.tabPillActive]}
                  onPress={() => switchTab(t)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabPillText, tab === t && styles.tabPillTextActive]}>
                    {TAB_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* ── Action bar ──────────────────────────────────────────────────── */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 2 }]}>

        {/* Floating pill of buttons */}
        <View style={styles.btnRow}>
          {/* Nope */}
          <TouchableOpacity
            style={[styles.circleBtn, styles.btnNope]}
            onPress={() => handleButtonAction('nope')}
            activeOpacity={0.8}
          >
            <Text style={styles.iconNope}>✕</Text>
          </TouchableOpacity>

          {/* Super like */}
          <TouchableOpacity
            style={[styles.circleBtn, styles.btnSuper]}
            onPress={() => handleButtonAction('super')}
            activeOpacity={0.8}
          >
            <Text style={styles.iconSuper}>★</Text>
          </TouchableOpacity>

          {/* Like — primary, larger */}
          <TouchableOpacity
            style={[styles.circleBtn, styles.btnLike]}
            onPress={() => handleButtonAction('like')}
            activeOpacity={0.8}
          >
            <Text style={styles.iconLike}>♥</Text>
          </TouchableOpacity>

          {/* Message */}
          <TouchableOpacity
            style={[styles.circleBtn, styles.btnMsg]}
            onPress={handleSendMessage}
            activeOpacity={0.8}
          >
            <Text style={styles.iconMsg}>✉</Text>
          </TouchableOpacity>
        </View>
      </View>

      <UpgradeModal
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onSuccess={() => setShowUpgrade(false)}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  screen:   { flex: 1, backgroundColor: '#0D0D0D' },
  cardArea: { flex: 1 },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    position: 'absolute',
    width: W,
    height: '100%',
    overflow: 'hidden',
    borderRadius: 0,
    backgroundColor: '#111',
  },
  cardImage: { width: '100%', height: '100%' },

  // Top vignette (darkens sky so header text reads)
  gradientOverlayTop: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: H * 0.38,
    backgroundColor: 'transparent',
    // Simulated gradient via opacity layers
    opacity: 0.75,
    background: 'linear-gradient(to bottom, #000, transparent)', // web only fallback
    // On RN we stack two views
  },
  // Bottom gradient — rich, multi-stop feel
  gradientOverlayBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: H * 0.52,
    backgroundColor: 'rgba(0,0,0,0.15)',
    // Fade the top edge of this overlay
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },

  // ── Stamps ────────────────────────────────────────────────────────────────
  stamp: {
    position: 'absolute', top: H * 0.18,
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 6, borderWidth: 3,
  },
  stampLike:  { left: 24,  transform: [{ rotate: '-18deg' }] },
  stampNope:  { right: 24, transform: [{ rotate: '18deg'  }] },
  stampSuper: { alignSelf: 'center', left: W / 2 - 72, transform: [{ rotate: '-4deg' }] },
  stampText:  { fontSize: 28, fontWeight: '900', letterSpacing: 3 },

  // ── Card info overlay ─────────────────────────────────────────────────────
  cardInfo: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 22,
    paddingBottom: 28,
    paddingTop: 16,
  },
  nameRow: {
    flexDirection: 'row', alignItems: 'center',
    flexWrap: 'wrap', gap: 8, marginBottom: 6,
  },
  cardName: {
    fontSize: 34, fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  agePill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  agePillText: { fontSize: 17, fontWeight: '600', color: '#fff' },

  verifiedBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#3498DB',
    alignItems: 'center', justifyContent: 'center',
  },
  verifiedBadgeText: { fontSize: 12, fontWeight: '900', color: '#fff' },

  onlineWrap: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2, borderColor: '#fff',
    backgroundColor: '#2ECC71',
    marginLeft: 2,
  },
  onlineDot: { flex: 1, borderRadius: 10 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  infoIcon:{ fontSize: 13 },
  infoText: {
    fontSize: 14, color: 'rgba(255,255,255,0.88)', fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  tagsRow:  { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  tag: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  tagText: { fontSize: 12, fontWeight: '600' },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 10,
  },

  // My avatar
  myAvatarBtn: { width: 42, height: 42, position: 'relative' },
  myAvatarImg: {
    width: 42, height: 42, borderRadius: 21,
    borderWidth: 2, borderColor: '#FF4B7A',
  },
  myAvatarFallback: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#FF4B7A',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,75,122,0.5)',
  },
  myAvatarInitial: { fontSize: 18, fontWeight: '800', color: '#fff' },
  myAvatarRing: {
    position: 'absolute', inset: -3,
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2, borderColor: 'rgba(255,75,122,0.4)',
    top: -3, left: -3,
  },

  // Brand wordmark
  brandMark: {
    fontSize: 26, fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
    textShadowColor: 'rgba(255,75,122,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },

  // Filter button
  filterBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  filterIcon: { fontSize: 20, color: '#fff' },

  // ── Tab pills ─────────────────────────────────────────────────────────────
  tabRowWrap: {
    position: 'absolute', left: 0, right: 0, zIndex: 15,
    alignItems: 'center',
  },
  tabPillBar: {
    flexDirection: 'row', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tabPill: {
    paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: 20,
  },
  tabPillActive: {
    backgroundColor: '#FF4B7A',
    ...Platform.select({
      ios:     { shadowColor: '#FF4B7A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.5, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  tabPillText:       { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.65)' },
  tabPillTextActive: { color: '#fff' },

  // ── Action bar ────────────────────────────────────────────────────────────
  // Was tall enough (paddingTop 16 + a 68px Like button + inset padding, ~110-
  // 130px total) that it visibly ate into the card image above it. Shrunk to
  // sit around ~70px tall (smaller buttons/icons, tighter padding) and made
  // semi-transparent instead of solid black, so it reads as an overlay rather
  // than a slab covering the photo.
  actionBar: {
    backgroundColor: 'rgba(13,13,13,0.7)',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },

  circleBtn: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 100,
    ...Platform.select({
      ios:     { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },

  // Nope — white with red tint border
  btnNope: {
    width: 38, height: 38,
    backgroundColor: 'rgba(26,26,26,0.75)',
    borderWidth: 1.5,
    borderColor: 'rgba(231,76,60,0.4)',
    ...Platform.select({ ios: { shadowColor: '#E74C3C' }, android: {} }),
  },
  // Super — white with blue tint
  btnSuper: {
    width: 34, height: 34,
    backgroundColor: 'rgba(26,26,26,0.75)',
    borderWidth: 1.5,
    borderColor: 'rgba(99,179,237,0.4)',
    ...Platform.select({ ios: { shadowColor: '#63B3ED' }, android: {} }),
  },
  // Like — primary gradient-like (solid pink)
  btnLike: {
    width: 44, height: 44,
    backgroundColor: '#FF4B7A',
    borderWidth: 0,
    ...Platform.select({ ios: { shadowColor: '#FF4B7A' }, android: {} }),
  },
  // Message
  btnMsg: {
    width: 38, height: 38,
    backgroundColor: 'rgba(26,26,26,0.75)',
    borderWidth: 1.5,
    borderColor: 'rgba(154,117,252,0.4)',
    ...Platform.select({ ios: { shadowColor: '#9A75FC' }, android: {} }),
  },

  iconNope:  { fontSize: 15, fontWeight: '800', color: '#E74C3C' },
  iconSuper: { fontSize: 13, color: '#63B3ED', fontWeight: '700' },
  iconLike:  { fontSize: 20, color: '#fff' },
  iconMsg:   { fontSize: 13, color: '#9A75FC' },

  // ── Loading / empty states ─────────────────────────────────────────────────
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14,
    backgroundColor: '#0D0D0D',
  },
  loadingLogoWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,75,122,0.15)',
    borderWidth: 2, borderColor: 'rgba(255,75,122,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  loadingLogo:    { fontSize: 36, color: '#FF4B7A' },
  centerText:     { fontSize: 15, color: 'rgba(255,255,255,0.45)', marginTop: 4 },

  emptyIconWrap: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,75,122,0.1)',
    borderWidth: 2, borderColor: 'rgba(255,75,122,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  emptyIconText:    { fontSize: 44 },
  emptyTitle:       { fontSize: 24, fontWeight: '800', color: '#fff' },
  emptySubtitle:    {
    fontSize: 14, color: 'rgba(255,255,255,0.45)',
    textAlign: 'center', paddingHorizontal: 40, lineHeight: 20,
  },
  refreshBtn: {
    marginTop: 6,
    backgroundColor: '#FF4B7A',
    paddingHorizontal: 36, paddingVertical: 13,
    borderRadius: 28,
    ...Platform.select({
      ios:     { shadowColor: '#FF4B7A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10 },
      android: { elevation: 6 },
    }),
  },
  refreshBtnAlt: { backgroundColor: '#2D3748', marginTop: 10 },
  refreshText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
});
