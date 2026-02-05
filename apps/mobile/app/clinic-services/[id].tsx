import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getClinicDetail, getClinicServices, type PublicServiceItem } from '../../lib/api';
import { useAuthStore } from '../../store/auth-store';
import { getTranslations } from '../../lib/translations';
import Skeleton from '../components/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 220;
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800';
const DEFAULT_SERVICE_IMAGE = 'https://images.unsplash.com/photo-1576091160399-112ba8e25d1d?w=200&h=200&fit=crop';

function formatPrice(price: PublicServiceItem['price']): string {
  if (price.amount != null) return `${price.amount.toLocaleString()} ${price.currency}`;
  if (price.minAmount != null && price.maxAmount != null) {
    return `${price.minAmount.toLocaleString()} – ${price.maxAmount.toLocaleString()} ${price.currency}`;
  }
  return price.currency;
}

function getOpenUntil(workingHours: Array<{ from: string; to: string }>): string | null {
  if (!workingHours?.length) return null;
  const last = workingHours[workingHours.length - 1];
  return last ? `${last.to}` : null;
}

export default function ClinicServicesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const t = getTranslations(language);
  const [clinic, setClinic] = useState<Awaited<ReturnType<typeof getClinicDetail>> | null>(null);
  const [services, setServices] = useState<PublicServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([getClinicDetail(id), getClinicServices(id)])
      .then(([clinicData, servicesList]) => {
        setClinic(clinicData);
        setServices(servicesList);
      })
      .catch(() => setError('Failed'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.heroBox}>
          <Skeleton width={SCREEN_WIDTH} height={HERO_HEIGHT} borderRadius={0} style={StyleSheet.absoluteFill} />
        </View>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Skeleton width={56} height={56} borderRadius={14} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Skeleton width="75%" height={20} style={{ marginBottom: 6 }} />
              <Skeleton width="50%" height={14} />
            </View>
          </View>
          <Skeleton width={80} height={12} style={{ marginBottom: 12 }} />
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.serviceCard}>
              <Skeleton width={56} height={56} borderRadius={14} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Skeleton width="70%" height={16} style={{ marginBottom: 6 }} />
                <Skeleton width="45%" height={14} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }
  if (error || !clinic) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t.noResultsFound}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnFull}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const coverUri = clinic.branding?.coverUrl || clinic.branding?.logoUrl || DEFAULT_COVER;
  const firstBranch = clinic.branches?.[0];
  const locationText = firstBranch
    ? `${firstBranch.address?.city ?? ''} ${firstBranch.address?.street ?? ''}`.trim() || firstBranch.name
    : null;
  const openUntil = firstBranch ? getOpenUntil(firstBranch.workingHours) : null;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero image - separated box */}
        <View style={styles.heroBox}>
          <Image source={{ uri: coverUri }} style={styles.heroImage} />
          <View style={styles.heroOverlay}>
            <TouchableOpacity style={styles.heroBackBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.heroFavoriteBtn}>
              <Ionicons name="heart-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.card}>
          <View style={styles.clinicNameRow}>
            <Text style={styles.clinicName}>{clinic.clinicDisplayName}</Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />
            </View>
          </View>
          {(locationText || openUntil) && (
            <View style={styles.metaRow}>
              {locationText ? (
                <>
                  <Ionicons name="location-outline" size={16} color="#a1a1aa" />
                  <Text style={styles.metaText}>{locationText}</Text>
                </>
              ) : null}
              {locationText && openUntil ? <Text style={styles.metaDot}>•</Text> : null}
              {openUntil ? (
                <>
                  <Ionicons name="time-outline" size={16} color="#22c55e" />
                  <Text style={[styles.metaText, { color: '#22c55e' }]}>{t.openUntil} {openUntil}</Text>
                </>
              ) : null}
            </View>
          )}
          {(clinic.rating?.count ?? 0) > 0 && (
            <View style={styles.ratingBox}>
              <View>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={18} color="#facc15" />
                  <Text style={styles.ratingValue}>{clinic.rating.avg.toFixed(1)} / 5.0</Text>
                </View>
                <Text style={styles.ratingReviews}>Based on {clinic.rating.count} reviews</Text>
              </View>
              <View style={styles.topRatedPill}>
                <Text style={styles.topRatedText}>{t.topRated}</Text>
              </View>
            </View>
          )}
          {(clinic.description?.full || clinic.description?.short) && (
            <View style={styles.aboutSection}>
              <Text style={styles.sectionTitle}>{t.about}</Text>
              <Text style={styles.aboutText} numberOfLines={6}>
                {clinic.description.full || clinic.description.short || ''}
              </Text>
            </View>
          )}

          {/* Services list */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.viewClinicServices}</Text>
            {services.length === 0 ? (
              <Text style={styles.noResults}>{t.noResultsFound}</Text>
            ) : (
              services.map((item) => (
                <TouchableOpacity
                  key={item._id}
                  style={styles.serviceCard}
                  activeOpacity={0.8}
                  onPress={() => router.push({ pathname: '/service/[id]', params: { id: item._id } })}
                >
                  <Image
                    source={{ uri: item.serviceImage || DEFAULT_SERVICE_IMAGE }}
                    style={styles.serviceImage}
                  />
                  <View style={styles.serviceBody}>
                    <Text style={styles.serviceTitle} numberOfLines={2}>{item.title}</Text>
                    {item.categoryName ? (
                      <Text style={styles.serviceCategory}>{item.categoryName}</Text>
                    ) : null}
                    <Text style={styles.servicePrice}>{formatPrice(item.price)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#71717a" />
                </TouchableOpacity>
              ))
            )}
          </View>
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#f87171', marginBottom: 12 },
  backBtnFull: { padding: 12 },
  backBtnText: { color: '#8b5cf6', fontSize: 16 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  heroBox: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    backgroundColor: '#27272a',
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
  heroFavoriteBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#18181b',
    paddingHorizontal: 20,
    paddingTop: 24,
    borderWidth: 1,
    borderColor: '#27272a',
    borderBottomWidth: 0,
  },
  clinicNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  clinicName: { color: '#fff', fontSize: 24, fontWeight: '700', flex: 1 },
  verifiedBadge: { marginLeft: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  metaText: { color: '#a1a1aa', fontSize: 13 },
  metaDot: { color: '#52525b', fontSize: 13 },
  ratingBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingValue: { color: '#fff', fontSize: 18, fontWeight: '700' },
  ratingReviews: { color: '#71717a', fontSize: 12, marginTop: 4 },
  topRatedPill: { backgroundColor: '#22c55e', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  topRatedText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  aboutSection: { marginBottom: 24 },
  sectionTitle: {
    color: '#a1a1aa',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  aboutText: { color: '#d4d4d8', fontSize: 15, lineHeight: 22 },
  section: { marginBottom: 24 },
  noResults: { color: '#71717a', fontSize: 14 },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  serviceImage: { width: 72, height: 72, borderRadius: 14, backgroundColor: '#3f3f46' },
  serviceBody: { flex: 1, marginLeft: 14 },
  serviceTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  serviceCategory: { color: '#a1a1aa', fontSize: 12, marginTop: 4 },
  servicePrice: { color: '#a78bfa', fontSize: 14, fontWeight: '600', marginTop: 4 },
});
