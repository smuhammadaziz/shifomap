import React from 'react';
import { View, ViewStyle, StyleProp, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeStore } from '../../store/theme-store';
import { getTokens } from '../../lib/design';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  elevated?: boolean;
  bordered?: boolean;
  onPress?: () => void;
  radius?: number;
  backgroundColor?: string;
}

export function Card({
  children,
  style,
  padding = 16,
  elevated = true,
  bordered = true,
  onPress,
  radius,
  backgroundColor,
}: Props) {
  const theme = useThemeStore((s) => s.theme);
  const tokens = getTokens(theme);
  const body = (
    <View
      style={[
        styles.base,
        {
          backgroundColor: backgroundColor ?? tokens.colors.backgroundCard,
          borderColor: tokens.colors.border,
          borderWidth: bordered ? StyleSheet.hairlineWidth : 0,
          padding,
          borderRadius: radius ?? tokens.radii.xl,
        },
        elevated ? tokens.shadows.sm : null,
        style,
      ]}
    >
      {children}
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
        {body}
      </TouchableOpacity>
    );
  }
  return body;
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
