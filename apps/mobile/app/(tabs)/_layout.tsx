import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import CustomTabBar from '../components/CustomTabBar';
import { useThemeStore } from '../../store/theme-store';
import { getTokens } from '../../lib/design';
import { useAuthStore } from '../../store/auth-store';
import { getCustomReminders } from '../../lib/api';
import { getPillsLocalNotificationsEnabled, syncPillReminderNotifications } from '../../lib/pill-local-notifications';
import { refreshExpoPushTokenOnBackend } from '../../lib/remote-push-registration';

export default function TabLayout() {
  const theme = useThemeStore((s) => s.theme);
  const tokens = getTokens(theme);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    let cancelled = false;
    async function syncWhenSignedIn() {
      if (!token) return;

      await refreshExpoPushTokenOnBackend().catch(() => {});

      const enabled = await getPillsLocalNotificationsEnabled().catch(() => true);
      if (!enabled || cancelled) return;
      try {
        const list = await getCustomReminders();
        if (!cancelled) await syncPillReminderNotifications(list);
      } catch {
        if (!cancelled) await syncPillReminderNotifications([]);
      }
    }
    syncWhenSignedIn();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: tokens.colors.background },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="appointments" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
