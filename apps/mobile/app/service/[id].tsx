import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getServiceById, type ServiceDetailResponse } from '../../lib/api';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { getTranslations } from '../../lib/translations';
import { getColors } from '../../lib/theme';
import SaveServiceStar from '../components/SaveServiceStar';
import Skeleton from '../components/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 220;
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1576091160399-112ba8e25d1d?w=400&h=300&fit=crop';
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop';

function formatPrice(price: { amount?: number; minAmount?: number; maxAmount?: number; currency: string }): string {
  if (price.amount != null) return `${price.amount.toLocaleString()} ${price.currency}`;
  if (price.minAmount != null && price.maxAmount != null) {
    return `${price.minAmount.toLocaleString()} – ${price.maxAmount.toLocaleString()} ${price.currency}`;
  }
  return price.currency;
}

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const theme = useThemeStore((s) => s.theme);
  const t = getTranslations(language);
  const colors = getColors(theme);
  const [data, setData] = useState<ServiceDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getServiceById(id)
      .then(setData)
      .catch(() => setError('Not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.heroBox, { backgroundColor: colors.border }]}>
          <Skeleton width={SCREEN_WIDTH} height={HERO_HEIGHT} borderRadius={0} />
        </View>
        <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
          <Skeleton width={120} height={13} style={{ marginBottom: 6 }} />
          <Skeleton width="85%" height={20} style={{ marginBottom: 8 }} />
          <Skeleton width={160} height={28} style={{ marginBottom: 12 }} />
          <Skeleton width={100} height={14} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={48} style={{ marginBottom: 20 }} />
          <Skeleton width={60} height={12} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={44} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={44} style={{ marginBottom: 18 }} />
          <Skeleton width={60} height={12} style={{ marginBottom: 8 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Skeleton width={36} height={36} borderRadius={18} />
            <Skeleton width={120} height={14} style={{ marginLeft: 10 }} />
          </View>
          <Skeleton width={60} height={12} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={44} />
        </View>
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{t.noResultsFound}</Text>
        <TouchableOpacity style={styles.backBtnFull} onPress={() => router.back()}>
          <Text style={[styles.backBtnText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { service, clinic } = data;
  const rawService = service as typeof service & { branchNames?: string[]; doctorNames?: string[] };
  const branchNames = rawService.branchNames ?? [];
  const doctorNames = rawService.doctorNames ?? [];
  const branchIds = service.branchIds ?? [];
  const doctorIds = service.doctorIds ?? [];
  // When API doesn't return branch names, show fallback label + index so branch list still works
  const branchList = branchIds.length > 0
    ? branchIds.map((bid, idx) => ({ id: bid, name: branchNames[idx] ?? `${t.branchLabel} ${idx + 1}` }))
    : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroBox, { backgroundColor: colors.border }]}>
          <Image source={{ uri: service.serviceImage || DEFAULT_IMAGE }} style={styles.heroImage} />
          <View style={styles.heroOverlay}>
            <TouchableOpacity style={styles.heroBackBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroStarWrap}>
              <SaveServiceStar service={service} size={22} />
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
          {service.categoryName ? (
            <Text style={[styles.category, { color: colors.textTertiary }]}>{service.categoryName}</Text>
          ) : null}
          <Text style={[styles.title, { color: colors.text }]}>{service.title}</Text>
          <Text style={[styles.price, { color: colors.text }]}>{formatPrice(service.price)}</Text>
          <View style={styles.metaLine}>
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{service.durationMin} {t.minutes}</Text>
            {service.categoryName ? (
              <>
                <Text style={[styles.metaDot, { color: colors.textTertiary }]}> · </Text>
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>{service.categoryName}</Text>
              </>
            ) : null}
          </View>

          {service.description ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>{service.description}</Text>
          ) : null}

          {branchList.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t.branches}</Text>
              {branchList.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.rowLink, { borderBottomColor: colors.border }]}
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: '/branch/[id]', params: { id: b.id, clinicId: clinic._id } })}
                >
                  <Text style={[styles.rowLinkText, { color: colors.text }]}>{b.name}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {doctorNames.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t.doctors}</Text>
              <View style={styles.doctorWrap}>
                {doctorNames.map((name, idx) => (
                  <TouchableOpacity
                    key={doctorIds[idx] ?? idx}
                    style={styles.doctorRow}
                    activeOpacity={0.7}
                    onPress={() => router.push({ pathname: '/doctor/[id]', params: { id: doctorIds[idx], clinicId: clinic._id } })}
                  >
                    <Image source={{ uri: DEFAULT_AVATAR }} style={[styles.doctorAvatar, { backgroundColor: colors.border }]} />
                    <Text style={[styles.doctorName, { color: colors.text }]} numberOfLines={1}>{name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t.clinic}</Text>
            <TouchableOpacity
              style={[styles.rowLink, { borderBottomColor: colors.border }]}
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: '/clinic/[id]', params: { id: clinic._id } })}
            >
              <Text style={[styles.clinicName, { color: colors.primaryLight }]}>{clinic.clinicDisplayName}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.primaryLight} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={[styles.stickyFooter, { backgroundColor: colors.backgroundCard, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.bookButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.9}
          onPress={() => router.push({ pathname: '/book', params: { clinicId: clinic._id, serviceId: id as string } })}
        >
          <Ionicons name="calendar" size={22} color="#fff" style={styles.bookIcon} />
          <Text style={styles.bookButtonText}>{t.bookAppointment}</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { marginBottom: 16 },
  backBtnFull: { padding: 12 },
  backBtnText: { fontSize: 16 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  heroBox: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
  },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  heroBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroStarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  category: { fontSize: 13, marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  price: { fontSize: 28, fontWeight: '800', marginBottom: 12 },
  metaLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  metaText: { fontSize: 14 },
  metaDot: { fontSize: 14 },
  description: { fontSize: 14, lineHeight: 21, marginBottom: 20 },
  section: { marginBottom: 18 },
  sectionLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  rowLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
  },
  rowLinkText: { fontSize: 15 },
  clinicName: { fontSize: 15, fontWeight: '600' },
  doctorWrap: {
    alignSelf: 'flex-start',
    minWidth: 0,
    maxWidth: '100%',
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 0,
    marginBottom: 6,
  },
  doctorAvatar: { width: 36, height: 36, borderRadius: 18 },
  doctorName: { fontSize: 14, marginLeft: 10, maxWidth: 200 },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  bookIcon: { marginRight: 4 },
  bookButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
