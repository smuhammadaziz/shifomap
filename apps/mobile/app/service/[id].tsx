import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getServiceById, type ServiceDetailResponse } from '../../lib/api';
import { useAuthStore } from '../../store/auth-store';
import { getTranslations } from '../../lib/translations';
import SaveServiceStar from '../components/SaveServiceStar';

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
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { service, clinic } = data;
  const branchNames = (service as { branchNames?: string[] }).branchNames;
  const doctorNames = (service as { doctorNames?: string[] }).doctorNames;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{t.serviceDetail}</Text>
        <SaveServiceStar service={service} size={24} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Image source={{ uri: service.serviceImage || DEFAULT_IMAGE }} style={styles.heroImage} />
        <View style={styles.body}>
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
              onPress={() => router.push({ pathname: '/clinic-services/[id]', params: { id: clinic._id } })}
            >
              <Text style={styles.clinicName}>{clinic.clinicDisplayName}</Text>
              <Ionicons name="chevron-forward" size={18} color="#a78bfa" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#f87171', marginBottom: 16 },
  backBtnFull: { padding: 12 },
  backBtnText: { color: '#8b5cf6', fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 8, flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  heroImage: { width: '100%', height: 220, backgroundColor: '#27272a' },
  body: { padding: 20 },
  title: { color: '#ffffff', fontSize: 22, fontWeight: '700', marginBottom: 16 },
  detailRow: { marginBottom: 14 },
  detailLabel: { color: '#71717a', fontSize: 12, marginBottom: 4, textTransform: 'uppercase' },
  detailValue: { color: '#e4e4e7', fontSize: 16 },
  clinicBlock: { marginTop: 20 },
  clinicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181b',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272a',
    marginTop: 8,
  },
  clinicName: { color: '#a78bfa', fontSize: 16, fontWeight: '600' },
});
