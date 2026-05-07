import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../store/theme-store';
import { useAuthStore } from '../store/auth-store';
import { getTokens } from '../lib/design';
import { Button, Card, IconButton } from '../components/ui';
import { saveAssessment } from '../lib/api';

type QOption = { label: string; weight: 0 | 1 | 2 };
type Q = { q: string; options: QOption[] };

type Answer = { question: string; answer: string };

function severityFromScore(sum: number): 'low' | 'medium' | 'high' {
  if (sum <= 6) return 'low';
  if (sum <= 13) return 'medium';
  return 'high';
}

const buildQuestions = (lang: 'uz' | 'ru' | 'en'): Q[] => {
  const uz: Q[] = [
    {
      q: "Sizda bosh og'rig'i qanchalik tez-tez bo'ladi?",
      options: [
        { label: "Kamdan-kam (0)", weight: 0 },
        { label: "Ba'zida (1)", weight: 1 },
        { label: "Tez-tez (2)", weight: 2 },
      ],
    },
    {
      q: 'Kun davomida energiya darajangiz qanday?',
      options: [
        { label: 'Tetikman (0)', weight: 0 },
        { label: "Ba'zida charchayman (1)", weight: 1 },
        { label: 'Doimiy charchoq bor (2)', weight: 2 },
      ],
    },
    {
      q: 'Uyqungiz qanday?',
      options: [
        { label: 'Yaxshi (0)', weight: 0 },
        { label: "Ba'zida muammo bo'ladi (1)", weight: 1 },
        { label: "Yomon / uyqusizlik (2)", weight: 2 },
      ],
    },
    {
      q: 'Stress darajangiz qanday?',
      options: [
        { label: 'Past (0)', weight: 0 },
        { label: "O'rtacha (1)", weight: 1 },
        { label: 'Yuqori (2)', weight: 2 },
      ],
    },
    {
      q: "Tanangizda og'riqlar bormi (bel, bo'yin)?",
      options: [
        { label: "Yo'q (0)", weight: 0 },
        { label: "Ba'zida (1)", weight: 1 },
        { label: 'Tez-tez (2)', weight: 2 },
      ],
    },
    {
      q: 'Ovqat hazm qilish qanday?',
      options: [
        { label: 'Hammasi yaxshi (0)', weight: 0 },
        { label: "Ba'zida noqulaylik bor (1)", weight: 1 },
        { label: 'Tez-tez muammo bor (2)', weight: 2 },
      ],
    },
    {
      q: 'Jismoniy faolligingiz qanday?',
      options: [
        { label: 'Muntazam (0)', weight: 0 },
        { label: "Ba'zida (1)", weight: 1 },
        { label: 'Juda kam (2)', weight: 2 },
      ],
    },
    {
      q: 'Ovqatlanish odatlaringiz qanday?',
      options: [
        { label: 'Muvozanatli (0)', weight: 0 },
        { label: "Ba'zida zararli ovqat yeyman (1)", weight: 1 },
        { label: "Noto'g'ri / tez ovqat (2)", weight: 2 },
      ],
    },
    {
      q: 'Kun davomida kayfiyatingiz qanday?',
      options: [
        { label: 'Barqaror (0)', weight: 0 },
        { label: "Ba'zida o'zgaradi (1)", weight: 1 },
        { label: "Ko'pincha yomon / asabiy (2)", weight: 2 },
      ],
    },
    {
      q: "Diqqat va e'tiboringiz qanday?",
      options: [
        { label: 'Yaxshi (0)', weight: 0 },
        { label: "Ba'zida jamlash qiyin (1)", weight: 1 },
        { label: 'Ko\'pincha «miya tuman» holati (2)', weight: 2 },
      ],
    },
  ];

  const ru: Q[] = [
    {
      q: 'Как часто у вас болит голова?',
      options: [
        { label: 'Редко (0)', weight: 0 },
        { label: 'Иногда (1)', weight: 1 },
        { label: 'Часто (2)', weight: 2 },
      ],
    },
    {
      q: 'Каков ваш уровень энергии в течение дня?',
      options: [
        { label: 'Бодрый (0)', weight: 0 },
        { label: 'Иногда устаю (1)', weight: 1 },
        { label: 'Постоянная усталость (2)', weight: 2 },
      ],
    },
    {
      q: 'Как у вас со сном?',
      options: [
        { label: 'Хорошо (0)', weight: 0 },
        { label: 'Иногда проблемы (1)', weight: 1 },
        { label: 'Плохо / бессонница (2)', weight: 2 },
      ],
    },
    {
      q: 'Каков уровень стресса?',
      options: [
        { label: 'Низкий (0)', weight: 0 },
        { label: 'Средний (1)', weight: 1 },
        { label: 'Высокий (2)', weight: 2 },
      ],
    },
    {
      q: 'Есть ли боли в теле (поясница, шея)?',
      options: [
        { label: 'Нет (0)', weight: 0 },
        { label: 'Иногда (1)', weight: 1 },
        { label: 'Часто (2)', weight: 2 },
      ],
    },
    {
      q: 'Как пищеварение?',
      options: [
        { label: 'Всё хорошо (0)', weight: 0 },
        { label: 'Иногда дискомфорт (1)', weight: 1 },
        { label: 'Часто проблемы (2)', weight: 2 },
      ],
    },
    {
      q: 'Какая у вас физическая активность?',
      options: [
        { label: 'Регулярно (0)', weight: 0 },
        { label: 'Иногда (1)', weight: 1 },
        { label: 'Очень мало (2)', weight: 2 },
      ],
    },
    {
      q: 'Какие привычи питания?',
      options: [
        { label: 'Сбалансированно (0)', weight: 0 },
        { label: 'Иногда вредная еда (1)', weight: 1 },
        { label: 'Нерегулярно / фастфуд (2)', weight: 2 },
      ],
    },
    {
      q: 'Как настроение в течение дня?',
      options: [
        { label: 'Стабильное (0)', weight: 0 },
        { label: 'Иногда меняется (1)', weight: 1 },
        { label: 'Часто плохое / раздражительность (2)', weight: 2 },
      ],
    },
    {
      q: 'Как внимание и концентрация?',
      options: [
        { label: 'Хорошо (0)', weight: 0 },
        { label: 'Иногда сложно сосредоточиться (1)', weight: 1 },
        { label: 'Часто «туман в голове» (2)', weight: 2 },
      ],
    },
  ];

  if (lang === 'ru') return ru;
  return uz;
};

export default function HealthTestScreen() {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const language = (useAuthStore((s) => s.language) ?? 'uz') as 'uz' | 'ru' | 'en';
  const insets = useSafeAreaInsets();
  const tokens = getTokens(theme);
  const questions = useMemo(() => buildQuestions(language), [language]);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(QOption | null)[]>(() => questions.map(() => null));

  useEffect(() => {
    setAnswers(questions.map(() => null));
    setStep(0);
    setResult(null);
  }, [questions]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ condition: string; advice: string; severity: 'low' | 'medium' | 'high' } | null>(null);

  const pick = (opt: QOption) => {
    const next = [...answers];
    next[step] = opt;
    setAnswers(next);
    setTimeout(() => {
      if (step < questions.length - 1) setStep(step + 1);
    }, 140);
  };

  const runAi = async () => {
    setLoading(true);
    try {
      const score = answers.reduce((s, a) => s + (a?.weight ?? 0), 0);
      const fallbackSeverity = severityFromScore(score);
      const payload: Answer[] = questions.map((q, i) => ({
        question: q.q,
        answer: answers[i]?.label ?? '',
      }));
      let ai: { condition: string; advice: string; severity: 'low' | 'medium' | 'high' } | null = null;
      const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      if (apiKey) {
        const prompt = `You are a cautious wellness triage assistant (not a doctor). The user answered 10 lifestyle/wellness questions; each answer has an implicit stress score 0–2 (higher = more concern). Sum of scores is ${score} (0–20). Return STRICT JSON with keys: condition (short phrase, ${language}), advice (3-5 sentences of practical, safe lifestyle advice in ${language}), severity ('low'|'medium'|'high') — align severity with sum: ~0-6 low, ~7-13 medium, ~14-20 high. Encourage seeing a doctor if appropriate. Answers JSON: ${JSON.stringify(payload)}`;
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: 'You are a cautious wellness triage assistant.' },
              { role: 'user', content: prompt },
            ],
          }),
        });
        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content ?? '{}';
        try {
          ai = JSON.parse(content);
        } catch {
          ai = { condition: 'N/A', advice: content, severity: fallbackSeverity };
        }
      } else {
        ai = {
          condition: language === 'uz' ? 'Umumiy holat' : language === 'ru' ? 'Общее состояние' : 'General status',
          advice:
            language === 'uz'
              ? "Javoblaringiz asosida, odatlaringizni kuzatib boring va kerak bo'lsa shifokor yoki dietolog bilan maslahatlashing."
              : language === 'ru'
                ? 'По вашим ответам наблюдайте за привычками; при необходимости обратитесь к врачу или диетологу.'
                : 'Monitor your habits and consult a doctor if needed.',
          severity: fallbackSeverity,
        };
      }
      const sev =
        ai?.severity === 'low' || ai?.severity === 'medium' || ai?.severity === 'high' ? ai.severity : fallbackSeverity;
      const merged = { ...ai!, severity: sev };
      setResult(merged);
      try {
        await saveAssessment({
          answers: payload,
          condition: merged.condition ?? null,
          advice: merged.advice ?? null,
          severity: merged.severity ?? null,
          aiSummary: null,
        });
      } catch {
        /* ignore */
      }
    } finally {
      setLoading(false);
    }
  };

  const progress = ((step + 1) / questions.length) * 100;
  const allAnswered = answers.every((a) => a != null);

  if (result) {
    const severityColor =
      result.severity === 'high' ? tokens.colors.error : result.severity === 'medium' ? tokens.brand.amber : tokens.colors.success;
    return (
      <View style={{ flex: 1, backgroundColor: tokens.colors.background }}>
        <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
          <IconButton icon="chevron-back" onPress={() => router.back()} />
          <Text style={[tokens.type.title, { color: tokens.colors.text }]}>
            {language === 'uz' ? 'Natija' : language === 'ru' ? 'Результат' : 'Result'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
          <LinearGradient
            colors={tokens.gradients.hero as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.resultHero}
          >
            <Ionicons name="sparkles" size={22} color="#fff" />
            <Text style={[tokens.type.titleXl, { color: '#fff', marginTop: 10 }]}>{result.condition}</Text>
            <View style={[styles.severityPill, { backgroundColor: severityColor }]}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
                {result.severity.toUpperCase()}
              </Text>
            </View>
          </LinearGradient>
          <Card>
            <Text style={[tokens.type.caption, { color: tokens.colors.textTertiary, marginBottom: 8 }]}>
              {language === 'uz' ? 'Maslahatlar' : language === 'ru' ? 'Советы' : 'Advice'}
            </Text>
            <Text style={{ color: tokens.colors.text, fontSize: 14, lineHeight: 22 }}>{result.advice}</Text>
          </Card>
          <Button
            title={language === 'uz' ? 'Yakunlash' : language === 'ru' ? 'Готово' : 'Done'}
            variant="gradient"
            onPress={() => router.back()}
          />
        </ScrollView>
      </View>
    );
  }

  const q = questions[step];

  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text style={[tokens.type.caption, { color: tokens.colors.textSecondary }]}>
          {step + 1} / {questions.length}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={[styles.progressTrack, { backgroundColor: tokens.colors.borderLight }]}>
        <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: tokens.brand.iris }]} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={[tokens.type.caption, { color: tokens.brand.iris, marginBottom: 10 }]}>
          {language === 'uz' ? 'SOG‘LIQ TESTI' : language === 'ru' ? 'ТЕСТ ЗДОРОВЬЯ' : 'HEALTH TEST'}
        </Text>
        <Text style={[tokens.type.titleXl, { color: tokens.colors.text }]}>{q.q}</Text>
        <View style={{ height: 20 }} />
        <View style={{ gap: 10 }}>
          {q.options.map((opt) => {
            const selected = answers[step]?.label === opt.label && answers[step]?.weight === opt.weight;
            return (
              <TouchableOpacity
                key={`${opt.label}-${opt.weight}`}
                activeOpacity={0.85}
                onPress={() => pick(opt)}
                style={[
                  styles.option,
                  {
                    borderColor: selected ? tokens.brand.iris : tokens.colors.border,
                    backgroundColor: selected ? tokens.brand.iris : tokens.colors.backgroundCard,
                  },
                ]}
              >
                <Text style={{ color: selected ? '#fff' : tokens.colors.text, fontSize: 15, fontWeight: '700' }}>
                  {opt.label}
                </Text>
                {selected ? <Ionicons name="checkmark-circle" size={20} color="#fff" /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      <View
        style={[
          styles.footer,
          { backgroundColor: tokens.colors.background, borderTopColor: tokens.colors.border, paddingBottom: insets.bottom + 14 },
        ]}
      >
        {step > 0 ? (
          <Button
            title={language === 'uz' ? 'Orqaga' : language === 'ru' ? 'Назад' : 'Back'}
            variant="outline"
            onPress={() => setStep(step - 1)}
            fullWidth={false}
            style={{ flex: 1 }}
          />
        ) : null}
        {step < questions.length - 1 ? (
          <Button
            title={language === 'uz' ? 'Keyingi' : language === 'ru' ? 'Далее' : 'Next'}
            rightIcon="arrow-forward"
            onPress={() => setStep(step + 1)}
            disabled={answers[step] == null}
            fullWidth={false}
            style={{ flex: 1.4 }}
          />
        ) : (
          <Button
            title={loading ? '' : language === 'uz' ? 'Natijani olish' : language === 'ru' ? 'Получить результат' : 'Get result'}
            rightIcon="sparkles"
            variant="gradient"
            loading={loading}
            disabled={!allAnswered}
            onPress={runAi}
            fullWidth={false}
            style={{ flex: 1.4 }}
          />
        )}
      </View>
      {loading ? (
        <View style={StyleSheet.absoluteFillObject}>
          <View style={[styles.overlay]} />
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={tokens.brand.iris} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTrack: {
    height: 4,
    marginHorizontal: 20,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: { height: 4, borderRadius: 4 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  resultHero: {
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
  },
  severityPill: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.35)' },
  loaderWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
