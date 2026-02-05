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
import { getClinicDetail, type ClinicDoctorPublic } from '../../lib/api';
import { useAuthStore } from '../../store/auth-store';
import { getTranslations } from '../../lib/translations';
import Skeleton from '../components/Skeleton';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop';

function DetailRow({ label, value }: { label: string; value: string | undefined }) {
  if (value == null || value === '') return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function DoctorDetailScreen() {
  const { id: doctorId, clinicId } = useLocalSearchParams<{ id: string; clinicId?: string }>();
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const t = getTranslations(language);
  const [doctor, setDoctor] = useState<ClinicDoctorPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!doctorId || !clinicId) {
      setError('Missing params');
      setLoading(false);
      return;
    }
    setLoading(true);
    getClinicDetail(clinicId)
      .then((clinic) => {
        const found = clinic.doctors?.find((d) => d._id === doctorId);
        setDoctor(found ?? null);
        if (!found) setError('Doctor not found');
      })
      .catch(() => setError('Not found'))
      .finally(() => setLoading(false));
  }, [doctorId, clinicId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Skeleton width={24} height={24} borderRadius={4} />
          <Skeleton width={120} height={18} style={{ marginLeft: 8, flex: 1 }} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.profileCard}>
            <Skeleton width={100} height={100} borderRadius={50} />
            <Skeleton width="70%" height={22} style={{ marginTop: 16, marginBottom: 6 }} />
            <Skeleton width={140} height={15} />
          </View>
          <View style={styles.body}>
            <Skeleton width={80} height={12} style={{ marginBottom: 4 }} />
            <Skeleton width="100%" height={16} style={{ marginBottom: 16 }} />
            <Skeleton width={60} height={12} style={{ marginBottom: 4 }} />
            <Skeleton width="100%" height={48} style={{ marginBottom: 16 }} />
            <Skeleton width={80} height={12} style={{ marginBottom: 4 }} />
            <Skeleton width="100%" height={40} />
          </View>
        </ScrollView>
      </View>
    );
  }
  if (error || !doctor) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t.noResultsFound}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnFull}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const scheduleText = doctor.schedule?.weekly?.length
    ? doctor.schedule.weekly
        .map((w) => `${dayNames[w.day - 1] ?? w.day}: ${w.from}-${w.to}`)
        .join('\n')
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{t.doctorDetail}</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <Image
            source={{ uri: doctor.avatarUrl || DEFAULT_AVATAR }}
            style={styles.avatar}
          />
          <Text style={styles.doctorName}>{doctor.fullName}</Text>
          <Text style={styles.specialty}>{doctor.specialty}</Text>
        </View>
        <View style={styles.body}>
          <DetailRow label={t.specialty} value={doctor.specialty} />
          <DetailRow label={t.description} value={doctor.bio || undefined} />
          {scheduleText ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Schedule</Text>
              <Text style={styles.detailValue}>{scheduleText}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ height: 40 }} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 8, flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#27272a' },
  doctorName: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 16 },
  specialty: { color: '#a78bfa', fontSize: 15, marginTop: 6 },
  body: { padding: 20 },
  detailRow: { marginBottom: 16 },
  detailLabel: { color: '#71717a', fontSize: 12, textTransform: 'uppercase', marginBottom: 4 },
  detailValue: { color: '#e4e4e7', fontSize: 16, lineHeight: 24 },
});
