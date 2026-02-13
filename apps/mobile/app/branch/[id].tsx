import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getClinicDetail } from '../../lib/api';
import type { ClinicBranchPublic } from '../../lib/api';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { getTranslations } from '../../lib/translations';
import { getColors } from '../../lib/theme';
import Skeleton from '../components/Skeleton';

export default function BranchDetailScreen() {
  const { id: branchId, clinicId } = useLocalSearchParams<{ id: string; clinicId?: string }>();
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const theme = useThemeStore((s) => s.theme);
  const t = getTranslations(language);
  const colors = getColors(theme);
  const [branch, setBranch] = useState<ClinicBranchPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!branchId || !clinicId) {
      setError('Missing params');
      setLoading(false);
      return;
    }
    setLoading(true);
    getClinicDetail(clinicId)
      .then((clinic) => {
        const found = clinic.branches?.find((b) => b._id === branchId);
        setBranch(found ?? null);
        if (!found) setError('Branch not found');
      })
      .catch(() => setError('Not found'))
      .finally(() => setLoading(false));
  }, [branchId, clinicId]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Skeleton width={24} height={24} borderRadius={4} />
          <Skeleton width={180} height={18} style={{ marginLeft: 8, flex: 1 }} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <View style={styles.row}>
              <Skeleton width={36} height={36} borderRadius={10} style={{ marginBottom: 8 }} />
              <Skeleton width={80} height={11} style={{ marginBottom: 4 }} />
              <Skeleton width="100%" height={15} />
            </View>
            <View style={styles.row}>
              <Skeleton width={36} height={36} borderRadius={10} style={{ marginBottom: 8 }} />
              <Skeleton width={60} height={11} style={{ marginBottom: 4 }} />
              <Skeleton width="70%" height={15} />
            </View>
            <View style={styles.row}>
              <Skeleton width={36} height={36} borderRadius={10} style={{ marginBottom: 8 }} />
              <Skeleton width={80} height={11} style={{ marginBottom: 4 }} />
              <Skeleton width="100%" height={15} />
            </View>
            <View style={styles.row}>
              <Skeleton width={36} height={36} borderRadius={10} style={{ marginBottom: 8 }} />
              <Skeleton width={100} height={11} style={{ marginBottom: 4 }} />
              <Skeleton width="90%" height={14} style={{ marginTop: 4 }} />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }
  if (error || !branch) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{t.noResultsFound}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnFull}>
          <Text style={[styles.backBtnText, { color: colors.primary }]}>← {t.back}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const addressLine = [branch.address?.city, branch.address?.street].filter(Boolean).join(', ');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{branch.name}</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryBg }]}>
              <Ionicons name="business-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.label, { color: colors.textTertiary }]}>{t.branchName}</Text>
            <Text style={[styles.value, { color: colors.text }]}>{branch.name}</Text>
          </View>
          {branch.phone ? (
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: colors.successBg }]}>
                <Ionicons name="call-outline" size={20} color={colors.success} />
              </View>
              <Text style={[styles.label, { color: colors.textTertiary }]}>{t.phone}</Text>
              <Text style={[styles.value, { color: colors.text }]}>{branch.phone}</Text>
            </View>
          ) : null}
          {addressLine ? (
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: colors.warningBg }]}>
                <Ionicons name="location-outline" size={20} color={colors.warning} />
              </View>
              <Text style={[styles.label, { color: colors.textTertiary }]}>{t.location}</Text>
              <Text style={[styles.value, { color: colors.text }]}>{addressLine}</Text>
            </View>
          ) : null}
          {branch.workingHours?.length > 0 ? (
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: colors.infoBg }]}>
                <Ionicons name="time-outline" size={20} color={colors.info} />
              </View>
              <Text style={[styles.label, { color: colors.textTertiary }]}>{t.workingHours}</Text>
              <View style={styles.hoursList}>
                {branch.workingHours.map((wh, idx) => {
                  const dayKey = `day${wh.day}` as keyof typeof t;
                  const dayLabel = (t[dayKey] as string) ?? String(wh.day);
                  return (
                    <Text key={idx} style={[styles.hoursLine, { color: colors.textSecondary }]}>
                      {dayLabel}: {wh.from} – {wh.to}
                    </Text>
                  );
                })}
              </View>
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
  scrollContent: { padding: 20 },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  row: { marginBottom: 16 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: { fontSize: 11, textTransform: 'uppercase', marginBottom: 4 },
  value: { fontSize: 15 },
  hoursList: { gap: 4 },
  hoursLine: { fontSize: 14 },
});
