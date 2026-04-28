import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { getTranslations } from '../../lib/translations';
import { getTokens } from '../../lib/design';
import { Button } from '../../components/ui';
import { promptNotificationPermissionInOnboarding } from '../../lib/pill-local-notifications';

// Healthcare-themed hero imagery (public unsplash CDN) — safe, license-free
const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1000&q=80',
  'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=1000&q=80',
  'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=1000&q=80',
];

const springConfig = { damping: 20, stiffness: 160 };

export default function OnboardingScreen() {
  const router = useRouter();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const language = useAuthStore((s) => s.language) ?? 'uz';
  const theme = useThemeStore((s) => s.theme);
  const setOnboardingSeen = useAuthStore((s) => s.setOnboardingSeen);
  const t = getTranslations(language);
  const tokens = getTokens(theme);

  const [index, setIndex] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const fade = useSharedValue(1);
  const scale = useSharedValue(1);

  const steps = useMemo(
    () => [
      {
        eyebrow: language === 'uz' ? 'SHIFOYOL' : 'ШИФОЙОЛ',
        title: t.onboardingStep1Title,
        subtitle: t.onboardingStep1Subtitle,
        image: HERO_IMAGES[0],
      },
      {
        eyebrow: language === 'uz' ? 'AI YORDAMI' : 'ПОМОЩЬ AI',
        title: t.onboardingStep2Title,
        subtitle: t.onboardingStep2Subtitle,
        image: HERO_IMAGES[1],
      },
      {
        eyebrow: language === 'uz' ? 'TAYYORMISIZ?' : 'ГОТОВЫ?',
        title: t.onboardingStep3Title,
        subtitle: t.onboardingStep3Subtitle,
        image: HERO_IMAGES[2],
      },
    ],
    [language, t],
  );

  const totalSteps = steps.length + 1;

  const finishOnboarding = useCallback(async () => {
    await setOnboardingSeen();
    router.replace('/(auth)/login');
  }, [setOnboardingSeen, router]);

  const animateToIndex = useCallback(
    (nextIdx: number) => {
      fade.value = withTiming(0, { duration: 160 });
      setTimeout(() => {
        setIndex(nextIdx);
        fade.value = withTiming(1, { duration: 240 });
        scale.value = withSpring(1.04, springConfig, () => {
          scale.value = withSpring(1, springConfig);
        });
      }, 160);
    },
    [fade, scale],
  );

  const goNext = useCallback(() => {
    if (index >= totalSteps - 1) {
      finishOnboarding();
      return;
    }
    animateToIndex(index + 1);
  }, [index, totalSteps, finishOnboarding, animateToIndex]);

  const onAllowNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      await promptNotificationPermissionInOnboarding();
    } finally {
      setNotifLoading(false);
    }
    animateToIndex(1);
  }, [animateToIndex]);

  const onSkipNotifications = useCallback(() => {
    animateToIndex(1);
  }, [animateToIndex]);

  const imgAnim = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ scale: scale.value }],
  }));
  const textAnim = useAnimatedStyle(() => ({ opacity: fade.value }));

  const heroIdx = index - 1;
  const heroStep = heroIdx >= 0 ? steps[heroIdx] : null;
  const imgSize = Math.min(screenWidth * 0.82, screenHeight * 0.45);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: tokens.colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <View style={{ width: 44 }} />
        <View style={styles.dots}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === index ? tokens.brand.iris : tokens.colors.border,
                  width: i === index ? 22 : 6,
                },
              ]}
            />
          ))}
        </View>
        <TouchableOpacity onPress={finishOnboarding} hitSlop={12}>
          <Text style={{ color: tokens.colors.textSecondary, fontWeight: '600', fontSize: 15 }}>
            {t.onboardingSkip}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {index === 0 ? (
          <>
            <Animated.View style={[styles.notifBellWrap, imgAnim]}>
              <LinearGradient
                colors={tokens.gradients.soft as [string, string, ...string[]]}
                style={styles.notifBellBubble}
              >
                <View style={[styles.notifBellInner, { backgroundColor: tokens.colors.backgroundCard }]}>
                  <Ionicons name="notifications" size={56} color={tokens.brand.iris} />
                </View>
              </LinearGradient>
            </Animated.View>
            <Animated.View style={[styles.textWrap, textAnim]}>
              <Text style={[tokens.type.overline, { color: tokens.brand.iris, marginBottom: 8 }]}>
                {language === 'uz' ? 'BILDIRISHNOMALAR' : 'УВЕДОМЛЕНИЯ'}
              </Text>
              <Text style={[tokens.type.display, { color: tokens.colors.text, textAlign: 'center' }]}>
                {t.onboardingNotifTitle}
              </Text>
              <Text
                style={{
                  color: tokens.colors.textSecondary,
                  fontSize: 15,
                  lineHeight: 22,
                  textAlign: 'center',
                  marginTop: 12,
                  paddingHorizontal: 8,
                }}
              >
                {t.onboardingNotifSubtitle}
              </Text>
            </Animated.View>
          </>
        ) : heroStep ? (
          <>
            <Animated.View style={[styles.imgWrap, imgAnim]}>
              <LinearGradient
                colors={tokens.gradients.soft as [string, string, ...string[]]}
                style={[styles.imgBubble, { width: imgSize, height: imgSize, borderRadius: imgSize / 2 }]}
              >
                <Image
                  source={{ uri: heroStep.image }}
                  style={[
                    styles.img,
                    { width: imgSize * 0.86, height: imgSize * 0.86, borderRadius: (imgSize * 0.86) / 2 },
                  ]}
                />
              </LinearGradient>

              <View style={[styles.floatCard, styles.floatTopLeft, { backgroundColor: tokens.colors.backgroundCard }]}>
                <View style={[styles.floatIcon, { backgroundColor: tokens.brand.iris }]}>
                  <Ionicons name="heart" size={14} color="#fff" />
                </View>
                <View>
                  <Text style={{ color: tokens.colors.text, fontWeight: '700', fontSize: 12 }}>98 BPM</Text>
                  <Text style={{ color: tokens.colors.textTertiary, fontSize: 10 }}>Pulse</Text>
                </View>
              </View>

              <View style={[styles.floatCard, styles.floatBottomRight, { backgroundColor: tokens.colors.backgroundCard }]}>
                <View style={[styles.floatIcon, { backgroundColor: tokens.brand.mint }]}>
                  <Ionicons name="shield-checkmark" size={14} color="#fff" />
                </View>
                <View>
                  <Text style={{ color: tokens.colors.text, fontWeight: '700', fontSize: 12 }}>Trusted</Text>
                  <Text style={{ color: tokens.colors.textTertiary, fontSize: 10 }}>Doctors</Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View style={[styles.textWrap, textAnim]}>
              <Text style={[tokens.type.overline, { color: tokens.brand.iris, marginBottom: 8 }]}>
                {heroStep.eyebrow}
              </Text>
              <Text style={[tokens.type.display, { color: tokens.colors.text, textAlign: 'center' }]}>
                {heroStep.title}
              </Text>
              <Text
                style={{
                  color: tokens.colors.textSecondary,
                  fontSize: 15,
                  lineHeight: 22,
                  textAlign: 'center',
                  marginTop: 12,
                  paddingHorizontal: 8,
                }}
              >
                {heroStep.subtitle}
              </Text>
            </Animated.View>
          </>
        ) : null}
      </View>

      <View style={styles.footer}>
        {index === 0 ? (
          <View style={styles.notifFooterCol}>
            <Button
              title={t.onboardingAllowNotifications}
              onPress={() => void onAllowNotifications()}
              variant="gradient"
              size="lg"
              loading={notifLoading}
              disabled={notifLoading}
              rightIcon="notifications"
            />
            <Button
              title={t.onboardingNotificationsLater}
              onPress={onSkipNotifications}
              variant="outline"
              size="lg"
              disabled={notifLoading}
            />
          </View>
        ) : (
          <Button
            title={index >= totalSteps - 1 ? (language === 'uz' ? 'Boshlash' : 'Начать') : t.onboardingNext}
            onPress={goNext}
            variant="gradient"
            size="lg"
            rightIcon={index >= totalSteps - 1 ? undefined : 'arrow-forward'}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 6, borderRadius: 3 },
  content: { flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  imgWrap: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  imgBubble: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  img: {},
  floatCard: {
    position: 'absolute',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  floatTopLeft: { top: 10, left: -10 },
  floatBottomRight: { bottom: 20, right: -10 },
  floatIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { marginTop: 36, alignItems: 'center' },
  footer: { paddingHorizontal: 24, paddingBottom: 12 },
  notifFooterCol: { gap: 12 },
  notifBellWrap: { alignItems: 'center', justifyContent: 'center' },
  notifBellBubble: {
    width: 176,
    height: 176,
    borderRadius: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBellInner: {
    width: 138,
    height: 138,
    borderRadius: 69,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
