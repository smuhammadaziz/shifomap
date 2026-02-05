import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Specialties from '../components/Specialties';
import FeaturedClinics from '../components/FeaturedClinics';
// import ServiceFiltersModal from '../components/ServiceFiltersModal';
import SaveServiceStar from '../components/SaveServiceStar';
import { useAuthStore, DEFAULT_AVATAR } from '../../store/auth-store';
import { getTranslations } from '../../lib/translations';
import { searchServicesSuggest, type PublicServiceItem } from '../../lib/api';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1576091160399-112ba8e25d1d?w=200&h=200&fit=crop';

function formatPrice(price: PublicServiceItem['price']): string {
  if (price.amount != null) return `${price.amount.toLocaleString()} ${price.currency}`;
  if (price.minAmount != null && price.maxAmount != null) {
    return `${price.minAmount.toLocaleString()} – ${price.maxAmount.toLocaleString()} ${price.currency}`;
  }
  return price.currency;
}

const DEBOUNCE_MS = 500;

const HomeScreen = () => {
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const patient = useAuthStore((s) => s.patient);
  const t = getTranslations(language);
  const avatarUri = patient?.avatarUrl || DEFAULT_AVATAR;

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PublicServiceItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // const [filterModalVisible, setFilterModalVisible] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setSuggestions([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    try {
      const result = await searchServicesSuggest(trimmed, 15);
      setSuggestions(result.services);
    } catch {
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setShowSuggestions(true);
    const timer = setTimeout(() => runSearch(searchQuery), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery, runSearch]);

  const hideSuggestions = () => {
    Keyboard.dismiss();
    setShowSuggestions(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <View style={styles.greetingRow}>
              <Text style={styles.greeting}>{t.greeting}</Text>
              <Text style={styles.waveEmoji}> 👋</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.avatarContainer} onPress={() => router.push('/profile')}>
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
            <View style={styles.onlineIndicator} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchSection}>
          <View style={[styles.searchContainer, showSuggestions && styles.searchContainerFocused]}>
            <Ionicons name="search" size={20} color="#a1a1aa" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t.searchPlaceholder}
              placeholderTextColor="#71717a"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
            />
            {searchLoading && (
              <ActivityIndicator size="small" color="#8b5cf6" style={styles.searchLoader} />
            )}
          </View>
          {/* Filters button - commented out for now
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons name="options-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
          */}
        </View>

        {showSuggestions && searchQuery.trim() && (
          <View style={styles.suggestionsBox}>
            {searchLoading ? (
              <View style={styles.suggestionsLoader}>
                <ActivityIndicator size="small" color="#8b5cf6" />
              </View>
            ) : suggestions.length === 0 ? (
              <Text style={styles.noResultsText}>{t.noResultsFound}</Text>
            ) : (
              <ScrollView
                style={styles.suggestionsScroll}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {suggestions.map((item) => (
                  <TouchableOpacity
                    key={item._id}
                    style={styles.suggestionRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      hideSuggestions();
                      setSearchQuery('');
                      router.push({ pathname: '/service/[id]', params: { id: item._id } });
                    }}
                  >
                    <Image
                      source={{ uri: item.serviceImage || DEFAULT_IMAGE }}
                      style={styles.suggestionImage}
                    />
                    <View style={styles.suggestionBody}>
                      <Text style={styles.suggestionTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={styles.suggestionPrice}>{formatPrice(item.price)}</Text>
                    </View>
                    <SaveServiceStar service={item} size={20} />
                    <Ionicons name="chevron-forward" size={18} color="#71717a" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        <TouchableWithoutFeedback onPress={hideSuggestions}>
          <View style={styles.dashboardContainer}>
            <TouchableOpacity style={styles.dashboardCard}>
              <View style={[styles.iconContainer, { backgroundColor: '#3b0764' }]}>
                <Ionicons name="calendar" size={24} color="#a78bfa" />
              </View>
              <Text style={styles.cardTitle}>{t.myAppointments}</Text>
              <Text style={styles.cardSubtitle}>{t.nextAppointment}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dashboardCard}>
              <View style={[styles.iconContainer, { backgroundColor: '#3b0764' }]}>
                <Ionicons name="medical" size={24} color="#a78bfa" />
              </View>
              <Text style={styles.cardTitle}>{t.pillReminders}</Text>
              <Text style={styles.cardSubtitle}>{t.pillsRemaining}</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>

        {/* <Specialties /> */}
        <FeaturedClinics />
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Filter modal - commented out for now
      <ServiceFiltersModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
      />
      */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#09090b' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTextContainer: { flex: 1 },
  greetingRow: { flexDirection: 'row', alignItems: 'center' },
  greeting: { color: '#ffffff', fontSize: 28, fontWeight: 'bold' },
  waveEmoji: { fontSize: 28, fontWeight: 'bold' },
  avatarContainer: { position: 'relative' },
  avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#27272a' },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#09090b',
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 56,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  searchContainerFocused: { borderColor: '#7c3aed' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#ffffff', fontSize: 14 },
  searchLoader: { marginLeft: 8 },
  filterButton: {
    width: 56,
    height: 56,
    backgroundColor: '#18181b',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  suggestionsBox: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    maxHeight: 320,
    overflow: 'hidden',
  },
  suggestionsLoader: { padding: 24, alignItems: 'center' },
  noResultsText: { color: '#71717a', fontSize: 13, padding: 20, textAlign: 'center' },
  suggestionsScroll: { maxHeight: 320 },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  suggestionImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#27272a',
  },
  suggestionBody: { flex: 1, marginLeft: 12 },
  suggestionTitle: { color: '#ffffff', fontSize: 15, fontWeight: '500' },
  suggestionPrice: { color: '#a78bfa', fontSize: 13, fontWeight: '600', marginTop: 4 },
  dashboardContainer: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 10 },
  dashboardCard: {
    flex: 1,
    backgroundColor: '#18181b',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardSubtitle: { color: '#a1a1aa', fontSize: 12 },
});

export default HomeScreen;
