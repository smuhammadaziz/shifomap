import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getClinicDetail, getServiceById, createBooking, type ClinicDetailPublic, type ClinicDoctorPublic, type ClinicBranchPublic, type ClinicServicePublic } from '../lib/api';
import { useAuthStore } from '../store/auth-store';
import { getTranslations } from '../lib/translations';

type DaySchedule = { day: number; from: string; to: string; lunchFrom?: string; lunchTo?: string };

function parseTime(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}

function formatSlot(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function getSlotsForDoctorAndDate(
  schedule: { weekly: DaySchedule[] },
  durationMin: number,
  dateStr: string
): string[] {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay() === 0 ? 7 : d.getDay();
  const weekDay = schedule.weekly.find((w) => w.day === day);
  if (!weekDay) return [];
  const fromMin = parseTime(weekDay.from);
  const toMin = parseTime(weekDay.to);
  const lunchFrom = weekDay.lunchFrom != null ? parseTime(weekDay.lunchFrom) : null;
  const lunchTo = weekDay.lunchTo != null ? parseTime(weekDay.lunchTo) : null;
  const slots: string[] = [];
  let slotStart = fromMin;
  while (slotStart + durationMin <= toMin) {
    const slotEnd = slotStart + durationMin;
    const inLunch = lunchFrom != null && lunchTo != null && (slotStart < lunchTo && slotEnd > lunchFrom);
    if (!inLunch) slots.push(formatSlot(slotStart));
    slotStart += durationMin;
  }
  return slots;
}

function formatPrice(price: ClinicServicePublic['price']): string {
  if (price.amount != null) return `${price.amount.toLocaleString()} ${price.currency}`;
  if (price.minAmount != null && price.maxAmount != null) {
    return `${price.minAmount.toLocaleString()} – ${price.maxAmount.toLocaleString()} ${price.currency}`;
  }
  return price.currency;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export default function BookScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clinicId?: string; serviceId?: string }>();
  const language = useAuthStore((s) => s.language);
  const t = getTranslations(language);
  const [clinic, setClinic] = useState<ClinicDetailPublic | null>(null);
  const [service, setService] = useState<ClinicServicePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [branchModalBranch, setBranchModalBranch] = useState<ClinicBranchPublic | null>(null);

  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const clinicId = params.clinicId ?? clinic?._id;
  const serviceId = params.serviceId;

  useEffect(() => {
    if (!clinicId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const promises: Promise<unknown>[] = [];
    let clinicData: ClinicDetailPublic | null = null;
    promises.push(
      getClinicDetail(clinicId).then((c) => {
        clinicData = c;
        setClinic(c);
      })
    );
    if (serviceId) {
      promises.push(
        getServiceById(serviceId).then((res) => {
          setService(res.service as ClinicServicePublic);
        })
      );
    }
    Promise.all(promises).then(() => {
      if (clinicData && !serviceId && clinicData.services?.length) {
        const first = clinicData.services.find((s) => s.isActive);
        if (first) setService(first);
      } else if (clinicData && serviceId) {
        const svc = clinicData.services?.find((s) => s._id === serviceId);
        if (svc) setService(svc);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [clinicId, serviceId]);

  const serviceDoctors = useMemo(() => {
    if (!clinic || !service) return [];
    return (clinic.doctors ?? []).filter((d) => d.isActive && (service.doctorIds ?? []).includes(d._id));
  }, [clinic, service]);

  const serviceBranches = useMemo(() => {
    if (!clinic || !service) return [];
    return (clinic.branches ?? []).filter((b) => b.isActive && (service.branchIds ?? []).includes(b._id));
  }, [clinic, service]);

  useEffect(() => {
    if (serviceDoctors.length === 1) setSelectedDoctorId(serviceDoctors[0]._id);
    else if (serviceDoctors.length > 0 && !selectedDoctorId) setSelectedDoctorId(serviceDoctors[0]._id);
  }, [serviceDoctors]);

  useEffect(() => {
    if (serviceBranches.length === 1) setSelectedBranchId(serviceBranches[0]._id);
    else if (serviceBranches.length > 0 && !selectedBranchId) setSelectedBranchId(serviceBranches[0]._id);
  }, [serviceBranches]);

  const selectedDoctor = selectedDoctorId ? serviceDoctors.find((d) => d._id === selectedDoctorId) : null;
  const slots = useMemo(() => {
    if (!selectedDoctor || !selectedDate || !service) return [];
    return getSlotsForDoctorAndDate(selectedDoctor.schedule, service.durationMin, selectedDate);
  }, [selectedDoctor, selectedDate, service]);

  const calendarDays = useMemo(() => {
    const { year, month } = calendarMonth;
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startPad = (first.getDay() + 6) % 7;
    const days: (number | null)[] = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(d);
    return days;
  }, [calendarMonth]);

  const canConfirm = clinicId && service && selectedDate && selectedTime && (serviceBranches.length <= 1 || selectedBranchId);

  const handleConfirm = async () => {
    if (!canConfirm || !clinicId || !service) return;
    setSubmitting(true);
    try {
      await createBooking({
        clinicId,
        branchId: selectedBranchId ?? undefined,
        serviceId: service._id,
        doctorId: selectedDoctorId ?? undefined,
        scheduledDate: selectedDate!,
        scheduledTime: selectedTime!,
      });
      setSuccessVisible(true);
      setTimeout(() => {
        setSuccessVisible(false);
        router.replace('/(tabs)');
      }, 2000);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  const openYandexMaps = (lat: number, lng: number) => {
    const url = `https://yandex.ru/maps/?pt=${lng},${lat}&z=16`;
    Linking.openURL(url).catch(() => {});
  };

  if (loading || !clinic) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  const monthLabel = `${MONTH_NAMES[calendarMonth.month]} ${calendarMonth.year}`;
  const selectedDateStr = selectedDate
    ? (() => {
        const [y, m, d] = selectedDate.split('-');
        return `${d}/${m}/${y}`;
      })()
    : '';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.bookAppointment}</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {service && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t.selectService}</Text>
            <View style={styles.serviceCard}>
              <View style={styles.serviceIconWrap}>
                <Ionicons name="medical" size={24} color="#a78bfa" />
              </View>
              <View style={styles.serviceCardBody}>
                <Text style={styles.serviceCardTitle}>{service.title}</Text>
                <Text style={styles.serviceCardMeta}>
                  {formatPrice(service.price)} • {service.durationMin} {t.minutes}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#71717a" />
            </View>
          </View>
        )}

        {serviceDoctors.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t.selectDoctor}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {serviceDoctors.map((doc) => (
                <TouchableOpacity
                  key={doc._id}
                  style={[styles.chip, selectedDoctorId === doc._id && styles.chipSelected]}
                  onPress={() => setSelectedDoctorId(doc._id)}
                >
                  <Text style={[styles.chipText, selectedDoctorId === doc._id && styles.chipTextSelected]}>{doc.fullName}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {serviceBranches.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t.selectBranch}</Text>
            {serviceBranches.map((b) => (
              <TouchableOpacity
                key={b._id}
                style={styles.branchRow}
                onPress={() => setBranchModalBranch(b)}
              >
                <Text style={styles.branchRowText}>{b.name}</Text>
                <Ionicons name="chevron-forward" size={18} color="#71717a" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.date}</Text>
          <View style={styles.calendar}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                onPress={() =>
                  setCalendarMonth((m) => (m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 }))
                }
              >
                <Ionicons name="chevron-back" size={24} color="#a1a1aa" />
              </TouchableOpacity>
              <Text style={styles.calendarMonthLabel}>{monthLabel}</Text>
              <TouchableOpacity
                onPress={() =>
                  setCalendarMonth((m) => (m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 }))
                }
              >
                <Ionicons name="chevron-forward" size={24} color="#a1a1aa" />
              </TouchableOpacity>
            </View>
            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((w) => (
                <Text key={w} style={styles.weekdayText}>
                  {w}
                </Text>
              ))}
            </View>
            <View style={styles.daysGrid}>
              {calendarDays.map((day, idx) => {
                if (day === null) return <View key={`e-${idx}`} style={styles.dayCell} />;
                const dateStr = `${calendarMonth.year}-${(calendarMonth.month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                const isSelected = selectedDate === dateStr;
                const isPast = new Date(dateStr) < new Date(new Date().toDateString());
                return (
                  <TouchableOpacity
                    key={dateStr}
                    style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                    onPress={() => !isPast && setSelectedDate(dateStr)}
                    disabled={isPast}
                  >
                    <Text style={[styles.dayCellText, isSelected && styles.dayCellTextSelected, isPast && styles.dayCellTextPast]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.availability}</Text>
          <View style={styles.slotsGrid}>
            {slots.map((slot) => (
              <TouchableOpacity
                key={slot}
                style={[styles.slotChip, selectedTime === slot && styles.slotChipSelected]}
                onPress={() => setSelectedTime(slot)}
              >
                {selectedTime === slot && <Ionicons name="checkmark" size={14} color="#fff" style={styles.slotCheck} />}
                <Text style={[styles.slotChipText, selectedTime === slot && styles.slotChipTextSelected]}>{slot}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {(selectedDate || selectedTime) && service && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t.summary}</Text>
            <View style={styles.summaryCard}>
              <Ionicons name="calendar" size={20} color="#a78bfa" />
              <Text style={styles.summaryText}>
                {service.title} • {selectedDateStr} • {selectedTime ?? '--'}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.confirmBtn, (!canConfirm || submitting) && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!canConfirm || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.confirmBtnText}>{t.confirmAppointment}</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
        <View style={{ height: 60 }} />
      </ScrollView>

      <Modal visible={successVisible} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
            <Text style={styles.successTitle}>{t.bookingSuccess}</Text>
          </View>
        </View>
      </Modal>

      {branchModalBranch && (
        <Modal visible={!!branchModalBranch} transparent animationType="slide">
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setBranchModalBranch(null)}>
            <View style={styles.branchModal}>
              <Text style={styles.branchModalTitle}>{branchModalBranch.name}</Text>
              {branchModalBranch.phone ? <Text style={styles.branchModalRow}>{t.phone}: {branchModalBranch.phone}</Text> : null}
              {(branchModalBranch.address?.city || branchModalBranch.address?.street) && (
                <Text style={styles.branchModalRow}>
                  {t.location}: {[branchModalBranch.address?.city, branchModalBranch.address?.street].filter(Boolean).join(', ')}
                </Text>
              )}
              <TouchableOpacity
                style={styles.yandexBtn}
                onPress={() => {
                  const { lat, lng } = branchModalBranch.address?.geo ?? {};
                  if (lat != null && lng != null) openYandexMaps(lat, lng);
                }}
              >
                <Ionicons name="navigate" size={20} color="#fff" />
                <Text style={styles.yandexBtnText}>{t.openInYandexMaps}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.branchModalClose} onPress={() => setBranchModalBranch(null)}>
                <Text style={styles.branchModalCloseText}>{t.back}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  scrollContent: { padding: 20, paddingBottom: 24 },
  section: { marginBottom: 20 },
  sectionLabel: { color: '#a1a1aa', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  serviceIconWrap: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(167, 139, 250, 0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  serviceCardBody: { flex: 1 },
  serviceCardTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  serviceCardMeta: { color: '#a1a1aa', fontSize: 13, marginTop: 4 },
  chipScroll: { marginHorizontal: -4 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#27272a',
    marginRight: 8,
  },
  chipSelected: { backgroundColor: '#7c3aed' },
  chipText: { color: '#a1a1aa', fontSize: 14 },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  branchRowText: { color: '#fff', fontSize: 15 },
  calendar: { backgroundColor: '#18181b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#27272a' },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  calendarMonthLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  weekdayRow: { flexDirection: 'row', marginBottom: 8 },
  weekdayText: { flex: 1, color: '#71717a', fontSize: 12, textAlign: 'center' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  dayCellSelected: { backgroundColor: '#7c3aed', borderRadius: 20 },
  dayCellText: { color: '#fff', fontSize: 14 },
  dayCellTextSelected: { color: '#fff', fontWeight: '700' },
  dayCellTextPast: { color: '#52525b' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotChip: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
    minWidth: 90,
    alignItems: 'center',
  },
  slotChipSelected: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  slotCheck: { position: 'absolute', top: 6, right: 8 },
  slotChipText: { color: '#fff', fontSize: 14 },
  slotChipTextSelected: { color: '#fff', fontWeight: '600' },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 12,
  },
  summaryText: { color: '#fff', fontSize: 15, flex: 1 },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    marginTop: 8,
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successBox: { alignItems: 'center', padding: 32 },
  successTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 16 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  branchModal: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderTopColor: '#27272a',
  },
  branchModalTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  branchModalRow: { color: '#d4d4d8', fontSize: 15, marginBottom: 8 },
  yandexBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 16,
  },
  yandexBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  branchModalClose: { marginTop: 12, alignItems: 'center' },
  branchModalCloseText: { color: '#a78bfa', fontSize: 16 },
});
