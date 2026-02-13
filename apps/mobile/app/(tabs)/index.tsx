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
import { useThemeStore } from '../../store/theme-store';
import { getTranslations } from '../../lib/translations';
import { searchServicesSuggest, getNextUpcomingBooking, getClinicsList, searchServicesWithFilters, type PublicServiceItem, type Booking, type ClinicListItem } from '../../lib/api';
import Skeleton from '../components/Skeleton';
import { getColors } from '../../lib/theme';

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
const FEATURED_SERVICES_COUNT = 8;
const SERVICES_POOL_SIZE = 40;

function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const HomeScreen = () => {
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const patient = useAuthStore((s) => s.patient);
  const theme = useThemeStore((s) => s.theme);
  const t = getTranslations(language);
  const colors = getColors(theme);
  const avatarUri = patient?.avatarUrl || DEFAULT_AVATAR;

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PublicServiceItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [nextBooking, setNextBooking] = useState<Booking | null>(null);
  const [clinics, setClinics] = useState<ClinicListItem[]>([]);
  const [clinicsLoading, setClinicsLoading] = useState(true);
  const [featuredServices, setFeaturedServices] = useState<PublicServiceItem[]>([]);
  const [featuredServicesLoading, setFeaturedServicesLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // const [filterModalVisible, setFilterModalVisible] = useState(false);

  const fetchFeaturedServices = useCallback(async () => {
    setFeaturedServicesLoading(true);
    try {
      const result = await searchServicesWithFilters({}, 1, SERVICES_POOL_SIZE);
      const pool = (result.services ?? []).filter((s) => s.isActive);
      const shuffled = shuffleArray(pool);
      setFeaturedServices(shuffled.slice(0, FEATURED_SERVICES_COUNT));
    } catch {
      setFeaturedServices([]);
    } finally {
      setFeaturedServicesLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchFeaturedServices();
    }, [fetchFeaturedServices])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        getClinicsList(4).then(setClinics).catch(() => setClinics([])),
        getNextUpcomingBooking().then(setNextBooking).catch(() => setNextBooking(null)),
        fetchFeaturedServices(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchFeaturedServices]);

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primaryLight}
            colors={[colors.primaryLight]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <View style={styles.greetingRow}>
              <Text style={[styles.greeting, { color: colors.text }]}>{t.greeting}</Text>
              <Text style={styles.waveEmoji}> 👋</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.avatarContainer} onPress={() => router.push('/profile')}>
            <Image source={{ uri: avatarUri }} style={[styles.avatar, { borderColor: colors.border }]} />
            <View style={[styles.onlineIndicator, { backgroundColor: colors.onlineIndicator, borderColor: colors.background }]} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchSection}>
          <View style={[
            styles.searchContainer,
            { backgroundColor: colors.backgroundInput, borderColor: colors.border },
            showSuggestions && { borderColor: colors.borderFocus }
          ]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t.searchPlaceholder}
              placeholderTextColor={colors.textPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
            />
            {searchLoading && (
              <ActivityIndicator size="small" color={colors.primary} style={styles.searchLoader} />
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
          <View style={[styles.suggestionsBox, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
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
              <Text style={[styles.noResultsText, { color: colors.textTertiary }]}>{t.noResultsFound}</Text>
            ) : (
              <ScrollView
                style={styles.suggestionsScroll}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {suggestions.map((item) => (
                  <TouchableOpacity
                    key={item._id}
                    style={[styles.suggestionRow, { borderBottomColor: colors.border }]}
                    activeOpacity={0.7}
                    onPress={() => {
                      hideSuggestions();
                      setSearchQuery('');
                      router.push({ pathname: '/service/[id]', params: { id: item._id } });
                    }}
                  >
                    <Image
                      source={{ uri: item.serviceImage || DEFAULT_IMAGE }}
                      style={[styles.suggestionImage, { backgroundColor: colors.border }]}
                    />
                    <View style={styles.suggestionBody}>
                      <Text style={[styles.suggestionTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
                      <Text style={[styles.suggestionPrice, { color: colors.primaryLight }]}>{formatPrice(item.price)}</Text>
                    </View>
                    <SaveServiceStar service={item} size={20} />
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        <TouchableWithoutFeedback onPress={hideSuggestions}>
          <View style={styles.dashboardContainer}>
            <TouchableOpacity style={[styles.dashboardCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]} onPress={() => router.push('/appointments')}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primaryBg }]}>
                <Ionicons name="calendar" size={24} color={colors.primaryLight} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t.myAppointments}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                {nextBooking &&
                (nextBooking.status === 'pending' || nextBooking.status === 'confirmed')
                  ? `${nextBooking.scheduledDate.split('-').reverse().join('/')} ${nextBooking.scheduledTime}`
                  : t.noUpcomingPromo}
              </Text>
            </TouchableOpacity>
            {/* <TouchableOpacity style={[styles.dashboardCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primaryBg }]}>
                <Ionicons name="medical" size={24} color={colors.primaryLight} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t.pillReminders}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{t.pillsRemaining}</Text>
            </TouchableOpacity> */}
          </View>
        </TouchableWithoutFeedback>

        

        <View style={styles.clinicsSection}>
          <View style={styles.clinicsSectionHeader}>
            <Text style={[styles.clinicsSectionTitle, { color: colors.text }]}>{t.clinics}</Text>
            <TouchableOpacity onPress={() => router.push('/clinics')} hitSlop={12}>
              <Text style={[styles.clinicsViewAll, { color: colors.primaryLight }]}>{t.viewAll}</Text>
            </TouchableOpacity>
          </View>
          {clinicsLoading ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clinicsScrollContent} style={styles.clinicsScroll}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={[styles.clinicCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
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
                    style={[styles.clinicCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                    activeOpacity={0.9}
                    onPress={() => router.push({ pathname: '/clinic/[id]', params: { id: c.id } })}
                  >
                    <View style={styles.clinicCardCoverWrap}>
                      <Image source={{ uri: coverUri }} style={[styles.clinicCardCover, { backgroundColor: colors.border }]} />
                      <View style={styles.clinicCardBadge}>
                        <Text style={styles.clinicCardBadgeText}>
                          {(t.nServices || '{{n}}').replace('{{n}}', String(c.servicesCount))}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.clinicCardInfo}>
                      <Text style={[styles.clinicCardName, { color: colors.text }]} numberOfLines={1}>{c.clinicDisplayName}</Text>
                      {tagline ? <Text style={[styles.clinicCardTagline, { color: colors.textTertiary }]} numberOfLines={1}>{tagline}</Text> : null}
                      <View style={styles.clinicCardMetaRow}>
                        <View style={styles.clinicCardRatingWrap}>
                          <Ionicons name="star" size={12} color={colors.warning} />
                          <Text style={[styles.clinicCardRating, { color: colors.warning }]}>{c.rating.avg > 0 ? c.rating.avg.toFixed(1) : '—'} {c.rating.count > 0 ? `(${c.rating.count})` : ''}</Text>
                        </View>
                        <Text style={[styles.clinicCardMetaDot, { color: colors.textTertiary }]}>•</Text>
                        <Text style={[styles.clinicCardBranches, { color: colors.textTertiary }]}>{c.branchesCount} {t.branches}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View style={styles.clinicsSection}>
          <View style={styles.clinicsSectionHeader}>
            <Text style={[styles.clinicsSectionTitle, { color: colors.text }]}>{t.services}</Text>
            <TouchableOpacity onPress={() => router.push('/services-results')} hitSlop={12}>
              <Text style={[styles.clinicsViewAll, { color: colors.primaryLight }]}>{t.viewAll}</Text>
            </TouchableOpacity>
          </View>
          {featuredServicesLoading ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clinicsScrollContent} style={styles.clinicsScroll}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={[styles.serviceCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                  <Skeleton width="100%" height={112} style={styles.serviceCardCover} />
                  <View style={styles.serviceCardInfo}>
                    <Skeleton width="90%" height={14} style={{ marginBottom: 6 }} />
                    <Skeleton width={70} height={18} style={{ marginBottom: 4 }} />
                    <Skeleton width={60} height={12} />
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clinicsScrollContent} style={styles.clinicsScroll}>
              {featuredServices.map((s) => (
                <TouchableOpacity
                  key={s._id}
                  style={[styles.serviceCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                  activeOpacity={0.9}
                  onPress={() => router.push({ pathname: '/service/[id]', params: { id: s._id } })}
                >
                  <View style={styles.serviceCardCoverWrap}>
                    <Image source={{ uri: s.serviceImage || DEFAULT_IMAGE }} style={[styles.serviceCardCover, { backgroundColor: colors.border }]} />
                  </View>
                  <View style={styles.serviceCardInfo}>
                    <Text style={[styles.serviceCardName, { color: colors.text }]} numberOfLines={2}>{s.title}</Text>
                    <Text style={[styles.serviceCardPrice, { color: colors.primaryLight }]}>{formatPrice(s.price)}</Text>
                    <Text style={[styles.serviceCardMeta, { color: colors.textTertiary }]}>{s.durationMin} {t.minutes}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

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
  safeArea: { flex: 1 },
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
  greeting: { fontSize: 28, fontWeight: 'bold' },
  waveEmoji: { fontSize: 28, fontWeight: 'bold' },
  avatarContainer: { position: 'relative' },
  avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2 },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
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
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 56,
    marginRight: 12,
    borderWidth: 1,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  searchLoader: { marginLeft: 8 },
  filterButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  suggestionsBox: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: 320,
    overflow: 'hidden',
  },
  suggestionsLoader: { padding: 24, alignItems: 'center' },
  suggestionsSkeleton: { padding: 12 },
  noResultsText: { fontSize: 13, padding: 20, textAlign: 'center' },
  suggestionsScroll: { maxHeight: 320 },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  suggestionImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  suggestionBody: { flex: 1, marginLeft: 12 },
  suggestionTitle: { fontSize: 15, fontWeight: '500' },
  suggestionPrice: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  dashboardContainer: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 10 },
  dashboardCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardSubtitle: { fontSize: 12 },

  clinicsSection: { marginTop: 32, paddingHorizontal: 20 },
  clinicsSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  clinicsSectionTitle: { fontSize: 18, fontWeight: '700' },
  clinicsViewAll: { fontSize: 14, fontWeight: '600' },
  clinicsScroll: { marginHorizontal: -20 },
  clinicsScrollContent: { paddingHorizontal: 20, paddingRight: 24, paddingBottom: 12, gap: 14 },
  clinicCard: {
    width: 200,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  clinicCardCoverWrap: { position: 'relative', width: '100%', height: 112 },
  clinicCardCover: { width: '100%', height: 112 },
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
  clinicCardName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  clinicCardTagline: { fontSize: 12, marginBottom: 6 },
  clinicCardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clinicCardRatingWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clinicCardRating: { fontSize: 12, fontWeight: '600' },
  clinicCardMetaDot: { fontSize: 10 },
  clinicCardBranches: { fontSize: 11 },

  serviceCard: {
    width: 200,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  serviceCardCoverWrap: { width: '100%', height: 112 },
  serviceCardCover: { width: '100%', height: 112 },
  serviceCardInfo: { padding: 12 },
  serviceCardName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  serviceCardPrice: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  serviceCardMeta: { fontSize: 12 },
});

export default HomeScreen;
