import React, { forwardRef, useState } from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  TextInputProps,
  Text,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/theme-store';
import { getTokens } from '../../lib/design';

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  errorText?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, icon, rightIcon, onRightIconPress, errorText, containerStyle, ...rest },
  ref,
) {
  const theme = useThemeStore((s) => s.theme);
  const tokens = getTokens(theme);
  const [focused, setFocused] = useState(false);
  return (
    <View style={containerStyle}>
      {label ? (
        <Text style={[tokens.type.caption, { color: tokens.colors.textSecondary, marginBottom: 6, marginLeft: 4 }]}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.container,
          {
            backgroundColor: tokens.colors.backgroundInput,
            borderColor: focused ? tokens.brand.iris : tokens.colors.border,
          },
        ]}
      >
        {icon ? (
          <Ionicons name={icon} size={18} color={tokens.colors.textTertiary} style={{ marginRight: 8 }} />
        ) : null}
        <TextInput
          ref={ref}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={tokens.colors.textPlaceholder}
          {...rest}
          style={[styles.input, { color: tokens.colors.text }]}
        />
        {rightIcon ? (
          <TouchableOpacity hitSlop={10} onPress={onRightIconPress}>
            <Ionicons name={rightIcon} size={18} color={tokens.colors.textTertiary} />
          </TouchableOpacity>
        ) : null}
      </View>
      {errorText ? (
        <Text style={[tokens.type.caption, { color: tokens.colors.error, marginTop: 4, marginLeft: 4 }]}>
          {errorText}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    height: 56,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
});
