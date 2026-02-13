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
import { useThemeStore } from '../../store/theme-store';
import { getTranslations } from '../../lib/translations';
import { getColors } from '../../lib/theme';
import Skeleton from '../components/Skeleton';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop';

export default function DoctorDetailScreen() {
  const { id: doctorId, clinicId } = useLocalSearchParams<{ id: string; clinicId?: string }>();
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const theme = useThemeStore((s) => s.theme);
  const t = getTranslations(language);
  const colors = getColors(theme);
  const [doctor, setDoctor] = useState<ClinicDoctorPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function DetailRow({ label, value }: { label: string; value: string | undefined }) {
    if (value == null || value === '') return null;
    return (
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
      </View>
    );
  }

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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Skeleton width={24} height={24} borderRadius={4} />
          <Skeleton width={120} height={18} style={{ marginLeft: 8, flex: 1 }} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.profileCard, { borderBottomColor: colors.border }]}>
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
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{t.noResultsFound}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnFull}>
          <Text style={[styles.backBtnText, { color: colors.primary }]}>← Back</Text>
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{t.doctorDetail}</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, { borderBottomColor: colors.border }]}>
          <Image
            source={{ uri: doctor.avatarUrl || DEFAULT_AVATAR }}
            style={[styles.avatar, { backgroundColor: colors.border }]}
          />
          <Text style={[styles.doctorName, { color: colors.text }]}>{doctor.fullName}</Text>
          <Text style={[styles.specialty, { color: colors.primaryLight }]}>{doctor.specialty}</Text>
        </View>
        <View style={styles.body}>
          <DetailRow label={t.specialty} value={doctor.specialty} />
          <DetailRow label={t.description} value={doctor.bio || undefined} />
          {scheduleText ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Schedule</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{scheduleText}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { marginBottom: 12 },
  backBtnFull: { padding: 12 },
  backBtnText: { fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '600', marginLeft: 8, flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  doctorName: { fontSize: 22, fontWeight: '700', marginTop: 16 },
  specialty: { fontSize: 15, marginTop: 6 },
  body: { padding: 20 },
  detailRow: { marginBottom: 16 },
  detailLabel: { fontSize: 12, textTransform: 'uppercase', marginBottom: 4 },
  detailValue: { fontSize: 16, lineHeight: 24 },
});
