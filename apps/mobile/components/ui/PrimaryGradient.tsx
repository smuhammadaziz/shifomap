import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../store/theme-store';
import { getTokens, gradients } from '../../lib/design';

interface Props {
  colors?: readonly string[];
  variant?: keyof typeof gradients;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  radius?: number;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

export function PrimaryGradient({
  colors,
  variant = 'hero',
  style,
  children,
  radius,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
}: Props) {
  const theme = useThemeStore((s) => s.theme);
  const tokens = getTokens(theme);
  const cs = (colors ?? tokens.gradients[variant]) as [string, string, ...string[]];
  return (
    <LinearGradient colors={cs} start={start} end={end} style={[{ borderRadius: radius ?? 20 }, style]}>
      <View style={styles.child}>{children}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  child: { flex: 1 },
});
