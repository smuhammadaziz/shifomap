import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getPrescriptionById, setPrescriptionEvent, type PrescriptionDetail } from '../../lib/api';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { getTranslations } from '../../lib/translations';
import { getColors } from '../../lib/theme';

export default function PrescriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const language = useAuthStore((s) => s.language) ?? 'uz';
  const theme = useThemeStore((s) => s.theme);
  const t = getTranslations(language);
  const colors = getColors(theme);
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<PrescriptionDetail | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const load = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const d = await getPrescriptionById(id, today);
      setData(d);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, today]);

  useEffect(() => {
    load();
  }, [load]);

  const onAction = async (medicineKey: string, time: string, action: 'taken' | 'skipped') => {
    if (!id) return;
    const key = `${medicineKey}|${time}`;
    setBusyKey(key);
    try {
      await setPrescriptionEvent({ prescriptionId: id, medicineKey, date: today, time, action });
      await load(true);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t.myPrescriptions}</Text>
      </View>

      {loading || !data ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        >
          <View style={[styles.infoCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {data.doctorName || '—'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {data.clinicName || '—'}
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.medicines}</Text>
          {data.medicines.map((m) => (
            <View key={m.key} style={[styles.medCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <Text style={[styles.medName, { color: colors.text }]}>{m.name}</Text>
              <Text style={[styles.medMeta, { color: colors.textSecondary }]}>
                {m.dosage} • {m.durationDays} {t.days} • {m.timesPerDay}×/{t.day}
              </Text>
              <Text style={[styles.medMeta, { color: colors.textSecondary }]}>
                {m.foodRelation === 'before_food'
                  ? t.beforeFood
                  : m.foodRelation === 'after_food'
                    ? t.afterFood
                    : t.noRelation}
                {m.foodTiming ? ` • ${m.foodTiming}` : ''}
              </Text>
              {m.notes ? <Text style={[styles.notes, { color: colors.textTertiary }]}>{m.notes}</Text> : null}
            </View>
          ))}

          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.today}</Text>
          {data.schedule.items.map((it) => {
            const key = `${it.medicineKey}|${it.time}`;
            const isBusy = busyKey === key;
            const statusColor =
              it.status === 'taken' ? colors.success : it.status === 'skipped' ? colors.warning : colors.textTertiary;
            return (
              <View key={key} style={[styles.slot, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                <View style={styles.slotLeft}>
                  <Text style={[styles.slotTime, { color: colors.text }]}>{it.time}</Text>
                  <Text style={[styles.slotName, { color: colors.textSecondary }]} numberOfLines={1}>
                    {it.name} • {it.dosage}
                  </Text>
                  <Text style={[styles.slotMeta, { color: statusColor }]}>
                    {it.status === 'taken' ? t.taken : it.status === 'skipped' ? t.skipped : t.pending}
                  </Text>
                </View>
                <View style={styles.slotActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.successBg, borderColor: colors.success }]}
                    onPress={() => onAction(it.medicineKey, it.time, 'taken')}
                    disabled={isBusy}
                  >
                    <Text style={[styles.actionText, { color: colors.success }]}>{t.markTaken}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.warningBg, borderColor: colors.warning }]}
                    onPress={() => onAction(it.medicineKey, it.time, 'skipped')}
                    disabled={isBusy}
                  >
                    <Text style={[styles.actionText, { color: colors.warning }]}>{t.skip}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <View style={{ height: Math.max(insets.bottom, 20) + 8 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '700', marginLeft: 6 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  infoCard: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 14 },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { marginTop: 4, fontSize: 13, fontWeight: '500' },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginTop: 10, marginBottom: 12 },
  medCard: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 12 },
  medName: { fontSize: 16, fontWeight: '800' },
  medMeta: { marginTop: 4, fontSize: 13, fontWeight: '500' },
  notes: { marginTop: 6, fontSize: 12, fontWeight: '500' },
  slot: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 12 },
  slotLeft: { marginBottom: 10 },
  slotTime: { fontSize: 15, fontWeight: '900' },
  slotName: { marginTop: 2, fontSize: 13, fontWeight: '600' },
  slotMeta: { marginTop: 4, fontSize: 12, fontWeight: '700' },
  slotActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  actionText: { fontSize: 13, fontWeight: '800' },
});

