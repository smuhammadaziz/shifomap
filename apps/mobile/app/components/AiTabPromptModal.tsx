import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  Keyboard,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { getTokens } from '../../lib/design';

const BRAND_BLUE = '#0A2FB8';
const { height: SCREEN_H } = Dimensions.get('window');

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
  /** Total height from screen bottom to top of tab icons (safe area + bar). */
  tabBarOffset: number;
};

export default function AiTabPromptModal({ visible, onClose, onSubmit, tabBarOffset }: Props) {
  const theme = useThemeStore((s) => s.theme);
  const language = useAuthStore((s) => s.language);
  const tokens = getTokens(theme);
  const isDark = theme === 'dark';
  const isUz = language === 'uz';

  const [text, setText] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      return;
    }
    setText('');
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 200);

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      clearTimeout(focusTimer);
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 80, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(24);
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleSubmit = () => {
    const val = text.trim();
    if (!val) return;
    Keyboard.dismiss();
    onSubmit(val);
    setText('');
  };

  const hasText = text.trim().length > 0;
  const keyboardUp = keyboardHeight > 0;
  const bottom =
    keyboardUp
      ? keyboardHeight + (Platform.OS === 'ios' ? 6 : 10)
      : tabBarOffset + 10;

  const cardBg = isDark ? '#18181b' : '#ffffff';
  const fieldBg = isDark ? '#27272a' : '#f4f6fb';
  const placeholder = isUz ? 'Shaxsiy doktorga savolingizni yozing…' : 'Спросите личного врача…';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
          <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
        </Animated.View>

        <Animated.View
          style={[
            styles.dockWrap,
            {
              bottom,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.dock,
              {
                backgroundColor: cardBg,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(10, 47, 184, 0.08)',
                maxHeight: keyboardUp ? SCREEN_H * 0.22 : undefined,
              },
            ]}
          >
            <View style={[styles.field, { backgroundColor: fieldBg }]}>
              <View style={styles.sparkleWrap}>
                <Ionicons name="sparkles" size={22} color={BRAND_BLUE} />
              </View>

              <TextInput
                ref={inputRef}
                style={[styles.input, { color: tokens.colors.text }]}
                placeholder={placeholder}
                placeholderTextColor={tokens.colors.textTertiary}
                value={text}
                onChangeText={setText}
                multiline={keyboardUp}
                blurOnSubmit={!keyboardUp}
                returnKeyType="send"
                onSubmitEditing={() => {
                  if (!keyboardUp) handleSubmit();
                }}
                maxLength={500}
                textAlignVertical="center"
              />

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!hasText}
                activeOpacity={0.85}
                style={[
                  styles.sendFab,
                  { backgroundColor: hasText ? BRAND_BLUE : isDark ? '#3f3f46' : '#d4d4d8' },
                ]}
                accessibilityRole="button"
                accessibilityLabel={isUz ? 'Yuborish' : 'Отправить'}
              >
                <Ionicons name="arrow-up" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  dockWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 14,
  },
  dock: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#0A2FB8',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 28,
      },
      android: { elevation: 20 },
    }),
  },
  field: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 22,
    paddingLeft: 4,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 52,
  },
  sparkleWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    paddingRight: 8,
    maxHeight: 120,
  },
  sendFab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
