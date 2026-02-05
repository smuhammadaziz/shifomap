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
import { getMyBookings, type Booking, type BookingStatus } from '../lib/api';
import { useAuthStore } from '../store/auth-store';
import { getTranslations } from '../lib/translations';

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
  const t = getTranslations(language);
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
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => router.push({ pathname: '/appointment/[id]', params: { id: item._id } })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.doctorName}>{item.doctorName ?? item.serviceTitle ?? '—'}</Text>
          <Text style={styles.specialty}>{item.serviceTitle}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#facc15" />
            <Text style={styles.ratingText}>5</Text>
          </View>
        </View>
        <Text style={styles.dateText}>{dateStr} • {item.scheduledTime}</Text>
        {(tab === 'completed' || tab === 'upcoming') && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.reBookBtn}
              onPress={() => router.push({ pathname: '/book', params: { clinicId: item.clinicId, serviceId: item.serviceId } })}
            >
              <Text style={styles.reBookBtnText}>{t.reBook}</Text>
            </TouchableOpacity>
            {tab === 'completed' && (
              <TouchableOpacity style={styles.addReviewBtn}>
                <Text style={styles.addReviewBtnText}>{t.addReview}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.allAppointments}</Text>
      </View>
      <View style={styles.tabs}>
        {(['upcoming', 'complete', 'cancelled'] as const).map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, tab === (key === 'complete' ? 'completed' : key) && styles.tabActive]}
            onPress={() => setTab(key === 'complete' ? 'completed' : key)}
          >
            <Text style={[styles.tabText, tab === (key === 'complete' ? 'completed' : key) && styles.tabTextActive]}>
              {key === 'complete' ? t.complete : key === 'upcoming' ? t.upcoming : t.cancelled}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="calendar-outline" size={48} color="#52525b" />
          <Text style={styles.emptyText}>{t.noResultsFound}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#8b5cf6" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
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
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 8 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#27272a',
  },
  tabActive: { backgroundColor: '#7c3aed' },
  tabText: { color: '#a1a1aa', fontSize: 14 },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#71717a', marginTop: 12, fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  cardHeader: { marginBottom: 8 },
  doctorName: { color: '#fff', fontSize: 17, fontWeight: '700' },
  specialty: { color: '#a1a1aa', fontSize: 13, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { color: '#facc15', fontSize: 13 },
  dateText: { color: '#a78bfa', fontSize: 14, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  reBookBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
    alignItems: 'center',
  },
  reBookBtnText: { color: '#a78bfa', fontSize: 14, fontWeight: '600' },
  addReviewBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
  },
  addReviewBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
