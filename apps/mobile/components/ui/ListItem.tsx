import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/theme-store';
import { getTokens } from '../../lib/design';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightLabel?: string;
  chevron?: boolean;
  destructive?: boolean;
}

export function ListItem({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  onPress,
  rightLabel,
  chevron = true,
  destructive,
}: Props) {
  const theme = useThemeStore((s) => s.theme);
  const tokens = getTokens(theme);
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.row, { borderBottomColor: tokens.colors.borderLight }]}
    >
      {icon ? (
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: iconBg ?? tokens.colors.primaryBg },
          ]}
        >
          <Ionicons name={icon} size={18} color={iconColor ?? tokens.brand.iris} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: destructive ? tokens.colors.error : tokens.colors.text,
            fontSize: 15,
            fontWeight: '600',
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: tokens.colors.textTertiary, fontSize: 12, marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>
      {rightLabel ? (
        <Text style={{ color: tokens.colors.textTertiary, fontSize: 13, marginRight: 6 }}>{rightLabel}</Text>
      ) : null}
      {chevron ? <Ionicons name="chevron-forward" size={18} color={tokens.colors.textTertiary} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
});
