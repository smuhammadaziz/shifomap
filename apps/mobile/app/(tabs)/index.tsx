import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Keyboard,
  TouchableWithoutFeedback,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore, DEFAULT_AVATAR } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { useNotificationStore } from '../../store/notification-store';
import { getTranslations } from '../../lib/translations';
import { getTokens } from '../../lib/design';
import {
  searchServicesSuggest,
  getNextUpcomingBooking,
  getClinicsList,
  getMyNextPill,
  submitCustomReminderPillEvent,
  setPrescriptionEvent,
  getNearestPharmacies,
  listStories,
  type StoryItem,
  type NextPillInfo,
  searchServicesWithFilters,
  listPatientConversations,
  type PublicServiceItem,
  type PublicPharmacyItem,
  type Booking,
  type ClinicListItem,
  type ChatConversation,
} from '../../lib/api';
import { Avatar, IconButton, SkeletonBlock } from '../../components/ui';
import FeaturedClinics from '../components/FeaturedClinics';
import DiscountsSlider from '../components/DiscountsSlider';
import HomePriceFilterSheet from '../components/HomePriceFilterSheet';
// import StoriesRibbon from '../components/StoriesRibbon';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1576091160399-112ba8e25d1d?w=400&q=80';
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&q=80';

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function formatPrice(price: PublicServiceItem['price']): string {
  if (price.amount != null) return `${price.amount.toLocaleString()} ${price.currency}`;
  if (price.minAmount != null && price.maxAmount != null) {
    return `${price.minAmount.toLocaleString()} – ${price.maxAmount.toLocaleString()} ${price.currency}`;
  }
  return price.currency;
}

interface Tool {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  path: string;
}

// Static "quick category" filter chips. Each one gets a signature gradient and
// a list of keywords used as the server `q` query when picked. Designed to be
// the most-tapped specialties in Uzbekistan medical apps.
type QuickCategoryIcon =
  | { lib: 'ion'; name: keyof typeof Ionicons.glyphMap }
  | { lib: 'mci'; name: keyof typeof MaterialCommunityIcons.glyphMap };

interface QuickCategory {
  key: string;
  uz: string;
  ru: string;
  icon: QuickCategoryIcon;
  gradient: [string, string];
  keywords: string[];
}

const QUICK_CATEGORIES: QuickCategory[] = [
  {
    key: 'stomatolog',
    uz: 'Tish',
    ru: 'Стомат.',
    icon: { lib: 'mci', name: 'tooth-outline' },
    gradient: ['#06b6d4', '#3b82f6'],
    keywords: ['stomatolog', 'стоматолог', 'tish', 'зуб'],
  },
  {
    key: 'kardiolog',
    uz: 'Yurak',
    ru: 'Кардио',
    icon: { lib: 'ion', name: 'heart' },
    gradient: ['#ef4444', '#f97316'],
    keywords: ['kardiolog', 'кардиолог', 'yurak', 'сердц'],
  },
  {
    key: 'pediatr',
    uz: 'Bolalar',
    ru: 'Дети',
    icon: { lib: 'ion', name: 'happy' },
    gradient: ['#f59e0b', '#fb7185'],
    keywords: ['pediatr', 'педиатр', 'bola', 'дет'],
  },
  {
    key: 'oftalmolog',
    uz: "Ko'z",
    ru: 'Глаза',
    icon: { lib: 'ion', name: 'eye' },
    gradient: ['#6366f1', '#a855f7'],
    keywords: ['oftalmolog', 'офтальмолог', 'окулист', "ko'z", 'глаз'],
  },
  {
    key: 'nevrolog',
    uz: 'Asab',
    ru: 'Невро',
    icon: { lib: 'mci', name: 'brain' },
    gradient: ['#8b5cf6', '#ec4899'],
    keywords: ['nevrolog', 'невролог', 'asab', 'нерв'],
  },
  {
    key: 'dermatolog',
    uz: 'Teri',
    ru: 'Кожа',
    icon: { lib: 'mci', name: 'leaf' },
    gradient: ['#10b981', '#34d399'],
    keywords: ['dermatolog', 'дерматолог', 'teri', 'кож'],
  },
  {
    key: 'ginekolog',
    uz: 'Ayollar',
    ru: 'Жен.',
    icon: { lib: 'ion', name: 'female' },
    gradient: ['#ec4899', '#f472b6'],
    keywords: ['ginekolog', 'гинеколог'],
  },
];

function QuickCategoryIconView({
  icon,
  size,
  color,
}: {
  icon: QuickCategoryIcon;
  size: number;
  color: string;
}) {
  if (icon.lib === 'mci') {
    return <MaterialCommunityIcons name={icon.name} size={size} color={color} />;
  }
  return <Ionicons name={icon.name} size={size} color={color} />;
}

export default function HomeScreen() {
  const router = useRouter();
  const language = useAuthStore((s) => s.language) ?? 'uz';
  const patient = useAuthStore((s) => s.patient);
  const theme = useThemeStore((s) => s.theme);
  const t = getTranslations(language);
  const tokens = getTokens(theme);
  const avatarUri = patient?.avatarUrl || DEFAULT_AVATAR;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [serviceSuggestions, setServiceSuggestions] = useState<PublicServiceItem[]>([]);
  const [clinicSuggestions, setClinicSuggestions] = useState<ClinicListItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [nextBooking, setNextBooking] = useState<Booking | null>(null);
  const [nextPill, setNextPill] = useState<NextPillInfo | null>(null);
  const [clinics, setClinics] = useState<ClinicListItem[]>([]);
  const [clinicsLoading, setClinicsLoading] = useState(true);
  const [featured, setFeatured] = useState<PublicServiceItem[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [nearestPharmacies, setNearestPharmacies] = useState<PublicPharmacyItem[]>([]);
  const [nearestPharmaciesLoading, setNearestPharmaciesLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadChats, setUnreadChats] = useState<ChatConversation[]>([]);

  const [quickCategory, setQuickCategory] = useState<string | null>(null);
  const [quickResults, setQuickResults] = useState<PublicServiceItem[]>([]);
  const [quickLoading, setQuickLoading] = useState(false);
  const [priceFilterVisible, setPriceFilterVisible] = useState(false);

  const { getUnreadCount, hydrated, hydrate } = useNotificationStore();
  const unread = getUnreadCount();

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  const loadAll = useCallback(async () => {
    await Promise.all([
      getClinicsList(6).then(setClinics).catch(() => setClinics([])),
      getNextUpcomingBooking().then(setNextBooking).catch(() => setNextBooking(null)),
      getMyNextPill()
        .then((p) => setNextPill(p))
        .catch(() => setNextPill(null)),
      searchServicesWithFilters({}, 1, 30)
        .then((r) => setFeatured(shuffle(r.services ?? []).slice(0, 8)))
        .catch(() => setFeatured([]))
        .finally(() => setFeaturedLoading(false)),
      listStories(20).then(setStories).catch(() => setStories([])),
      listPatientConversations()
        .then((list) => setUnreadChats(list.filter((c) => c.unread > 0)))
        .catch(() => setUnreadChats([])),
    ]);
    setClinicsLoading(false);
  }, []);

  const loadNearbyPharmacies = useCallback(async () => {
    setNearestPharmaciesLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setNearestPharmacies([]);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const rows = await getNearestPharmacies({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        limit: 10,
      });
      setNearestPharmacies(rows);
    } catch {
      setNearestPharmacies([]);
    } finally {
      setNearestPharmaciesLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      listPatientConversations()
        .then((list) => setUnreadChats(list.filter((c) => c.unread > 0)))
        .catch(() => {});
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAll();
      loadNearbyPharmacies();
    }, [loadAll, loadNearbyPharmacies]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAll();
      await loadNearbyPharmacies();
      await hydrate();
    } finally {
      setRefreshing(false);
    }
  }, [loadAll, loadNearbyPharmacies, hydrate]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setServiceSuggestions([]);
      setClinicSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setShowSuggestions(true);
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await searchServicesSuggest(searchQuery.trim(), 10);
        setServiceSuggestions(res.services);
        setClinicSuggestions(res.clinics);
      } catch {
        setServiceSuggestions([]);
        setClinicSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 380);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!quickCategory) {
      setQuickResults([]);
      setQuickLoading(false);
      return;
    }
    const cat = QUICK_CATEGORIES.find((c) => c.key === quickCategory);
    if (!cat) return;
    let cancelled = false;
    setQuickLoading(true);

    const tryQueries = async () => {
      const seen = new Set<string>();
      const collected: PublicServiceItem[] = [];
      for (const kw of cat.keywords) {
        if (cancelled || collected.length >= 12) break;
        try {
          const res = await searchServicesWithFilters({ q: kw }, 1, 12);
          for (const s of res.services ?? []) {
            if (seen.has(s._id)) continue;
            seen.add(s._id);
            collected.push(s);
            if (collected.length >= 12) break;
          }
        } catch {
          /* try next keyword */
        }
      }
      // Last resort: filter the already-loaded `featured` services by category
      // name to guarantee at least *something* shows up.
      if (!cancelled && collected.length === 0) {
        const fallback = featured.filter((s) =>
          cat.keywords.some((k) => (s.categoryName ?? '').toLowerCase().includes(k.toLowerCase())),
        );
        for (const s of fallback) {
          if (!seen.has(s._id)) {
            seen.add(s._id);
            collected.push(s);
          }
        }
      }
      if (!cancelled) {
        setQuickResults(collected);
        setQuickLoading(false);
      }
    };
    tryQueries();
    return () => {
      cancelled = true;
    };
  }, [quickCategory, featured]);

  const tools: Tool[] = [
    {
      title: language === 'uz' ? 'AI Doktor' : 'AI Доктор',
      subtitle: language === 'uz' ? 'Suhbat' : 'Чат',
      icon: 'sparkles',
      gradient: [tokens.brand.iris, tokens.brand.lilac],
      path: '/ai-chat',
    },
    {
      title: language === 'uz' ? '10 ta savol' : '10 вопросов',
      subtitle: language === 'uz' ? 'Holatingizni baholang' : 'Оценка здоровья',
      icon: 'pulse',
      gradient: [tokens.brand.rose, tokens.brand.peach],
      path: '/health-test',
    },
    {
      title: language === 'uz' ? 'Ilk yordam' : 'Первая помощь',
      subtitle: language === 'uz' ? 'Qo‘llanmalar' : 'Инструкции',
      icon: 'medkit',
      gradient: [tokens.brand.mint, '#a7f3d0'],
      path: '/first-aid',
    },
    {
      title: language === 'uz' ? 'AI Tahlil' : 'AI Анализ',
      subtitle: language === 'uz' ? 'AI izohi' : 'AI объяснит',
      icon: 'document-text',
      gradient: [tokens.brand.sky, tokens.brand.skySoft],
      path: '/ai-analyze',
    },
    {
      title: language === 'uz' ? 'Dori eslatma' : 'Таблетки',
      subtitle: language === 'uz' ? 'Vaqtida ichish' : 'Вовремя принимать',
      icon: 'medical',
      gradient: [tokens.brand.indigo, tokens.brand.sky],
      path: '/pill-reminder',
    },
    {
      title: language === 'uz' ? 'Kasalliklar tarixi' : 'История заболеваний',
      subtitle: language === 'uz' ? 'Tashxislar va davolanishlar' : 'Диагнозы и лечение',
      icon: 'pulse',
      gradient: [tokens.brand.rose, tokens.brand.peach],
      path: '/medical-history',
    },
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: tokens.colors.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.brand.iris} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}
            activeOpacity={0.85}
          >
            <Avatar uri={avatarUri} name={patient?.fullName} size={46} ring />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[
                  tokens.type.overline,
                  { color: tokens.colors.textTertiary, marginBottom: 2, letterSpacing: 1 },
                ]}
                numberOfLines={1}
              >
                {language === 'ru' ? 'ПРИВЕТ' : 'SALOM'}
              </Text>
              <Text
                style={{
                  color: tokens.colors.text,
                  fontSize: 16,
                  fontWeight: '700',
                  lineHeight: 20,
                }}
                numberOfLines={1}
              >
                {patient?.fullName?.trim()?.split(/\s+/)[0] ||
                  (language === 'ru' ? 'Пользователь' : 'Foydalanuvchi')}
              </Text>
            </View>
          </TouchableOpacity>
          <IconButton
            icon="notifications-outline"
            onPress={() => router.push('/notifications')}
            badge={unread}
          />
        </View>

        {/* <StoriesRibbon stories={stories} language={language} /> */}

        {/* Search */}
        <View style={styles.searchWrap}>
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: tokens.colors.backgroundInput,
                borderColor: showSuggestions ? tokens.brand.iris : tokens.colors.border,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={tokens.colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: tokens.colors.text }]}
              placeholder={t.searchPlaceholder}
              placeholderTextColor={tokens.colors.textPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => searchQuery && setShowSuggestions(true)}
            />
            <TouchableOpacity
              hitSlop={8}
              onPress={() => {
                Keyboard.dismiss();
                setShowSuggestions(false);
                setPriceFilterVisible(true);
              }}
              style={[styles.searchFilterBtn, { borderLeftColor: tokens.colors.border }]}
              activeOpacity={0.75}
            >
              <Ionicons name="options-outline" size={20} color={tokens.brand.iris} />
            </TouchableOpacity>
            {searchQuery ? (
              <TouchableOpacity
                hitSlop={8}
                onPress={() => {
                  setSearchQuery('');
                  Keyboard.dismiss();
                }}
              >
                <Ionicons name="close-circle" size={18} color={tokens.colors.textTertiary} />
              </TouchableOpacity>
            ) : null}
          </View>

          <HomePriceFilterSheet
            visible={priceFilterVisible}
            onClose={() => setPriceFilterVisible(false)}
            initialQuery={searchQuery}
            language={language}
            tokens={tokens}
          />

          {/* <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/doctor-search')}
            style={[
              styles.mapShortcut,
              { backgroundColor: tokens.colors.backgroundCard, borderColor: tokens.colors.border },
            ]}
          >
            <View style={[styles.mapShortcutIcon, { backgroundColor: tokens.brand.rose + '18' }]}>
              <Ionicons name="medical" size={18} color={tokens.brand.rose} />
            </View>
            <View style={styles.mapShortcutText}>
              <Text style={[styles.mapShortcutTitle, { color: tokens.colors.text }]} numberOfLines={1}>
                {language === 'ru' ? 'Поиск врача' : 'Shifokor qidirish'}
              </Text>
              <Text style={[styles.mapShortcutSubtitle, { color: tokens.colors.textTertiary }]} numberOfLines={1}>
                {language === 'ru' ? 'Специализации и ФИО' : 'Mutaxassislik va F.I.Sh.'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={tokens.colors.textTertiary} />
          </TouchableOpacity> */}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/clinics-map')}
            style={[
              styles.mapShortcut,
              { backgroundColor: tokens.colors.backgroundCard, borderColor: tokens.colors.border },
            ]}
          >
            <View style={[styles.mapShortcutIcon, { backgroundColor: tokens.brand.iris + '18' }]}>
              <Ionicons name="map" size={18} color={tokens.brand.iris} />
            </View>
            <View style={styles.mapShortcutText}>
              <Text style={[styles.mapShortcutTitle, { color: tokens.colors.text }]} numberOfLines={1}>
                {language === 'ru'
                  ? 'Поиск на карте'
                  : language === 'en'
                    ? 'Search on map'
                    : 'Xaritadan qidirish'}
              </Text>
              <Text style={[styles.mapShortcutSubtitle, { color: tokens.colors.textTertiary }]} numberOfLines={1}>
                {language === 'ru'
                  ? 'Ближайшие клиники и аптеки'
                  : language === 'en'
                    ? 'Nearby clinics and pharmacies'
                    : 'Yaqin atrofdagi klinika va aptekalar'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={tokens.colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {showSuggestions && searchQuery.trim() ? (
          <View
            style={[
              styles.suggestions,
              { backgroundColor: tokens.colors.backgroundCard, borderColor: tokens.colors.border },
            ]}
          >
            {searchLoading ? (
              <View style={{ padding: 16, gap: 12 }}>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <SkeletonBlock width={44} height={44} radius={12} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <SkeletonBlock width="80%" height={12} />
                      <SkeletonBlock width="50%" height={10} />
                    </View>
                  </View>
                ))}
              </View>
            ) : serviceSuggestions.length + clinicSuggestions.length === 0 ? (
              <Text style={{ color: tokens.colors.textTertiary, textAlign: 'center', padding: 20, fontSize: 13 }}>
                {t.noResultsFound}
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {clinicSuggestions.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.sugRow, { borderBottomColor: tokens.colors.borderLight }]}
                    onPress={() => {
                      setShowSuggestions(false);
                      setSearchQuery('');
                      Keyboard.dismiss();
                      router.push({ pathname: '/clinic/[id]', params: { id: c.id } });
                    }}
                  >
                    <Image
                      source={{ uri: c.logoUrl || DEFAULT_IMAGE }}
                      style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: tokens.colors.border }}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ color: tokens.colors.text, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
                        {c.clinicDisplayName}
                      </Text>
                      <Text style={{ color: tokens.colors.textTertiary, fontSize: 12 }}>
                        {c.branchesCount} {language === 'uz' ? 'filial' : 'филиалов'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={tokens.colors.textTertiary} />
                  </TouchableOpacity>
                ))}
                {serviceSuggestions.map((s) => (
                  <TouchableOpacity
                    key={s._id}
                    style={[styles.sugRow, { borderBottomColor: tokens.colors.borderLight }]}
                    onPress={() => {
                      setShowSuggestions(false);
                      setSearchQuery('');
                      Keyboard.dismiss();
                      router.push({ pathname: '/service/[id]', params: { id: s._id } });
                    }}
                  >
                    <Image
                      source={{ uri: s.serviceImage || DEFAULT_IMAGE }}
                      style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: tokens.colors.border }}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ color: tokens.colors.text, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
                        {s.title}
                      </Text>
                      <Text style={{ color: tokens.colors.textTertiary, fontSize: 12 }}>{s.clinicDisplayName}</Text>
                    </View>
                    <Text style={{ color: tokens.brand.iris, fontWeight: '700', fontSize: 13 }}>
                      {formatPrice(s.price)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        ) : null}

        {/* Pill reminder banner */}
        {nextPill ? (
              <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
                <View
                  style={[
                    styles.pillBanner,
                    { backgroundColor: tokens.colors.backgroundCard, borderColor: tokens.colors.border },
                  ]}
                >
                  <TouchableOpacity
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                    onPress={() => router.push('/pill-reminder')}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={tokens.gradients.warm as [string, string, ...string[]]}
                      style={styles.pillIcon}
                    >
                      <Ionicons name="medical" size={20} color={tokens.brand.amber} />
                    </LinearGradient>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={{
                          color: tokens.colors.textSecondary,
                          fontSize: 11,
                          fontWeight: '700',
                          letterSpacing: 0.4,
                        }}
                        numberOfLines={1}
                      >
                        {language === 'uz' ? 'Doringizni ichdingizmi?' : 'Вы приняли лекарство?'}
                      </Text>
                      <Text
                        style={{ color: tokens.colors.text, fontSize: 15, fontWeight: '700', marginTop: 3 }}
                        numberOfLines={1}
                      >
                        {nextPill.medicineName} · {nextPill.time}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pillCheckBtn, { backgroundColor: tokens.brand.iris }]}
                    activeOpacity={0.88}
                    onPress={async () => {
                      const pill = nextPill;
                      setNextPill(null);
                      try {
                        if (pill.customReminderId) {
                          await submitCustomReminderPillEvent({
                            reminderId: pill.customReminderId,
                            action: 'taken',
                            date: pill.date,
                            time: pill.time,
                          });
                        } else if (pill.prescriptionId && pill.medicineKey) {
                          await setPrescriptionEvent({
                            prescriptionId: pill.prescriptionId,
                            medicineKey: pill.medicineKey,
                            date: pill.date,
                            time: pill.time,
                            action: 'taken',
                          });
                        }
                        const p = await getMyNextPill().catch(() => null);
                        setNextPill(p);
                      } catch {
                        setNextPill(pill);
                      }
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.pillCheckBtnText}>
                      {language === 'uz' ? 'Ichdim' : language === 'ru' ? 'Принял(а)' : 'Taken'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

        <TouchableWithoutFeedback onPress={() => setShowSuggestions(false)}>
          <View>
            {/* Hero Health Card */}
            <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
              <LinearGradient
                colors={tokens.gradients.hero as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>
                    {language === 'uz' ? "SIZ UCHUN" : 'ДЛЯ ВАС'}
                  </Text>
                  <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 8, lineHeight: 28 }}>
                    {nextBooking
                      ? language === 'uz'
                        ? 'Keyingi tashrif tayyor'
                        : 'Следующий приём готов'
                      : language === 'uz'
                        ? "Shifokor bilan bog'laning"
                        : 'Запишитесь к врачу'}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 6 }}>
                    {nextBooking
                      ? `${nextBooking.scheduledDate.split('-').reverse().join('/')} · ${nextBooking.scheduledTime}`
                      : language === 'uz'
                        ? "Bir necha daqiqada bron qiling"
                        : 'Запись за пару минут'}
                  </Text>
                  <TouchableOpacity
                    style={styles.heroBtn}
                    onPress={() => router.push(nextBooking ? '/(tabs)/appointments' : '/clinics')}
                    activeOpacity={0.85}
                  >
                    <Text style={{ color: tokens.brand.indigoDeep, fontWeight: '800', fontSize: 13 }}>
                      {nextBooking
                        ? language === 'uz'
                          ? "Ko'rish"
                          : 'Посмотреть'
                        : language === 'uz'
                          ? 'Bron qilish'
                          : 'Записаться'}
                    </Text>
                    <Ionicons name="arrow-forward" size={14} color={tokens.brand.indigoDeep} />
                  </TouchableOpacity>
                </View>
                <View style={styles.heroCircle}>
                  <Ionicons name="medkit" size={38} color="#fff" />
                </View>
              </LinearGradient>
            </View>

            <DiscountsSlider
              theme={theme}
              language={language}
              city={patient?.location?.city}
            />

            {/* Unread doctor message alert */}
            {unreadChats.length > 0 ? (
              <View style={{ paddingHorizontal: 20, marginTop: 14 }}>
                <TouchableOpacity
                  style={[
                    styles.chatAlert,
                    { backgroundColor: tokens.colors.backgroundCard, borderColor: tokens.brand.iris + '55' },
                  ]}
                  activeOpacity={0.9}
                  onPress={() =>
                    router.push({ pathname: '/chat/[id]', params: { id: unreadChats[0]._id } })
                  }
                >
                  <LinearGradient colors={tokens.gradients.cool as [string, string, ...string[]]} style={styles.chatAlertIcon}>
                    <Ionicons name="chatbubbles" size={18} color={tokens.brand.iris} />
                  </LinearGradient>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: tokens.colors.text, fontSize: 14, fontWeight: '800' }} numberOfLines={1}>
                      {language === 'uz'
                        ? `Yangi xabar: ${unreadChats[0].doctorName ?? 'Shifokor'}`
                        : `Новое сообщение: ${unreadChats[0].doctorName ?? 'Врач'}`}
                    </Text>
                    <Text style={{ color: tokens.colors.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                      {unreadChats[0].lastMessage ?? (language === 'uz' ? 'Yozishmaga o‘ting' : 'Откройте чат')}
                    </Text>
                  </View>
                  <View style={[styles.chatAlertBadge, { backgroundColor: tokens.brand.iris }]}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                      {unreadChats.reduce((acc, c) => acc + c.unread, 0)}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Quick Tools Grid */}
            <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
              <View style={styles.rowBetween}>
                <Text style={[tokens.type.titleLg, { color: tokens.colors.text }]}>
                  {language === 'uz' ? 'Tezkor' : 'Быстрый доступ'}
                </Text>
              </View>
              <View style={styles.toolsGrid}>
                {tools.map((tool) => (
                  <TouchableOpacity
                    key={tool.title}
                    style={[
                      styles.toolCard,
                      { backgroundColor: tokens.colors.backgroundCard, borderColor: tokens.colors.border },
                    ]}
                    onPress={() => router.push(tool.path as never)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={tool.gradient} style={styles.toolIcon}>
                      <Ionicons name={tool.icon} size={22} color="#fff" />
                    </LinearGradient>
                    <Text style={{ color: tokens.colors.text, fontSize: 14, fontWeight: '700', marginTop: 10 }}>
                      {tool.title}
                    </Text>
                    <Text style={{ color: tokens.colors.textTertiary, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                      {tool.subtitle}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            

            {/* Quick category filter — morphing chips with signature colors */}
            <View style={{ marginTop: 24 }}>
              <View style={[styles.rowBetween, { paddingHorizontal: 20, marginBottom: 14 }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[tokens.type.titleLg, { color: tokens.colors.text }]}>
                    {language === 'uz' ? "Yo'nalish bo'yicha" : 'По направлениям'}
                  </Text>
                  <Text
                    style={{
                      color: tokens.colors.textTertiary,
                      fontSize: 12,
                      marginTop: 2,
                      fontWeight: '500',
                    }}
                    numberOfLines={1}
                  >
                    {language === 'uz'
                      ? 'Mutaxassislik tanlang va xizmatlarni darhol toping'
                      : 'Выберите специальность и найдите услуги мгновенно'}
                  </Text>
                </View>
                {quickCategory ? (
                  <TouchableOpacity hitSlop={10} onPress={() => setQuickCategory(null)}>
                    <Text style={{ color: tokens.brand.iris, fontWeight: '700', fontSize: 13 }}>
                      {language === 'uz' ? 'Tozalash' : 'Сбросить'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity hitSlop={10} onPress={() => router.push('/doctor-search')}>
                    <Text style={{ color: tokens.brand.iris, fontWeight: '700', fontSize: 13 }}>
                      {language === 'uz' ? 'Hammasi →' : 'Все →'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingRight: 24, gap: 10 }}
              >
                {QUICK_CATEGORIES.map((cat) => {
                  const active = quickCategory === cat.key;
                  const label = language === 'ru' ? cat.ru : cat.uz;
                  const tintBg = cat.gradient[0] + '14';
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      activeOpacity={0.85}
                      onPress={() => setQuickCategory(active ? null : cat.key)}
                      style={[
                        styles.qcChipShell,
                        active
                          ? styles.qcChipShellActive
                          : {
                              backgroundColor: tokens.colors.backgroundCard,
                              borderColor: tokens.colors.border,
                            },
                      ]}
                    >
                      {active ? (
                        <LinearGradient
                          colors={cat.gradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFill}
                        />
                      ) : null}
                      <View
                        style={[
                          styles.qcIconTile,
                          {
                            backgroundColor: active ? 'rgba(255,255,255,0.22)' : tintBg,
                            transform: [{ rotate: active ? '0deg' : '-8deg' }],
                          },
                        ]}
                      >
                        <QuickCategoryIconView
                          icon={cat.icon}
                          size={18}
                          color={active ? '#fff' : cat.gradient[0]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.qcChipLabel,
                          { color: active ? '#fff' : tokens.colors.text },
                        ]}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {quickCategory ? (
                <View style={{ marginTop: 16 }}>
                  {quickLoading ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingHorizontal: 20, paddingRight: 24, gap: 12 }}
                    >
                      {[1, 2, 3].map((i) => (
                        <View
                          key={i}
                          style={[
                            styles.serviceCard,
                            { backgroundColor: tokens.colors.backgroundCard, borderColor: tokens.colors.border },
                          ]}
                        >
                          <SkeletonBlock width="100%" height={108} radius={0} />
                          <View style={{ padding: 12, gap: 6 }}>
                            <SkeletonBlock width="80%" height={14} />
                            <SkeletonBlock width="55%" height={12} />
                            <SkeletonBlock width="40%" height={12} />
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  ) : quickResults.length === 0 ? (
                    <View
                      style={{
                        marginHorizontal: 20,
                        padding: 18,
                        borderRadius: 18,
                        backgroundColor: tokens.colors.backgroundCard,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: tokens.colors.border,
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Ionicons
                        name="search-outline"
                        size={26}
                        color={tokens.colors.textTertiary}
                      />
                      <Text style={{ color: tokens.colors.text, fontSize: 14, fontWeight: '700' }}>
                        {language === 'uz' ? 'Hozircha xizmat topilmadi' : 'Услуги пока не найдены'}
                      </Text>
                      <Text
                        style={{
                          color: tokens.colors.textTertiary,
                          fontSize: 12,
                          textAlign: 'center',
                        }}
                      >
                        {language === 'uz'
                          ? 'Boshqa yo\'nalishni tanlab ko\'ring'
                          : 'Попробуйте выбрать другое направление'}
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingHorizontal: 20, paddingRight: 24, gap: 12 }}
                    >
                      {quickResults.map((s) => {
                        const cat = QUICK_CATEGORIES.find((c) => c.key === quickCategory);
                        const accent = cat?.gradient[0] ?? tokens.brand.iris;
                        return (
                          <TouchableOpacity
                            key={s._id}
                            activeOpacity={0.88}
                            onPress={() => router.push({ pathname: '/service/[id]', params: { id: s._id } })}
                            style={[
                              styles.serviceCard,
                              { backgroundColor: tokens.colors.backgroundCard, borderColor: tokens.colors.border },
                            ]}
                          >
                            <View style={{ height: 4, backgroundColor: accent }} />
                            <Image
                              source={{ uri: s.serviceImage || DEFAULT_IMAGE }}
                              style={{ width: '100%', height: 104, backgroundColor: tokens.colors.border }}
                            />
                            <View style={styles.serviceCardBody}>
                              <Text
                                style={{ color: tokens.colors.text, fontSize: 14, fontWeight: '700' }}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                              >
                                {s.title}
                              </Text>
                              <Text
                                style={{
                                  color: tokens.colors.textTertiary,
                                  fontSize: 12,
                                  marginTop: 2,
                                }}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                              >
                                {s.clinicDisplayName}
                              </Text>
                              <Text
                                style={{
                                  color: accent,
                                  fontWeight: '800',
                                  fontSize: 13,
                                  marginTop: 6,
                                }}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                              >
                                {formatPrice(s.price)}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              ) : null}
            </View>

            {/* Top doctors / clinics rail */}
            <View style={{ marginTop: 26 }}>
              <View style={[styles.rowBetween, { paddingHorizontal: 20, marginBottom: 12 }]}>
                <Text style={[tokens.type.titleLg, { color: tokens.colors.text }]}>
                  {language === 'uz' ? 'Eng yaxshi klinikalar' : 'Лучшие клиники'}
                </Text>
                <TouchableOpacity hitSlop={12} onPress={() => router.push('/clinics')}>
                  <Text style={{ color: tokens.brand.iris, fontWeight: '700', fontSize: 14 }}>{t.viewAll}</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingRight: 24, gap: 14 }}
              >
                {clinicsLoading && clinics.length === 0
                  ? [1, 2, 3].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.clinicCard,
                          { backgroundColor: tokens.colors.backgroundCard, borderColor: tokens.colors.border },
                        ]}
                      >
                        <SkeletonBlock width="100%" height={120} radius={0} />
                        <View style={{ padding: 12, gap: 6 }}>
                          <SkeletonBlock width="80%" height={14} />
                          <SkeletonBlock width="50%" height={10} />
                        </View>
                      </View>
                    ))
                  : clinics.map((c) => {
                      const cover = c.coverUrl || c.logoUrl || DEFAULT_COVER;
                      const cats = (c.categories || []).map((x) => (typeof x === 'string' ? x : x.name)).slice(0, 2).join(' · ');
                      return (
                        <TouchableOpacity
                          key={c.id}
                          style={[
                            styles.clinicCard,
                            { backgroundColor: tokens.colors.backgroundCard, borderColor: tokens.colors.border },
                          ]}
                          activeOpacity={0.88}
                          onPress={() => router.push({ pathname: '/clinic/[id]', params: { id: c.id } })}
                        >
                          <Image source={{ uri: cover }} style={{ width: '100%', height: 120, backgroundColor: tokens.colors.border }} />
                          <View style={styles.ratingPill}>
                            <Ionicons name="star" size={11} color={tokens.brand.amber} />
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                              {(c.rating?.avg ?? 0).toFixed(1)}
                            </Text>
                          </View>
                          <View style={{ padding: 12 }}>
                            <Text style={{ color: tokens.colors.text, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
                              {c.clinicDisplayName}
                            </Text>
                            <Text style={{ color: tokens.colors.textTertiary, fontSize: 12, marginTop: 3 }} numberOfLines={1}>
                              {cats || `${c.servicesCount} ${language === 'uz' ? 'xizmat' : 'услуг'}`}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
              </ScrollView>
            </View>

            {/* Featured services */}
            <View style={{ marginTop: 28 }}>
              <View style={[styles.rowBetween, { paddingHorizontal: 20, marginBottom: 12 }]}>
                <Text style={[tokens.type.titleLg, { color: tokens.colors.text }]}>
                  {language === 'uz' ? 'Mashhur xizmatlar' : 'Популярные услуги'}
                </Text>
                <TouchableOpacity hitSlop={12} onPress={() => router.push('/services-results')}>
                  <Text style={{ color: tokens.brand.iris, fontWeight: '700', fontSize: 14 }}>{t.viewAll}</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingRight: 24, gap: 14 }}
              >
                {featuredLoading && featured.length === 0
                  ? [1, 2, 3].map((i) => (
                      <View key={i} style={styles.serviceCardSkeleton}>
                        <SkeletonBlock width="100%" height={110} radius={16} />
                        <View style={{ gap: 6, marginTop: 8 }}>
                          <SkeletonBlock width="80%" height={12} />
                          <SkeletonBlock width="55%" height={10} />
                        </View>
                      </View>
                    ))
                  : featured.map((s) => (
                      <TouchableOpacity
                        key={s._id}
                        style={[
                          styles.serviceCard,
                          { backgroundColor: tokens.colors.backgroundCard, borderColor: tokens.colors.border },
                        ]}
                        activeOpacity={0.88}
                        onPress={() => router.push({ pathname: '/service/[id]', params: { id: s._id } })}
                      >
                        <Image
                          source={{ uri: s.serviceImage || DEFAULT_IMAGE }}
                          style={{ width: '100%', height: 100, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: tokens.colors.border }}
                        />
                        <View style={styles.serviceCardBody}>
                          <Text
                            style={{ color: tokens.colors.text, fontWeight: '700', fontSize: 13, lineHeight: 17 }}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {s.title}
                          </Text>
                          <Text
                            style={{ color: tokens.brand.iris, fontWeight: '800', fontSize: 13, lineHeight: 17, marginTop: 6 }}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {formatPrice(s.price)}
                          </Text>
                          <Text
                            style={{ color: tokens.colors.textTertiary, fontSize: 11, lineHeight: 14, marginTop: 4 }}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {s.clinicDisplayName}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
              </ScrollView>
            </View>

            <FeaturedClinics />
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 10,
  },
  searchWrap: { paddingHorizontal: 20, marginTop: 14, gap: 10 },
  searchBox: {
    height: 52,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500' },
  searchFilterBtn: {
    paddingLeft: 10,
    marginLeft: 2,
    borderLeftWidth: StyleSheet.hairlineWidth,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 2,
  },
  mapShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  mapShortcutIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapShortcutText: { flex: 1, gap: 2, minWidth: 0 },
  mapShortcutTitle: { fontSize: 14, fontWeight: '700', letterSpacing: -0.1 },
  mapShortcutSubtitle: { fontSize: 12, fontWeight: '500' },
  suggestions: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  sugRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    minHeight: 140,
    overflow: 'hidden',
  },
  heroBtn: {
    marginTop: 14,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  toolCard: {
    width: '48%',
    padding: 14,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toolIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pillBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  pillIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pillCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  pillCheckBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  clinicCard: {
    width: 220,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    position: 'relative',
  },
  ratingPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  qcChipShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.2,
    overflow: 'hidden',
    minHeight: 44,
  },
  qcChipShellActive: {
    borderColor: 'transparent',
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  qcIconTile: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qcChipLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  serviceCard: {
    width: 188,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  serviceCardBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  serviceCardSkeleton: {
    width: 188,
    padding: 6,
  },
  emergency: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
  },
  emergencyIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatAlert: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chatAlertIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatAlertBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
