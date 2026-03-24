import React from 'react';
import { Tabs } from 'expo-router';
import CustomTabBar from '../components/CustomTabBar';
import { useAuthStore } from '../../store/auth-store';
import { getTranslations } from '../../lib/translations';

const tabTitleKey: Record<string, 'tabHome' | 'tabSchedule' | 'tabPills' | 'tabProfile'> = {
  index: 'tabHome',
  appointments: 'tabSchedule',
  'pill-reminder': 'tabPills',
  profile: 'tabProfile',
};

export default function TabLayout() {
  const language = useAuthStore((s) => s.language);
  const t = getTranslations(language);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        title: t[tabTitleKey[route.name] ?? 'tabHome'],
        contentStyle: { backgroundColor: '#09090b' },
      })}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="appointments" />
      <Tabs.Screen name="pill-reminder" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
