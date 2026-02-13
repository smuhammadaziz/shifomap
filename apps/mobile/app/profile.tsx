import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore, DEFAULT_AVATAR } from '../store/auth-store';
import { useThemeStore } from '../store/theme-store';
import { getTranslations } from '../lib/translations';
import { getColors } from '../lib/theme';

const ProfileDashboard = () => {
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const patient = useAuthStore((s) => s.patient);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const t = getTranslations(language);
  const colors = getColors(theme);

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
            <View style={styles.premiumTag}>
              <FontAwesome5 name="crown" size={12} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.premiumText, { color: colors.primary }]}>{t.premiumMember}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t.upNext}</Text>
          <TouchableOpacity><Text style={[styles.seeAll, { color: colors.primary }]}>{t.seeAll}</Text></TouchableOpacity>
        </View>

        <View style={[styles.upNextCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <View style={styles.upNextHeader}>
            <View style={[styles.consultationTag, { backgroundColor: colors.primaryBg }]}>
              <Text style={[styles.consultationText, { color: colors.primaryLight }]}>{t.consultation}</Text>
            </View>
            <TouchableOpacity style={[styles.videoButton, { backgroundColor: colors.primaryBg, borderColor: colors.primary }]}>
              <Ionicons name="videocam" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.timeText, { color: colors.text }]}>10:00 AM</Text>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>Today, Oct 24</Text>
          <View style={styles.doctorRow}>
            <Image source={{ uri: 'https://i.pravatar.cc/150?u=dr' }} style={styles.doctorAvatar} />
            <View style={styles.doctorInfo}>
              <Text style={[styles.doctorName, { color: colors.text }]}>Dr. Sarah Jenkins</Text>
              <Text style={[styles.doctorSpecialty, { color: colors.textSecondary }]}>Cardiologist</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={[styles.historyCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
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
