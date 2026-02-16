import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { getTranslations } from '../../lib/translations';
import { getColors } from '../../lib/theme';

export default function LanguageScreen() {
  const router = useRouter();
  const setLanguage = useAuthStore((s) => s.setLanguage);
  const onboardingSeen = useAuthStore((s) => s.onboardingSeen);
  const theme = useThemeStore((s) => s.theme);
  const tUz = getTranslations('uz');
  const tRu = getTranslations('ru');
  const colors = getColors(theme);

  const gradientColors: readonly [string, string, ...string[]] = theme === 'light'
    ? [colors.background, colors.backgroundSecondary, colors.backgroundSecondary]
    : ['#09090b', '#18181b', '#27272a'];

  const selectLanguage = async (lang: 'uz' | 'ru') => {
    await setLanguage(lang);
    if (onboardingSeen) {
      router.replace('/(auth)/login');
    } else {
      router.replace('/(auth)/onboarding');
    }
  };

  return (
    <LinearGradient
      colors={gradientColors}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{tUz.languageTitle}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{tUz.languageSubtitle} / {tRu.languageSubtitle}</Text>
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
            onPress={() => selectLanguage('uz')}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>{tUz.languageUzbek}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
            onPress={() => selectLanguage('ru')}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>{tRu.languageRussian}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center', paddingHorizontal: 32 },
  title: { fontSize: 48, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, marginBottom: 48 },
  buttons: { width: '100%', gap: 16 },
  button: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
