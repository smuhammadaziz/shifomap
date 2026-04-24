import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/theme-store';
import { useAuthStore } from '../../store/auth-store';
import { getTokens } from '../../lib/design';
import { t, type TranslationKey } from '../../lib/translations';

/**
 * Full-width docked tab bar (edge-to-edge, flush with bottom).
 * Lumora-style: active tab = dark pill + white icon/label; inactive = outline icons only.
 * Labels: Uzbek / Russian only (via content.json + `t()`).
 *
 * Order: Home · Feed · Visits · Profile
 */
export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const theme = useThemeStore((s) => s.theme);
  const language = useAuthStore((s) => s.language);
  const tokens = getTokens(theme);
  const isDark = theme === 'dark';

  const activePillBg = isDark ? '#e2e8f0' : '#0f172a';
  const activePillFg = isDark ? '#0f172a' : '#ffffff';
  const barBg = isDark ? '#09090b' : '#ffffff';
  const barBorder = tokens.colors.border;
  const inactiveIcon = tokens.colors.textTertiary;

  const tabs: {
    key: string;
    route: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconActive: keyof typeof Ionicons.glyphMap;
    labelKey: TranslationKey;
  }[] = [
    { key: 'index', route: 'index', icon: 'home-outline', iconActive: 'home', labelKey: 'tabHome' },
    { key: 'feed', route: 'feed', icon: 'play-circle-outline', iconActive: 'play-circle', labelKey: 'tabFeed' },
    {
      key: 'appointments',
      route: 'appointments',
      icon: 'calendar-outline',
      iconActive: 'calendar',
      labelKey: 'tabVisits',
    },
    { key: 'profile', route: 'profile', icon: 'person-outline', iconActive: 'person', labelKey: 'tabProfile' },
  ];

  const activeRouteName = state.routes[state.index]?.name;

  const handlePress = (routeName: string) => {
    const route = state.routes.find((r) => r.name === routeName);
    if (!route) return;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) navigation.navigate(route.name);
  };

  return (
    <View
      style={[
        styles.dock,
        {
          backgroundColor: barBg,
          borderTopColor: barBorder,
          paddingBottom: insets.bottom,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.row}>
        {tabs.map((tab) => {
          const focused = tab.route === activeRouteName;
          return (
            <TouchableOpacity
              key={tab.key}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              onPress={() => handlePress(tab.route)}
              style={styles.slot}
              activeOpacity={0.85}
            >
              {focused ? (
                <View style={[styles.activePill, { backgroundColor: activePillBg }]}>
                  <Ionicons
                    name={tab.iconActive as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={activePillFg}
                  />
                  <Text style={[styles.activeLabel, { color: activePillFg }]} numberOfLines={1}>
                    {t(language, tab.labelKey)}
                  </Text>
                </View>
              ) : (
                <View style={styles.inactiveWrap}>
                  <Ionicons name={tab.icon as keyof typeof Ionicons.glyphMap} size={24} color={inactiveIcon} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const BAR_ROW_HEIGHT = 56;

const styles = StyleSheet.create({
  dock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 16 },
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: BAR_ROW_HEIGHT,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: BAR_ROW_HEIGHT,
  },
  inactiveWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    minWidth: 44,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    maxWidth: '100%',
  },
  activeLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginLeft: 6,
  },
});
