import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle, StyleProp, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/theme-store';
import { getTokens } from '../../lib/design';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: number;
  color?: string;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  badge?: number;
  accessibilityLabel?: string;
}

export function IconButton({
  icon,
  onPress,
  size = 44,
  color,
  backgroundColor,
  style,
  badge,
  accessibilityLabel,
}: Props) {
  const theme = useThemeStore((s) => s.theme);
  const tokens = getTokens(theme);
  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: backgroundColor ?? tokens.colors.backgroundCard,
          borderColor: tokens.colors.border,
        },
        tokens.shadows.sm,
        style,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.48)} color={color ?? tokens.colors.text} />
      {badge != null && badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: tokens.colors.error }]}>
          <View style={styles.badgeInner} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeInner: {},
});
