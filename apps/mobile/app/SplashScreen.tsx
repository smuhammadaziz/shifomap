import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore, needsProfile } from '../store/auth-store';

const SplashScreen = () => {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const patient = useAuthStore((s) => s.patient);
  const language = useAuthStore((s) => s.language);
  const hydrate = useAuthStore((s) => s.hydrate);

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

  return (
    <LinearGradient
      colors={['#09090b', '#18181b', '#27272a']}
      style={styles.container}
    >
      <Text style={styles.text}>ShifoYo'l</Text>
      <ActivityIndicator size="large" color="#a78bfa" style={styles.spinner} />
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
    color: '#ffffff',
  },
  spinner: {
    position: 'absolute',
    bottom: 80,
  },
});

export default SplashScreen;
