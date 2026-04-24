import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  StyleProp,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/theme-store';
import { getTokens } from '../../lib/design';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'gradient';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading,
  disabled,
  fullWidth = true,
  style,
  textStyle,
}: Props) {
  const theme = useThemeStore((s) => s.theme);
  const tokens = getTokens(theme);

  const heightBySize: Record<Size, number> = { sm: 40, md: 52, lg: 60 };
  const fontBySize: Record<Size, number> = { sm: 14, md: 16, lg: 17 };
  const iconSize: Record<Size, number> = { sm: 16, md: 18, lg: 20 };
  const radiusBySize: Record<Size, number> = { sm: 12, md: 16, lg: 18 };

  const isDisabled = disabled || loading;

  const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: tokens.colors.text, fg: tokens.colors.background },
    secondary: { bg: tokens.colors.backgroundSecondary, fg: tokens.colors.text },
    ghost: { bg: 'transparent', fg: tokens.colors.text },
    outline: { bg: 'transparent', fg: tokens.colors.text, border: tokens.colors.border },
    danger: { bg: tokens.colors.errorBg, fg: tokens.colors.error },
    gradient: { bg: 'transparent', fg: '#ffffff' },
  };
  const p = palette[variant];

  const content = (
    <View style={styles.row}>
      {leftIcon ? <Ionicons name={leftIcon} size={iconSize[size]} color={p.fg} style={{ marginRight: 8 }} /> : null}
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <Text style={[{ color: p.fg, fontSize: fontBySize[size], fontWeight: '700' }, textStyle]}>{title}</Text>
      )}
      {rightIcon ? <Ionicons name={rightIcon} size={iconSize[size]} color={p.fg} style={{ marginLeft: 8 }} /> : null}
    </View>
  );

  const baseStyle: ViewStyle = {
    height: heightBySize[size],
    borderRadius: radiusBySize[size],
    paddingHorizontal: 20,
    opacity: isDisabled ? 0.55 : 1,
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
  };

  if (variant === 'gradient') {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={isDisabled} style={[baseStyle, style]}>
        <LinearGradient
          colors={tokens.gradients.hero as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.center, StyleSheet.absoluteFillObject, { borderRadius: radiusBySize[size] }]}
        />
        <View style={[styles.center, { height: '100%' }]}>{content}</View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.center,
        baseStyle,
        {
          backgroundColor: p.bg,
          borderWidth: p.border ? 1 : 0,
          borderColor: p.border ?? 'transparent',
        },
        style,
      ]}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
});
