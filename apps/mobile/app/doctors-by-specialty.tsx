import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore, DEFAULT_AVATAR } from '../store/auth-store';
import { useThemeStore } from '../store/theme-store';
import { getTokens } from '../lib/design';
import { searchServicesWithFilters, type PublicServiceItem } from '../lib/api';
import {
  getDoctorSpecialty,
  specialtyDisplayName,
  SpecialtyIconView,
} from '../lib/doctor-specialties';
import { findDoctorsForSpecialty, findDoctorsByName, type PublicDoctorMatch } from '../lib/find-doctors';

const DEFAULT_SERVICE_IMG =
  'https://images.unsplash.com/photo-1576091160399-112ba8e25d1d?w=200&h=200&fit=crop';

function formatPrice(price: PublicServiceItem['price']): string {
  if (price.amount != null) return `${price.amount.toLocaleString()} ${price.currency}`;
  if (price.minAmount != null && price.maxAmount != null) {
    return `${price.minAmount.toLocaleString()} – ${price.maxAmount.toLocaleString()} ${price.currency}`;
  }
  return price.currency;
}

export default function DoctorsBySpecialtyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ key?: string; q?: string }>();
  const language = useAuthStore((s) => s.language);
  const theme = useThemeStore((s) => s.theme);
  const tokens = getTokens(theme);
  const isUz = language !== 'ru';

  const specialty = getDoctorSpecialty(String(params.key ?? ''));
  const nameQuery = typeof params.q === 'string' ? params.q.trim() : '';

  const [doctors, setDoctors] = useState<PublicDoctorMatch[]>([]);
  const [services, setServices] = useState<PublicServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const title = specialty ? specialtyDisplayName(specialty, language) : isUz ? 'Shifokorlar' : 'Врачи';

  const load = useCallback(async () => {
    if (!specialty) {
      setDoctors([]);
      setServices([]);
      setLoading(false);
      return;
    }

    const looksLikeName =
      nameQuery.length >= 2 &&
      !specialty.keywords.some((k) => nameQuery.toLowerCase().includes(k.toLowerCase())) &&
      !specialtyDisplayName(specialty, language).toLowerCase().includes(nameQuery.toLowerCase());

    const [doctorList, serviceRes] = await Promise.all([
      looksLikeName
        ? findDoctorsByName(nameQuery, specialty.key)
        : findDoctorsForSpecialty(specialty.key, nameQuery || undefined),
      searchServicesWithFilters({ q: specialty.keywords[0] }, 1, 16).catch(() => ({
        services: [],
        total: 0,
        page: 1,
        limit: 16,
        totalPages: 0,
      })),
    ]);

    setDoctors(doctorList);
    setServices(serviceRes.services ?? []);
  }, [specialty, nameQuery]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => {
        setDoctors([]);
        setServices([]);
      })
      .finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const renderDoctor = ({ item }: { item: PublicDoctorMatch }) => (
    <TouchableOpacity
      style={[styles.doctorCard, { backgroundColor: tokens.colors.backgroundCard, borderColor: tokens.colors.border }]}
      activeOpacity={0.85}
      onPress={() =>
        router.push({ pathname: '/doctor/[id]', params: { id: item.doctorId, clinicId: item.clinicId } })
      }
    >
      <Image source={{ uri: item.avatarUrl || DEFAULT_AVATAR }} style={styles.avatar} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.doctorName, { color: tokens.colors.text }]} numberOfLines={1}>
          {item.doctorName}
        </Text>
        <Text style={[styles.doctorSpec, { color: tokens.colors.textSecondary }]} numberOfLines={1}>
          {item.specialty}
        </Text>
        <Text style={[styles.clinicName, { color: tokens.colors.textTertiary }]} numberOfLines={1}>
          {item.clinicName}
        </Text>
        {(item.ratingAvg ?? 0) > 0 ? (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={13} color="#f59e0b" />
            <Text style={{ color: tokens.colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
              {item.ratingAvg.toFixed(1)} · {item.reviewsCount}
            </Text>
          </View>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={tokens.colors.textTertiary} />
    </TouchableOpacity>
  );

  const renderService = ({ item }: { item: PublicServiceItem }) => (
    <TouchableOpacity
      style={[styles.serviceCard, { backgroundColor: tokens.colors.backgroundCard, borderColor: tokens.colors.border }]}
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: '/service/[id]', params: { id: item._id } })}
    >
      <Image source={{ uri: item.serviceImage || DEFAULT_SERVICE_IMG }} style={styles.serviceImg} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.serviceTitle, { color: tokens.colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.clinicName, { color: tokens.colors.textTertiary }]} numberOfLines={1}>
          {item.clinicDisplayName}
        </Text>
        <Text style={[styles.servicePrice, { color: tokens.brand.iris }]}>{formatPrice(item.price)}</Text>
      </View>
    </TouchableOpacity>
  );

  const ListHeader = () => (
    <View style={styles.listHeader}>
      {specialty ? (
        <View style={styles.heroRow}>
          <LinearGradient colors={specialty.gradient} style={styles.heroIcon}>
            <SpecialtyIconView icon={specialty.icon} size={32} color="#fff" />
          </LinearGradient>
          <Text style={[styles.heroTitle, { color: tokens.colors.text }]}>{title}</Text>
        </View>
      ) : null}
      {!loading && doctors.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: tokens.colors.backgroundSecondary }]}>
          <Ionicons name="person-outline" size={40} color={tokens.colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: tokens.colors.text }]}>
            {isUz ? "Bu yo'nalishda hozircha shifokor yo'q" : 'В этом направлении врачи пока не найдены'}
          </Text>
          <Text style={[styles.emptySub, { color: tokens.colors.textSecondary }]}>
            {isUz
              ? 'Boshqa mutaxassislikni tanlang yoki keyinroq qayta urinib ko‘ring.'
              : 'Выберите другое направление или попробуйте позже.'}
          </Text>
        </View>
      ) : doctors.length > 0 ? (
        <Text style={[styles.sectionTitle, { color: tokens.colors.text }]}>
          {isUz ? 'Shifokorlar' : 'Врачи'}
        </Text>
      ) : null}
    </View>
  );

  const ListFooter = () =>
    services.length > 0 ? (
      <View style={{ marginTop: 8, paddingBottom: 24 }}>
        <Text style={[styles.sectionTitle, { color: tokens.colors.text, marginTop: 16 }]}>
          {isUz ? 'Mos xizmatlar' : 'Подходящие услуги'}
        </Text>
        {services.map((s) => (
          <View key={s._id}>{renderService({ item: s })}</View>
        ))}
      </View>
    ) : null;

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: tokens.colors.background }]} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={tokens.brand.iris} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: tokens.colors.background }]} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={tokens.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: tokens.colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={doctors}
        keyExtractor={(d) => `${d.clinicId}:${d.doctorId}`}
        renderItem={renderDoctor}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={tokens.brand.iris} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  topTitle: { flex: 1, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  listHeader: { paddingTop: 4 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  heroIcon: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { flex: 1, fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 12 },
  emptyBox: {
    alignItems: 'center',
    padding: 28,
    borderRadius: 20,
    marginBottom: 8,
    gap: 10,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  emptySub: { fontSize: 14, lineHeight: 20, textAlign: 'center', fontWeight: '500' },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    gap: 12,
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  doctorName: { fontSize: 16, fontWeight: '700' },
  doctorSpec: { fontSize: 13, marginTop: 2, fontWeight: '500' },
  clinicName: { fontSize: 12, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  serviceCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    gap: 12,
  },
  serviceImg: { width: 72, height: 72, borderRadius: 12 },
  serviceTitle: { fontSize: 15, fontWeight: '700' },
  servicePrice: { fontSize: 14, fontWeight: '800', marginTop: 6 },
});
