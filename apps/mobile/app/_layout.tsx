import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSavedServicesStore } from '../store/saved-services-store';
import { useThemeStore } from '../store/theme-store';
import { getTokens } from '../lib/design';

export default function RootLayout() {
  const hydrateSaved = useSavedServicesStore((s) => s.hydrate);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const theme = useThemeStore((s) => s.theme);
  const tokens = getTokens(theme);

  useEffect(() => {
    hydrateSaved();
    hydrateTheme();
  }, [hydrateSaved, hydrateTheme]);

  const screenOptions = {
    headerShown: false,
    animation: 'slide_from_right' as const,
    animationDuration: 260,
    gestureEnabled: true,
    contentStyle: { backgroundColor: tokens.colors.background },
  };

  return (
    <>
      <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="(auth)" options={screenOptions} />
        <Stack.Screen name="(tabs)" options={screenOptions} />

        <Stack.Screen name="edit-profile" options={screenOptions} />
        <Stack.Screen name="settings" options={screenOptions} />
        <Stack.Screen name="services-results" options={screenOptions} />
        <Stack.Screen name="service/[id]" options={screenOptions} />
        <Stack.Screen name="clinic-services/[id]" options={screenOptions} />
        <Stack.Screen name="clinics" options={screenOptions} />
        <Stack.Screen name="clinic/[id]" options={screenOptions} />
        <Stack.Screen name="doctor/[id]" options={screenOptions} />
        <Stack.Screen name="book" options={screenOptions} />
        <Stack.Screen name="book-doctor" options={screenOptions} />
        <Stack.Screen name="branch/[id]" options={screenOptions} />
        <Stack.Screen name="appointments" options={screenOptions} />
        <Stack.Screen name="appointment/[id]" options={screenOptions} />

        <Stack.Screen name="health-test" options={screenOptions} />
        <Stack.Screen name="first-aid/index" options={screenOptions} />
        <Stack.Screen name="first-aid/[slug]" options={screenOptions} />
        <Stack.Screen name="ai-analyze" options={screenOptions} />
        <Stack.Screen name="medical-history/index" options={screenOptions} />
        <Stack.Screen name="medical-history/edit" options={screenOptions} />
        <Stack.Screen name="chat/index" options={screenOptions} />
        <Stack.Screen name="chat/[id]" options={screenOptions} />
        <Stack.Screen name="post/[id]" options={screenOptions} />
      </Stack>
    </>
  );
}
