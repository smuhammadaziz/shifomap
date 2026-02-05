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
import { getTranslations } from '../../lib/translations';
import SaveServiceStar from '../components/SaveServiceStar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 240;
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1576091160399-112ba8e25d1d?w=400&h=300&fit=crop';

function formatPrice(price: { amount?: number; minAmount?: number; maxAmount?: number; currency: string }): string {
  if (price.amount != null) return `${price.amount.toLocaleString()} ${price.currency}`;
  if (price.minAmount != null && price.maxAmount != null) {
    return `${price.minAmount.toLocaleString()} – ${price.maxAmount.toLocaleString()} ${price.currency}`;
  }
  return price.currency;
}

function DetailRow({ label, value }: { label: string; value: string | undefined }) {
  if (value == null || value === '') return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const t = getTranslations(language);
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t.noResultsFound}</Text>
        <TouchableOpacity style={styles.backBtnFull} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { service, clinic } = data;
  const branchNames = (service as { branchNames?: string[] }).branchNames;
  const doctorNames = (service as { doctorNames?: string[] }).doctorNames;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero image - separated box */}
        <View style={styles.heroBox}>
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

        {/* Info card */}
        <View style={styles.card}>
          <Text style={styles.title}>{service.title}</Text>
          <DetailRow label={t.description} value={service.description || undefined} />
          <DetailRow label={t.category} value={service.categoryName || undefined} />
          <DetailRow label={t.price} value={formatPrice(service.price)} />
          <DetailRow label={t.durationMin} value={`${service.durationMin} ${t.minutes}`} />
          {branchNames && branchNames.length > 0 && (
            <DetailRow label={t.branches} value={branchNames.join(', ')} />
          )}
          {doctorNames && doctorNames.length > 0 && (
            <DetailRow label={t.doctors} value={doctorNames.join(', ')} />
          )}
          <View style={styles.clinicBlock}>
            <Text style={styles.detailLabel}>{t.clinic}</Text>
            <TouchableOpacity
              style={styles.clinicChip}
              onPress={() => router.push({ pathname: '/clinic/[id]', params: { id: clinic._id } })}
            >
              <Text style={styles.clinicName}>{clinic.clinicDisplayName}</Text>
              <Ionicons name="chevron-forward" size={18} color="#a78bfa" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Book button - for this service */}
      <View style={styles.stickyFooter}>
        <TouchableOpacity
          style={styles.bookButton}
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
  container: { flex: 1, backgroundColor: '#09090b' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#f87171', marginBottom: 16 },
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
  heroStarWrap: {
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
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: '#27272a',
    borderBottomWidth: 0,
  },
  title: { color: '#ffffff', fontSize: 22, fontWeight: '700', marginBottom: 16 },
  detailRow: { marginBottom: 14 },
  detailLabel: { color: '#71717a', fontSize: 12, marginBottom: 4, textTransform: 'uppercase' },
  detailValue: { color: '#e4e4e7', fontSize: 16 },
  clinicBlock: { marginTop: 20 },
  clinicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#27272a',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3f3f46',
    marginTop: 8,
  },
  clinicName: { color: '#a78bfa', fontSize: 16, fontWeight: '600' },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 12,
    backgroundColor: '#18181b',
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  bookIcon: { marginRight: 4 },
  bookButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
