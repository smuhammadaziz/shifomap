import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/theme-store';
import { getTokens } from '../../lib/design';

interface Props {
  children: React.ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
}

export function Screen({ children, edges = ['top'], style, backgroundColor }: Props) {
  const theme = useThemeStore((s) => s.theme);
  const tokens = getTokens(theme);
  const bg = backgroundColor ?? tokens.colors.background;
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bg }, style]} edges={edges}>
      <View style={{ flex: 1, backgroundColor: bg }}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
