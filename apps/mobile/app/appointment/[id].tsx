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
  Keyboard,
  TouchableWithoutFeedback,
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

function formatDateFull(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  const month = MONTH_NAMES[parseInt(m, 10) - 1];
  return `${d} ${month}, ${y}`;
}

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams(); // Can be string | string[]
  const router = useRouter();
  const language = useAuthStore((s) => s.language) ?? 'uz';
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

  // Extract a single string ID
  const bookingId = Array.isArray(id) ? id[0] : id;

  const loadBooking = () => {
    if (!bookingId) {
      setLoading(false);
      setError('Invalid ID');
      return;
    }
    setLoading(true);
    getBookingById(bookingId)
      .then(setBooking)
      .catch(() => setError('Not found'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  useEffect(() => {
    if (sheetVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 6,
      }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [sheetVisible]);

  const handleCancelConfirm = async () => {
    if (!bookingId) return;
    setCancelling(true);
    try {
      const updated = await cancelBooking(bookingId, cancelReason.trim() || null);
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
          <Skeleton width="100%" height={100} style={{ marginBottom: 20, borderRadius: 20 }} />
          <Skeleton width="100%" height={90} style={{ marginBottom: 20, borderRadius: 20 }} />
          <Skeleton width="100%" height={120} style={{ marginBottom: 20, borderRadius: 20 }} />
        </ScrollView>
      </View>
    );
  }

  // Cooler, user-friendly Empty State
  if (error || !booking) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.backgroundCard, shadowColor: '#000' }]}>
            <Ionicons name="document-text-outline" size={64} color={colors.textTertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t.noResultsFound}</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {language === 'ru' ? 'Бронь не найдена или была удалена.' : 'Bron topilmadi yoki o‘chirib tashlangan.'}
          </Text>
          <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
            <Text style={styles.emptyBtnText}>{t.back}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const dayName = getDayName(booking.scheduledDate);
  const dateFull = formatDateFull(booking.scheduledDate);
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'patient_arrived';
  const steps = [
    { key: 'confirmed', label: t.bookingConfirmed, icon: 'checkmark-circle' },
    { key: 'patient_arrived', label: t.patientArrived, icon: 'location' },
    { key: 'in_progress', label: t.consultationStarted, icon: 'pulse' },
    { key: 'completed', label: t.consultationCompleted, icon: 'flag' },
  ] as const;
  const statusRank: Record<string, number> = {
    pending: 0,
    confirmed: 1,
    patient_arrived: 2,
    in_progress: 3,
    completed: 4,
    cancelled: -1,
  };
  const currentRank = statusRank[booking.status] ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t.yourAppointment}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Card: Time & Date (Large floating presentation) */}
        <View style={[styles.glassCard, { backgroundColor: colors.backgroundCard, shadowColor: '#000' }]}>
          <View style={styles.dateTimeHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.primaryBg }]}>
              <Ionicons name="calendar-outline" size={24} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.dateBig, { color: colors.text }]}>{dateFull}</Text>
              <Text style={[styles.dayText, { color: colors.textSecondary }]}>{dayName}</Text>
            </View>
          </View>
          <View style={[styles.timeDivider, { borderLeftColor: colors.border }]} />
          <View style={styles.dateTimeTime}>
            <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>{language === 'ru' ? 'Время' : 'Vaqt'}</Text>
            <Text style={[styles.timeBig, { color: colors.primary }]}>{booking.scheduledTime}</Text>
          </View>
        </View>

        {/* Card: Doctor Info */}
        <View style={[styles.glassCard, styles.doctorCard, { backgroundColor: colors.backgroundCard, shadowColor: '#000' }]}>
          <Image source={{ uri: DEFAULT_AVATAR }} style={[styles.doctorAvatar, { backgroundColor: colors.border }]} />
          <View style={styles.doctorInfo}>
            <Text style={[styles.doctorName, { color: colors.text }]} numberOfLines={1}>{booking.doctorName || (language === 'ru' ? 'Врач' : 'Shifokor')}</Text>
            <Text style={[styles.doctorSpecialty, { color: colors.textSecondary }]} numberOfLines={2}>{(t as any).doctor || (language === 'ru' ? 'Врач' : 'Shifokor')}</Text>
          </View>
        </View>

        {/* Card: Clinic & Details */}
        <View style={[styles.glassCard, { backgroundColor: colors.backgroundCard, shadowColor: '#000' }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'ru' ? 'Детали клиники' : 'Klinika tafsilotlari'}</Text>
          <View style={styles.rows}>
            <Row label={language === 'ru' ? 'Клиника' : 'Klinika'} value={booking.clinicDisplayName || '—'} colors={colors} />
            <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
            <Row label={language === 'ru' ? 'Филиал' : 'Filial'} value={booking.branchName || '—'} colors={colors} />
            <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
            <Row label={language === 'ru' ? 'Услуга' : 'Xizmat'} value={booking.serviceTitle || '—'} colors={colors} />
          </View>
        </View>

        {/* Card: Progress Timeline */}
        <View style={[styles.glassCard, { backgroundColor: colors.backgroundCard, shadowColor: '#000' }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.progress}</Text>

          {booking.status === 'cancelled' ? (
            <View style={[styles.cancelledAlert, { backgroundColor: colors.errorBg }]}>
              <View style={styles.cancelledRow}>
                <Ionicons name="alert-circle" size={24} color={colors.error} />
                <Text style={[styles.cancelledAlertText, { color: colors.error }]}>{t.cancelled}</Text>
              </View>
              {booking.cancel?.reason && (
                <Text style={[styles.cancelReasonLabel, { color: colors.textTertiary }]}>
                  {language === 'ru' ? 'Причина:' : 'Sabab:'} <Text style={{ color: colors.textSecondary }}>{booking.cancel?.reason}</Text>
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.timelineContainer}>
              {steps.map((s, idx) => {
                const stepRank = statusRank[s.key];
                const done = currentRank >= stepRank;
                const isCurrent = currentRank === stepRank;
                const last = idx === steps.length - 1;

                return (
                  <View key={s.key} style={styles.timelineStep}>
                    {/* Circle and Line */}
                    <View style={styles.timelineGraphic}>
                      <View style={[styles.timelineCircle,
                      {
                        backgroundColor: done ? colors.primary : colors.backgroundCard,
                        borderColor: done ? colors.primary : colors.border,
                        borderWidth: done ? 0 : 2
                      }]}>
                        {done && <Ionicons name={s.icon as any} size={14} color="#fff" />}
                      </View>
                      {!last && (
                        <View style={[styles.timelineLine, { backgroundColor: done ? colors.primary : colors.border }]} />
                      )}
                    </View>

                    {/* Text */}
                    <View style={styles.timelineContent}>
                      <Text style={[styles.timelineText, {
                        color: done ? colors.text : colors.textTertiary,
                        fontWeight: done ? '700' : '500'
                      }]}>
                        {s.label}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Card: Patient Information */}
        {(() => {
          const p = useAuthStore.getState().patient;
          if (!p) return null;
          return (
            <View style={[styles.glassCard, { backgroundColor: colors.backgroundCard, shadowColor: '#000' }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.bookingFor}</Text>
              <View style={styles.rows}>
                <Row label={t.completeFullName} value={p.fullName || '—'} colors={colors} />
                <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                <Row label={t.completeAge} value={p.age ? `${p.age}` : '—'} colors={colors} />
                <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                <Row label={t.completeGender} value={p.gender === 'male' ? (language === 'ru' ? 'Мужчина' : 'Erkak') : (language === 'ru' ? 'Женщина' : 'Ayol')} colors={colors} />
              </View>
            </View>
          );
        })()}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Buttons */}
      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {canCancel && (
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.error }]}
            onPress={() => setSheetVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.cancelBtnText, { color: colors.error }]}>{t.cancelAppointment}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Cancel reason bottom sheet */}
      <Modal visible={sheetVisible} transparent animationType="none">
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => { Keyboard.dismiss(); setSheetVisible(false); }} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetAvoid}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <Animated.View style={[styles.sheet, { backgroundColor: colors.backgroundCard, borderColor: colors.border, transform: [{ translateY: slideAnim }] }]}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.textTertiary }]} />
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{t.whyCancel}</Text>

              <ScrollView keyboardShouldPersistTaps="handled" bounces={false} showsVerticalScrollIndicator={false}>
                <TextInput
                  style={[styles.sheetInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder={t.whyCancel}
                  placeholderTextColor={colors.textTertiary}
                  value={cancelReason}
                  onChangeText={setCancelReason}
                  multiline
                  numberOfLines={4}
                />

                <TouchableOpacity
                  style={[styles.sheetConfirmBtn, { backgroundColor: colors.error }, cancelling && styles.sheetConfirmBtnDisabled]}
                  onPress={handleCancelConfirm}
                  disabled={cancelling}
                  activeOpacity={0.8}
                >
                  {cancelling ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.sheetConfirmBtnText}>{t.cancelAppointment}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.sheetDismiss} onPress={() => setSheetVisible(false)} activeOpacity={0.8}>
                  <Text style={[styles.sheetDismissText, { color: colors.textSecondary }]}>{t.back}</Text>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Row({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  backBtn: { padding: 4 },

  // Empty states
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyIconCircle: {
    width: 120, height: 120, borderRadius: 60,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
    elevation: 4, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12,
  },
  emptyTitle: { fontSize: 22, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  emptyText: { fontSize: 16, fontWeight: '500', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  emptyBtn: { paddingVertical: 16, paddingHorizontal: 48, borderRadius: 100 },
  emptyBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 16 },

  // Cooler unified cards
  glassCard: {
    borderRadius: 24,
    padding: 20,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },

  // Date Time Big Card
  dateTimeHeader: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  dateBig: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  dayText: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  timeDivider: { position: 'absolute', right: 110, top: 0, bottom: 0, borderLeftWidth: 1 },
  dateTimeTime: { position: 'absolute', right: 20, top: 20, alignItems: 'flex-end', justifyContent: 'center' },
  timeLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  timeBig: { fontSize: 22, fontWeight: '800' },

  // Doctor Card
  doctorCard: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  doctorAvatar: { width: 60, height: 60, borderRadius: 30, marginRight: 16 },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  doctorSpecialty: { fontSize: 15, fontWeight: '500' },

  // Timeline
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 20 },
  cancelledAlert: { padding: 16, borderRadius: 16, gap: 8 },
  cancelledAlertText: { fontSize: 16, fontWeight: '600' },
  cancelledRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cancelReasonLabel: { fontSize: 14, fontWeight: '500', marginTop: 4 },
  timelineContainer: { paddingLeft: 8 },
  timelineStep: { flexDirection: 'row', minHeight: 48 },
  timelineGraphic: { width: 32, alignItems: 'center' },
  timelineCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  timelineLine: { width: 2, flex: 1, marginVertical: -4 },
  timelineContent: { flex: 1, paddingTop: 4, paddingLeft: 12, paddingBottom: 24 },
  timelineText: { fontSize: 16 },

  // Rows
  rows: { gap: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 15, fontWeight: '500' },
  rowValue: { fontSize: 15, fontWeight: '700' },
  rowDivider: { height: StyleSheet.hairlineWidth },

  // Bottom action
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelBtn: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  cancelBtnText: { fontSize: 17, fontWeight: '700' },

  // Cancel Sheet
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetAvoid: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40,
    borderWidth: 1, borderBottomWidth: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 20,
  },
  sheetHandle: { width: 48, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 24, opacity: 0.5 },
  sheetTitle: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  sheetInput: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  sheetConfirmBtn: { paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  sheetConfirmBtnDisabled: { opacity: 0.6 },
  sheetConfirmBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  sheetDismiss: { alignItems: 'center', marginTop: 16, paddingVertical: 12 },
  sheetDismissText: { fontSize: 16, fontWeight: '600' },
});
