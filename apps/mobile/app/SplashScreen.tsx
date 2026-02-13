import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore, needsProfile } from '../store/auth-store';
import { useThemeStore } from '../store/theme-store';
import { getColors } from '../lib/theme';

const SplashScreen = () => {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const patient = useAuthStore((s) => s.patient);
  const language = useAuthStore((s) => s.language);
  const hydrate = useAuthStore((s) => s.hydrate);
  const theme = useThemeStore((s) => s.theme);
  const colors = getColors(theme);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      if (language === null) {
        router.replace('/(auth)/language');
        return;
      }
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }
      if (needsProfile(patient)) {
        router.replace('/(auth)/complete-profile');
        return;
      }
      router.replace('/(tabs)');
    }, 1200);
    return () => clearTimeout(t);
  }, [hydrated, token, patient, language, router]);

  const gradientColors = theme === 'light'
    ? [colors.background, colors.backgroundSecondary, colors.backgroundSecondary]
    : ['#09090b', '#18181b', '#27272a'];

  return (
    <LinearGradient
      colors={gradientColors}
      style={styles.container}
    >
      <Text style={[styles.text, { color: colors.text }]}>ShifoYo'l</Text>
      <ActivityIndicator size="large" color={colors.primaryLight} style={styles.spinner} />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  spinner: {
    position: 'absolute',
    bottom: 80,
  },
});

export default SplashScreen;
