import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore, DEFAULT_AVATAR } from '../store/auth-store';
import { getTranslations } from '../lib/translations';
import { updateMe } from '../lib/api';

export default function SettingsScreen() {
  const router = useRouter();
  const language = useAuthStore((s) => s.language);
  const patient = useAuthStore((s) => s.patient);
  const setPatient = useAuthStore((s) => s.setPatient);
  const setLanguage = useAuthStore((s) => s.setLanguage);
  const logout = useAuthStore((s) => s.logout);
  const t = getTranslations(language);

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.settings}</Text>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.userCard}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{displayName}</Text>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{t.patientAccount}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t.accountSettings}</Text>
          <View style={styles.card}>
            <SettingItem icon="person-circle-outline" label={t.editProfile} />
            <SettingItem icon="document-text-outline" label={t.personalInfo} />
            <View style={styles.languageRow}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(167, 139, 250, 0.1)' }]}>
                  <Ionicons name="globe-outline" size={20} color="#a78bfa" />
                </View>
                <Text style={styles.rowLabel}>{t.language}</Text>
              </View>
            </View>
            <View style={styles.divider} />
          </View>
          <View style={styles.languageSwitcher}>
            <TouchableOpacity
              style={[styles.langOption, language === 'uz' && styles.langOptionActive]}
              onPress={() => selectLanguage('uz')}
              activeOpacity={0.8}
            >
              <Text style={[styles.langOptionText, language === 'uz' && styles.langOptionTextActive]}>
                {tUz.langUzbek}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langOption, language === 'ru' && styles.langOptionActive]}
              onPress={() => selectLanguage('ru')}
              activeOpacity={0.8}
            >
              <Text style={[styles.langOptionText, language === 'ru' && styles.langOptionTextActive]}>
                {tRu.langRussian}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t.notifications}</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                  <Ionicons name="calendar-outline" size={20} color="#22c55e" />
                </View>
                <Text style={styles.rowLabel}>{t.appointmentReminders}</Text>
              </View>
              <Switch
                value={toggles.appointments}
                onValueChange={() => toggleSwitch('appointments')}
                trackColor={{ false: '#3f3f46', true: '#8b5cf6' }}
                thumbColor={'#ffffff'}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(167, 139, 250, 0.1)' }]}>
                  <Ionicons name="medical-outline" size={20} color="#a78bfa" />
                </View>
                <Text style={styles.rowLabel}>{t.pillRemindersLabel}</Text>
              </View>
              <Switch
                value={toggles.pills}
                onValueChange={() => toggleSwitch('pills')}
                trackColor={{ false: '#3f3f46', true: '#8b5cf6' }}
                thumbColor={'#ffffff'}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(113, 113, 122, 0.1)' }]}>
                  <Ionicons name="notifications-outline" size={20} color="#a1a1aa" />
                </View>
                <Text style={styles.rowLabel}>{t.generalNotifications}</Text>
              </View>
              <Switch
                value={toggles.general}
                onValueChange={() => toggleSwitch('general')}
                trackColor={{ false: '#3f3f46', true: '#8b5cf6' }}
                thumbColor={'#ffffff'}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t.healthSecurity}</Text>
          <View style={styles.card}>
            <SettingItem icon="alarm-outline" label={t.pillReminderSettings} />
            <SettingItem icon="shield-checkmark-outline" label={t.privacyPolicy} />
            <SettingItem icon="lock-closed-outline" label={t.changePassword} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t.support}</Text>
          <View style={styles.card}>
            <SettingItem icon="help-circle-outline" label={t.helpSupport} isExternal />
            <SettingItem icon="mail-outline" label={t.contactUs} />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={20} color="#a1a1aa" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>{t.logout}</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>{t.version} 2.4.1</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const SettingItem = ({ icon, label, value, isExternal, onPress }: { icon: string; label: string; value?: string; isExternal?: boolean; onPress?: () => void }) => (
    <>
        <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress}>
            <View style={styles.rowLeft}>
                <View style={styles.iconBox}>
                    <Ionicons name={icon as any} size={20} color="#a78bfa" />
                </View>
                <Text style={styles.rowLabel}>{label}</Text>
            </View>
            <View style={styles.rowRight}>
                {value && <Text style={styles.valueText}>{value}</Text>}
                <Ionicons name={isExternal ? "open-outline" : "chevron-forward"} size={18} color="#52525b" />
            </View>
        </TouchableOpacity>
        <View style={styles.divider} />
    </>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#09090b' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
    content: { flex: 1, paddingHorizontal: 20 },
    userCard: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
    avatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#27272a' },
    userInfo: { marginLeft: 16 },
    userName: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
    badgeContainer: { backgroundColor: '#2e1065', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 4, alignSelf: 'flex-start' },
    badgeText: { color: '#a78bfa', fontSize: 12, fontWeight: '600' },
    section: { marginBottom: 24 },
    sectionHeader: { color: '#a1a1aa', fontSize: 12, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
    card: { backgroundColor: '#18181b', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#27272a' },
    languageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    languageSwitcher: { flexDirection: 'row', gap: 12, marginTop: 12 },
    langOption: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 14,
      backgroundColor: '#18181b',
      borderWidth: 1,
      borderColor: '#27272a',
      alignItems: 'center',
    },
    langOptionActive: { borderColor: '#7c3aed', backgroundColor: 'rgba(124, 58, 237, 0.15)' },
    langOptionText: { color: '#a1a1aa', fontSize: 15, fontWeight: '500' },
    langOptionTextActive: { color: '#a78bfa', fontWeight: '600' },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    rowLeft: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(167, 139, 250, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    rowLabel: { color: '#ffffff', fontSize: 15, fontWeight: '500' },
    rowRight: { flexDirection: 'row', alignItems: 'center' },
    valueText: { color: '#a1a1aa', fontSize: 14, marginRight: 8 },
    divider: { height: 1, backgroundColor: '#27272a', marginLeft: 64 },
    logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 10, paddingBottom: 6 },
    logoutText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
    versionText: { textAlign: 'center', color: '#52525b', fontSize: 12, marginTop: 10 },
});
