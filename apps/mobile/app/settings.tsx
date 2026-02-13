import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore, DEFAULT_AVATAR } from '../store/auth-store';
import { useThemeStore } from '../store/theme-store';
import { getTranslations } from '../lib/translations';
import { updateMe } from '../lib/api';
import { getColors } from '../lib/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const patient = useAuthStore((s) => s.patient);
  const setPatient = useAuthStore((s) => s.setPatient);
  const setLanguage = useAuthStore((s) => s.setLanguage);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const t = getTranslations(language);
  const colors = getColors(theme);

  const [toggles, setToggles] = useState({
    appointments: true,
    pills: true,
    general: false,
  });

  useEffect(() => {
    if (patient?.preferences) {
      setToggles((prev) => ({
        ...prev,
        general: patient.preferences.notificationsEnabled ?? prev.general,
      }));
    }
  }, [patient?.preferences?.notificationsEnabled]);

  const toggleSwitch = (key: keyof typeof toggles) => {
    const next = !toggles[key];
    setToggles((prev) => ({ ...prev, [key]: next }));
    if (key === 'general') {
      updateMe({ preferences: { notificationsEnabled: next } })
        .then((p) => setPatient(p))
        .catch(() => {});
    }
  };

  const displayName = patient?.fullName?.trim() || (language === 'ru' ? 'Пользователь' : 'Foydalanuvchi');
  const avatarUri = patient?.avatarUrl || DEFAULT_AVATAR;

  const tUz = getTranslations('uz');
  const tRu = getTranslations('ru');

  const selectLanguage = async (lang: 'uz' | 'ru') => {
    if (lang === language) return;
    await setLanguage(lang);
    updateMe({ preferences: { language: lang } }).then((p) => setPatient(p)).catch(() => {});
  };

  const selectTheme = async (selectedTheme: 'light' | 'dark') => {
    if (selectedTheme === theme) return;
    await setTheme(selectedTheme);
  };

  const onLogout = async () => {
    Alert.alert(
      language === 'ru' ? 'Выйти?' : "Chiqish?",
      language === 'ru' ? 'Вы уверены?' : "Ishonchingiz komilmi?",
      [
        { text: language === 'ru' ? 'Отмена' : 'Bekor qilish', style: 'cancel' },
        {
          text: language === 'ru' ? 'Выйти' : 'Chiqish',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t.settings}</Text>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.userCard}>
          <Image source={{ uri: avatarUri }} style={[styles.avatar, { borderColor: colors.border }]} />
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>{displayName}</Text>
            <View style={[styles.badgeContainer, { backgroundColor: colors.badge }]}>
              <Text style={[styles.badgeText, { color: colors.badgeText }]}>{t.patientAccount}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{t.accountSettings}</Text>
          <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <SettingItem icon="person-circle-outline" label={t.editProfile} colors={colors} />
            <SettingItem icon="document-text-outline" label={t.personalInfo} colors={colors} />
            <View style={styles.languageRow}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.iconPurpleBg }]}>
                  <Ionicons name="globe-outline" size={20} color={colors.iconPurple} />
                </View>
                <Text style={[styles.rowLabel, { color: colors.text }]}>{t.language}</Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>
          <View style={styles.languageSwitcher}>
            <TouchableOpacity
              style={[
                styles.langOption,
                { backgroundColor: colors.backgroundCard, borderColor: colors.border },
                language === 'uz' && { borderColor: colors.primary, backgroundColor: colors.primaryBgActive }
              ]}
              onPress={() => selectLanguage('uz')}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.langOptionText,
                { color: colors.textSecondary },
                language === 'uz' && { color: colors.primaryLight, fontWeight: '600' }
              ]}>
                {tUz.langUzbek}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.langOption,
                { backgroundColor: colors.backgroundCard, borderColor: colors.border },
                language === 'ru' && { borderColor: colors.primary, backgroundColor: colors.primaryBgActive }
              ]}
              onPress={() => selectLanguage('ru')}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.langOptionText,
                { color: colors.textSecondary },
                language === 'ru' && { color: colors.primaryLight, fontWeight: '600' }
              ]}>
                {tRu.langRussian}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border, marginTop: 16 }]}>
            <View style={styles.languageRow}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.iconPurpleBg }]}>
                  <Ionicons name={theme === 'light' ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.iconPurple} />
                </View>
                <Text style={[styles.rowLabel, { color: colors.text }]}>{t.theme}</Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>
          <View style={styles.languageSwitcher}>
            <TouchableOpacity
              style={[
                styles.langOption,
                { backgroundColor: colors.backgroundCard, borderColor: colors.border },
                theme === 'light' && { borderColor: colors.primary, backgroundColor: colors.primaryBgActive }
              ]}
              onPress={() => selectTheme('light')}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.langOptionText,
                { color: colors.textSecondary },
                theme === 'light' && { color: colors.primaryLight, fontWeight: '600' }
              ]}>
                {t.themeLight}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.langOption,
                { backgroundColor: colors.backgroundCard, borderColor: colors.border },
                theme === 'dark' && { borderColor: colors.primary, backgroundColor: colors.primaryBgActive }
              ]}
              onPress={() => selectTheme('dark')}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.langOptionText,
                { color: colors.textSecondary },
                theme === 'dark' && { color: colors.primaryLight, fontWeight: '600' }
              ]}>
                {t.themeDark}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{t.notifications}</Text>
          <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.iconGreenBg }]}>
                  <Ionicons name="calendar-outline" size={20} color={colors.iconGreen} />
                </View>
                <Text style={[styles.rowLabel, { color: colors.text }]}>{t.appointmentReminders}</Text>
              </View>
              <Switch
                value={toggles.appointments}
                onValueChange={() => toggleSwitch('appointments')}
                trackColor={{ false: colors.switchTrackFalse, true: colors.switchTrackTrue }}
                thumbColor={colors.switchThumb}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.iconPurpleBg }]}>
                  <Ionicons name="medical-outline" size={20} color={colors.iconPurple} />
                </View>
                <Text style={[styles.rowLabel, { color: colors.text }]}>{t.pillRemindersLabel}</Text>
              </View>
              <Switch
                value={toggles.pills}
                onValueChange={() => toggleSwitch('pills')}
                trackColor={{ false: colors.switchTrackFalse, true: colors.switchTrackTrue }}
                thumbColor={colors.switchThumb}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.iconGrayBg }]}>
                  <Ionicons name="notifications-outline" size={20} color={colors.iconGray} />
                </View>
                <Text style={[styles.rowLabel, { color: colors.text }]}>{t.generalNotifications}</Text>
              </View>
              <Switch
                value={toggles.general}
                onValueChange={() => toggleSwitch('general')}
                trackColor={{ false: colors.switchTrackFalse, true: colors.switchTrackTrue }}
                thumbColor={colors.switchThumb}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{t.healthSecurity}</Text>
          <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <SettingItem icon="alarm-outline" label={t.pillReminderSettings} colors={colors} />
            <SettingItem icon="shield-checkmark-outline" label={t.privacyPolicy} colors={colors} />
            <SettingItem icon="lock-closed-outline" label={t.changePassword} colors={colors} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{t.support}</Text>
          <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <SettingItem icon="help-circle-outline" label={t.helpSupport} isExternal colors={colors} />
            <SettingItem icon="mail-outline" label={t.contactUs} colors={colors} />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <Text style={[styles.logoutText, { color: colors.text }]}>{t.logout}</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: colors.textTertiary }]}>{t.version} 1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const SettingItem = ({ icon, label, value, isExternal, onPress, colors }: { icon: string; label: string; value?: string; isExternal?: boolean; onPress?: () => void; colors: any }) => (
    <>
        <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress}>
            <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.iconPurpleBg }]}>
                    <Ionicons name={icon as any} size={20} color={colors.iconPurple} />
                </View>
                <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
            </View>
            <View style={styles.rowRight}>
                {value && <Text style={[styles.valueText, { color: colors.textSecondary }]}>{value}</Text>}
                <Ionicons name={isExternal ? "open-outline" : "chevron-forward"} size={18} color={colors.textTertiary} />
            </View>
        </TouchableOpacity>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
    </>
);

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    content: { flex: 1, paddingHorizontal: 20 },
    userCard: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
    avatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2 },
    userInfo: { marginLeft: 16 },
    userName: { fontSize: 18, fontWeight: 'bold' },
    badgeContainer: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 4, alignSelf: 'flex-start' },
    badgeText: { fontSize: 12, fontWeight: '600' },
    section: { marginBottom: 24 },
    sectionHeader: { fontSize: 12, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
    card: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
    languageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    languageSwitcher: { flexDirection: 'row', gap: 12, marginTop: 12 },
    langOption: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: 'center',
    },
    langOptionText: { fontSize: 15, fontWeight: '500' },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    rowLeft: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    rowLabel: { fontSize: 15, fontWeight: '500' },
    rowRight: { flexDirection: 'row', alignItems: 'center' },
    valueText: { fontSize: 14, marginRight: 8 },
    divider: { height: 1, marginLeft: 64 },
    logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 10, paddingBottom: 6 },
    logoutText: { fontSize: 16, fontWeight: '600' },
    versionText: { textAlign: 'center', fontSize: 12, marginTop: 10 },
});
