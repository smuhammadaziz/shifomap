import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSavedServicesStore } from '../store/saved-services-store';

const BG = '#09090b';

const screenOptions = {
  headerShown: false,
  animation: 'slide_from_right' as const,
  animationDuration: 300,
  gestureEnabled: true,
  contentStyle: { backgroundColor: BG },
};

export default function RootLayout() {
  const hydrate = useSavedServicesStore((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="(auth)" options={screenOptions} />
        <Stack.Screen name="(tabs)" options={screenOptions} />
        <Stack.Screen name="profile" options={screenOptions} />
        <Stack.Screen name="settings" options={screenOptions} />
        <Stack.Screen name="services-results" options={screenOptions} />
        <Stack.Screen name="service/[id]" options={screenOptions} />
        <Stack.Screen name="clinic-services/[id]" options={screenOptions} />
        <Stack.Screen name="clinic/[id]" options={screenOptions} />
        <Stack.Screen name="doctor/[id]" options={screenOptions} />
        <Stack.Screen name="book" options={screenOptions} />
        <Stack.Screen name="branch/[id]" options={screenOptions} />
        <Stack.Screen name="appointments" options={screenOptions} />
        <Stack.Screen name="appointment/[id]" options={screenOptions} />
      </Stack>
    </>
  );
}
