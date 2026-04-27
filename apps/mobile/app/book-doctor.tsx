import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../store/theme-store';
import { useAuthStore } from '../store/auth-store';
import { getTokens } from '../lib/design';
import { Button, IconButton } from '../components/ui';
import {
  getClinicDetail,
  getDoctorSlots,
  createBooking,
  type ClinicDetailPublic,
  type DoctorSlotsResponse,
} from '../lib/api';

function parseTime(t: string): number {
  const [h, m] = t.split(':').map((x) => parseInt(x, 10));
  return h * 60 + m;
}

function formatSlot(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateSlots(
  schedule: DoctorSlotsResponse['schedule'],
  durationMin: number,
  dateStr: string
): string[] {
  if (!schedule?.weekly?.length) return [];
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay() === 0 ? 7 : d.getDay();
  const weekDay = schedule.weekly.find((w) => w.day === day);
  if (!weekDay) return [];
  const from = parseTime(weekDay.from);
  const to = parseTime(weekDay.to);
  const lunchFrom = weekDay.lunchFrom ? parseTime(weekDay.lunchFrom) : null;
  const lunchTo = weekDay.lunchTo ? parseTime(weekDay.lunchTo) : null;
  const slots: string[] = [];
  let start = from;
  while (start + durationMin <= to) {
    const end = start + durationMin;
    const inLunch = lunchFrom != null && lunchTo != null && start < lunchTo && end > lunchFrom;
    if (!inLunch) slots.push(formatSlot(start));
    start += durationMin;
  }
  return slots;
}

function getNextDates(count: number): { key: string; label: string; weekday: string }[] {
  const dates: { key: string; label: string; weekday: string }[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dates.push({
      key,
      label: String(d.getDate()),
      weekday: d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase(),
    });
  }
  return dates;
}

export default function BookDoctorScreen() {
  const { clinicId, doctorId } = useLocalSearchParams<{ clinicId: string; doctorId: string }>();
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const language = (useAuthStore((s) => s.language) ?? 'uz') as 'uz' | 'ru' | 'en';
  const insets = useSafeAreaInsets();
  const tokens = getTokens(theme);

  const [clinic, setClinic] = useState<ClinicDetailPublic | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slotsData, setSlotsData] = useState<DoctorSlotsResponse | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);

  const tr = (u: string, r: string, e: string) => (language === 'uz' ? u : language === 'ru' ? r : e);
  const dates = useMemo(() => getNextDates(14), []);

  useEffect(() => {
    if (!clinicId) return;
    getClinicDetail(clinicId).then(setClinic).catch(() => {});
  }, [clinicId]);

  useEffect(() => {
    if (!clinicId || !doctorId || !selectedDate) return;
    setLoadingSlots(true);
    setSelectedTime(null);
    getDoctorSlots(clinicId, doctorId, selectedDate)
      .then((res) => {
        setSlotsData(res);
        if (!selectedServiceId && res.services.length > 0) {
          setSelectedServiceId(res.services[0]._id);
        }
      })
      .catch(() => setSlotsData(null))
      .finally(() => setLoadingSlots(false));
  }, [clinicId, doctorId, selectedDate]);

  const doctor = clinic?.doctors?.find((d) => d._id === doctorId);
  const selectedService = slotsData?.services.find((s) => s._id === selectedServiceId) ?? null;
  const allSlots = slotsData && selectedService
    ? generateSlots(slotsData.schedule, selectedService.durationMin, selectedDate)
    : [];
  const bookedSet = new Set(slotsData?.bookedTimes ?? []);

  const confirm = async () => {
    if (!clinicId || !doctorId || !selectedServiceId || !selectedTime) return;
    setBooking(true);
    try {
      const result = await createBooking({
        clinicId,
        serviceId: selectedServiceId,
        doctorId,
        scheduledDate: selectedDate,
        scheduledTime: selectedTime,
      });
      router.replace({ pathname: '/appointment/[id]', params: { id: result._id } });
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setBooking(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text style={[tokens.type.title, { color: tokens.colors.text }]}>
          {tr('Bron qilish', 'Запись', 'Book appointment')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 140 }}>
        {doctor ? (
          <LinearGradient
            colors={tokens.gradients.cool as [string, string, ...string[]]}
            style={styles.doctorHero}
          >
            <Text style={[tokens.type.caption, { color: tokens.brand.iris }]}>
              {tr('SHIFOKOR', 'ВРАЧ', 'DOCTOR')}
            </Text>
            <Text style={[tokens.type.titleLg, { color: tokens.colors.text, marginTop: 4 }]}>{doctor.fullName}</Text>
            <Text style={{ color: tokens.colors.textSecondary, fontSize: 13, marginTop: 2 }}>{doctor.specialty}</Text>
          </LinearGradient>
        ) : null}

        <View>
          <Text style={[tokens.type.title, { color: tokens.colors.text, marginBottom: 10 }]}>
            {tr('1. Xizmatni tanlang', '1. Выберите услугу', '1. Pick a service')}
          </Text>
          {slotsData?.services?.length === 0 ? (
            <Text style={{ color: tokens.colors.textTertiary }}>
              {tr('Shifokor uchun xizmatlar yo‘q', 'Нет доступных услуг', 'No services')}
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {slotsData?.services?.map((s) => {
                const active = s._id === selectedServiceId;
                return (
                  <TouchableOpacity
                    key={s._id}
                    activeOpacity={0.85}
                    onPress={() => {
                      setSelectedServiceId(s._id);
                      setSelectedTime(null);
                    }}
                    style={[
                      styles.serviceRow,
                      {
                        backgroundColor: active ? tokens.brand.iris + '10' : tokens.colors.backgroundCard,
                        borderColor: active ? tokens.brand.iris : tokens.colors.border,
                      },
                    ]}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[tokens.type.title, { color: tokens.colors.text }]} numberOfLines={1}>
                        {s.title}
                      </Text>
                      <Text style={{ color: tokens.colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                        {s.durationMin} {tr('daq', 'мин', 'min')}
                        {s.price?.amount ? ` · ${s.price.amount.toLocaleString()} ${s.price.currency}` : ''}
                      </Text>
                    </View>
                    {active ? <Ionicons name="checkmark-circle" size={22} color={tokens.brand.iris} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View>
          <Text style={[tokens.type.title, { color: tokens.colors.text, marginBottom: 10 }]}>
            {tr('2. Sanani tanlang', '2. Выберите дату', '2. Pick a date')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {dates.map((d) => {
                const active = d.key === selectedDate;
                return (
                  <TouchableOpacity
                    key={d.key}
                    onPress={() => setSelectedDate(d.key)}
                    activeOpacity={0.85}
                    style={[
                      styles.dateChip,
                      {
                        backgroundColor: active ? tokens.brand.iris : tokens.colors.backgroundCard,
                        borderColor: active ? tokens.brand.iris : tokens.colors.border,
                      },
                    ]}
                  >
                    <Text style={{ color: active ? '#fff' : tokens.colors.textTertiary, fontSize: 10, fontWeight: '700' }}>
                      {d.weekday}
                    </Text>
                    <Text style={{ color: active ? '#fff' : tokens.colors.text, fontSize: 18, fontWeight: '800', marginTop: 3 }}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <View>
          <Text style={[tokens.type.title, { color: tokens.colors.text, marginBottom: 10 }]}>
            {tr('3. Vaqtni tanlang', '3. Выберите время', '3. Pick a time')}
          </Text>
          {loadingSlots ? (
            <ActivityIndicator color={tokens.brand.iris} />
          ) : allSlots.length === 0 ? (
            <Text style={{ color: tokens.colors.textTertiary }}>
              {tr('Bu kuni bo‘sh vaqt yo‘q', 'Нет свободных слотов на этот день', 'No slots available')}
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {allSlots.map((slot) => {
                const booked = bookedSet.has(slot);
                const active = selectedTime === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    disabled={booked}
                    onPress={() => setSelectedTime(slot)}
                    style={[
                      styles.timeChip,
                      booked
                        ? { backgroundColor: tokens.colors.borderLight, borderColor: tokens.colors.border }
                        : active
                        ? { backgroundColor: tokens.brand.iris, borderColor: tokens.brand.iris }
                        : { backgroundColor: tokens.colors.backgroundCard, borderColor: tokens.colors.border },
                    ]}
                  >
                    <Text
                      style={{
                        color: booked ? tokens.colors.textTertiary : active ? '#fff' : tokens.colors.text,
                        fontWeight: '700',
                        fontSize: 13,
                        textDecorationLine: booked ? 'line-through' : 'none',
                      }}
                    >
                      {slot}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.ctaBar, { backgroundColor: tokens.colors.background, borderTopColor: tokens.colors.border, paddingBottom: insets.bottom + 12 }]}>
        <Button
          title={booking ? '' : tr('Bronni tasdiqlash', 'Подтвердить запись', 'Confirm booking')}
          variant="gradient"
          loading={booking}
          rightIcon="arrow-forward"
          disabled={!selectedServiceId || !selectedTime}
          onPress={confirm}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  doctorHero: { padding: 18, borderRadius: 20 },
  serviceRow: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateChip: {
    width: 56,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  timeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
