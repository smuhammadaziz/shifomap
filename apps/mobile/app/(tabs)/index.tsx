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
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Specialties from '../components/Specialties';
import FeaturedClinics from '../components/FeaturedClinics';
// import ServiceFiltersModal from '../components/ServiceFiltersModal';
import SaveServiceStar from '../components/SaveServiceStar';
import { useAuthStore, DEFAULT_AVATAR } from '../../store/auth-store';
import { getTranslations } from '../../lib/translations';
import { searchServicesSuggest, getNextUpcomingBooking, getClinicsList, type PublicServiceItem, type Booking, type ClinicListItem } from '../../lib/api';
import Skeleton from '../components/Skeleton';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1576091160399-112ba8e25d1d?w=200&h=200&fit=crop';
const DEFAULT_CLINIC_LOGO = 'https://static.vecteezy.com/system/resources/thumbnails/036/372/442/small/hospital-building-with-ambulance-emergency-car-on-cityscape-background-cartoon-illustration-vector.jpg';
const DEFAULT_CLINIC_COVER = 'https://www.shutterstock.com/image-photo/medical-coverage-insurance-concept-hands-260nw-1450246616.jpg';

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
  const [nextBooking, setNextBooking] = useState<Booking | null>(null);
  const [clinics, setClinics] = useState<ClinicListItem[]>([]);
  const [clinicsLoading, setClinicsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // const [filterModalVisible, setFilterModalVisible] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        getClinicsList(4).then(setClinics).catch(() => setClinics([])),
        getNextUpcomingBooking().then(setNextBooking).catch(() => setNextBooking(null)),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const fetchNextBooking = useCallback(() => {
    getNextUpcomingBooking().then(setNextBooking).catch(() => setNextBooking(null));
  }, []);

  useEffect(() => {
    fetchNextBooking();
  }, [fetchNextBooking]);

  useFocusEffect(
    useCallback(() => {
      fetchNextBooking();
    }, [fetchNextBooking])
  );

  useEffect(() => {
    getClinicsList(4)
      .then(setClinics)
      .catch(() => setClinics([]))
      .finally(() => setClinicsLoading(false));
  }, []);

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#a78bfa"
            colors={['#a78bfa']}
          />
        }
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
              <View style={styles.suggestionsSkeleton}>
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} style={styles.suggestionRow}>
                    <Skeleton width={52} height={52} borderRadius={12} />
                    <View style={styles.suggestionBody}>
                      <Skeleton width="85%" height={15} style={{ marginBottom: 6 }} />
                      <Skeleton width={80} height={13} />
                    </View>
                  </View>
                ))}
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
            <TouchableOpacity style={styles.dashboardCard} onPress={() => router.push('/appointments')}>
              <View style={[styles.iconContainer, { backgroundColor: '#3b0764' }]}>
                <Ionicons name="calendar" size={24} color="#a78bfa" />
              </View>
              <Text style={styles.cardTitle}>{t.myAppointments}</Text>
              <Text style={styles.cardSubtitle}>
                {nextBooking &&
                (nextBooking.status === 'pending' || nextBooking.status === 'confirmed')
                  ? `${nextBooking.scheduledDate.split('-').reverse().join('/')} ${nextBooking.scheduledTime}`
                  : t.noUpcomingPromo}
              </Text>
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

        <View style={styles.clinicsSection}>
          <View style={styles.clinicsSectionHeader}>
            <Text style={styles.clinicsSectionTitle}>{t.clinics}</Text>
            <TouchableOpacity onPress={() => router.push('/clinics')} hitSlop={12}>
              <Text style={styles.clinicsViewAll}>{t.viewAll}</Text>
            </TouchableOpacity>
          </View>
          {clinicsLoading ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clinicsScrollContent} style={styles.clinicsScroll}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={styles.clinicCard}>
                  <Skeleton width="100%" height={112} style={styles.clinicCardCover} />
                  <View style={styles.clinicCardInfo}>
                    <Skeleton width="90%" height={16} style={{ marginBottom: 6 }} />
                    <Skeleton width="70%" height={12} style={{ marginBottom: 8 }} />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Skeleton width={60} height={18} borderRadius={9} />
                      <Skeleton width={80} height={18} borderRadius={9} />
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.clinicsScrollContent}
              style={styles.clinicsScroll}
            >
              {clinics.map((c) => {
                const coverUri = c.coverUrl || c.logoUrl || DEFAULT_CLINIC_COVER;
                const tagline = c.categories.length ? c.categories.slice(0, 2).join(' · ') + (c.categories.length > 2 ? ' ...' : '') : (c.descriptionShort || '').slice(0, 30);
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.clinicCard}
                    activeOpacity={0.9}
                    onPress={() => router.push({ pathname: '/clinic/[id]', params: { id: c.id } })}
                  >
                    <View style={styles.clinicCardCoverWrap}>
                      <Image source={{ uri: coverUri }} style={styles.clinicCardCover} />
                      <View style={styles.clinicCardBadge}>
                        <Text style={styles.clinicCardBadgeText}>
                          {(t.nServices || '{{n}}').replace('{{n}}', String(c.servicesCount))}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.clinicCardInfo}>
                      <Text style={styles.clinicCardName} numberOfLines={1}>{c.clinicDisplayName}</Text>
                      {tagline ? <Text style={styles.clinicCardTagline} numberOfLines={1}>{tagline}</Text> : null}
                      <View style={styles.clinicCardMetaRow}>
                        <View style={styles.clinicCardRatingWrap}>
                          <Ionicons name="star" size={12} color="#f59e0b" />
                          <Text style={styles.clinicCardRating}>{c.rating.avg > 0 ? c.rating.avg.toFixed(1) : '—'} {c.rating.count > 0 ? `(${c.rating.count})` : ''}</Text>
                        </View>
                        <Text style={styles.clinicCardMetaDot}>•</Text>
                        <Text style={styles.clinicCardBranches}>{c.branchesCount} {t.branches}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

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
  suggestionsSkeleton: { padding: 12 },
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

  clinicsSection: { marginTop: 32, paddingHorizontal: 20 },
  clinicsSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  clinicsSectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  clinicsViewAll: { color: '#a78bfa', fontSize: 14, fontWeight: '600' },
  clinicsScroll: { marginHorizontal: -20 },
  clinicsScrollContent: { paddingHorizontal: 20, paddingRight: 24, paddingBottom: 12, gap: 14 },
  clinicCard: {
    width: 200,
    backgroundColor: '#18181b',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  clinicCardCoverWrap: { position: 'relative', width: '100%', height: 112 },
  clinicCardCover: { width: '100%', height: 112, backgroundColor: '#27272a' },
  clinicCardBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  clinicCardBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  clinicCardInfo: { padding: 12 },
  clinicCardName: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  clinicCardTagline: { color: '#71717a', fontSize: 12, marginBottom: 6 },
  clinicCardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clinicCardRatingWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clinicCardRating: { color: '#f59e0b', fontSize: 12, fontWeight: '600' },
  clinicCardMetaDot: { color: '#52525b', fontSize: 10 },
  clinicCardBranches: { color: '#71717a', fontSize: 11 },
});

export default HomeScreen;
