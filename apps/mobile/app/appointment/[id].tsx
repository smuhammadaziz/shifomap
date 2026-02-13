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
import { useThemeStore } from '../../store/theme-store';
import { getTranslations } from '../../lib/translations';
import { getColors } from '../../lib/theme';
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
  const theme = useThemeStore((s) => s.theme);
  const t = getTranslations(language);
  const colors = getColors(theme);
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
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
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{t.noResultsFound}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnFull}>
          <Text style={[styles.backBtnText, { color: colors.primary }]}>← {t.back}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const dayName = getDayName(booking.scheduledDate);
  const datePill = formatDatePill(booking.scheduledDate);
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t.yourAppointment}</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Doctor card */}
        <View style={[styles.doctorCard, { backgroundColor: colors.primaryBg, borderColor: colors.primary }]}>
          <View style={styles.doctorAvatarWrap}>
            <Image source={{ uri: DEFAULT_AVATAR }} style={[styles.doctorAvatar, { backgroundColor: colors.border }]} />
          </View>
          <View style={styles.doctorInfo}>
            <Text style={[styles.doctorName, { color: colors.text }]}>{booking.doctorName ?? '—'}</Text>
            <Text style={[styles.doctorSpecialty, { color: colors.textSecondary }]}>{booking.serviceTitle ?? '—'}</Text>
            <View style={styles.doctorIcons}>
              <View style={styles.iconBadge}>
                <Ionicons name="star" size={14} color={colors.warning} />
                <Text style={[styles.iconBadgeText, { color: colors.warning }]}>5</Text>
              </View>
              <View style={styles.iconBadge}>
                <Ionicons name="chatbubble-outline" size={14} color={colors.textTertiary} />
                <Text style={[styles.iconBadgeTextMuted, { color: colors.textTertiary }]}>—</Text>
              </View>
              <TouchableOpacity style={styles.iconBadge}>
                <Ionicons name="heart-outline" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Date & time */}
        <View style={styles.dateSection}>
          <View style={[styles.datePill, { backgroundColor: colors.primary }]}>
            <Text style={styles.datePillText}>{datePill}</Text>
          </View>
          <View style={styles.dateTimeRow}>
            <Text style={[styles.dayTimeText, { color: colors.textSecondary }]}>{dayName}, {booking.scheduledTime}</Text>
            <View style={styles.statusIcons}>
              {(booking.status === 'confirmed' || booking.status === 'completed') && (
                <View style={[styles.statusIconWrap, { backgroundColor: colors.success }]}>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </View>
              )}
              {booking.status === 'cancelled' && (
                <View style={[styles.statusIconWrap, { backgroundColor: colors.error }]}>
                  <Ionicons name="close" size={18} color="#fff" />
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Booking For */}
        <View style={styles.bookingForSection}>
          <Row label={t.bookingFor} value="—" colors={colors} />
          <Row label={t.completeFullName} value="—" colors={colors} />
          <Row label={t.completeAge} value="—" colors={colors} />
          <Row label={t.completeGender} value="—" colors={colors} />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Problem */}
        <View style={styles.problemSection}>
          <Text style={[styles.problemLabel, { color: colors.textTertiary }]}>{t.problem}</Text>
          <Text style={[styles.problemPlaceholder, { color: colors.textSecondary }]}>—</Text>
        </View>

        {canCancel && (
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.error, backgroundColor: colors.errorBg }]}
            onPress={() => setSheetVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="close-circle-outline" size={22} color={colors.error} />
            <Text style={[styles.cancelBtnText, { color: colors.error }]}>{t.cancelAppointment}</Text>
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
          <Animated.View style={[styles.sheet, { backgroundColor: colors.backgroundCard, borderColor: colors.border, transform: [{ translateY: slideAnim }] }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.textTertiary }]} />
            <Text style={[styles.sheetTitle, { color: colors.textSecondary }]}>{t.whyCancel}</Text>
            <TextInput
              style={[styles.sheetInput, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
              placeholder={t.whyCancel}
              placeholderTextColor={colors.textTertiary}
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity
              style={[styles.sheetConfirmBtn, { backgroundColor: colors.error }, cancelling && styles.sheetConfirmBtnDisabled]}
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
              <Text style={[styles.sheetDismissText, { color: colors.primaryLight }]}>{t.back}</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Row({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.text }]}>{value}</Text>
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
  headerTitle: { fontSize: 18, fontWeight: '600', marginLeft: 8 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  doctorCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 4,
  },
  doctorAvatarWrap: { marginRight: 14 },
  doctorAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 18, fontWeight: '700' },
  doctorSpecialty: { fontSize: 14, marginTop: 4 },
  doctorIcons: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  iconBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBadgeText: { fontSize: 13 },
  iconBadgeTextMuted: { fontSize: 13 },
  divider: { height: 1, marginVertical: 16 },
  dateSection: { marginBottom: 4 },
  datePill: {
    alignSelf: 'flex-start',
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
  dayTimeText: { fontSize: 15 },
  statusIcons: { flexDirection: 'row', gap: 8 },
  statusIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingForSection: { marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 14, fontWeight: '500' },
  problemSection: { marginBottom: 20 },
  problemLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  problemPlaceholder: { fontSize: 14 },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  cancelBtnText: { fontSize: 16, fontWeight: '600' },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  sheetInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  sheetConfirmBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  sheetConfirmBtnDisabled: { opacity: 0.6 },
  sheetConfirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sheetDismiss: { alignItems: 'center', marginTop: 12 },
  sheetDismissText: { fontSize: 16 },
});
