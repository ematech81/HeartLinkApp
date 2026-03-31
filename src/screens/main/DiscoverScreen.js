
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Modal, SafeAreaView, Dimensions, FlatList,
  ImageBackground, ActivityIndicator, StatusBar, Image,
} from 'react-native';
import { Search, ChevronRight, ArrowLeft, MapPin, Briefcase, Church, X, Heart } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from 'src/constants/Colors';
import { Routes } from 'src/constants/appConstants';
import { UserAPI, MatchAPI } from 'services/ApiServices';
import { useAuth } from 'src/store/authStore';

const { width, height } = Dimensions.get('window');

const getAge = (dob) => !dob ? null : Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));

// ── Categories config ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: '1', title: 'Singles',        icon: '❤️',  bgImage: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400', filter: { relationshipType: 'single'        } },
  { id: '2', title: 'Single Mothers', icon: '👩‍👦', bgImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', filter: { relationshipType: 'single_mother' } },
  { id: '3', title: 'Single Fathers', icon: '👨‍👦', bgImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400', filter: { relationshipType: 'single_father' } },
  { id: '4', title: 'Christians',     icon: '✝️',  bgImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400', filter: { religion: 'christianity'          } },
  { id: '5', title: 'Muslims',        icon: '🌙',  bgImage: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400', filter: { religion: 'islam'                 } },
  { id: '6', title: 'Professionals',  icon: '💼',  bgImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', filter: { profession: 'any'                 } },
];

// ══════════════════════════════════════════════════════════════════════════════
// Category swipeable modal — shows real users from that category
// ══════════════════════════════════════════════════════════════════════════════
function CategoryModal({ visible, category, onClose, onLike, onViewProfile }) {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [liked,   setLiked]   = useState({});

  useEffect(() => {
    if (!visible || !category) return;
    fetchCategoryUsers();
  }, [visible, category]);

  const fetchCategoryUsers = async () => {
    setLoading(true);
    setUsers([]);
    try {
      const params = { page: 1, limit: 20, ...category.filter };
      if (params.profession === 'any') delete params.profession;
      const data = await UserAPI.search(params);
      setUsers(data.users || []);
    } catch (err) {
      console.log('❌ [CategoryModal] fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (user) => {
    const id = user._id || user.id;
    setLiked((prev) => ({ ...prev, [id]: true }));
    await onLike(user);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.categoryModalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.swippableContent}>
          {/* Modal header */}
          <View style={styles.swippableHeader}>
            <Text style={styles.swippableTitle}>{category?.title}</Text>
            <TouchableOpacity style={styles.closeCircle} onPress={onClose}>
              <X size={22} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.modalCenter}>
              <ActivityIndicator size="large" color={Colors.white} />
              <Text style={styles.modalLoadingText}>Finding people...</Text>
            </View>
          ) : users.length === 0 ? (
            <View style={styles.modalCenter}>
              <Text style={styles.modalEmptyEmoji}>😕</Text>
              <Text style={styles.modalEmptyText}>No profiles found in this category yet.</Text>
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item) => item._id || item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={width * 0.9}
              decelerationRate="fast"
              contentContainerStyle={styles.swippableList}
              renderItem={({ item }) => {
                const avatar = item.profilePicture || item.photos?.[0]
                  || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=FF4D6D&color=fff&size=400`;
                const age     = item.age || getAge(item.dateOfBirth);
                const id      = item._id || item.id;
                const isLiked = liked[id];

                return (
                  <TouchableOpacity
                    style={styles.personCard}
                    onPress={() => onViewProfile(item)}
                    activeOpacity={0.95}
                  >
                    <ImageBackground
                      source={{ uri: avatar }}
                      style={styles.personImage}
                      imageStyle={styles.personImageRadius}
                    >
                      <View style={styles.personOverlay}>
                        <View>
                          <Text style={styles.personName}>{item.name}{age ? `, ${age}` : ''}</Text>
                          {item.profession && (
                            <Text style={styles.personProfession}>💼 {item.profession}</Text>
                          )}
                          {(item.city || item.country) && (
                            <View style={styles.locationRow}>
                              <MapPin size={14} color={Colors.white} />
                              <Text style={styles.personLocation}>
                                {[item.city, item.country].filter(Boolean).join(', ')}
                              </Text>
                            </View>
                          )}
                        </View>
                        <TouchableOpacity
                          style={[styles.likeButton, isLiked && styles.likeButtonActive]}
                          onPress={() => handleLike(item)}
                        >
                          <Heart size={26} color={Colors.white} fill={isLiked ? Colors.white : 'transparent'} />
                        </TouchableOpacity>
                      </View>
                    </ImageBackground>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Filter Modal
// ══════════════════════════════════════════════════════════════════════════════
function FilterModal({ visible, filters, onApply, onClose }) {
  const [local, setLocal] = useState(filters);
  const update = (key, val) => setLocal((prev) => ({ ...prev, [key]: val }));

  const handleApply = () => { onApply(local); onClose(); };
  const handleReset = () => {
    const empty = { gender: null, relationshipType: null, religion: null, education: null, profession: '', country: '', city: '', minAge: null, maxAge: null };
    setLocal(empty); onApply(empty); onClose();
  };

  const AGE_RANGES = [
    { label: 'Any', min: null, max: null },
    { label: '18–24', min: 18, max: 24 },
    { label: '25–30', min: 25, max: 30 },
    { label: '31–40', min: 31, max: 40 },
    { label: '41–50', min: 41, max: 50 },
    { label: '50+',   min: 50, max: null },
  ];

  const selectedAgeLabel = AGE_RANGES.find(
    (r) => r.min === local.minAge && r.max === local.maxAge
  )?.label || 'Any';

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Filters</Text>
          <TouchableOpacity onPress={handleReset}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>

          {/* Location */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Country</Text>
            <View style={styles.inputContainer}>
              <Search size={18} color={Colors.primary} style={{ marginRight: 10 }} />
              <TextInput
                placeholder="e.g. Nigeria"
                style={styles.textInput}
                value={local.country || ''}
                onChangeText={(v) => update('country', v)}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>City</Text>
            <View style={styles.inputContainer}>
              <MapPin size={18} color={Colors.primary} style={{ marginRight: 10 }} />
              <TextInput
                placeholder="e.g. Lagos"
                style={styles.textInput}
                value={local.city || ''}
                onChangeText={(v) => update('city', v)}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Gender */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Gender</Text>
            <View style={styles.toggleRow}>
              {['male', 'female', 'both'].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.toggleButton, local.gender === item && styles.toggleButtonActive]}
                  onPress={() => update('gender', local.gender === item ? null : item)}
                >
                  <Text style={[styles.toggleText, local.gender === item && styles.toggleTextActive]}>
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Age Range */}
          <View style={styles.filterSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.filterLabel}>Age Range</Text>
              <Text style={styles.valueText}>{selectedAgeLabel}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {AGE_RANGES.map((r) => (
                <TouchableOpacity
                  key={r.label}
                  style={[styles.chip, selectedAgeLabel === r.label && styles.chipActive]}
                  onPress={() => { update('minAge', r.min); update('maxAge', r.max); }}
                >
                  <Text style={[styles.chipText, selectedAgeLabel === r.label && styles.chipTextActive]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Relationship Type */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Relationship Type</Text>
            <View style={styles.chipRow}>
              {['single', 'single_mother', 'single_father'].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, local.relationshipType === item && styles.chipActive]}
                  onPress={() => update('relationshipType', local.relationshipType === item ? null : item)}
                >
                  <Text style={[styles.chipText, local.relationshipType === item && styles.chipTextActive]}>
                    {item.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Advanced filters */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Advanced Filters</Text>

            {/* Profession */}
            <View style={styles.inputContainer}>
              <Briefcase size={18} color={Colors.primary} style={{ marginRight: 10 }} />
              <TextInput
                placeholder="Profession (e.g. Doctor)"
                style={styles.textInput}
                value={local.profession || ''}
                onChangeText={(v) => update('profession', v)}
                autoCapitalize="words"
              />
            </View>

            <View style={{ height: 12 }} />

            {/* Religion */}
            <View style={styles.chipRow}>
              {['christianity', 'islam', 'hinduism', 'buddhism', 'agnostic', 'other'].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, local.religion === item && styles.chipActive]}
                  onPress={() => update('religion', local.religion === item ? null : item)}
                >
                  <Text style={[styles.chipText, local.religion === item && styles.chipTextActive]}>
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply} activeOpacity={0.85}>
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DiscoverScreen
// ══════════════════════════════════════════════════════════════════════════════
export default function DiscoverScreen({ navigation }) {
  const insets      = useSafeAreaInsets();
  const { user: me } = useAuth();

  const [searchQuery,       setSearchQuery]       = useState('');
  const [isFilterVisible,   setIsFilterVisible]   = useState(false);
  const [categoryModal,     setCategoryModal]     = useState(null); // selected category object
  const [searchResults,     setSearchResults]     = useState([]);
  const [searchLoading,     setSearchLoading]     = useState(false);
  const [isSearchMode,      setIsSearchMode]      = useState(false);
  const [page,              setPage]              = useState(1);
  const [hasMore,           setHasMore]           = useState(true);
  const [filters,           setFilters]           = useState({
    gender: null, relationshipType: null, religion: null,
    education: null, profession: '', country: '', city: '',
    minAge: null, maxAge: null,
  });

  const searchTimeout = useRef(null);

  // ── Build search params ───────────────────────────────────────────────────
  const buildParams = useCallback((pageNum = 1, query = searchQuery) => {
    const params = { page: pageNum, limit: 20 };
    if (query.trim())               params.profession    = query.trim();
    if (filters.gender)             params.gender        = filters.gender;
    if (filters.relationshipType)   params.relationshipType = filters.relationshipType;
    if (filters.religion)           params.religion      = filters.religion;
    if (filters.education)          params.education     = filters.education;
    if (filters.profession?.trim()) params.profession    = filters.profession.trim();
    if (filters.country?.trim())    params.country       = filters.country.trim();
    if (filters.city?.trim())       params.city          = filters.city.trim();
    if (filters.minAge)             params.minAge        = filters.minAge;
    if (filters.maxAge)             params.maxAge        = filters.maxAge;
    return params;
  }, [searchQuery, filters]);

  // ── Search ────────────────────────────────────────────────────────────────
  const doSearch = useCallback(async (pageNum = 1, query = searchQuery, reset = true) => {
    setSearchLoading(true);
    setIsSearchMode(true);
    try {
      const data    = await UserAPI.search(buildParams(pageNum, query));
      const fetched = data.users || [];
      if (reset) setSearchResults(fetched);
      else       setSearchResults((prev) => [...prev, ...fetched]);
      setHasMore(data.hasMore ?? fetched.length === 20);
      setPage(pageNum);
    } catch (err) {
      console.log('❌ [Discover]', err.message);
    } finally {
      setSearchLoading(false);
    }
  }, [buildParams, searchQuery]);

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (!text.trim()) { setIsSearchMode(false); setSearchResults([]); return; }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => doSearch(1, text, true), 500);
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    const hasActiveFilters = Object.values(newFilters).some(Boolean);
    if (hasActiveFilters || searchQuery.trim()) {
      setIsSearchMode(true);
      setTimeout(() => doSearch(1, searchQuery, true), 100);
    } else {
      // No filters and no search — go back to categories
      setIsSearchMode(false);
      setSearchResults([]);
    }
  };

  const handleLoadMore = () => {
    if (!searchLoading && hasMore) doSearch(page + 1, searchQuery, false);
  };

  // ── Like a user ───────────────────────────────────────────────────────────
  const handleLike = async (user) => {
    const id = user._id || user.id;
    try {
      const res = await MatchAPI.likeUser(id, false);
      if (res?.match) {
        setCategoryModal(null);
        navigation.navigate('MatchScreen', {
          matchedUser: user,
          matchId:     res.match._id,
        });
      }
    } catch (err) {
      console.log('❌ [Discover] Like error:', err.message);
    }
  };

  // ── Open profile ──────────────────────────────────────────────────────────
  const openProfile = (user) => {
    setCategoryModal(null);
    navigation.navigate(Routes.USER_PROFILE, {
      userId:  user._id || user.id,
      profile: user,
    });
  };

  // ── Category card ─────────────────────────────────────────────────────────
  const CategoryCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setCategoryModal(item)}
      activeOpacity={0.85}
    >
      <ImageBackground
        source={{ uri: item.bgImage }}
        style={styles.cardBackground}
        imageStyle={styles.cardImage}
      >
        <View style={styles.cardOverlay}>
          <Text style={styles.cardIcon}>{item.icon}</Text>
          <Text style={styles.cardTitle}>{item.title}</Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

  // ── Search result card ────────────────────────────────────────────────────
  const SearchResultCard = ({ item }) => {
    const avatar = item.profilePicture || item.photos?.[0]
      || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=FF4D6D&color=fff&size=300`;
    const age = item.age || getAge(item.dateOfBirth);

    return (
      <TouchableOpacity style={styles.searchCard} onPress={() => openProfile(item)} activeOpacity={0.88}>
        <Image source={{ uri: avatar }} style={styles.searchCardImage} />
        {item.isOnline && <View style={styles.onlineDot} />}
        <View style={styles.searchCardOverlay}>
          <Text style={styles.searchCardName} numberOfLines={1}>
            {item.name}{age ? `, ${age}` : ''}
          </Text>
          {item.profession && (
            <Text style={styles.searchCardSub} numberOfLines={1}>💼 {item.profession}</Text>
          )}
          {(item.city || item.country) && (
            <Text style={styles.searchCardSub} numberOfLines={1}>
              📍 {[item.city, item.country].filter(Boolean).join(', ')}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const CARD_W = (width - 60) / 2;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* ── Header & Search ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {isSearchMode && (
            <TouchableOpacity
              style={styles.backToCategories}
              onPress={() => {
                setIsSearchMode(false);
                setSearchResults([]);
                setSearchQuery('');
              }}
            >
              <ArrowLeft size={22} color={Colors.primary} />
            </TouchableOpacity>
          )}
          <Text style={styles.title}>
            {isSearchMode ? 'Search Results' : 'Discover'}
          </Text>
        </View>

        <View style={styles.searchRow}>
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => {}}
            activeOpacity={1}
          >
            <Search size={20} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or profession..."
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={handleSearchChange}
              returnKeyType="search"
              onSubmitEditing={() => doSearch(1, searchQuery, true)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setIsSearchMode(false); setSearchResults([]); }}>
                <X size={18} color={Colors.textLight} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterIconBtn} onPress={() => setIsFilterVisible(true)}>
            <Text style={styles.filterIconText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search results OR category grid ──────────────────────────── */}
      {isSearchMode ? (
        searchLoading && searchResults.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : searchResults.length === 0 ? (
          <View style={styles.center}>
            <Text style={{ fontSize: 48 }}>😕</Text>
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptySub}>Try different keywords or adjust filters.</Text>
            <TouchableOpacity style={styles.filterBtn2} onPress={() => setIsFilterVisible(true)}>
              <Text style={styles.filterBtn2Text}>Adjust Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item._id || item.id}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 20 }}
            contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
            ListHeaderComponent={
              <Text style={styles.resultsCount}>
                {searchResults.length} {searchResults.length === 1 ? 'person' : 'people'} found
              </Text>
            }
            ListFooterComponent={
              searchLoading ? <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} /> : null
            }
            renderItem={({ item }) => <SearchResultCard item={item} />}
          />
        )
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Browse Categories</Text>
          <View style={styles.grid}>
            {CATEGORIES.map((item) => (
              <CategoryCard key={item.id} item={item} />
            ))}
          </View>
        </ScrollView>
      )}

      {/* ── Category modal ────────────────────────────────────────────── */}
      <CategoryModal
        visible={!!categoryModal}
        category={categoryModal}
        onClose={() => setCategoryModal(null)}
        onLike={handleLike}
        onViewProfile={openProfile}
      />

      {/* ── Filter modal ──────────────────────────────────────────────── */}
      <FilterModal
        visible={isFilterVisible}
        filters={filters}
        onApply={handleApplyFilters}
        onClose={() => setIsFilterVisible(false)}
      />
    </SafeAreaView>
  );
}

const CARD_W = (width - 60) / 2;
const SEARCH_CARD_W = (width - 60) / 2;

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.background },

  // Header
  header:        { padding: 20, paddingHorizontal: 20, marginTop: 20, backgroundColor: Colors.background },
  titleRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  backToCategories: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF0F3', alignItems: 'center', justifyContent: 'center' },
  title:         { fontSize: 28, fontWeight: 'bold', color: Colors.text },
  searchRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchBar:     { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 15, borderWidth: 1, borderColor: '#F3F4F6', gap: 10 },
  searchInput:   { flex: 1, fontSize: 15, color: Colors.text, height: 24 },
  filterIconBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#FFF0F3', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFB8CC' },
  filterIconText:{ fontSize: 20 },

  // Category grid
  scrollContent: { padding: 20 },
  sectionTitle:  { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 16 },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card:          { width: CARD_W, height: CARD_W, backgroundColor: Colors.white, borderRadius: 20, marginBottom: 20, overflow: 'hidden', elevation: 3 },
  cardBackground:{ flex: 1, width: '100%', height: '100%' },
  cardImage:     { borderRadius: 20 },
  cardOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.38)', alignItems: 'center', justifyContent: 'center', padding: 14 },
  cardIcon:      { fontSize: 30, marginBottom: 8 },
  cardTitle:     { fontSize: 15, fontWeight: 'bold', color: Colors.white, textAlign: 'center' },

  // Search result cards (2-column)
  searchCard:      { width: SEARCH_CARD_W, height: SEARCH_CARD_W * 1.35, borderRadius: 18, overflow: 'hidden', backgroundColor: '#FFD6E4', marginBottom: 12, position: 'relative' },
  searchCardImage: { width: '100%', height: '100%' },
  onlineDot:       { position: 'absolute', top: 10, right: 10, width: 12, height: 12, borderRadius: 6, backgroundColor: '#2ECC71', borderWidth: 2, borderColor: '#fff' },
  searchCardOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 10, paddingBottom: 10, paddingTop: 24, backgroundColor: 'rgba(0,0,0,0.42)', borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  searchCardName:  { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  searchCardSub:   { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  resultsCount:    { fontSize: 13, color: Colors.textSecondary, paddingHorizontal: 20, marginBottom: 10, marginTop: 4 },

  // States
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  loadingText:  { fontSize: 15, color: Colors.textSecondary },
  emptyTitle:   { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  emptySub:     { fontSize: 14, color: '#A0A0A0', textAlign: 'center' },
  filterBtn2:   { marginTop: 8, backgroundColor: Colors.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 50 },
  filterBtn2Text:{ color: '#fff', fontWeight: '600', fontSize: 15 },

  // Category swipeable modal
  categoryModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center' },
  swippableContent:     { width: width * 0.92, height: height * 0.76, borderRadius: 30, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.3)' },
  swippableHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  swippableTitle:       { fontSize: 22, fontWeight: 'bold', color: Colors.white },
  closeCircle:          { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  swippableList:        { alignItems: 'center', paddingHorizontal: 6 },
  personCard:           { width: width * 0.9, height: height * 0.62, paddingHorizontal: 4 },
  personImage:          { flex: 1, width: '100%', height: '100%', justifyContent: 'flex-end' },
  personImageRadius:    { borderRadius: 26 },
  personOverlay:        { padding: 22, backgroundColor: 'rgba(0,0,0,0.32)', borderBottomLeftRadius: 26, borderBottomRightRadius: 26, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  personName:           { fontSize: 26, fontWeight: 'bold', color: Colors.white, marginBottom: 4 },
  personProfession:     { fontSize: 13, color: 'rgba(255,255,255,0.88)', marginBottom: 4 },
  locationRow:          { flexDirection: 'row', alignItems: 'center', gap: 4 },
  personLocation:       { fontSize: 14, color: Colors.white, opacity: 0.9 },
  likeButton:           { width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  likeButtonActive:     { backgroundColor: '#c0392b' },
  modalCenter:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  modalLoadingText:     { fontSize: 15, color: 'rgba(255,255,255,0.8)' },
  modalEmptyEmoji:      { fontSize: 48 },
  modalEmptyText:       { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },

  // Filter modal
  modalContainer:    { flex: 1, backgroundColor: Colors.white },
  modalHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle:        { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  resetText:         { color: Colors.primary, fontSize: 16, fontWeight: '600' },
  filterContent:     { flex: 1, padding: 20 },
  filterSection:     { marginBottom: 24 },
  sectionHeaderRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  filterLabel:       { fontSize: 17, fontWeight: 'bold', color: Colors.text, marginBottom: 12 },
  valueText:         { color: Colors.primary, fontWeight: 'bold', fontSize: 15 },
  inputContainer:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF5F7', borderRadius: 15, paddingHorizontal: 15 },
  textInput:         { flex: 1, paddingVertical: 14, fontSize: 15, color: Colors.text },
  toggleRow:         { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  toggleButton:      { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 25, borderWidth: 1, borderColor: '#F3F4F6' },
  toggleButtonActive:{ backgroundColor: Colors.white, borderColor: Colors.primary, borderWidth: 2 },
  toggleText:        { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },
  toggleTextActive:  { color: Colors.primary, fontWeight: 'bold' },
  chipRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:              { paddingHorizontal: 16, paddingVertical: 9, backgroundColor: '#F9FAFB', borderRadius: 25, borderWidth: 1, borderColor: '#F3F4F6' },
  chipActive:        { backgroundColor: Colors.white, borderColor: Colors.primary, borderWidth: 2 },
  chipText:          { fontSize: 14, color: Colors.textSecondary },
  chipTextActive:    { color: Colors.primary, fontWeight: 'bold' },
  footer:            { padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  applyButton:       { backgroundColor: Colors.primary, paddingVertical: 18, borderRadius: 20, alignItems: 'center', elevation: 5 },
  applyButtonText:   { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
});



// import React, { useState, useCallback, useRef, useEffect } from 'react';
// import {
//   View, Text, StyleSheet, TextInput, TouchableOpacity,
//   ScrollView, Modal, SafeAreaView, Dimensions, FlatList,
//   ImageBackground, ActivityIndicator, StatusBar, Image,
// } from 'react-native';
// import { Search, ChevronRight, ArrowLeft, MapPin, Briefcase, Church, X, Heart } from 'lucide-react-native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import Colors from 'src/constants/Colors';
// import { Routes } from 'src/constants/appConstants';
// import { UserAPI, MatchAPI } from 'services/ApiServices';
// import { useAuth } from 'src/store/authStore';

// const { width, height } = Dimensions.get('window');

// const getAge = (dob) => !dob ? null : Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));

// // ── Categories config ─────────────────────────────────────────────────────────
// const CATEGORIES = [
//   { id: '1', title: 'Singles',        icon: '❤️',  bgImage: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400', filter: { relationshipType: 'single'        } },
//   { id: '2', title: 'Single Mothers', icon: '👩‍👦', bgImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', filter: { relationshipType: 'single_mother' } },
//   { id: '3', title: 'Single Fathers', icon: '👨‍👦', bgImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400', filter: { relationshipType: 'single_father' } },
//   { id: '4', title: 'Christians',     icon: '✝️',  bgImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400', filter: { religion: 'christianity'          } },
//   { id: '5', title: 'Muslims',        icon: '🌙',  bgImage: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400', filter: { religion: 'islam'                 } },
//   { id: '6', title: 'Professionals',  icon: '💼',  bgImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', filter: { profession: 'any'                 } },
// ];

// // ══════════════════════════════════════════════════════════════════════════════
// // Category swipeable modal — shows real users from that category
// // ══════════════════════════════════════════════════════════════════════════════
// function CategoryModal({ visible, category, onClose, onLike, onViewProfile }) {
//   const [users,   setUsers]   = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [liked,   setLiked]   = useState({});

//   useEffect(() => {
//     if (!visible || !category) return;
//     fetchCategoryUsers();
//   }, [visible, category]);

//   const fetchCategoryUsers = async () => {
//     setLoading(true);
//     setUsers([]);
//     try {
//       const params = { page: 1, limit: 20, ...category.filter };
//       if (params.profession === 'any') delete params.profession;
//       const data = await UserAPI.search(params);
//       setUsers(data.users || []);
//     } catch (err) {
//       console.log('❌ [CategoryModal] fetch error:', err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleLike = async (user) => {
//     const id = user._id || user.id;
//     setLiked((prev) => ({ ...prev, [id]: true }));
//     await onLike(user);
//   };

//   return (
//     <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
//       <View style={styles.categoryModalOverlay}>
//         <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />

//         <View style={styles.swippableContent}>
//           {/* Modal header */}
//           <View style={styles.swippableHeader}>
//             <Text style={styles.swippableTitle}>{category?.title}</Text>
//             <TouchableOpacity style={styles.closeCircle} onPress={onClose}>
//               <X size={22} color={Colors.white} />
//             </TouchableOpacity>
//           </View>

//           {loading ? (
//             <View style={styles.modalCenter}>
//               <ActivityIndicator size="large" color={Colors.white} />
//               <Text style={styles.modalLoadingText}>Finding people...</Text>
//             </View>
//           ) : users.length === 0 ? (
//             <View style={styles.modalCenter}>
//               <Text style={styles.modalEmptyEmoji}>😕</Text>
//               <Text style={styles.modalEmptyText}>No profiles found in this category yet.</Text>
//             </View>
//           ) : (
//             <FlatList
//               data={users}
//               keyExtractor={(item) => item._id || item.id}
//               horizontal
//               pagingEnabled
//               showsHorizontalScrollIndicator={false}
//               snapToInterval={width * 0.9}
//               decelerationRate="fast"
//               contentContainerStyle={styles.swippableList}
//               renderItem={({ item }) => {
//                 const avatar = item.profilePicture || item.photos?.[0]
//                   || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=FF4D6D&color=fff&size=400`;
//                 const age     = item.age || getAge(item.dateOfBirth);
//                 const id      = item._id || item.id;
//                 const isLiked = liked[id];

//                 return (
//                   <TouchableOpacity
//                     style={styles.personCard}
//                     onPress={() => onViewProfile(item)}
//                     activeOpacity={0.95}
//                   >
//                     <ImageBackground
//                       source={{ uri: avatar }}
//                       style={styles.personImage}
//                       imageStyle={styles.personImageRadius}
//                     >
//                       <View style={styles.personOverlay}>
//                         <View>
//                           <Text style={styles.personName}>{item.name}{age ? `, ${age}` : ''}</Text>
//                           {item.profession && (
//                             <Text style={styles.personProfession}>💼 {item.profession}</Text>
//                           )}
//                           {(item.city || item.country) && (
//                             <View style={styles.locationRow}>
//                               <MapPin size={14} color={Colors.white} />
//                               <Text style={styles.personLocation}>
//                                 {[item.city, item.country].filter(Boolean).join(', ')}
//                               </Text>
//                             </View>
//                           )}
//                         </View>
//                         <TouchableOpacity
//                           style={[styles.likeButton, isLiked && styles.likeButtonActive]}
//                           onPress={() => handleLike(item)}
//                         >
//                           <Heart size={26} color={Colors.white} fill={isLiked ? Colors.white : 'transparent'} />
//                         </TouchableOpacity>
//                       </View>
//                     </ImageBackground>
//                   </TouchableOpacity>
//                 );
//               }}
//             />
//           )}
//         </View>
//       </View>
//     </Modal>
//   );
// }

// // ══════════════════════════════════════════════════════════════════════════════
// // Filter Modal
// // ══════════════════════════════════════════════════════════════════════════════
// function FilterModal({ visible, filters, onApply, onClose }) {
//   const [local, setLocal] = useState(filters);
//   const update = (key, val) => setLocal((prev) => ({ ...prev, [key]: val }));

//   const handleApply = () => { onApply(local); onClose(); };
//   const handleReset = () => {
//     const empty = { gender: null, relationshipType: null, religion: null, education: null, profession: '', country: '', city: '', minAge: null, maxAge: null };
//     setLocal(empty); onApply(empty); onClose();
//   };

//   const AGE_RANGES = [
//     { label: 'Any', min: null, max: null },
//     { label: '18–24', min: 18, max: 24 },
//     { label: '25–30', min: 25, max: 30 },
//     { label: '31–40', min: 31, max: 40 },
//     { label: '41–50', min: 41, max: 50 },
//     { label: '50+',   min: 50, max: null },
//   ];

//   const selectedAgeLabel = AGE_RANGES.find(
//     (r) => r.min === local.minAge && r.max === local.maxAge
//   )?.label || 'Any';

//   return (
//     <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
//       <SafeAreaView style={styles.modalContainer}>
//         {/* Header */}
//         <View style={styles.modalHeader}>
//           <TouchableOpacity onPress={onClose}>
//             <ArrowLeft size={24} color={Colors.text} />
//           </TouchableOpacity>
//           <Text style={styles.modalTitle}>Filters</Text>
//           <TouchableOpacity onPress={handleReset}>
//             <Text style={styles.resetText}>Reset</Text>
//           </TouchableOpacity>
//         </View>

//         <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>

//           {/* Location */}
//           <View style={styles.filterSection}>
//             <Text style={styles.filterLabel}>Country</Text>
//             <View style={styles.inputContainer}>
//               <Search size={18} color={Colors.primary} style={{ marginRight: 10 }} />
//               <TextInput
//                 placeholder="e.g. Nigeria"
//                 style={styles.textInput}
//                 value={local.country || ''}
//                 onChangeText={(v) => update('country', v)}
//                 autoCapitalize="words"
//               />
//             </View>
//           </View>

//           <View style={styles.filterSection}>
//             <Text style={styles.filterLabel}>City</Text>
//             <View style={styles.inputContainer}>
//               <MapPin size={18} color={Colors.primary} style={{ marginRight: 10 }} />
//               <TextInput
//                 placeholder="e.g. Lagos"
//                 style={styles.textInput}
//                 value={local.city || ''}
//                 onChangeText={(v) => update('city', v)}
//                 autoCapitalize="words"
//               />
//             </View>
//           </View>

//           {/* Gender */}
//           <View style={styles.filterSection}>
//             <Text style={styles.filterLabel}>Gender</Text>
//             <View style={styles.toggleRow}>
//               {['male', 'female', 'both'].map((item) => (
//                 <TouchableOpacity
//                   key={item}
//                   style={[styles.toggleButton, local.gender === item && styles.toggleButtonActive]}
//                   onPress={() => update('gender', local.gender === item ? null : item)}
//                 >
//                   <Text style={[styles.toggleText, local.gender === item && styles.toggleTextActive]}>
//                     {item.charAt(0).toUpperCase() + item.slice(1)}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//             </View>
//           </View>

//           {/* Age Range */}
//           <View style={styles.filterSection}>
//             <View style={styles.sectionHeaderRow}>
//               <Text style={styles.filterLabel}>Age Range</Text>
//               <Text style={styles.valueText}>{selectedAgeLabel}</Text>
//             </View>
//             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
//               {AGE_RANGES.map((r) => (
//                 <TouchableOpacity
//                   key={r.label}
//                   style={[styles.chip, selectedAgeLabel === r.label && styles.chipActive]}
//                   onPress={() => { update('minAge', r.min); update('maxAge', r.max); }}
//                 >
//                   <Text style={[styles.chipText, selectedAgeLabel === r.label && styles.chipTextActive]}>
//                     {r.label}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//             </ScrollView>
//           </View>

//           {/* Relationship Type */}
//           <View style={styles.filterSection}>
//             <Text style={styles.filterLabel}>Relationship Type</Text>
//             <View style={styles.chipRow}>
//               {['single', 'single_mother', 'single_father'].map((item) => (
//                 <TouchableOpacity
//                   key={item}
//                   style={[styles.chip, local.relationshipType === item && styles.chipActive]}
//                   onPress={() => update('relationshipType', local.relationshipType === item ? null : item)}
//                 >
//                   <Text style={[styles.chipText, local.relationshipType === item && styles.chipTextActive]}>
//                     {item.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//             </View>
//           </View>

//           {/* Advanced filters */}
//           <View style={styles.filterSection}>
//             <Text style={styles.filterLabel}>Advanced Filters</Text>

//             {/* Profession */}
//             <View style={styles.inputContainer}>
//               <Briefcase size={18} color={Colors.primary} style={{ marginRight: 10 }} />
//               <TextInput
//                 placeholder="Profession (e.g. Doctor)"
//                 style={styles.textInput}
//                 value={local.profession || ''}
//                 onChangeText={(v) => update('profession', v)}
//                 autoCapitalize="words"
//               />
//             </View>

//             <View style={{ height: 12 }} />

//             {/* Religion */}
//             <View style={styles.chipRow}>
//               {['christianity', 'islam', 'hinduism', 'buddhism', 'agnostic', 'other'].map((item) => (
//                 <TouchableOpacity
//                   key={item}
//                   style={[styles.chip, local.religion === item && styles.chipActive]}
//                   onPress={() => update('religion', local.religion === item ? null : item)}
//                 >
//                   <Text style={[styles.chipText, local.religion === item && styles.chipTextActive]}>
//                     {item.charAt(0).toUpperCase() + item.slice(1)}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//             </View>
//           </View>
//         </ScrollView>

//         <View style={styles.footer}>
//           <TouchableOpacity style={styles.applyButton} onPress={handleApply} activeOpacity={0.85}>
//             <Text style={styles.applyButtonText}>Apply Filters</Text>
//           </TouchableOpacity>
//         </View>
//       </SafeAreaView>
//     </Modal>
//   );
// }

// // ══════════════════════════════════════════════════════════════════════════════
// // DiscoverScreen
// // ══════════════════════════════════════════════════════════════════════════════
// export default function DiscoverScreen({ navigation }) {
//   const insets      = useSafeAreaInsets();
//   const { user: me } = useAuth();

//   const [searchQuery,       setSearchQuery]       = useState('');
//   const [isFilterVisible,   setIsFilterVisible]   = useState(false);
//   const [categoryModal,     setCategoryModal]     = useState(null); // selected category object
//   const [searchResults,     setSearchResults]     = useState([]);
//   const [searchLoading,     setSearchLoading]     = useState(false);
//   const [isSearchMode,      setIsSearchMode]      = useState(false);
//   const [page,              setPage]              = useState(1);
//   const [hasMore,           setHasMore]           = useState(true);
//   const [filters,           setFilters]           = useState({
//     gender: null, relationshipType: null, religion: null,
//     education: null, profession: '', country: '', city: '',
//     minAge: null, maxAge: null,
//   });

//   const searchTimeout = useRef(null);

//   // ── Build search params ───────────────────────────────────────────────────
//   const buildParams = useCallback((pageNum = 1, query = searchQuery) => {
//     const params = { page: pageNum, limit: 20 };
//     if (query.trim())               params.profession    = query.trim();
//     if (filters.gender)             params.gender        = filters.gender;
//     if (filters.relationshipType)   params.relationshipType = filters.relationshipType;
//     if (filters.religion)           params.religion      = filters.religion;
//     if (filters.education)          params.education     = filters.education;
//     if (filters.profession?.trim()) params.profession    = filters.profession.trim();
//     if (filters.country?.trim())    params.country       = filters.country.trim();
//     if (filters.city?.trim())       params.city          = filters.city.trim();
//     if (filters.minAge)             params.minAge        = filters.minAge;
//     if (filters.maxAge)             params.maxAge        = filters.maxAge;
//     return params;
//   }, [searchQuery, filters]);

//   // ── Search ────────────────────────────────────────────────────────────────
//   const doSearch = useCallback(async (pageNum = 1, query = searchQuery, reset = true) => {
//     setSearchLoading(true);
//     setIsSearchMode(true);
//     try {
//       const data    = await UserAPI.search(buildParams(pageNum, query));
//       const fetched = data.users || [];
//       if (reset) setSearchResults(fetched);
//       else       setSearchResults((prev) => [...prev, ...fetched]);
//       setHasMore(data.hasMore ?? fetched.length === 20);
//       setPage(pageNum);
//     } catch (err) {
//       console.log('❌ [Discover]', err.message);
//     } finally {
//       setSearchLoading(false);
//     }
//   }, [buildParams, searchQuery]);

//   const handleSearchChange = (text) => {
//     setSearchQuery(text);
//     if (!text.trim()) { setIsSearchMode(false); setSearchResults([]); return; }
//     clearTimeout(searchTimeout.current);
//     searchTimeout.current = setTimeout(() => doSearch(1, text, true), 500);
//   };

//   const handleApplyFilters = (newFilters) => {
//     setFilters(newFilters);
//     setTimeout(() => doSearch(1, searchQuery, true), 100);
//   };

//   const handleLoadMore = () => {
//     if (!searchLoading && hasMore) doSearch(page + 1, searchQuery, false);
//   };

//   // ── Like a user ───────────────────────────────────────────────────────────
//   const handleLike = async (user) => {
//     const id = user._id || user.id;
//     try {
//       const res = await MatchAPI.likeUser(id, false);
//       if (res?.match) {
//         setCategoryModal(null);
//         navigation.navigate('MatchScreen', {
//           matchedUser: user,
//           matchId:     res.match._id,
//         });
//       }
//     } catch (err) {
//       console.log('❌ [Discover] Like error:', err.message);
//     }
//   };

//   // ── Open profile ──────────────────────────────────────────────────────────
//   const openProfile = (user) => {
//     setCategoryModal(null);
//     navigation.navigate(Routes.USER_PROFILE, {
//       userId:  user._id || user.id,
//       profile: user,
//     });
//   };

//   // ── Category card ─────────────────────────────────────────────────────────
//   const CategoryCard = ({ item }) => (
//     <TouchableOpacity
//       style={styles.card}
//       onPress={() => setCategoryModal(item)}
//       activeOpacity={0.85}
//     >
//       <ImageBackground
//         source={{ uri: item.bgImage }}
//         style={styles.cardBackground}
//         imageStyle={styles.cardImage}
//       >
//         <View style={styles.cardOverlay}>
//           <Text style={styles.cardIcon}>{item.icon}</Text>
//           <Text style={styles.cardTitle}>{item.title}</Text>
//         </View>
//       </ImageBackground>
//     </TouchableOpacity>
//   );

//   // ── Search result card ────────────────────────────────────────────────────
//   const SearchResultCard = ({ item }) => {
//     const avatar = item.profilePicture || item.photos?.[0]
//       || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=FF4D6D&color=fff&size=300`;
//     const age = item.age || getAge(item.dateOfBirth);

//     return (
//       <TouchableOpacity style={styles.searchCard} onPress={() => openProfile(item)} activeOpacity={0.88}>
//         <Image source={{ uri: avatar }} style={styles.searchCardImage} />
//         {item.isOnline && <View style={styles.onlineDot} />}
//         <View style={styles.searchCardOverlay}>
//           <Text style={styles.searchCardName} numberOfLines={1}>
//             {item.name}{age ? `, ${age}` : ''}
//           </Text>
//           {item.profession && (
//             <Text style={styles.searchCardSub} numberOfLines={1}>💼 {item.profession}</Text>
//           )}
//           {(item.city || item.country) && (
//             <Text style={styles.searchCardSub} numberOfLines={1}>
//               📍 {[item.city, item.country].filter(Boolean).join(', ')}
//             </Text>
//           )}
//         </View>
//       </TouchableOpacity>
//     );
//   };

//   const CARD_W = (width - 60) / 2;

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

//       {/* ── Header & Search ──────────────────────────────────────────── */}
//       <View style={styles.header}>
//         <Text style={styles.title}>Discover</Text>

//         <View style={styles.searchRow}>
//           <TouchableOpacity
//             style={styles.searchBar}
//             onPress={() => {}}
//             activeOpacity={1}
//           >
//             <Search size={20} color={Colors.textLight} />
//             <TextInput
//               style={styles.searchInput}
//               placeholder="Search by name or profession..."
//               placeholderTextColor={Colors.textLight}
//               value={searchQuery}
//               onChangeText={handleSearchChange}
//               returnKeyType="search"
//               onSubmitEditing={() => doSearch(1, searchQuery, true)}
//             />
//             {searchQuery.length > 0 && (
//               <TouchableOpacity onPress={() => { setSearchQuery(''); setIsSearchMode(false); setSearchResults([]); }}>
//                 <X size={18} color={Colors.textLight} />
//               </TouchableOpacity>
//             )}
//           </TouchableOpacity>

//           <TouchableOpacity style={styles.filterIconBtn} onPress={() => setIsFilterVisible(true)}>
//             <Text style={styles.filterIconText}>⚙️</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* ── Search results OR category grid ──────────────────────────── */}
//       {isSearchMode ? (
//         searchLoading && searchResults.length === 0 ? (
//           <View style={styles.center}>
//             <ActivityIndicator size="large" color={Colors.primary} />
//             <Text style={styles.loadingText}>Searching...</Text>
//           </View>
//         ) : searchResults.length === 0 ? (
//           <View style={styles.center}>
//             <Text style={{ fontSize: 48 }}>😕</Text>
//             <Text style={styles.emptyTitle}>No results found</Text>
//             <Text style={styles.emptySub}>Try different keywords or adjust filters.</Text>
//             <TouchableOpacity style={styles.filterBtn2} onPress={() => setIsFilterVisible(true)}>
//               <Text style={styles.filterBtn2Text}>Adjust Filters</Text>
//             </TouchableOpacity>
//           </View>
//         ) : (
//           <FlatList
//             data={searchResults}
//             keyExtractor={(item) => item._id || item.id}
//             numColumns={2}
//             columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 20 }}
//             contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}
//             showsVerticalScrollIndicator={false}
//             onEndReached={handleLoadMore}
//             onEndReachedThreshold={0.4}
//             ListHeaderComponent={
//               <Text style={styles.resultsCount}>
//                 {searchResults.length} {searchResults.length === 1 ? 'person' : 'people'} found
//               </Text>
//             }
//             ListFooterComponent={
//               searchLoading ? <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} /> : null
//             }
//             renderItem={({ item }) => <SearchResultCard item={item} />}
//           />
//         )
//       ) : (
//         <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
//           <Text style={styles.sectionTitle}>Browse Categories</Text>
//           <View style={styles.grid}>
//             {CATEGORIES.map((item) => (
//               <CategoryCard key={item.id} item={item} />
//             ))}
//           </View>
//         </ScrollView>
//       )}

//       {/* ── Category modal ────────────────────────────────────────────── */}
//       <CategoryModal
//         visible={!!categoryModal}
//         category={categoryModal}
//         onClose={() => setCategoryModal(null)}
//         onLike={handleLike}
//         onViewProfile={openProfile}
//       />

//       {/* ── Filter modal ──────────────────────────────────────────────── */}
//       <FilterModal
//         visible={isFilterVisible}
//         filters={filters}
//         onApply={handleApplyFilters}
//         onClose={() => setIsFilterVisible(false)}
//       />
//     </SafeAreaView>
//   );
// }

// const CARD_W = (width - 60) / 2;
// const SEARCH_CARD_W = (width - 60) / 2;

// const styles = StyleSheet.create({
//   container:     { flex: 1, backgroundColor: Colors.background },

//   // Header
//   header:        { padding: 20, paddingBottom: 10, backgroundColor: Colors.background },
//   title:         { fontSize: 28, fontWeight: 'bold', color: Colors.text, marginBottom: 14 },
//   searchRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
//   searchBar:     { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 15, borderWidth: 1, borderColor: '#F3F4F6', gap: 10 },
//   searchInput:   { flex: 1, fontSize: 15, color: Colors.text, height: 24 },
//   filterIconBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#FFF0F3', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFB8CC' },
//   filterIconText:{ fontSize: 20 },

//   // Category grid
//   scrollContent: { padding: 20 },
//   sectionTitle:  { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 16 },
//   grid:          { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
//   card:          { width: CARD_W, height: CARD_W, backgroundColor: Colors.white, borderRadius: 20, marginBottom: 20, overflow: 'hidden', elevation: 3 },
//   cardBackground:{ flex: 1, width: '100%', height: '100%' },
//   cardImage:     { borderRadius: 20 },
//   cardOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.38)', alignItems: 'center', justifyContent: 'center', padding: 14 },
//   cardIcon:      { fontSize: 30, marginBottom: 8 },
//   cardTitle:     { fontSize: 15, fontWeight: 'bold', color: Colors.white, textAlign: 'center' },

//   // Search result cards (2-column)
//   searchCard:      { width: SEARCH_CARD_W, height: SEARCH_CARD_W * 1.35, borderRadius: 18, overflow: 'hidden', backgroundColor: '#FFD6E4', marginBottom: 12, position: 'relative' },
//   searchCardImage: { width: '100%', height: '100%' },
//   onlineDot:       { position: 'absolute', top: 10, right: 10, width: 12, height: 12, borderRadius: 6, backgroundColor: '#2ECC71', borderWidth: 2, borderColor: '#fff' },
//   searchCardOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 10, paddingBottom: 10, paddingTop: 24, backgroundColor: 'rgba(0,0,0,0.42)', borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
//   searchCardName:  { fontSize: 14, fontWeight: 'bold', color: '#fff' },
//   searchCardSub:   { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
//   resultsCount:    { fontSize: 13, color: Colors.textSecondary, paddingHorizontal: 20, marginBottom: 10, marginTop: 4 },

//   // States
//   center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
//   loadingText:  { fontSize: 15, color: Colors.textSecondary },
//   emptyTitle:   { fontSize: 20, fontWeight: 'bold', color: Colors.text },
//   emptySub:     { fontSize: 14, color: '#A0A0A0', textAlign: 'center' },
//   filterBtn2:   { marginTop: 8, backgroundColor: Colors.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 50 },
//   filterBtn2Text:{ color: '#fff', fontWeight: '600', fontSize: 15 },

//   // Category swipeable modal
//   categoryModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center' },
//   swippableContent:     { width: width * 0.92, height: height * 0.76, borderRadius: 30, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.3)' },
//   swippableHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
//   swippableTitle:       { fontSize: 22, fontWeight: 'bold', color: Colors.white },
//   closeCircle:          { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
//   swippableList:        { alignItems: 'center', paddingHorizontal: 6 },
//   personCard:           { width: width * 0.9, height: height * 0.62, paddingHorizontal: 4 },
//   personImage:          { flex: 1, width: '100%', height: '100%', justifyContent: 'flex-end' },
//   personImageRadius:    { borderRadius: 26 },
//   personOverlay:        { padding: 22, backgroundColor: 'rgba(0,0,0,0.32)', borderBottomLeftRadius: 26, borderBottomRightRadius: 26, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
//   personName:           { fontSize: 26, fontWeight: 'bold', color: Colors.white, marginBottom: 4 },
//   personProfession:     { fontSize: 13, color: 'rgba(255,255,255,0.88)', marginBottom: 4 },
//   locationRow:          { flexDirection: 'row', alignItems: 'center', gap: 4 },
//   personLocation:       { fontSize: 14, color: Colors.white, opacity: 0.9 },
//   likeButton:           { width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 5 },
//   likeButtonActive:     { backgroundColor: '#c0392b' },
//   modalCenter:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
//   modalLoadingText:     { fontSize: 15, color: 'rgba(255,255,255,0.8)' },
//   modalEmptyEmoji:      { fontSize: 48 },
//   modalEmptyText:       { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },

//   // Filter modal
//   modalContainer:    { flex: 1, backgroundColor: Colors.white },
//   modalHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
//   modalTitle:        { fontSize: 20, fontWeight: 'bold', color: Colors.text },
//   resetText:         { color: Colors.primary, fontSize: 16, fontWeight: '600' },
//   filterContent:     { flex: 1, padding: 20 },
//   filterSection:     { marginBottom: 24 },
//   sectionHeaderRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
//   filterLabel:       { fontSize: 17, fontWeight: 'bold', color: Colors.text, marginBottom: 12 },
//   valueText:         { color: Colors.primary, fontWeight: 'bold', fontSize: 15 },
//   inputContainer:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF5F7', borderRadius: 15, paddingHorizontal: 15 },
//   textInput:         { flex: 1, paddingVertical: 14, fontSize: 15, color: Colors.text },
//   toggleRow:         { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
//   toggleButton:      { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 25, borderWidth: 1, borderColor: '#F3F4F6' },
//   toggleButtonActive:{ backgroundColor: Colors.white, borderColor: Colors.primary, borderWidth: 2 },
//   toggleText:        { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },
//   toggleTextActive:  { color: Colors.primary, fontWeight: 'bold' },
//   chipRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
//   chip:              { paddingHorizontal: 16, paddingVertical: 9, backgroundColor: '#F9FAFB', borderRadius: 25, borderWidth: 1, borderColor: '#F3F4F6' },
//   chipActive:        { backgroundColor: Colors.white, borderColor: Colors.primary, borderWidth: 2 },
//   chipText:          { fontSize: 14, color: Colors.textSecondary },
//   chipTextActive:    { color: Colors.primary, fontWeight: 'bold' },
//   footer:            { padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
//   applyButton:       { backgroundColor: Colors.primary, paddingVertical: 18, borderRadius: 20, alignItems: 'center', elevation: 5 },
//   applyButtonText:   { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
// });