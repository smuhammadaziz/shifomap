import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMyBookings, type Booking, type BookingStatus } from '../../lib/api';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { getTranslations } from '../../lib/translations';
import { getColors } from '../../lib/theme';

type TabFilter = 'completed' | 'upcoming' | 'cancelled';

const statusToTab: Record<BookingStatus, TabFilter | null> = {
  completed: 'completed',
  confirmed: 'upcoming',
  pending: 'upcoming',
  cancelled: 'cancelled',
};

export default function AppointmentsScreen() {
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const theme = useThemeStore((s) => s.theme);
  const t = getTranslations(language);
  const colors = getColors(theme);
  const [tab, setTab] = useState<TabFilter>('upcoming');
  const [list, setList] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const statusFilter: BookingStatus[] =
    tab === 'completed' ? ['completed'] : tab === 'upcoming' ? ['pending', 'confirmed'] : ['cancelled'];

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const all = await getMyBookings();
      setList(all);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = list.filter((b) => statusFilter.includes(b.status));

  const renderItem = ({ item }: { item: Booking }) => {
    const dateStr = item.scheduledDate.split('-').reverse().join('/');
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
        activeOpacity={0.8}
        onPress={() => router.push({ pathname: '/appointment/[id]', params: { id: item._id } })}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.doctorName, { color: colors.text }]}>{item.doctorName ?? item.serviceTitle ?? '—'}</Text>
          <Text style={[styles.specialty, { color: colors.textSecondary }]}>{item.serviceTitle}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={colors.warning} />
            <Text style={[styles.ratingText, { color: colors.warning }]}>5</Text>
          </View>
        </View>
        <Text style={[styles.dateText, { color: colors.primaryLight }]}>{dateStr} • {item.scheduledTime}</Text>
        {(tab === 'completed' || tab === 'upcoming') && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.reBookBtn, { backgroundColor: colors.primaryBg }]}
              onPress={() => router.push({ pathname: '/book', params: { clinicId: item.clinicId, serviceId: item.serviceId } })}
            >
              <Text style={[styles.reBookBtnText, { color: colors.primaryLight }]}>{t.reBook}</Text>
            </TouchableOpacity>
            {tab === 'completed' && (
              <TouchableOpacity style={[styles.addReviewBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.addReviewBtnText}>{t.addReview}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t.allAppointments}</Text>
      </View>
      <View style={styles.tabs}>
        {(['upcoming', 'complete', 'cancelled'] as const).map((key) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.tab,
              { backgroundColor: colors.border },
              tab === (key === 'complete' ? 'completed' : key) && { backgroundColor: colors.primary }
            ]}
            onPress={() => setTab(key === 'complete' ? 'completed' : key)}
          >
            <Text style={[
              styles.tabText,
              { color: colors.textSecondary },
              tab === (key === 'complete' ? 'completed' : key) && { color: '#fff', fontWeight: '600' }
            ]}>
              {key === 'complete' ? t.complete : key === 'upcoming' ? t.upcoming : t.cancelled}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="calendar-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>{t.noResultsFound}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '600', marginLeft: 8 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  tabText: { fontSize: 14 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 12, fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: { marginBottom: 8 },
  doctorName: { fontSize: 17, fontWeight: '700' },
  specialty: { fontSize: 13, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { fontSize: 13 },
  dateText: { fontSize: 14, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  reBookBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  reBookBtnText: { fontSize: 14, fontWeight: '600' },
  addReviewBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  addReviewBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
