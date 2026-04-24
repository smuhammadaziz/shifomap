import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore, DEFAULT_AVATAR } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { getTranslations } from '../../lib/translations';
import { getTokens } from '../../lib/design';
import { getNextUpcomingBooking, deleteMe, type Booking } from '../../lib/api';
import { Avatar, Card, Button } from '../../components/ui';

export default function ProfileScreen() {
  const router = useRouter();
  const language = useAuthStore((s) => s.language) ?? 'uz';
  const patient = useAuthStore((s) => s.patient);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const t = getTranslations(language);
  const tokens = getTokens(theme);

  const [nextBooking, setNextBooking] = useState<Booking | null>(null);

  useFocusEffect(
    useCallback(() => {
      getNextUpcomingBooking().then(setNextBooking).catch(() => setNextBooking(null));
    }, []),
  );

  const onLogout = () => {
    Alert.alert(
      language === 'ru' ? 'Выйти?' : 'Chiqish?',
      language === 'ru' ? 'Вы уверены?' : 'Ishonchingiz komilmi?',
      [
        { text: language === 'ru' ? 'Отмена' : 'Bekor', style: 'cancel' },
        {
          text: language === 'ru' ? 'Выйти' : 'Chiqish',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  };

  const onDelete = () => {
    Alert.alert(
      t.deleteAccount as string,
      (t.deleteAccountConfirm as string) + '\n\n' + (t.deleteAccountWarning as string),
      [
        { text: language === 'ru' ? 'Отмена' : 'Bekor', style: 'cancel' },
        {
          text: t.delete as string,
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMe();
              await logout();
              router.replace('/(auth)/login');
            } catch {
              Alert.alert('Error', 'Failed to delete account');
            }
          },
        },
      ],
    );
  };

  const name = patient?.fullName?.trim() || (language === 'ru' ? 'Пользователь' : 'Foydalanuvchi');
  const avatarUri = patient?.avatarUrl || DEFAULT_AVATAR;

  const menu: Array<{
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bg: string;
    title: string;
    subtitle?: string;
    onPress: () => void;
  }> = [
    {
      icon: 'pulse',
      color: tokens.brand.rose,
      bg: '#fce7f3',
      title: language === 'uz' ? 'Kasalliklar tarixi' : 'История заболеваний',
      subtitle: language === 'uz' ? 'Tashxislar va davolanishlar' : 'Диагнозы и лечение',
      onPress: () => router.push('/medical-history'),
    },
    {
      icon: 'calendar',
      color: tokens.brand.iris,
      bg: '#e0e7ff',
      title: t.visitHistory,
      subtitle: t.visitHistorySubtitle,
      onPress: () => router.push('/(tabs)/appointments'),
    },
    {
      icon: 'receipt',
      color: tokens.brand.mint,
      bg: '#d1fae5',
      title: language === 'uz' ? 'Retseptlar' : 'Рецепты',
      onPress: () => router.push('/pill-reminder'),
    },
    {
      icon: 'chatbubbles',
      color: tokens.brand.sky,
      bg: '#dbeafe',
      title: language === 'uz' ? 'Shifokor chatlari' : 'Чаты с врачами',
      onPress: () => router.push('/chat'),
    },
    {
      icon: 'bookmark',
      color: tokens.brand.amber,
      bg: '#fef3c7',
      title: language === 'uz' ? 'Saqlangan xizmatlar' : 'Сохранённые услуги',
      onPress: () => router.push('/services-results?saved=1' as never),
    },
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: tokens.colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Hero with avatar */}
        <LinearGradient
          colors={tokens.gradients.soft as [string, string, ...string[]]}
          style={styles.hero}
        >
          <View style={styles.heroRow}>
            <Avatar uri={avatarUri} name={name} size={72} ring />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[tokens.type.titleLg, { color: tokens.colors.text }]} numberOfLines={1}>
                {name}
              </Text>
              <Text style={{ color: tokens.colors.textSecondary, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
                {patient?.contacts?.phone ?? ''}
              </Text>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => router.push('/edit-profile')}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={13} color={tokens.brand.iris} />
                <Text style={{ color: tokens.brand.iris, fontSize: 12, fontWeight: '700' }}>
                  {t.editProfile}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {nextBooking && (nextBooking.status === 'pending' || nextBooking.status === 'confirmed') ? (
            <TouchableOpacity
              style={[styles.upNext, { backgroundColor: tokens.colors.backgroundCard }]}
              onPress={() => router.push({ pathname: '/appointment/[id]', params: { id: nextBooking._id } })}
              activeOpacity={0.85}
            >
              <View style={[styles.upNextIcon, { backgroundColor: tokens.brand.iris }]}>
                <Ionicons name="medkit" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: tokens.colors.textTertiary, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 }}>
                  {language === 'uz' ? 'KEYINGI TASHRIF' : 'СЛЕДУЮЩИЙ ПРИЁМ'}
                </Text>
                <Text style={{ color: tokens.colors.text, fontWeight: '700', fontSize: 14, marginTop: 2 }} numberOfLines={1}>
                  {nextBooking.scheduledDate.split('-').reverse().join('/')} · {nextBooking.scheduledTime}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={tokens.colors.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </LinearGradient>

        {/* Menu */}
        <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
          <Card padding={0} elevated={false}>
            {menu.map((item, i) => (
              <TouchableOpacity
                key={item.title}
                style={[
                  styles.menuRow,
                  i < menu.length - 1 ? { borderBottomColor: tokens.colors.borderLight, borderBottomWidth: StyleSheet.hairlineWidth } : null,
                ]}
                onPress={item.onPress}
                activeOpacity={0.75}
              >
                <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: tokens.colors.text, fontWeight: '700', fontSize: 14 }}>{item.title}</Text>
                  {item.subtitle ? (
                    <Text style={{ color: tokens.colors.textTertiary, fontSize: 12, marginTop: 2 }}>{item.subtitle}</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color={tokens.colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </Card>
        </View>

        {/* Settings group */}
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <Card padding={0} elevated={false}>
            <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/settings')} activeOpacity={0.75}>
              <View style={[styles.menuIcon, { backgroundColor: tokens.colors.backgroundSecondary }]}>
                <Ionicons name="settings-outline" size={18} color={tokens.colors.textSecondary} />
              </View>
              <Text style={{ flex: 1, color: tokens.colors.text, fontWeight: '700', fontSize: 14 }}>
                {t.settings}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={tokens.colors.textTertiary} />
            </TouchableOpacity>
            <View style={[styles.rowDivider, { backgroundColor: tokens.colors.borderLight }]} />
            {/* <TouchableOpacity
              style={styles.menuRow}
              onPress={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              activeOpacity={0.75}
            >
              <View style={[styles.menuIcon, { backgroundColor: tokens.colors.backgroundSecondary }]}>
                <Ionicons name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} size={18} color={tokens.colors.textSecondary} />
              </View>
              <Text style={{ flex: 1, color: tokens.colors.text, fontWeight: '700', fontSize: 14 }}>
                {theme === 'light' ? (language === 'uz' ? 'Qorong‘i rejim' : 'Тёмная тема') : (language === 'uz' ? 'Yorug‘ rejim' : 'Светлая тема')}
              </Text>
            </TouchableOpacity> */}
            <View style={[styles.rowDivider, { backgroundColor: tokens.colors.borderLight }]} />
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => Linking.openURL('https://t.me/shifoyol_contact_bot')}
              activeOpacity={0.75}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="chatbox-ellipses-outline" size={18} color="#0088cc" />
              </View>
              <Text style={{ flex: 1, color: tokens.colors.text, fontWeight: '700', fontSize: 14 }}>
                {t.contactUs}
              </Text>
              <Ionicons name="open-outline" size={16} color={tokens.colors.textTertiary} />
            </TouchableOpacity>
          </Card>
        </View>

        <View style={{ padding: 20, gap: 10 }}>
          <Button title={t.logOut} variant="outline" leftIcon="log-out-outline" onPress={onLogout} />
          <Button title={t.deleteAccount} variant="danger" leftIcon="trash-outline" onPress={onDelete} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    padding: 20,
    paddingTop: 14,
    marginHorizontal: 0,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  editBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  upNext: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    gap: 12,
    shadowColor: '#0f1a4a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  upNextIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowDivider: { height: StyleSheet.hairlineWidth, marginLeft: 62 },
});
