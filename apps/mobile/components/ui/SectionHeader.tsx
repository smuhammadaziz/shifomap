import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/theme-store';
import { getTokens } from '../../lib/design';

interface Props {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: object;
}

export function SectionHeader({ title, subtitle, actionLabel, onAction, style }: Props) {
  const theme = useThemeStore((s) => s.theme);
  const tokens = getTokens(theme);
  return (
    <View style={[styles.row, style]}>
      <View style={{ flex: 1 }}>
        <Text style={[tokens.type.titleLg, { color: tokens.colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[tokens.type.bodySm, { color: tokens.colors.textTertiary, marginTop: 2 }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel ? (
        <TouchableOpacity hitSlop={12} onPress={onAction}>
          <Text style={{ color: tokens.brand.iris, fontWeight: '700', fontSize: 14 }}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
});
