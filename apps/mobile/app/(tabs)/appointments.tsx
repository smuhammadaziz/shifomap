import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
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
  patient_arrived: 'upcoming',
  in_progress: 'upcoming',
  cancelled: 'cancelled',
};

export default function AppointmentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const language = useAuthStore((s) => s.language);
  const theme = useThemeStore((s) => s.theme);
  const t = getTranslations(language);
  const colors = getColors(theme);
  const [tab, setTab] = useState<TabFilter>('upcoming');
  const [list, setList] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ticketBooking, setTicketBooking] = useState<Booking | null>(null);

  const statusFilter: BookingStatus[] =
    tab === 'completed' ? ['completed'] : tab === 'upcoming' ? ['pending', 'confirmed', 'patient_arrived', 'in_progress'] : ['cancelled'];

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
    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isToday = item.scheduledDate === todayIso;
    const dateStr = item.scheduledDate.split('-').reverse().join('/');
    const statusKey = statusToTab[item.status];
    const statusLabel =
      item.status === 'completed'
        ? t.complete
        : item.status === 'cancelled'
          ? t.cancelled
          : t.upcoming;
    const statusBg =
      item.status === 'completed'
        ? '#dcfce7'
        : item.status === 'cancelled'
          ? '#fee2e2'
          : colors.primaryBg;
    const statusColor =
      item.status === 'completed'
        ? '#166534'
        : item.status === 'cancelled'
          ? '#b91c1c'
          : colors.primaryLight;
    return (
      <View style={styles.blockWrap}>
        <Text style={[styles.dayLabel, { color: colors.text }]}>
          {isToday ? (language === 'ru' ? 'Сегодня' : 'Bugun') : dateStr}
        </Text>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
          activeOpacity={0.84}
          onPress={() => router.push({ pathname: '/appointment/[id]', params: { id: item._id } })}
        >
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.clinicTitle, { color: colors.text }]} numberOfLines={1}>
                {item.clinicDisplayName || '—'}
              </Text>
              <Text style={[styles.serviceTitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.serviceTitle}
              </Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          <View style={[styles.addressRow, { borderColor: colors.borderLight }]}>
            <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
            <Text style={[styles.addressText, { color: colors.textTertiary }]} numberOfLines={1}>
              {item.branchName || (language === 'ru' ? 'Филиал не указан' : 'Filial ko‘rsatilmagan')}
            </Text>
          </View>

          <View style={[styles.timeGrid, { borderColor: colors.borderLight }]}>
            <View style={styles.timeCol}>
              <Text style={[styles.timeLabel, { color: colors.textTertiary }]}>
                {language === 'ru' ? 'Дата' : 'Sana'}
              </Text>
              <Text style={[styles.timeValue, { color: colors.text }]}>{dateStr}</Text>
            </View>
            <View style={[styles.timeDivider, { backgroundColor: colors.borderLight }]} />
            <View style={styles.timeCol}>
              <Text style={[styles.timeLabel, { color: colors.textTertiary }]}>
                {language === 'ru' ? 'Время' : 'Vaqt'}
              </Text>
              <Text style={[styles.timeValue, { color: colors.text }]}>{item.scheduledTime}</Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtnOutline, { borderColor: colors.border }]}
              onPress={() => router.push({ pathname: '/appointment/[id]', params: { id: item._id } })}
              activeOpacity={0.85}
            >
              <Text style={[styles.actionBtnOutlineText, { color: colors.text }]}>
                {language === 'ru' ? 'Подробнее' : 'Batafsil'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtnDark}
              onPress={() => setTicketBooking(item)}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnDarkText}>{language === 'ru' ? 'Электронный билет' : 'E-bilet'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t.allAppointments}</Text>
          <Text style={[styles.headerSub, { color: colors.textTertiary }]}>
            {language === 'ru' ? 'Управляйте своими записями' : 'Navbatlaringizni boshqaring'}
          </Text>
        </View>
      </View>
      <View style={[styles.tabsWrap, { borderBottomColor: colors.border }]}>
      <View style={styles.tabs}>
        {(['upcoming', 'complete', 'cancelled'] as const).map((key) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.tab,
              { backgroundColor: '#ececec' },
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
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={42} color={colors.textTertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t.noResultsFound}</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            {language === 'ru' ? 'Попробуйте другой фильтр или создайте новую запись.' : 'Boshqa filter tanlang yoki yangi navbat yarating.'}
          </Text>
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

      <Modal
        visible={!!ticketBooking}
        transparent
        animationType="slide"
        onRequestClose={() => setTicketBooking(null)}
      >
        <View style={styles.ticketOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setTicketBooking(null)} />
          {ticketBooking ? (
            <View style={[styles.ticketWrap, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <View style={styles.ticketHeader}>
                <Text style={styles.ticketHeaderText}>{language === 'ru' ? 'E-bilet' : 'E-bilet'}</Text>
              </View>

              <View style={styles.ticketBody}>
                <Text style={[styles.ticketClinic, { color: colors.text }]} numberOfLines={1}>
                  {ticketBooking.clinicDisplayName || '—'}
                </Text>
                <Text style={[styles.ticketService, { color: colors.textSecondary }]} numberOfLines={1}>
                  {ticketBooking.serviceTitle}
                </Text>

                <View style={styles.ticketInfoGrid}>
                  <View style={styles.ticketInfoItem}>
                    <Text style={[styles.ticketInfoLabel, { color: colors.textTertiary }]}>{language === 'ru' ? 'Дата' : 'Sana'}</Text>
                    <Text style={[styles.ticketInfoValue, { color: colors.text }]}>
                      {ticketBooking.scheduledDate.split('-').reverse().join('.')}
                    </Text>
                  </View>
                  <View style={styles.ticketInfoItem}>
                    <Text style={[styles.ticketInfoLabel, { color: colors.textTertiary }]}>{language === 'ru' ? 'Время' : 'Vaqt'}</Text>
                    <Text style={[styles.ticketInfoValue, { color: colors.text }]}>{ticketBooking.scheduledTime}</Text>
                  </View>
                </View>

                <View style={styles.ticketInfoGrid}>
                  <View style={styles.ticketInfoItem}>
                    <Text style={[styles.ticketInfoLabel, { color: colors.textTertiary }]}>{language === 'ru' ? 'Врач' : 'Shifokor'}</Text>
                    <Text style={[styles.ticketInfoValue, { color: colors.text }]} numberOfLines={1}>
                      {ticketBooking.doctorName || '—'}
                    </Text>
                  </View>
                </View>

                <View style={styles.ticketCodeCenterWrap}>
                  <Text style={styles.ticketCodeCenterLabel}>
                    {language === 'ru' ? 'Код билета' : 'Bilet kodi'}
                  </Text>
                  <Text style={styles.ticketCode}>{makeTicketCode(ticketBooking._id)}</Text>
                </View>

                <View style={[styles.qrWrap, { borderColor: colors.border }]}>
                  <QRCode
                    value={buildTicketPayload(ticketBooking)}
                    size={142}
                    color="#111827"
                    backgroundColor="#ffffff"
                  />
                </View>

                <Text style={[styles.ticketHint, { color: colors.textTertiary }]}>
                  {language === 'ru'
                    ? 'Скан содержит уникальный ID, дату и время записи для проверки в клинике.'
                    : 'Skanda klinika tekshiruvi uchun noyob ID, sana va vaqt ma’lumotlari bor.'}
                </Text>
              </View>

              <TouchableOpacity style={[styles.ticketCloseBtn, { borderColor: colors.border }]} onPress={() => setTicketBooking(null)}>
                <Text style={[styles.ticketCloseText, { color: colors.text }]}>{language === 'ru' ? 'Закрыть' : 'Yopish'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function makeTicketCode(id: string): string {
  const compact = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const slice = compact.slice(-10);
  return `SHIFO-${slice}`;
}

function buildTicketPayload(booking: Booking): string {
  const ticketCode = makeTicketCode(booking._id);
  return JSON.stringify({
    type: 'shifoyol_e_ticket',
    ticketCode,
    bookingId: booking._id,
    clinic: booking.clinicDisplayName ?? null,
    doctor: booking.doctorName ?? null,
    service: booking.serviceTitle ?? null,
    date: booking.scheduledDate,
    time: booking.scheduledTime,
  });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 30, fontWeight: '800', marginLeft: 8, letterSpacing: -0.6 },
  headerSub: { marginLeft: 8, marginTop: 2, fontSize: 13, fontWeight: '500' },
  tabsWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
  },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  tab: {
    paddingHorizontal: 17,
    paddingVertical: 9,
    borderRadius: 20,
  },
  tabText: { fontSize: 16, fontWeight: '500' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySub: { marginTop: 6, fontSize: 13, textAlign: 'center', paddingHorizontal: 36, lineHeight: 19 },
  listContent: { padding: 16, paddingBottom: 40, paddingTop: 14 },
  blockWrap: { marginBottom: 12 },
  dayLabel: { fontSize: 19, fontWeight: '800', marginBottom: 9, marginLeft: 2 },
  card: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  cardTop: { marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  clinicTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.2 },
  serviceTitle: { fontSize: 14, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 8,
    marginBottom: 10,
  },
  addressText: { fontSize: 12, fontWeight: '500', flex: 1 },
  timeGrid: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 12,
  },
  timeCol: { flex: 1, paddingHorizontal: 11, paddingVertical: 10 },
  timeLabel: { fontSize: 11, fontWeight: '600' },
  timeValue: { marginTop: 3, fontSize: 17, fontWeight: '800' },
  timeDivider: { width: 1 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtnOutline: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  actionBtnOutlineText: { fontSize: 14, fontWeight: '600' },
  actionBtnDark: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  actionBtnDarkText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  ticketOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  ticketWrap: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  ticketHeader: {
    backgroundColor: '#3730A3',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ticketHeaderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  ticketBody: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  ticketClinic: { fontSize: 20, fontWeight: '800' },
  ticketService: { marginTop: 2, fontSize: 13, fontWeight: '500' },
  ticketInfoGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  ticketInfoItem: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  ticketInfoLabel: { fontSize: 11, fontWeight: '600' },
  ticketInfoValue: { marginTop: 3, fontSize: 14, fontWeight: '700' },
  ticketCodeCenterWrap: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  ticketCodeCenterLabel: { fontSize: 12, fontWeight: '700', color: '#4338ca' },
  ticketCode: { marginTop: 4, fontSize: 24, fontWeight: '900', letterSpacing: 1.1, color: '#111827' },
  qrWrap: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketHint: { marginTop: 8, fontSize: 12, lineHeight: 17 },
  ticketCloseBtn: {
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  ticketCloseText: { fontSize: 14, fontWeight: '700' },
});
