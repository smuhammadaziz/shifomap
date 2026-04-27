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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
  searchServicesWithFilters,
  listPatientConversations,
  type PublicServiceItem,
  type Booking,
  type ClinicListItem,
  type ChatConversation,
} from '../../lib/api';
import { Avatar, IconButton, SkeletonBlock } from '../../components/ui';

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

function greetingKey(lang: string, name: string | undefined) {
  const h = new Date().getHours();
  if (lang === 'ru') {
    if (h < 6) return `Доброй ночи${name ? ', ' + name : ''}`;
    if (h < 12) return `Доброе утро${name ? ', ' + name : ''}`;
    if (h < 18) return `Добрый день${name ? ', ' + name : ''}`;
    return `Добрый вечер${name ? ', ' + name : ''}`;
  }
  if (h < 6) return `Tungi salom${name ? ', ' + name : ''}`;
  if (h < 12) return `Xayrli tong${name ? ', ' + name : ''}`;
  if (h < 18) return `Xayrli kun${name ? ', ' + name : ''}`;
  return `Xayrli kech${name ? ', ' + name : ''}`;
}

interface Tool {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  path: string;
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
  const [nextPill, setNextPill] = useState<{ time: string; medicineName: string } | null>(null);
  const [clinics, setClinics] = useState<ClinicListItem[]>([]);
  const [clinicsLoading, setClinicsLoading] = useState(true);
  const [featured, setFeatured] = useState<PublicServiceItem[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadChats, setUnreadChats] = useState<ChatConversation[]>([]);

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
        .then((p) => (p ? setNextPill({ time: p.time, medicineName: p.medicineName }) : setNextPill(null)))
        .catch(() => setNextPill(null)),
      searchServicesWithFilters({}, 1, 30)
        .then((r) => setFeatured(shuffle(r.services ?? []).slice(0, 8)))
        .catch(() => setFeatured([]))
        .finally(() => setFeaturedLoading(false)),
      listPatientConversations()
        .then((list) => setUnreadChats(list.filter((c) => c.unread > 0)))
        .catch(() => setUnreadChats([])),
    ]);
    setClinicsLoading(false);
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
    }, [loadAll]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAll();
      await hydrate();
    } finally {
      setRefreshing(false);
    }
  }, [loadAll, hydrate]);

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

  const tools: Tool[] = [
    {
      title: language === 'uz' ? 'AI Doktor' : 'AI Доктор',
      subtitle: language === 'uz' ? 'Suhbat' : 'Чат',
      icon: 'sparkles',
      gradient: [tokens.brand.iris, tokens.brand.lilac],
      path: '/ai-chat',
    },
    {
      title: language === 'uz' ? '8 ta savol' : '8 вопросов',
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
            <View style={{ flex: 1 }}>
              <Text style={{ color: tokens.colors.textTertiary, fontSize: 12, fontWeight: '600' }}>
                {greetingKey(language, patient?.fullName?.split(' ')[0])}
              </Text>
              <Text style={[tokens.type.title, { color: tokens.colors.text }]} numberOfLines={1}>
                {language === 'uz' ? "Qanday yordam kerak?" : 'Чем помочь вам сегодня?'}
              </Text>
            </View>
          </TouchableOpacity>
          <IconButton
            icon="notifications-outline"
            onPress={() => router.push('/notifications')}
            badge={unread}
          />
        </View>

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
            ) : (
              <TouchableOpacity hitSlop={8} onPress={() => router.push('/clinics-map')}>
                <Ionicons name="options" size={18} color={tokens.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
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

            {/* Pill reminder banner */}
            {nextPill ? (
              <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
                <TouchableOpacity
                  style={[
                    styles.pillBanner,
                    { backgroundColor: tokens.colors.backgroundCard, borderColor: tokens.colors.border },
                  ]}
                  onPress={() => router.push('/pill-reminder')}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={tokens.gradients.warm as [string, string, ...string[]]}
                    style={styles.pillIcon}
                  >
                    <Ionicons name="medical" size={20} color={tokens.brand.amber} />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: tokens.colors.textTertiary, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 }}>
                      {language === 'uz' ? 'KEYINGI DORI' : 'СЛЕДУЮЩАЯ ТАБЛЕТКА'}
                    </Text>
                    <Text style={{ color: tokens.colors.text, fontSize: 15, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
                      {nextPill.medicineName} · {nextPill.time}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={tokens.colors.textTertiary} />
                </TouchableOpacity>
              </View>
            ) : null}

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
                        <View style={{ padding: 12 }}>
                          <Text style={{ color: tokens.colors.text, fontWeight: '700', fontSize: 13 }} numberOfLines={2}>
                            {s.title}
                          </Text>
                          <Text style={{ color: tokens.brand.iris, fontWeight: '800', fontSize: 14, marginTop: 6 }}>
                            {formatPrice(s.price)}
                          </Text>
                          <Text style={{ color: tokens.colors.textTertiary, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                            {s.clinicDisplayName}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
              </ScrollView>
            </View>

            {/* Emergency banner */}
            <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
              <LinearGradient
                colors={[tokens.brand.rose, '#f43f5e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.emergency}
              >
                <View style={[styles.emergencyIcon]}>
                  <Ionicons name="call" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>
                    {language === 'uz' ? 'Shoshilinch yordam' : 'Экстренная помощь'}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 }}>
                    103 · {language === 'uz' ? '24/7 onlayn' : '24/7 онлайн'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.emergencyBtn}
                  onPress={() => router.push('/first-aid')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="arrow-forward" size={16} color="#f43f5e" />
                </TouchableOpacity>
              </LinearGradient>
            </View>
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
  searchWrap: { paddingHorizontal: 20, marginTop: 14 },
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
    padding: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  pillIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
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
  serviceCard: {
    width: 180,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  serviceCardSkeleton: {
    width: 180,
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
