import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getBookingById, cancelBooking, type Booking } from '../../lib/api';
import { useAuthStore } from '../../store/auth-store';
import { getTranslations } from '../../lib/translations';
import Skeleton from '../components/Skeleton';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop';
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return DAY_NAMES[d.getDay()] ?? '';
}

function formatDatePill(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  const month = MONTH_NAMES[parseInt(m, 10) - 1];
  return `${d} ${month}, ${y}`;
}

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const t = getTranslations(language);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;

  const loadBooking = () => {
    if (!id) return;
    setLoading(true);
    getBookingById(id)
      .then(setBooking)
      .catch(() => setError('Not found'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBooking();
  }, [id]);

  useEffect(() => {
    if (sheetVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [sheetVisible]);

  const handleCancelConfirm = async () => {
    if (!id) return;
    setCancelling(true);
    try {
      const updated = await cancelBooking(id, cancelReason.trim() || null);
      setBooking(updated);
      setSheetVisible(false);
      setCancelReason('');
      Alert.alert('', t.cancelSuccess, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Skeleton width={24} height={24} borderRadius={4} />
          <Skeleton width={160} height={18} style={{ marginLeft: 8 }} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Skeleton width="100%" height={100} style={{ marginBottom: 16, borderRadius: 16 }} />
          <Skeleton width="60%" height={14} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={56} style={{ marginBottom: 20 }} />
          <Skeleton width="60%" height={14} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={80} style={{ marginBottom: 20 }} />
        </ScrollView>
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t.noResultsFound}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnFull}>
          <Text style={styles.backBtnText}>← {t.back}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const dayName = getDayName(booking.scheduledDate);
  const datePill = formatDatePill(booking.scheduledDate);
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.yourAppointment}</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Doctor card */}
        <View style={styles.doctorCard}>
          <View style={styles.doctorAvatarWrap}>
            <Image source={{ uri: DEFAULT_AVATAR }} style={styles.doctorAvatar} />
          </View>
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>{booking.doctorName ?? '—'}</Text>
            <Text style={styles.doctorSpecialty}>{booking.serviceTitle ?? '—'}</Text>
            <View style={styles.doctorIcons}>
              <View style={styles.iconBadge}>
                <Ionicons name="star" size={14} color="#facc15" />
                <Text style={styles.iconBadgeText}>5</Text>
              </View>
              <View style={styles.iconBadge}>
                <Ionicons name="chatbubble-outline" size={14} color="#71717a" />
                <Text style={styles.iconBadgeTextMuted}>—</Text>
              </View>
              <TouchableOpacity style={styles.iconBadge}>
                <Ionicons name="heart-outline" size={16} color="#71717a" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Date & time */}
        <View style={styles.dateSection}>
          <View style={styles.datePill}>
            <Text style={styles.datePillText}>{datePill}</Text>
          </View>
          <View style={styles.dateTimeRow}>
            <Text style={styles.dayTimeText}>{dayName}, {booking.scheduledTime}</Text>
            <View style={styles.statusIcons}>
              {(booking.status === 'confirmed' || booking.status === 'completed') && (
                <View style={styles.statusIconWrap}>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </View>
              )}
              {booking.status === 'cancelled' && (
                <View style={[styles.statusIconWrap, styles.statusIconCancel]}>
                  <Ionicons name="close" size={18} color="#fff" />
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Booking For */}
        <View style={styles.bookingForSection}>
          <Row label={t.bookingFor} value="—" />
          <Row label={t.completeFullName} value="—" />
          <Row label={t.completeAge} value="—" />
          <Row label={t.completeGender} value="—" />
        </View>

        <View style={styles.divider} />

        {/* Problem */}
        <View style={styles.problemSection}>
          <Text style={styles.problemLabel}>{t.problem}</Text>
          <Text style={styles.problemPlaceholder}>—</Text>
        </View>

        {canCancel && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setSheetVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="close-circle-outline" size={22} color="#f87171" />
            <Text style={styles.cancelBtnText}>{t.cancelAppointment}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Cancel reason bottom sheet */}
      <Modal visible={sheetVisible} transparent animationType="none">
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setSheetVisible(false)}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetAvoid}
        >
          <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t.whyCancel}</Text>
            <TextInput
              style={styles.sheetInput}
              placeholder={t.whyCancel}
              placeholderTextColor="#71717a"
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity
              style={[styles.sheetConfirmBtn, cancelling && styles.sheetConfirmBtnDisabled]}
              onPress={handleCancelConfirm}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sheetConfirmBtnText}>{t.cancelAppointment}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetDismiss} onPress={() => setSheetVisible(false)}>
              <Text style={styles.sheetDismissText}>{t.back}</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
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
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 8 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  doctorCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    marginBottom: 4,
  },
  doctorAvatarWrap: { marginRight: 14 },
  doctorAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3f3f46',
  },
  doctorInfo: { flex: 1 },
  doctorName: { color: '#fff', fontSize: 18, fontWeight: '700' },
  doctorSpecialty: { color: '#a1a1aa', fontSize: 14, marginTop: 4 },
  doctorIcons: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  iconBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBadgeText: { color: '#facc15', fontSize: 13 },
  iconBadgeTextMuted: { color: '#71717a', fontSize: 13 },
  divider: { height: 1, backgroundColor: '#27272a', marginVertical: 16 },
  dateSection: { marginBottom: 4 },
  datePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  datePillText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  dayTimeText: { color: '#a1a1aa', fontSize: 15 },
  statusIcons: { flexDirection: 'row', gap: 8 },
  statusIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIconCancel: { backgroundColor: '#f87171' },
  bookingForSection: { marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  rowLabel: { color: '#71717a', fontSize: 14 },
  rowValue: { color: '#f4f4f5', fontSize: 14, fontWeight: '500' },
  problemSection: { marginBottom: 20 },
  problemLabel: { color: '#71717a', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  problemPlaceholder: { color: '#a1a1aa', fontSize: 14 },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.4)',
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
  },
  cancelBtnText: { color: '#f87171', fontSize: 16, fontWeight: '600' },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#27272a',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#52525b',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: { color: '#a1a1aa', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  sheetInput: {
    backgroundColor: '#27272a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  sheetConfirmBtn: {
    backgroundColor: '#f87171',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  sheetConfirmBtnDisabled: { opacity: 0.6 },
  sheetConfirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sheetDismiss: { alignItems: 'center', marginTop: 12 },
  sheetDismissText: { color: '#a78bfa', fontSize: 16 },
});
