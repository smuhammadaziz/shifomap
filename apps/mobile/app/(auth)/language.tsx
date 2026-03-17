import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { getTranslations } from '../../lib/translations';
import { getColors } from '../../lib/theme';

const LOGO = require('../../assets/play_store_512-Photoroom.png');

type Lang = 'uz' | 'ru';

export default function LanguageScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setLanguage = useAuthStore((s) => s.setLanguage);
  const onboardingSeen = useAuthStore((s) => s.onboardingSeen);
  const theme = useThemeStore((s) => s.theme);
  const tUz = getTranslations('uz');
  const tRu = getTranslations('ru');
  const colors = getColors(theme);

  const [selected, setSelected] = useState<Lang>('uz');

  const confirmLanguage = async () => {
    await setLanguage(selected);
    if (onboardingSeen) {
      router.replace('/(auth)/login');
    } else {
      router.replace('/(auth)/onboarding');
    }
  };

  const options: { lang: Lang; label: string }[] = [
    { lang: 'uz', label: tUz.languageUzbek },
    { lang: 'ru', label: tRu.languageRussian },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.content}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.title, { color: colors.text }]}>{tUz.languageTitle}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {tUz.languageSubtitle} / {tRu.languageSubtitle}
        </Text>

        <View style={styles.cards}>
          {options.map(({ lang, label }) => {
            const isSelected = selected === lang;
            return (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.card,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.backgroundCard,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderWidth: isSelected ? 0 : 1,
                  },
                ]}
                onPress={() => setSelected(lang)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="language-outline"
                  size={24}
                  color={isSelected ? '#fff' : colors.textSecondary}
                  style={styles.cardIcon}
                />
                <Text
                  style={[
                    styles.cardText,
                    { color: isSelected ? '#fff' : colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor: isSelected ? '#fff' : colors.textPlaceholder,
                      backgroundColor: isSelected ? 'transparent' : 'transparent',
                    },
                  ]}
                >
                  {isSelected && (
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={[styles.footer, { paddingHorizontal: 24 }]}>
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: colors.primary }]}
          onPress={confirmLanguage}
          activeOpacity={0.85}
        >
          <Text style={styles.continueText}>{getTranslations(selected).passwordContinue}</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 24,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 22,
  },
  cards: {
    width: '100%',
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  cardIcon: {
    marginRight: 14,
  },
  cardText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingBottom: 8,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  continueText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
});
