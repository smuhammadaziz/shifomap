import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { getTranslations } from '../../lib/translations';
import { getColors } from '../../lib/theme';

import UndrawMedicine from '../../assets/undraw_medicine_hqqg.svg';
import UndrawMedicalResearch from '../../assets/undraw_medical-research_pze7.svg';
import UndrawNewsfeed from '../../assets/undraw_newsfeed_8ms9.svg';

const ILLUSTRATIONS = [
  UndrawMedicine,
  UndrawMedicalResearch,
  UndrawNewsfeed,
] as const;

const springConfig = { damping: 18, stiffness: 120 };

const HORIZONTAL_PADDING = 32;

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const contentWidth = screenWidth - HORIZONTAL_PADDING * 2;
  const language = useAuthStore((s) => s.language) ?? 'uz';
  const theme = useThemeStore((s) => s.theme);
  const setOnboardingSeen = useAuthStore((s) => s.setOnboardingSeen);
  const t = getTranslations(language);
  const colors = getColors(theme);

  const [index, setIndex] = React.useState(0);
  const illustrationScale = useSharedValue(1);
  const illustrationOpacity = useSharedValue(1);
  const textOpacity = useSharedValue(1);

  const steps = [
    {
      title: t.onboardingStep1Title,
      subtitle: t.onboardingStep1Subtitle,
      Illustration: ILLUSTRATIONS[0],
    },
    {
      title: t.onboardingStep2Title,
      subtitle: t.onboardingStep2Subtitle,
      Illustration: ILLUSTRATIONS[1],
    },
    {
      title: t.onboardingStep3Title,
      subtitle: t.onboardingStep3Subtitle,
      Illustration: ILLUSTRATIONS[2],
    },
  ];

  const finishOnboarding = useCallback(async () => {
    await setOnboardingSeen();
    router.replace('/(auth)/login');
  }, [setOnboardingSeen, router]);

  const goNext = useCallback(() => {
    if (index < steps.length - 1) {
      illustrationOpacity.value = withTiming(0, { duration: 150 });
      textOpacity.value = withTiming(0, { duration: 150 });
      setTimeout(() => {
        const next = index + 1;
        setIndex(next);
        illustrationOpacity.value = withTiming(1, { duration: 250 });
        textOpacity.value = withTiming(1, { duration: 250 });
        illustrationScale.value = withSpring(1.08, springConfig, () => {
          illustrationScale.value = withSpring(1, springConfig);
        });
      }, 150);
    } else {
      finishOnboarding();
    }
  }, [index, steps.length, finishOnboarding, illustrationOpacity, textOpacity, illustrationScale]);

  const goBack = useCallback(() => {
    if (index > 0) {
      illustrationOpacity.value = withTiming(0, { duration: 150 });
      textOpacity.value = withTiming(0, { duration: 150 });
      setTimeout(() => {
        const prev = index - 1;
        setIndex(prev);
        illustrationOpacity.value = withTiming(1, { duration: 250 });
        textOpacity.value = withTiming(1, { duration: 250 });
        illustrationScale.value = withSpring(1.08, springConfig, () => {
          illustrationScale.value = withSpring(1, springConfig);
        });
      }, 150);
    }
  }, [index, illustrationOpacity, textOpacity, illustrationScale]);

  const illustrationAnimatedStyle = useAnimatedStyle(() => ({
    opacity: illustrationOpacity.value,
    transform: [{ scale: illustrationScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom, width: screenWidth, alignSelf: 'stretch' }]}>
      {/* Header */}
      <View style={styles.header}>
        {index > 0 ? (
          <TouchableOpacity
            onPress={goBack}
            style={[styles.backBtn, { backgroundColor: colors.backgroundSecondary }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
        <TouchableOpacity onPress={finishOnboarding} style={styles.skipBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[styles.skipText, { color: colors.primary }]}>{t.onboardingSkip}</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.slide}>
          <Animated.View style={[styles.illustrationWrap, illustrationAnimatedStyle]}>
            {(() => {
              const step = steps[index];
              const Illo = step.Illustration;
              return (
                <Illo
                  width={contentWidth * 0.9}
                  height={contentWidth * 0.65}
                  style={styles.illustration}
                />
              );
            })()}
          </Animated.View>
          <Animated.View style={[styles.textWrap, textAnimatedStyle]}>
            <Text style={[styles.title, { color: colors.text }]}>
              {steps[index].title}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {steps[index].subtitle}
            </Text>
          </Animated.View>
        </View>

        {/* Progress dots */}
        <View style={styles.dots}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === index ? colors.primary : colors.border },
                i === index && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Next button */}
        <TouchableOpacity
          onPress={goNext}
          style={[styles.nextBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-forward" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'stretch',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: HORIZONTAL_PADDING,
    width: '100%',
  },
  slide: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    maxHeight: 280,
  },
  illustration: {
    maxWidth: '100%',
  },
  textWrap: {
    width: '100%',
    alignSelf: 'stretch',
    marginBottom: 40,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
  },
  nextBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
});
