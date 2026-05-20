import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../store/theme-store';
import { getTokens } from '../../lib/design';
import TabBarCurveBackground, { TAB_BAR_NOTCH_LIFT, TAB_BAR_NOTCH_HALF } from './TabBarCurveBackground';

const LOGO_BLUE = '#0A2FB8';
const BAR_BODY_HEIGHT = 58;
const AI_SIZE = 54;
const CENTER_SLOT = TAB_BAR_NOTCH_HALF * 2 + 12;
/** AI sits in the cradle — moves with notch height. */
const AI_BOTTOM_OFFSET = 8;

type TabDef = {
  key: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
};

const LEFT_TABS: TabDef[] = [
  { key: 'index', route: 'index', icon: 'home-outline', iconActive: 'home' },
  { key: 'feed', route: 'feed', icon: 'play-circle-outline', iconActive: 'play-circle' },
];

const RIGHT_TABS: TabDef[] = [
  { key: 'appointments', route: 'appointments', icon: 'calendar-outline', iconActive: 'calendar' },
  { key: 'profile', route: 'profile', icon: 'person-outline', iconActive: 'person' },
];

export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const tokens = getTokens(theme);
  const isDark = theme === 'dark';

  const activeRouteName = state.routes[state.index]?.name;

  if (activeRouteName === 'feed') {
    return null;
  }

  const barBg = isDark ? '#18181b' : '#ffffff';
  const inactiveIcon = isDark ? '#a1a1aa' : '#94a3b8';
  const activeIcon = LOGO_BLUE;
  const totalHeight = BAR_BODY_HEIGHT + TAB_BAR_NOTCH_LIFT + insets.bottom;

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

  const renderTab = (tab: TabDef) => {
    const focused = tab.route === activeRouteName;
    return (
      <TouchableOpacity
        key={tab.key}
        accessibilityRole="button"
        accessibilityState={{ selected: focused }}
        onPress={() => handlePress(tab.route)}
        style={styles.slot}
        activeOpacity={0.75}
      >
        <Ionicons
          name={(focused ? tab.iconActive : tab.icon) as keyof typeof Ionicons.glyphMap}
          size={focused ? 25 : 24}
          color={focused ? activeIcon : inactiveIcon}
        />
        <View
          style={[
            styles.activeDot,
            {
              backgroundColor: focused ? LOGO_BLUE : 'transparent',
              opacity: focused ? 1 : 0,
            },
          ]}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { height: totalHeight, width: screenW }]} pointerEvents="box-none">
      <TabBarCurveBackground height={totalHeight} fill={barBg} isDark={isDark} />

      <View
        style={[
          styles.iconsRow,
          {
            paddingBottom: insets.bottom,
            marginTop: TAB_BAR_NOTCH_LIFT,
            height: BAR_BODY_HEIGHT + insets.bottom,
          },
        ]}
      >
        <View style={styles.sideGroup}>{LEFT_TABS.map(renderTab)}</View>
        <View style={{ width: CENTER_SLOT }} />
        <View style={styles.sideGroup}>{RIGHT_TABS.map(renderTab)}</View>
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="AI"
        onPress={() => router.push('/ai-chat')}
        style={[
          styles.aiFab,
          {
            bottom: insets.bottom + AI_BOTTOM_OFFSET,
            backgroundColor: isDark ? '#27272a' : '#ffffff',
          },
        ]}
        activeOpacity={0.9}
      >
        <View style={styles.aiInner}>
          <Ionicons name="sparkles" size={25} color="#fff" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#0A2FB8',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 24 },
    }),
  },
  iconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  sideGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    gap: 5,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  aiFab: {
    position: 'absolute',
    alignSelf: 'center',
    left: '50%',
    marginLeft: -AI_SIZE / 2,
    width: AI_SIZE,
    height: AI_SIZE,
    borderRadius: AI_SIZE / 2,
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#0A2FB8',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: { elevation: 12 },
    }),
  },
  aiInner: {
    width: '100%',
    height: '100%',
    borderRadius: (AI_SIZE - 8) / 2,
    backgroundColor: LOGO_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
