import React from 'react';
import { Text, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/theme-store';
import { getTokens } from '../../lib/design';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ label, selected, onPress, icon, color, backgroundColor, style }: Props) {
  const theme = useThemeStore((s) => s.theme);
  const tokens = getTokens(theme);
  const bg = selected
    ? tokens.colors.text
    : backgroundColor ?? tokens.colors.backgroundCard;
  const fg = selected
    ? tokens.colors.background
    : color ?? tokens.colors.text;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.base,
        {
          backgroundColor: bg,
          borderColor: selected ? 'transparent' : tokens.colors.border,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={fg} style={{ marginRight: 6 }} /> : null}
      <Text style={{ color: fg, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
