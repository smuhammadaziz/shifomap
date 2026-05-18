import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../store/theme-store';
import { getTokens } from '../../lib/design';
import AiTabPromptModal from './AiTabPromptModal';

const LOGO_BLUE = '#0A2FB8';
const BAR_ROW_HEIGHT = 56;
const TAB_ICON_SIZE = 48;

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
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const tokens = getTokens(theme);
  const isDark = theme === 'dark';
  const [aiPromptVisible, setAiPromptVisible] = useState(false);

  const activeRouteName = state.routes[state.index]?.name;
  const isFeedActive = activeRouteName === 'feed';

  const activePillBg = isFeedActive ? 'rgba(10, 47, 184, 0.92)' : LOGO_BLUE;
  const activePillFg = '#ffffff';
  const barBg = isFeedActive ? 'rgba(0,0,0,0.42)' : isDark ? '#09090b' : '#ffffff';
  const barBorder = isFeedActive ? 'transparent' : tokens.colors.border;
  const inactiveIcon = isFeedActive ? '#ffffff' : tokens.colors.textTertiary;

  const tabBarOffset = insets.bottom + BAR_ROW_HEIGHT + 8;

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

  const openAiChat = (question: string) => {
    setAiPromptVisible(false);
    router.push({
      pathname: '/ai-chat',
      params: { initialMessage: question },
    });
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
        activeOpacity={0.85}
      >
        {focused ? (
          <View style={[styles.iconCircle, { backgroundColor: activePillBg }]}>
            <Ionicons
              name={tab.iconActive as keyof typeof Ionicons.glyphMap}
              size={22}
              color={activePillFg}
            />
          </View>
        ) : (
          <View style={styles.inactiveWrap}>
            <Ionicons name={tab.icon as keyof typeof Ionicons.glyphMap} size={26} color={inactiveIcon} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <View
        style={[
          styles.dock,
          {
            backgroundColor: barBg,
            borderTopColor: barBorder,
            paddingBottom: insets.bottom,
            ...(isFeedActive
              ? {
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderTopWidth: 0,
                  shadowOpacity: 0,
                  elevation: 0,
                }
              : null),
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.row}>
          {LEFT_TABS.map(renderTab)}

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="AI"
            onPress={() => setAiPromptVisible(true)}
            style={styles.slot}
            activeOpacity={0.85}
          >
            <View style={[styles.iconCircle, { backgroundColor: LOGO_BLUE }]}>
              <Ionicons name="sparkles" size={22} color="#fff" />
            </View>
          </TouchableOpacity>

          {RIGHT_TABS.map(renderTab)}
        </View>
      </View>

      <AiTabPromptModal
        visible={aiPromptVisible}
        onClose={() => setAiPromptVisible(false)}
        onSubmit={openAiChat}
        tabBarOffset={tabBarOffset}
      />
    </>
  );
}

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
    width: TAB_ICON_SIZE,
    height: TAB_ICON_SIZE,
  },
  iconCircle: {
    width: TAB_ICON_SIZE,
    height: TAB_ICON_SIZE,
    borderRadius: TAB_ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
