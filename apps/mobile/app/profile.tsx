import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useAuthStore, DEFAULT_AVATAR } from '../store/auth-store';
import { useThemeStore } from '../store/theme-store';
import { getTranslations } from '../lib/translations';
import { getColors } from '../lib/theme';
import { getNextUpcomingBooking, type Booking } from '../lib/api';

const DEFAULT_DOCTOR_AVATAR = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop';

function formatUpcomingDate(dateStr: string, lang: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  if (isToday) return lang === 'ru' ? 'Сегодня' : 'Bugun';
  if (isTomorrow) return lang === 'ru' ? 'Завтра' : 'Ertaga';
  return `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`;
}

const ProfileDashboard = () => {
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const patient = useAuthStore((s) => s.patient);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const t = getTranslations(language);
  const colors = getColors(theme);

  const [nextBooking, setNextBooking] = useState<Booking | null>(null);
  const [nextBookingLoading, setNextBookingLoading] = useState(true);

  const fetchNextBooking = useCallback(() => {
    setNextBookingLoading(true);
    getNextUpcomingBooking()
      .then(setNextBooking)
      .catch(() => setNextBooking(null))
      .finally(() => setNextBookingLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNextBooking();
    }, [fetchNextBooking])
  );

  const displayName = patient?.fullName?.trim() || (language === 'ru' ? 'Пользователь' : 'Foydalanuvchi');
  const avatarUri = patient?.avatarUrl || DEFAULT_AVATAR;

  const onLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t.profileDashboard}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.userSection}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: avatarUri }} style={[styles.avatar, { borderColor: colors.border }]} />
            <View style={[styles.onlineBadge, { backgroundColor: colors.onlineIndicator, borderColor: colors.background }]} />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>{displayName}</Text>
            
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t.upNext}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/appointments')} hitSlop={12}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>{t.seeAll}</Text>
          </TouchableOpacity>
        </View>

        {nextBookingLoading ? (
          <View style={[styles.upNextCard, styles.upNextCardEmpty, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>{t.seeAll}</Text>
          </View>
        ) : nextBooking && (nextBooking.status === 'pending' || nextBooking.status === 'confirmed') ? (
          <TouchableOpacity
            style={[styles.upNextCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
            activeOpacity={0.9}
            onPress={() => router.push({ pathname: '/appointment/[id]', params: { id: nextBooking._id } })}
          >
            <View style={styles.upNextHeader}>
              <View style={[styles.consultationTag, { backgroundColor: colors.primaryBg }]}>
                <Text style={[styles.consultationText, { color: colors.primaryLight }]}>{t.consultation}</Text>
              </View>
              <TouchableOpacity
                style={[styles.videoButton, { backgroundColor: colors.primaryBg, borderColor: colors.primary }]}
                onPress={(e) => { e.stopPropagation(); }}
              >
                <Ionicons name="videocam" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.timeText, { color: colors.text }]}>{nextBooking.scheduledTime}</Text>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {formatUpcomingDate(nextBooking.scheduledDate, language ?? 'uz')}
            </Text>
            <View style={styles.doctorRow}>
              <Image source={{ uri: DEFAULT_DOCTOR_AVATAR }} style={styles.doctorAvatar} />
              <View style={styles.doctorInfo}>
                <Text style={[styles.doctorName, { color: colors.text }]} numberOfLines={1}>
                  {nextBooking.doctorName ?? '—'}
                </Text>
                <Text style={[styles.doctorSpecialty, { color: colors.textSecondary }]} numberOfLines={1}>
                  {nextBooking.serviceTitle ?? '—'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.upNextCard, styles.upNextCardEmpty, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryBg }]}>
              <Ionicons name="calendar-outline" size={32} color={colors.primaryLight} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t.noUpcomingTitle}</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>{t.noUpcomingSubtitle}</Text>
            <TouchableOpacity
              style={[styles.emptyCta, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(tabs)')}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyCtaText}>{t.noUpcomingPromo}</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.historyCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
          onPress={() => router.push('/(tabs)/appointments')}
          activeOpacity={0.8}
        >
          <View style={[styles.historyIconBox, { backgroundColor: colors.border }]}>
            <Ionicons name="time-outline" size={24} color={colors.text} />
          </View>
          <View style={styles.historyInfo}>
            <Text style={[styles.historyTitle, { color: colors.text }]}>{t.visitHistory}</Text>
            <Text style={[styles.historySubtitle, { color: colors.textSecondary }]}>{t.visitHistorySubtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 24, marginBottom: 16 }]}>{t.dailyMeds}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.medsScroll}>
          <MedCard name="Vitamin D" schedule={`8:00 AM • ${t.taken}`} icon="capsules" color="#22c55e" bgColor="rgba(34, 197, 94, 0.1)" colors={colors} />
          <MedCard name="Amoxicillin" schedule={`2:00 PM • ${t.upcoming}`} icon="pills" color="#f97316" bgColor="rgba(249, 115, 22, 0.1)" colors={colors} />
          <MedCard name="Iron Supp" schedule={`8:00 PM • ${t.upcoming}`} icon="glass-whiskey" color="#3b82f6" bgColor="rgba(59, 130, 246, 0.1)" colors={colors} />
        </ScrollView>

        <View style={[styles.settingsGroup, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={22} color={colors.textSecondary} style={styles.settingIcon} />
            <Text style={[styles.settingLabel, { color: colors.text }]}>{t.settings}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.settingRow}>
            <Ionicons name="card-outline" size={22} color={colors.textSecondary} style={styles.settingIcon} />
            <Text style={[styles.settingLabel, { color: colors.text }]}>{t.paymentMethods}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} style={{ marginRight: 8 }} />
          <Text style={[styles.logoutText, { color: colors.error }]}>{t.logOut}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const MedCard = ({ name, schedule, icon, color, bgColor, colors }: any) => (
    <View style={[styles.medCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
        <View style={[styles.medIconBox, { backgroundColor: bgColor }]}>
            <FontAwesome5 name={icon} size={18} color={color} />
        </View>
        <Text style={[styles.medName, { color: colors.text }]}>{name}</Text>
        <Text style={[styles.medSchedule, { color: color }]}>{schedule}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingHorizontal: 20, paddingVertical: 15 },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '600' },
    headerRight: { fontSize: 14 },

    userSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
    avatarContainer: { position: 'relative' },
    avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2 },
    onlineBadge: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
    userInfo: { marginLeft: 16 },
    userName: { fontSize: 22, fontWeight: 'bold' },
    premiumTag: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    premiumText: { fontSize: 14, fontWeight: '600' },

    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    seeAll: { fontSize: 14 },

    upNextCard: {
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
    upNextCardEmpty: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 28,
    },
    emptyIconWrap: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6, textAlign: 'center' },
    emptySubtext: { fontSize: 13, textAlign: 'center', paddingHorizontal: 16 },
    emptyCta: {
        marginTop: 16,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 14,
    },
    emptyCtaText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    upNextHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    consultationTag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    consultationText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
    videoButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    timeText: { fontSize: 32, fontWeight: 'bold', letterSpacing: -1 },
    dateText: { fontSize: 14, marginBottom: 20 },
    doctorRow: { flexDirection: 'row', alignItems: 'center' },
    doctorAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
    doctorInfo: { justifyContent: 'center' },
    doctorName: { fontSize: 14, fontWeight: '600' },
    doctorSpecialty: { fontSize: 12 },

    historyCard: {
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
    },
    historyIconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    historyInfo: { flex: 1 },
    historyTitle: { fontSize: 16, fontWeight: '600' },
    historySubtitle: { fontSize: 12, marginTop: 2 },

    medsScroll: { paddingRight: 20 },
    medCard: {
        width: 130,
        padding: 16,
        borderRadius: 20,
        marginRight: 12,
        borderWidth: 1,
    },
    medIconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    medName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
    medSchedule: { fontSize: 10, fontWeight: '500' },

    settingsGroup: {
        marginTop: 30,
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden'
    },
    settingRow: { flexDirection: 'row', alignItems: 'center', padding: 18 },
    settingIcon: { marginRight: 16 },
    settingLabel: { flex: 1, fontSize: 16 },
    divider: { height: 1, marginLeft: 56 },

    logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 40, marginBottom: 40 },
    logoutText: { fontSize: 15, fontWeight: '600' },

});

export default ProfileDashboard;
