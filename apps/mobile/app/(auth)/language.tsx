import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth-store';
import { getTranslations } from '../../lib/translations';

export default function LanguageScreen() {
  const router = useRouter();
  const setLanguage = useAuthStore((s) => s.setLanguage);
  const tUz = getTranslations('uz');
  const tRu = getTranslations('ru');

  const selectLanguage = async (lang: 'uz' | 'ru') => {
    await setLanguage(lang);
    router.replace('/(auth)/login');
  };

  return (
    <LinearGradient
      colors={['#09090b', '#18181b', '#27272a']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>{tUz.languageTitle}</Text>
        <Text style={styles.subtitle}>{tUz.languageSubtitle} / {tRu.languageSubtitle}</Text>
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => selectLanguage('uz')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{tUz.languageUzbek}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => selectLanguage('ru')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{tRu.languageRussian}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center', paddingHorizontal: 32 },
  title: { fontSize: 48, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#a1a1aa', marginBottom: 48 },
  buttons: { width: '100%', gap: 16 },
  button: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
