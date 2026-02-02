import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const screenOptions = {
  headerShown: false,
  animation: 'slide_from_right' as const,
  animationDuration: 300,
  gestureEnabled: true,
  contentStyle: { backgroundColor: 'transparent' },
};

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="(auth)" options={screenOptions} />
        <Stack.Screen name="(tabs)" options={screenOptions} />
        <Stack.Screen name="profile" options={screenOptions} />
        <Stack.Screen name="settings" options={screenOptions} />
      </Stack>
    </>
  );
}
