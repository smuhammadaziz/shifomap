import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Image, Animated, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore, needsProfile } from '../store/auth-store';
import { useThemeStore } from '../store/theme-store';
import { getColors } from '../lib/theme';

const LOGO = require('../assets/play_store_512-Photoroom.png');

const SplashScreen = () => {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const patient = useAuthStore((s) => s.patient);
  const language = useAuthStore((s) => s.language);
  const onboardingSeen = useAuthStore((s) => s.onboardingSeen);
  const hydrate = useAuthStore((s) => s.hydrate);
  const theme = useThemeStore((s) => s.theme);
  const colors = getColors(theme);
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    let mounted = true;
    const heartbeat = () => {
      if (!mounted) return;
      Animated.sequence([
        // Beat 1: up then down
        Animated.timing(scale, { toValue: 1.12, duration: 220, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.96, duration: 180, useNativeDriver: true }),
        // Beat 2: up then down
        Animated.timing(scale, { toValue: 1.1, duration: 220, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.98, duration: 180, useNativeDriver: true }),
        // Rest back to normal
        Animated.timing(scale, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start(() => heartbeat());
    };
    heartbeat();
    return () => { mounted = false; };
  }, [scale]);

  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      if (language === null) {
        router.replace('/(auth)/language');
        return;
      }
      if (!token) {
        if (!onboardingSeen) {
          router.replace('/(auth)/onboarding');
        } else {
          router.replace('/(auth)/login');
        }
        return;
      }
      if (needsProfile(patient)) {
        router.replace('/(auth)/complete-profile');
        return;
      }
      router.replace('/(tabs)');
    }, 1200);
    return () => clearTimeout(t);
  }, [hydrated, token, patient, language, onboardingSeen, router]);

  const gradientColors: readonly [string, string, ...string[]] = theme === 'light'
    ? [colors.background, colors.backgroundSecondary, colors.backgroundSecondary]
    : ['#09090b', '#18181b', '#27272a'];

  return (
    <LinearGradient
      colors={gradientColors}
      style={styles.container}
    >
      <Animated.View style={[styles.logoWrap, { transform: [{ scale }] }]}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      </Animated.View>
      <Animated.Text style={[styles.appName, { transform: [{ scale }], color: theme === 'dark' ? '#fff' : colors.primary }]}>
        ShifoYo'l
      </Animated.Text>
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
  logoWrap: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '60%',
    height: '60%',
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    marginTop: -20,
    letterSpacing: 1,
  },
  spinner: {
    position: 'absolute',
    bottom: 80,
  },
});

export default SplashScreen;
