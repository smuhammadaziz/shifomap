import React from 'react';
import { Image, StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { useThemeStore } from '../../store/theme-store';
import { getTokens } from '../../lib/design';

interface Props {
  uri?: string | null;
  name?: string;
  size?: number;
  ring?: boolean;
  ringColor?: string;
  style?: StyleProp<ViewStyle>;
}

function initials(name?: string): string {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({ uri, name, size = 40, ring, ringColor, style }: Props) {
  const theme = useThemeStore((s) => s.theme);
  const tokens = getTokens(theme);
  const borderWidth = ring ? 2 : 0;
  const padded = size;
  return (
    <View
      style={[
        {
          width: padded,
          height: padded,
          borderRadius: padded / 2,
          borderWidth,
          borderColor: ringColor ?? tokens.brand.iris,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{
            width: size - borderWidth * 2,
            height: size - borderWidth * 2,
            borderRadius: (size - borderWidth * 2) / 2,
            backgroundColor: tokens.colors.backgroundSecondary,
          }}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: size - borderWidth * 2,
              height: size - borderWidth * 2,
              borderRadius: (size - borderWidth * 2) / 2,
              backgroundColor: tokens.brand.iris,
            },
          ]}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: Math.round(size * 0.4) }}>
            {initials(name)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
