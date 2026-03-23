import React, { useEffect, useState, useMemo, useRef } from 'react';
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
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getClinicDetail, getServiceById, createBooking, getBookedSlots, type ClinicDetailPublic, type ClinicDoctorPublic, type ClinicBranchPublic, type ClinicServicePublic } from '../lib/api';
import { useAuthStore } from '../store/auth-store';
import { useThemeStore } from '../store/theme-store';
import { getTranslations } from '../lib/translations';
import { getColors } from '../lib/theme';

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

const WEEKDAY_LABELS_UZ = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
const WEEKDAY_LABELS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const SCREEN_W = Dimensions.get('window').width;

function get7DaysForWeek(weekOffset: number): { dateStr: string; dayNum: number; weekdayIdx: number; isToday: boolean; isPast: boolean }[] {
  const result = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + weekOffset * 7);
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const weekday = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const dateStr = `${y}-${m}-${day}`;
    const isToday = d.getTime() === today.getTime();
    const isPast = d.getTime() < today.getTime();
    result.push({ dateStr, dayNum: d.getDate(), weekdayIdx: weekday, isToday, isPast });
  }
  return result;
}

const MONTH_NAMES_SHORT_UZ = ['yan', 'fev', 'mart', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek'];
const MONTH_NAMES_SHORT_RU = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function getWeekRangeLabel(days: { dateStr: string }[], lang: string): string {
  if (days.length === 0) return '';
  const first = new Date(days[0].dateStr + 'T00:00:00');
  const last = new Date(days[days.length - 1].dateStr + 'T00:00:00');
  const months = lang === 'ru' ? MONTH_NAMES_SHORT_RU : MONTH_NAMES_SHORT_UZ;
  const d1 = first.getDate();
  const m1 = months[first.getMonth()];
  const d2 = last.getDate();
  const m2 = months[last.getMonth()];
  if (first.getMonth() === last.getMonth()) {
    return `${d1} – ${d2} ${m1}`;
  }
  return `${d1} ${m1} – ${d2} ${m2}`;
}


export default function BookScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clinicId?: string; serviceId?: string }>();
  const language = useAuthStore((s) => s.language) ?? 'uz';
  const theme = useThemeStore((s) => s.theme);
  const t = getTranslations(language);
  const colors = getColors(theme);
  const [clinic, setClinic] = useState<ClinicDetailPublic | null>(null);
  const [service, setService] = useState<ClinicServicePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [branchModalBranch, setBranchModalBranch] = useState<ClinicBranchPublic | null>(null);

  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Animation for success modal
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  const [weekOffset, setWeekOffset] = useState(0);

  const clinicId = params.clinicId ?? clinic?._id;
  const serviceId = params.serviceId;

  const weekdayLabels = language === 'ru' ? WEEKDAY_LABELS_RU : WEEKDAY_LABELS_UZ;
  const weekDays = useMemo(() => get7DaysForWeek(weekOffset), [weekOffset]);
  const weekRangeLabel = useMemo(() => getWeekRangeLabel(weekDays, language), [weekDays, language]);
  const canGoPrev = weekOffset > 0;

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

  // Auto-select today on first load
  useEffect(() => {
    if (!selectedDate && weekDays.length > 0) {
      const firstSelectable = weekDays.find((d) => !d.isPast);
      if (firstSelectable) setSelectedDate(firstSelectable.dateStr);
    }
  }, []);

  const selectedDoctor = selectedDoctorId ? serviceDoctors.find((d) => d._id === selectedDoctorId) : null;

  // Generate schedule-based slots (all possible times from doctor schedule)
  const allSlots = useMemo(() => {
    if (!selectedDoctor || !selectedDate || !service) return [];
    return getSlotsForDoctorAndDate(selectedDoctor.schedule, service.durationMin, selectedDate);
  }, [selectedDoctor, selectedDate, service]);

  // Fetch booked times from the server
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (!clinicId || !selectedDoctorId || !selectedDate) {
      setBookedTimes([]);
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    getBookedSlots(clinicId, selectedDoctorId, selectedDate)
      .then((times) => { if (!cancelled) setBookedTimes(times); })
      .catch(() => { if (!cancelled) setBookedTimes([]); })
      .finally(() => { if (!cancelled) setLoadingSlots(false); });
    return () => { cancelled = true; };
  }, [clinicId, selectedDoctorId, selectedDate]);

  // Available slots = schedule slots minus already-booked times
  const slots = useMemo(() => {
    return allSlots.filter((s) => !bookedTimes.includes(s));
  }, [allSlots, bookedTimes]);

  // Determine the empty state reason
  const isNotWorkingDay = allSlots.length === 0 && !!selectedDate && !!selectedDoctor;
  const allSlotsBooked = allSlots.length > 0 && slots.length === 0;

  const canConfirm = clinicId && service && selectedDate && selectedTime && (serviceBranches.length <= 1 || selectedBranchId);

  const showSuccessAnimation = () => {
    setSuccessVisible(true);
    successScale.setValue(0);
    successOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(successScale, { toValue: 1, useNativeDriver: true, tension: 50, friction: 6 }),
      Animated.timing(successOpacity, { toValue: 1, useNativeDriver: true, duration: 300 }),
    ]).start();
  };

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
      showSuccessAnimation();
      setTimeout(() => {
        setSuccessVisible(false);
        router.replace('/(tabs)');
      }, 2500);
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
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t.bookAppointment}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Booking Info Card */}
        {service && (
          <View style={[styles.infoCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <View style={styles.infoCardRow}>
              <View style={[styles.infoIcon, { backgroundColor: colors.primaryBg }]}>
                <Ionicons name="medical" size={22} color={colors.primary} />
              </View>
              <View style={styles.infoCardBody}>
                <Text style={[styles.infoCardTitle, { color: colors.text }]}>{service.title}</Text>
                <Text style={[styles.infoCardSub, { color: colors.textSecondary }]}>
                  {formatPrice(service.price)} · {service.durationMin} {t.minutes}
                </Text>
              </View>
            </View>
            {selectedDoctor && (
              <View style={[styles.infoMetaRow, { borderTopColor: colors.border }]}>
                <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.infoMetaText, { color: colors.textSecondary }]}>{selectedDoctor.fullName}</Text>
              </View>
            )}
            {clinic && (
              <View style={styles.infoMetaRow2}>
                <Ionicons name="business-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.infoMetaText, { color: colors.textSecondary }]}>{clinic.clinicDisplayName}</Text>
              </View>
            )}
          </View>
        )}

        {/* Doctor Selection */}
        {serviceDoctors.length > 1 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.selectDoctor}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {serviceDoctors.map((doc) => {
                const isActive = selectedDoctorId === doc._id;
                return (
                  <TouchableOpacity
                    key={doc._id}
                    style={[styles.chip, { backgroundColor: isActive ? colors.primary : colors.backgroundCard, borderColor: isActive ? colors.primary : colors.border }]}
                    onPress={() => { setSelectedDoctorId(doc._id); setSelectedTime(null); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, { color: isActive ? '#fff' : colors.text }]}>{doc.fullName}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Branch Selection */}
        {serviceBranches.length > 1 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.selectBranch}</Text>
            {serviceBranches.map((b) => {
              const isActive = selectedBranchId === b._id;
              return (
                <TouchableOpacity
                  key={b._id}
                  style={[styles.branchRow, { backgroundColor: isActive ? colors.primaryBg : colors.backgroundCard, borderColor: isActive ? colors.primary : colors.border }]}
                  onPress={() => setSelectedBranchId(b._id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.branchRowLeft}>
                    <Ionicons name="location-outline" size={18} color={isActive ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.branchRowText, { color: colors.text }]}>{b.name}</Text>
                  </View>
                  <TouchableOpacity hitSlop={12} onPress={() => setBranchModalBranch(b)}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.textTertiary} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Date Selection — 7-day strip with week navigation */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.selectDate ?? t.date}</Text>

          {/* Week navigation: ← 25 mart – 2 aprel → */}
          <View style={[styles.weekNav, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => canGoPrev && setWeekOffset((w) => w - 1)}
              style={[styles.weekNavArrow, !canGoPrev && { opacity: 0.3 }]}
              disabled={!canGoPrev}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.weekNavLabel, { color: colors.text }]}>{weekRangeLabel}</Text>
            <TouchableOpacity
              onPress={() => setWeekOffset((w) => w + 1)}
              style={styles.weekNavArrow}
              hitSlop={12}
            >
              <Ionicons name="chevron-forward" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Day strip */}
          <View style={styles.dayStripRow}>
            {weekDays.map((d) => {
              const isActive = selectedDate === d.dateStr;
              return (
                <TouchableOpacity
                  key={d.dateStr}
                  style={[
                    styles.dayStripItem,
                    { backgroundColor: isActive ? colors.primary : colors.backgroundCard, borderColor: isActive ? colors.primary : colors.border },
                    d.isPast && { opacity: 0.35 },
                  ]}
                  onPress={() => { if (!d.isPast) { setSelectedDate(d.dateStr); setSelectedTime(null); } }}
                  disabled={d.isPast}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dayStripWeekday, { color: isActive ? 'rgba(255,255,255,0.75)' : colors.textSecondary }]}>
                    {weekdayLabels[d.weekdayIdx]}
                  </Text>
                  <Text style={[styles.dayStripNum, { color: isActive ? '#fff' : colors.text }]}>{d.dayNum}</Text>
                  {d.isToday && (
                    <View style={[styles.todayDot, { backgroundColor: isActive ? '#fff' : colors.primary }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Time Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginBottom: 0 }]}>{t.selectTime ?? t.availability}</Text>
            {slots.length > 0 && (
              <Text style={[styles.slotsCount, { color: colors.textTertiary }]}>{slots.length} {language === 'ru' ? 'слотов' : 'slot'}</Text>
            )}
          </View>
          {loadingSlots ? (
            <View style={[styles.emptySlots, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : isNotWorkingDay ? (
            <View style={[styles.emptySlots, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <Ionicons name="calendar-outline" size={32} color={colors.textTertiary} />
              <Text style={[styles.emptySlotsTitle, { color: colors.text }]}>{t.notWorkingDay}</Text>
              <Text style={[styles.emptySlotsText, { color: colors.textTertiary }]}>
                {language === 'ru' ? 'Попробуйте другую дату' : 'Boshqa sanani tanlang'}
              </Text>
            </View>
          ) : allSlotsBooked ? (
            <View style={[styles.emptySlots, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <Ionicons name="alert-circle-outline" size={32} color="#F59E0B" />
              <Text style={[styles.emptySlotsTitle, { color: colors.text }]}>{t.noSlotsAvailable}</Text>
              <Text style={[styles.emptySlotsText, { color: colors.textTertiary }]}>
                {language === 'ru' ? 'Все слоты заняты, выберите другой день' : "Barcha vaqtlar band, boshqa kunni tanlang"}
              </Text>
            </View>
          ) : slots.length === 0 ? (
            <View style={[styles.emptySlots, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <Ionicons name="time-outline" size={28} color={colors.textTertiary} />
              <Text style={[styles.emptySlotsText, { color: colors.textTertiary }]}>
                {language === 'ru' ? 'Выберите дату и врача' : 'Sana va shifokorni tanlang'}
              </Text>
            </View>
          ) : (
            <View style={styles.slotsGrid}>
              {slots.map((slot) => {
                const isActive = selectedTime === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.slotChip,
                      { backgroundColor: isActive ? colors.primary : colors.backgroundCard, borderColor: isActive ? colors.primary : colors.border },
                    ]}
                    onPress={() => setSelectedTime(slot)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.slotChipText, { color: isActive ? '#fff' : colors.text }]}>{slot}</Text>
                    {isActive && <Ionicons name="checkmark" size={14} color="#fff" style={styles.slotCheck} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: colors.primary }, (!canConfirm || submitting) && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!canConfirm || submitting}
          activeOpacity={0.85}
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
      </View>

      {/* Success Modal */}
      <Modal visible={successVisible} transparent animationType="none">
        <View style={styles.successOverlay}>
          <Animated.View style={[styles.successCard, { backgroundColor: colors.backgroundCard, transform: [{ scale: successScale }], opacity: successOpacity }]}>
            <View style={[styles.successIconCircle, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="checkmark-circle" size={56} color="#4CAF50" />
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>{t.bookingSuccess}</Text>
            {service && selectedDate && selectedTime && (
              <View style={styles.successDetails}>
                <View style={styles.successDetailRow}>
                  <Ionicons name="medical-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.successDetailText, { color: colors.textSecondary }]}>{service.title}</Text>
                </View>
                <View style={styles.successDetailRow}>
                  <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.successDetailText, { color: colors.textSecondary }]}>{selectedDate.split('-').reverse().join('/')} · {selectedTime}</Text>
                </View>
                {selectedDoctor && (
                  <View style={styles.successDetailRow}>
                    <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.successDetailText, { color: colors.textSecondary }]}>{selectedDoctor.fullName}</Text>
                  </View>
                )}
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* Branch Info Modal */}
      {branchModalBranch && (
        <Modal visible={!!branchModalBranch} transparent animationType="slide">
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setBranchModalBranch(null)}>
            <View style={[styles.branchModal, { backgroundColor: colors.backgroundCard }]}>
              <View style={[styles.branchModalHandle, { backgroundColor: colors.border }]} />
              <Text style={[styles.branchModalTitle, { color: colors.text }]}>{branchModalBranch.name}</Text>
              {branchModalBranch.phone ? (
                <View style={styles.branchModalInfoRow}>
                  <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.branchModalInfoText, { color: colors.textSecondary }]}>{branchModalBranch.phone}</Text>
                </View>
              ) : null}
              {(branchModalBranch.address?.city || branchModalBranch.address?.street) && (
                <View style={styles.branchModalInfoRow}>
                  <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.branchModalInfoText, { color: colors.textSecondary }]}>
                    {[branchModalBranch.address?.city, branchModalBranch.address?.street].filter(Boolean).join(', ')}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.yandexBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  const { lat, lng } = branchModalBranch.address?.geo ?? {};
                  if (lat != null && lng != null) openYandexMaps(lat, lng);
                }}
              >
                <Ionicons name="navigate" size={20} color="#fff" />
                <Text style={styles.yandexBtnText}>{t.openInYandexMaps}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.branchModalCloseBtn} onPress={() => setBranchModalBranch(null)}>
                <Text style={[styles.branchModalCloseText, { color: colors.textSecondary }]}>{t.back}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },

  // Info Card
  infoCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  infoCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoCardBody: { flex: 1, minWidth: 0 },
  infoCardTitle: { fontSize: 17, fontWeight: '700' },
  infoCardSub: { fontSize: 13, fontWeight: '500', marginTop: 3 },
  infoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  infoMetaRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  infoMetaText: { fontSize: 13, fontWeight: '500' },

  // Sections
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthLabel: { fontSize: 15, fontWeight: '600' },
  slotsCount: { fontSize: 13, fontWeight: '500' },

  // Chips
  chipRow: { gap: 8 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  chipText: { fontSize: 14, fontWeight: '600' },

  // Branch
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  branchRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  branchRowText: { fontSize: 15, fontWeight: '500' },

  // Week navigation
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 10,
    marginBottom: 14,
  },
  weekNavArrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekNavLabel: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },

  // 7-day strip
  dayStripRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, paddingVertical: 2 },
  dayStripItem: {
    flex: 1,
    height: 72,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayStripWeekday: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  dayStripNum: { fontSize: 18, fontWeight: '700' },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 3,
  },

  // Time slots
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotChip: {
    width: (SCREEN_W - 40 - 20) / 3,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  slotCheck: {},
  slotChipText: { fontSize: 15, fontWeight: '600' },
  emptySlots: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptySlotsTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' as const },
  emptySlotsText: { fontSize: 14, fontWeight: '500', textAlign: 'center' as const },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  confirmBtnDisabled: { opacity: 0.45 },
  confirmBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  // Success Modal
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  successCard: {
    width: '100%',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  successIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
  },
  successDetails: { gap: 8, width: '100%' },
  successDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  successDetailText: { fontSize: 14, fontWeight: '500' },

  // Branch Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  branchModal: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingTop: 16,
  },
  branchModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  branchModalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  branchModalInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  branchModalInfoText: { fontSize: 15, fontWeight: '500' },
  yandexBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 16,
  },
  yandexBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  branchModalCloseBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  branchModalCloseText: { fontSize: 16, fontWeight: '500' },
});
