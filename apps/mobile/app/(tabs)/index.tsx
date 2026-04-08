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
import { useNotificationStore } from '../../store/notification-store';
import { getTranslations } from '../../lib/translations';
import { searchServicesSuggest, getNextUpcomingBooking, getClinicsList, getMyNextPill, searchServicesWithFilters, getServiceFilterOptions, type PublicServiceItem, type Booking, type ClinicListItem } from '../../lib/api';
import Skeleton from '../components/Skeleton';
import { getColors } from '../../lib/theme';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1576091160399-112ba8e25d1d?w=200&h=200&fit=crop';
const DEFAULT_CLINIC_LOGO = 'https://static.vecteezy.com/system/resources/thumbnails/036/372/442/small/hospital-building-with-ambulance-emergency-car-on-cityscape-background-cartoon-illustration-vector.jpg';
const DEFAULT_CLINIC_COVER = 'https://www.shutterstock.com/image-photo/medical-coverage-insurance-concept-hands-260nw-1450246616.jpg';

const APP_LOGO = require('../../assets/play_store_512-Photoroom.png');

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
  const [serviceSuggestions, setServiceSuggestions] = useState<PublicServiceItem[]>([]);
  const [clinicSuggestions, setClinicSuggestions] = useState<ClinicListItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [nextBooking, setNextBooking] = useState<Booking | null>(null);
  const [nextPill, setNextPill] = useState<{ prescriptionId: string | null; time: string; medicineName: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dismissedPill, setDismissedPill] = useState<string | null>(null);
  const [clinics, setClinics] = useState<ClinicListItem[]>([]);
  const [clinicsLoading, setClinicsLoading] = useState(true);
  const [featuredServices, setFeaturedServices] = useState<PublicServiceItem[]>([]);
  const [featuredServicesLoading, setFeaturedServicesLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allCategories, setAllCategories] = useState<{ _id: string; name: string }[]>([]);

  const { getUnreadCount, hydrated: notificationsHydrated, hydrate: hydrateNotifications } = useNotificationStore();
  const unreadCount = getUnreadCount();

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

  useEffect(() => {
    if (!notificationsHydrated) {
      hydrateNotifications();
    }
  }, [notificationsHydrated, hydrateNotifications]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000 * 60);
    return () => clearInterval(timer);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        getClinicsList(5).then(setClinics).catch(() => setClinics([])),
        getNextUpcomingBooking().then(setNextBooking).catch(() => setNextBooking(null)),
        getMyNextPill().then(setNextPill).catch(() => setNextPill(null)),
        fetchFeaturedServices(),
        hydrateNotifications(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchFeaturedServices]);

  const fetchNextBooking = useCallback(() => {
    getNextUpcomingBooking().then(setNextBooking).catch(() => setNextBooking(null));
  }, []);

  const fetchNextPill = useCallback(() => {
    getMyNextPill().then(setNextPill).catch(() => setNextPill(null));
  }, []);

  useEffect(() => {
    fetchNextBooking();
    fetchNextPill();
  }, [fetchNextBooking, fetchNextPill]);

  useFocusEffect(
    useCallback(() => {
      fetchNextBooking();
      fetchNextPill();
    }, [fetchNextBooking, fetchNextPill])
  );

  useEffect(() => {
    getServiceFilterOptions()
      .then((res) => {
        setAllCategories(res.categories);
      })
      .catch(() => setAllCategories([]));
  }, []);

  useEffect(() => {
    getClinicsList(5)
      .then((res) => {
        setClinics(res);
      })
      .catch(() => setClinics([]))
      .finally(() => setClinicsLoading(false));
  }, []);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setServiceSuggestions([]);
      setClinicSuggestions([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    try {
      const result = await searchServicesSuggest(trimmed, 15);
      setServiceSuggestions(result.services);
      setClinicSuggestions(result.clinics);
    } catch {
      setServiceSuggestions([]);
      setClinicSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setServiceSuggestions([]);
      setClinicSuggestions([]);
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
      <View style={[styles.fixedHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.fixedHeaderBrand}>
          <Image source={APP_LOGO} style={styles.fixedHeaderLogo} resizeMode="contain" />
          <Text style={[styles.fixedHeaderTitle, { color: colors.text }]}>ShifoYo'l</Text>
        </View>
        <View style={styles.fixedHeaderActions}>
          <TouchableOpacity
            style={styles.fixedHeaderIconBtn}
            onPress={() => router.push('/ai-chat')}
            hitSlop={12}
            accessibilityLabel="AI Chat"
          >
            <Ionicons name="chatbubbles-outline" size={22} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.fixedHeaderIconBtn}
            onPress={() => router.push('/notifications')}
            hitSlop={12}
            accessibilityLabel={t.notifications}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            {unreadCount > 0 && (
              <View style={[styles.notificationBadge, { backgroundColor: colors.error }]}>
                <Text style={styles.notificationBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

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
            ) : (serviceSuggestions.length === 0 && clinicSuggestions.length === 0) ? (
              <Text style={[styles.noResultsText, { color: colors.textTertiary }]}>{t.noResultsFound}</Text>
            ) : (
              <ScrollView
                style={styles.suggestionsScroll}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {clinicSuggestions.length > 0 && (
                  <View style={styles.suggestionSection}>
                    <View style={[styles.suggestionSectionHeader, { borderBottomColor: colors.border }]}>
                      <Ionicons name="business" size={14} color={colors.primaryLight} style={{ marginRight: 6 }} />
                      <Text style={[styles.suggestionSectionTitle, { color: colors.textSecondary }]}>
                        {language === 'uz' ? 'Klinikalar' : 'Клиники'}
                      </Text>
                    </View>
                    {clinicSuggestions.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.suggestionRow, { borderBottomColor: colors.border }]}
                        activeOpacity={0.7}
                        onPress={() => {
                          hideSuggestions();
                          setSearchQuery('');
                          router.push({ pathname: '/clinic/[id]', params: { id: item.id } });
                        }}
                      >
                        <Image
                          source={{ uri: item.logoUrl || DEFAULT_IMAGE }}
                          style={[styles.suggestionImage, { backgroundColor: colors.border }]}
                        />
                        <View style={styles.suggestionBody}>
                          <Text style={[styles.suggestionTitle, { color: colors.text }]} numberOfLines={1}>{item.clinicDisplayName}</Text>
                          <Text style={[styles.suggestionClinic, { color: colors.textTertiary }]} numberOfLines={1}>
                            {item.branchesCount} {language === 'uz' ? 'filial' : 'филиалов'}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {serviceSuggestions.length > 0 && (
                  <View style={styles.suggestionSection}>
                    <View style={[styles.suggestionSectionHeader, { borderBottomColor: colors.border }]}>
                      <Ionicons name="medkit" size={14} color={colors.primaryLight} style={{ marginRight: 6 }} />
                      <Text style={[styles.suggestionSectionTitle, { color: colors.textSecondary }]}>
                        {language === 'uz' ? 'Xizmatlar' : 'Услуги'}
                      </Text>
                    </View>
                    {serviceSuggestions.map((item) => (
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
                          <Text style={[styles.suggestionTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                          <View style={styles.suggestionFooter}>
                            <Text style={[styles.suggestionClinic, { color: colors.textTertiary }]} numberOfLines={1}>
                              {item.clinicDisplayName}
                            </Text>
                            <Text style={[styles.suggestionPrice, { color: colors.primaryLight }]}>{formatPrice(item.price)}</Text>
                          </View>
                        </View>
                        <SaveServiceStar service={item} size={20} />
                        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
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
            <TouchableOpacity
              style={[styles.dashboardCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
              onPress={() => router.push('/pill-reminder')}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.primaryBg }]}>
                <Ionicons name="medical" size={24} color={colors.primaryLight} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t.pillReminders}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                {nextPill ? `${nextPill.time} • ${nextPill.medicineName}` : (t.noUpcomingPromo ?? '—')}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>

        {(() => {
          if (!nextPill || dismissedPill === `${nextPill.time}-${nextPill.medicineName}`) return null;
          
          const [pH, pM] = nextPill.time.split(':').map(Number);
          const pillDate = new Date();
          pillDate.setHours(pH, pM, 0, 0);
          
          const diffMs = pillDate.getTime() - currentTime.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          
          if (diffMins > 10 || diffMins < -10) return null;
          
          const isUrgent = diffMins <= 0;
          
          return (
            <View style={[styles.attentionCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border, borderWidth: 1 }]}>
              <View style={[styles.attentionIconContainer, { backgroundColor: colors.primaryBg }]}>
                <Ionicons name="medical" size={24} color={colors.primary} />
              </View>
              <View style={styles.attentionBody}>
                <Text style={[styles.attentionTitle, { color: colors.primary }]}>
                  {language === 'uz' ? 'DIQQAT' : 'ВНИМАНИЕ'}
                </Text>
                <Text style={[styles.attentionMessage, { color: colors.text }]} numberOfLines={2}>
                  {isUrgent 
                    ? `${nextPill.medicineName}: ${language === 'uz' ? 'Ichish vaqti!' : 'Пора пить!'}`
                    : `${nextPill.medicineName}: ${diffMins} ${language === 'uz' ? 'min' : 'мин'}`
                  }
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.attentionAction}
                onPress={() => setDismissedPill(`${nextPill.time}-${nextPill.medicineName}`)}
              >
                <Ionicons name="checkmark-done-circle" size={32} color="#34C759" />
              </TouchableOpacity>
            </View>
          );
        })()}

        <View style={styles.categoriesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScrollContent}
          >
            {clinicsLoading && clinics.length === 0 ? (
              [1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={[styles.categoryChipSkeleton, { backgroundColor: colors.border }]} />
              ))
            ) : (
              (() => {
                const rawCategories = clinics.slice(0, 5).flatMap(c => c.categories || []);
                const aggregated: { _id: string; name: string }[] = [];
                const seenNames = new Set<string>();

                for (const cat of rawCategories) {
                  const name = typeof cat === 'string' ? cat : cat.name;
                  const id = typeof cat === 'string' ? (allCategories.find(ac => ac.name === cat)?._id || '') : cat._id;

                  if (name && !seenNames.has(name)) {
                    seenNames.add(name);
                    aggregated.push({ _id: id, name });
                  }
                }

                return aggregated.map(cat => (
                  <TouchableOpacity
                    key={cat.name}
                    style={[styles.categoryChip, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                    activeOpacity={0.7}
                    onPress={() => {
                      router.push({
                        pathname: '/services-results',
                        params: { categoryId: cat._id, q: cat._id ? '' : cat.name }
                      });
                    }}
                  >
                    <Text style={[styles.categoryChipText, { color: colors.textSecondary }]}>{cat.name}</Text>
                  </TouchableOpacity>
                ));
              })()
            )}
          </ScrollView>
        </View>

        <View style={styles.clinicsSection}>
          <View style={styles.clinicsSectionHeader}>
            <Text style={[styles.clinicsSectionTitle, { color: colors.text }]}>{t.clinics}</Text>
            <TouchableOpacity onPress={() => router.push('/clinics')} hitSlop={12}>
              <Text style={[styles.clinicsViewAll, { color: colors.primaryLight }]}>{t.viewAll}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.searchMapBtn, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={() => router.push('/clinics-map')}
          >
            <Ionicons name="map-outline" size={24} color={colors.primary} style={{ marginRight: 12 }} />
            <Text style={[styles.searchMapBtnText, { color: colors.text }]}>{t.searchFromMap || 'Search from map'}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

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
                const catNames = (c.categories || []).map(cat => typeof cat === 'string' ? cat : cat.name);
                const tagline = catNames.length ? catNames.slice(0, 2).join(' · ') + (catNames.length > 2 ? ' ...' : '') : (c.descriptionShort || '').slice(0, 30);
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
                          {(t.nServices || '{{n}} xizmat').replace('{{n}}', String(c.servicesCount))}
                        </Text>
                        {c.rating?.count > 0 ? (
                          <View style={styles.clinicCardBadgeRating}>
                            <Ionicons name="star" size={12} color="#facc15" />
                            <Text style={styles.clinicCardBadgeText}>
                              {c.rating.avg.toFixed(1)}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.clinicCardInfo}>
                      <Text style={[styles.clinicCardName, { color: colors.text }]} numberOfLines={1} ellipsizeMode="middle">{c.clinicDisplayName}</Text>
                      {tagline ? <Text style={[styles.clinicCardTagline, { color: colors.textTertiary }]} numberOfLines={1} ellipsizeMode="middle">{tagline}</Text> : null}

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
                    <View style={styles.serviceCardBadge}>
                      <Ionicons name="star" size={12} color="#facc15" />
                      <Text style={styles.serviceCardBadgeText}>
                        {(s.rating?.avg != null ? s.rating.avg : 0).toFixed(1)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.serviceCardInfo}>
                    <Text style={[styles.serviceCardName, { color: colors.text }]} numberOfLines={2} ellipsizeMode="middle">{s.title}</Text>
                    <Text style={[styles.serviceCardPrice, { color: colors.primaryLight }]} numberOfLines={1} ellipsizeMode="middle">{formatPrice(s.price)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <FeaturedClinics />

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  fixedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingTop: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fixedHeaderBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fixedHeaderLogo: {
    width: 32,
    height: 32,
  },
  fixedHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  fixedHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fixedHeaderIconBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
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
    borderWidth: 1,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  searchLoader: { marginLeft: 8 },
  suggestionsBox: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: 320,
    overflow: 'hidden',
  },
  suggestionsSkeleton: { padding: 12 },
  noResultsText: { fontSize: 13, padding: 20, textAlign: 'center' },
  suggestionsScroll: { maxHeight: 400 },
  suggestionSection: { marginBottom: 12 },
  suggestionSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderBottomWidth: 0.5,
  },
  suggestionSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
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
  suggestionTitle: { fontSize: 15, fontWeight: '600' },
  suggestionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  suggestionClinic: { fontSize: 12, flex: 1, marginRight: 8 },
  suggestionPrice: { fontSize: 13, fontWeight: '700' },
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
  cardSubtitle: { fontSize: 13, fontWeight: '500', marginTop: 4 },
  attentionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  attentionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  clockIllustration: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FF9500',
    opacity: 0.3,
  },
  attentionBody: {
    flex: 1,
  },
  attentionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  attentionMessage: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  attentionAction: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  actionSubText: {
    color: '#34C759',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  categoriesSection: { marginTop: 24, paddingBottom: 10 },
  categoriesScrollContent: { paddingHorizontal: 20, gap: 10 },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryChipSkeleton: {
    width: 80,
    height: 38,
    borderRadius: 14,
    opacity: 0.3,
  },
  clinicsSection: { marginTop: 32, paddingHorizontal: 20 },
  clinicsSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  clinicsSectionTitle: { fontSize: 18, fontWeight: '700' },
  clinicsViewAll: { fontSize: 14, fontWeight: '600' },
  searchMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  searchMapBtnText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  clinicCardBadgeRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clinicCardBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  clinicCardInfo: { padding: 12, minWidth: 0 },
  clinicCardName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  clinicCardTagline: { fontSize: 12, marginBottom: 6 },
  clinicCardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'nowrap', minWidth: 0 },
  clinicCardRatingWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  clinicCardRating: { fontSize: 12, fontWeight: '600' },
  clinicCardMetaDot: { fontSize: 10, flexShrink: 0 },
  clinicCardBranches: { fontSize: 11, flexShrink: 1, minWidth: 0 },

  serviceCard: {
    width: 200,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  serviceCardCoverWrap: { position: 'relative', width: '100%', height: 112 },
  serviceCardCover: { width: '100%', height: 112 },
  serviceCardBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    zIndex: 10,
    elevation: 5,
    minWidth: 44,
    justifyContent: 'center',
  },
  serviceCardBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  serviceCardInfo: { padding: 12, minWidth: 0 },
  serviceCardName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  serviceCardPrice: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  serviceCardMeta: { fontSize: 12 },
});

export default HomeScreen;
