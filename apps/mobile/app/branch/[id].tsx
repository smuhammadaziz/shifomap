import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getClinicDetail } from '../../lib/api';
import type { ClinicBranchPublic } from '../../lib/api';
import { useAuthStore } from '../../store/auth-store';
import { getTranslations } from '../../lib/translations';
import Skeleton from '../components/Skeleton';

export default function BranchDetailScreen() {
  const { id: branchId, clinicId } = useLocalSearchParams<{ id: string; clinicId?: string }>();
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const t = getTranslations(language);
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
      <View style={styles.container}>
        <View style={styles.header}>
          <Skeleton width={24} height={24} borderRadius={4} />
          <Skeleton width={180} height={18} style={{ marginLeft: 8, flex: 1 }} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
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
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t.noResultsFound}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnFull}>
          <Text style={styles.backBtnText}>← {t.back}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const addressLine = [branch.address?.city, branch.address?.street].filter(Boolean).join(', ');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{branch.name}</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Ionicons name="business-outline" size={20} color="#8b5cf6" />
            </View>
            <Text style={styles.label}>{t.branchName}</Text>
            <Text style={styles.value}>{branch.name}</Text>
          </View>
          {branch.phone ? (
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                <Ionicons name="call-outline" size={20} color="#22c55e" />
              </View>
              <Text style={styles.label}>{t.phone}</Text>
              <Text style={styles.value}>{branch.phone}</Text>
            </View>
          ) : null}
          {addressLine ? (
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                <Ionicons name="location-outline" size={20} color="#f59e0b" />
              </View>
              <Text style={styles.label}>{t.location}</Text>
              <Text style={styles.value}>{addressLine}</Text>
            </View>
          ) : null}
          {branch.workingHours?.length > 0 ? (
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: 'rgba(14, 165, 233, 0.2)' }]}>
                <Ionicons name="time-outline" size={20} color="#0ea5e9" />
              </View>
              <Text style={styles.label}>{t.workingHours}</Text>
              <View style={styles.hoursList}>
                {branch.workingHours.map((wh, idx) => {
                  const dayKey = `day${wh.day}` as keyof typeof t;
                  const dayLabel = (t[dayKey] as string) ?? String(wh.day);
                  return (
                    <Text key={idx} style={styles.hoursLine}>
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
  scrollContent: { padding: 20 },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  row: { marginBottom: 16 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: { color: '#71717a', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 },
  value: { color: '#f4f4f5', fontSize: 15 },
  hoursList: { gap: 4 },
  hoursLine: { color: '#d4d4d8', fontSize: 14 },
});
