import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  Dimensions,
  FlatList,
  ImageBackground,
} from 'react-native';
import { Search, ChevronRight, ArrowLeft, MapPin, Briefcase, Church } from 'lucide-react-native';


const { width, height } = Dimensions.get('window');

const DiscoverScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Filter States
  const [gender, setGender] = useState('Male');
  const [distance, setDistance] = useState(50);
  const [ageRange, setAgeRange] = useState([18, 45]);
  const [relationshipType, setRelationshipType] = useState('Single');

  const categories = [
    { id: '1', title: 'Singles', icon: '❤️', bgImage: 'https://picsum.photos/seed/singles/400/400' },
    { id: '2', title: 'Single Mothers', icon: '👩‍👦', bgImage: 'https://picsum.photos/seed/mother/400/400' },
    { id: '3', title: 'Single Fathers', icon: '👨‍👦', bgImage: 'https://picsum.photos/seed/father/400/400' },
    { id: '4', title: 'Christians', icon: '✝️', bgImage: 'https://picsum.photos/seed/christian/400/400' },
    { id: '5', title: 'Muslims', icon: '🌙', bgImage: 'https://picsum.photos/seed/muslim/400/400' },
    { id: '6', title: 'Professionals', icon: '💼', bgImage: 'https://picsum.photos/seed/professional/400/400' },
  ];

  const dummyData = {
    'Singles': [
      { id: '1', name: 'Alex', age: 24, location: 'New York', image: 'https://picsum.photos/seed/alex/800/1200' },
      { id: '2', name: 'Sarah', age: 27, location: 'Los Angeles', image: 'https://picsum.photos/seed/sarah/800/1200' },
      { id: '3', name: 'Mike', age: 30, location: 'Chicago', image: 'https://picsum.photos/seed/mike/800/1200' },
      { id: '4', name: 'Emma', age: 22, location: 'Miami', image: 'https://picsum.photos/seed/emma/800/1200' },
    ],
    'Single Mothers': [
      { id: '5', name: 'Jessica', age: 29, location: 'Houston', image: 'https://picsum.photos/seed/jessica/800/1200' },
      { id: '6', name: 'Maria', age: 34, location: 'Phoenix', image: 'https://picsum.photos/seed/maria/800/1200' },
      { id: '7', name: 'Linda', age: 31, location: 'Philadelphia', image: 'https://picsum.photos/seed/linda/800/1200' },
    ],
    'Single Fathers': [
      { id: '8', name: 'David', age: 35, location: 'San Antonio', image: 'https://picsum.photos/seed/david/800/1200' },
      { id: '9', name: 'Chris', age: 32, location: 'San Diego', image: 'https://picsum.photos/seed/chris/800/1200' },
      { id: '10', name: 'Robert', age: 38, location: 'Dallas', image: 'https://picsum.photos/seed/robert/800/1200' },
    ],
    'Christians': [
      { id: '11', name: 'John', age: 26, location: 'San Jose', image: 'https://picsum.photos/seed/john/800/1200' },
      { id: '12', name: 'Grace', age: 24, location: 'Austin', image: 'https://picsum.photos/seed/grace/800/1200' },
      { id: '13', name: 'Peter', age: 29, location: 'Jacksonville', image: 'https://picsum.photos/seed/peter/800/1200' },
    ],
    'Muslims': [
      { id: '14', name: 'Ahmed', age: 28, location: 'Fort Worth', image: 'https://picsum.photos/seed/ahmed/800/1200' },
      { id: '15', name: 'Fatima', age: 25, location: 'Columbus', image: 'https://picsum.photos/seed/fatima/800/1200' },
      { id: '16', name: 'Omar', age: 30, location: 'Charlotte', image: 'https://picsum.photos/seed/omar/800/1200' },
    ],
    'Professionals': [
      { id: '17', name: 'Dr. Smith', age: 40, location: 'San Francisco', image: 'https://picsum.photos/seed/smith/800/1200' },
      { id: '18', name: 'Engr. Jane', age: 33, location: 'Indianapolis', image: 'https://picsum.photos/seed/jane/800/1200' },
      { id: '19', name: 'Atty. Paul', age: 35, location: 'Seattle', image: 'https://picsum.photos/seed/paul/800/1200' },
    ],
  };

  const handleCategoryPress = (category) => {
    setSelectedCategory(category);
    setIsCategoryModalVisible(true);
  };

  const CategoryCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleCategoryPress(item.title)}
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header & Search Bar */}
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <TouchableOpacity 
          style={styles.searchBar}
          onPress={() => setIsFilterVisible(true)}
        >
          <Search size={20} color={Colors.textLight} />
          <Text style={styles.searchPlaceholder}>Search for your match...</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <View style={styles.grid}>
          {categories.map((item) => (
            <CategoryCard key={item.id} item={item} />
          ))}
        </View>
      </ScrollView>

      {/* Filter Modal (Design from Image) */}
      <Modal
        visible={isFilterVisible}
        animationType="slide"
        transparent={false}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsFilterVisible(false)}>
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterContent}>
            {/* Location */}
            <View style={styles.filterSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.filterLabel}>Location</Text>
                <TouchableOpacity>
                  <Text style={styles.nearbyText}>Nearby</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputContainer}>
                <Search size={18} color={Colors.primary} style={styles.inputIcon} />
                <TextInput
                  placeholder="Search Country or City"
                  style={styles.textInput}
                />
              </View>
            </View>

            {/* Distance */}
            <View style={styles.filterSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.filterLabel}>Distance</Text>
                <Text style={styles.valueText}>{distance} km</Text>
              </View>
              <View style={styles.sliderPlaceholder}>
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderFill, { width: '50%' }]} />
                  <View style={[styles.sliderThumb, { left: '50%' }]} />
                </View>
              </View>
            </View>

            {/* Gender */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Gender</Text>
              <View style={styles.toggleRow}>
                {['Male', 'Female', 'Both'].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.toggleButton,
                      gender === item && styles.toggleButtonActive,
                    ]}
                    onPress={() => setGender(item)}
                  >
                    <Text style={[
                      styles.toggleText,
                      gender === item && styles.toggleTextActive,
                    ]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Age Range */}
            <View style={styles.filterSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.filterLabel}>Age Range</Text>
                <Text style={styles.valueText}>{ageRange[0]} - {ageRange[1]}</Text>
              </View>
              <View style={styles.sliderPlaceholder}>
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderFill, { left: '10%', width: '60%' }]} />
                  <View style={[styles.sliderThumb, { left: '10%' }]} />
                  <View style={[styles.sliderThumb, { left: '70%' }]} />
                </View>
              </View>
            </View>

            {/* Relationship Type */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Relationship Type</Text>
              <View style={styles.chipRow}>
                {['Single', 'Single Mother', 'Single Father'].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.chip,
                      relationshipType === item && styles.chipActive,
                    ]}
                    onPress={() => setRelationshipType(item)}
                  >
                    <Text style={[
                      styles.chipText,
                      relationshipType === item && styles.chipTextActive,
                    ]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Advanced Filters */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Advanced Filters</Text>
              <TouchableOpacity style={styles.advancedItem}>
                <View style={styles.advancedLeft}>
                  <View style={[styles.iconBox, { backgroundColor: '#FFF0F3' }]}>
                    <Briefcase size={20} color={Colors.primary} />
                  </View>
                  <Text style={styles.advancedText}>Profession</Text>
                </View>
                <View style={styles.advancedRight}>
                  <Text style={styles.advancedValue}>Any</Text>
                  <ChevronRight size={20} color={Colors.textLight} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.advancedItem}>
                <View style={styles.advancedLeft}>
                  <View style={[styles.iconBox, { backgroundColor: '#FFF0F3' }]}>
                    <Church size={20} color={Colors.primary} />
                  </View>
                  <Text style={styles.advancedText}>Religion</Text>
                </View>
                <View style={styles.advancedRight}>
                  <Text style={styles.advancedValue}>Christianity</Text>
                  <ChevronRight size={20} color={Colors.textLight} />
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={() => setIsFilterVisible(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Category Swippable Modal */}
      <Modal
        visible={isCategoryModalVisible}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.categoryModalOverlay}>
          <TouchableOpacity 
            style={styles.modalCloseArea} 
            onPress={() => setIsCategoryModalVisible(false)} 
          />
          <View style={styles.swippableContent}>
            <View style={styles.swippableHeader}>
              <Text style={styles.swippableTitle}>{selectedCategory}</Text>
              <TouchableOpacity 
                style={styles.closeCircle}
                onPress={() => setIsCategoryModalVisible(false)}
              >
                <X size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={dummyData[selectedCategory] || []}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={width * 0.9}
              decelerationRate="fast"
              contentContainerStyle={styles.swippableList}
              renderItem={({ item }) => (
                <View style={styles.personCard}>
                  <ImageBackground
                    source={{ uri: item.image }}
                    style={styles.personImage}
                    imageStyle={styles.personImageRadius}
                  >
                    <View style={styles.personOverlay}>
                      <View>
                        <Text style={styles.personName}>{item.name}, {item.age}</Text>
                        <View style={styles.locationRow}>
                          <MapPin size={16} color={Colors.white} />
                          <Text style={styles.personLocation}>{item.location}</Text>
                        </View>
                      </View>
                      <TouchableOpacity style={styles.likeButton}>
                        <Heart size={28} color={Colors.white} fill={Colors.white} />
                      </TouchableOpacity>
                    </View>
                  </ImageBackground>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  searchPlaceholder: {
    marginLeft: 10,
    color: Colors.textLight,
    fontSize: 16,
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 15,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: (width - 60) / 2,
    height: (width - 60) / 2,
    backgroundColor: Colors.white,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  cardBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  cardImage: {
    borderRadius: 20,
  },
  cardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  resetText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  filterContent: {
    flex: 1,
    padding: 20,
  },
  filterSection: {
    marginBottom: 25,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  nearbyText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  valueText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F7',
    borderRadius: 15,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: Colors.text,
  },
  sliderPlaceholder: {
    height: 40,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 4,
    backgroundColor: '#FFE4E9',
    borderRadius: 2,
    position: 'relative',
  },
  sliderFill: {
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    position: 'absolute',
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    position: 'absolute',
    top: -8,
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 25,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  toggleButtonActive: {
    backgroundColor: Colors.white,
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  toggleText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 25,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  chipActive: {
    backgroundColor: Colors.white,
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  chipText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  advancedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 20,
    marginBottom: 12,
  },
  advancedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  advancedText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  advancedRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  advancedValue: {
    color: Colors.textSecondary,
    marginRight: 5,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  applyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  applyButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Category Modal
  categoryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseArea: {
    ...StyleSheet.absoluteFillObject,
  },
  swippableContent: {
    width: width * 0.9,
    height: height * 0.75,
    borderRadius: 30,
    overflow: 'hidden',
  },
  swippableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 15,
  },
  swippableTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
  },
  closeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swippableList: {
    alignItems: 'center',
  },
  personCard: {
    width: width * 0.9,
    height: height * 0.65,
    paddingHorizontal: 5,
  },
  personImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  personImageRadius: {
    borderRadius: 30,
  },
  personOverlay: {
    padding: 25,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  personName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personLocation: {
    fontSize: 16,
    color: Colors.white,
    marginLeft: 5,
    opacity: 0.9,
  },
  likeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
});

export default DiscoverScreen;
