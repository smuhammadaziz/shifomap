import { Stack } from 'expo-router';
import { useThemeStore } from '../../store/theme-store';
import { getColors } from '../../lib/theme';

export default function AuthLayout() {
  const theme = useThemeStore((s) => s.theme);
  const colors = getColors(theme);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 280,
        gestureEnabled: true,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
