import { Stack } from 'expo-router';

const BG = '#09090b';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 280,
        gestureEnabled: true,
        contentStyle: { backgroundColor: BG },
      }}
    />
  );
}
