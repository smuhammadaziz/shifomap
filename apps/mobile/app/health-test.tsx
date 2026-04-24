import React, { useMemo, useState } from 'react';
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

type Answer = { question: string; answer: string };

const buildQuestions = (lang: 'uz' | 'ru' | 'en') => {
  const data = {
    uz: [
      { q: 'Umumiy ahvolingiz qanday?', a: ["A'lo", 'Yaxshi', "O'rtacha", 'Yomon'] },
      { q: 'Bugun tanangizning qaysi qismi ogʻriyapti?', a: ['Bosh', 'Qorin', 'Ko‘krak', 'Orqa', 'Hech qayeri'] },
      { q: 'Oʻsha ogʻriq qancha kuchli (0-10)?', a: ['0-2', '3-5', '6-8', '9-10'] },
      { q: 'Tanangiz harorati koʻtarilganmi?', a: ['Yo‘q', '37.0-37.5', '37.6-38.5', '38.6+'] },
      { q: 'Boshqa simptomlar bormi?', a: ['Yo‘q', 'Yo‘tal', 'Ko‘ngil aynishi', 'Bosh aylanish', 'Charchoq'] },
      { q: 'Qancha davom etmoqda?', a: ['<24 soat', '1-3 kun', '4-7 kun', '>1 hafta'] },
      { q: 'Dori ichganmisiz?', a: ['Yo‘q', 'Analgetik', 'Antibiotik', 'Boshqa'] },
      { q: 'Surunkali kasalligingiz bormi?', a: ['Yo‘q', 'Diabet', 'Gipertoniya', 'Allergiya', 'Boshqa'] },
    ],
    ru: [
      { q: 'Общее состояние?', a: ['Отличное', 'Хорошее', 'Среднее', 'Плохое'] },
      { q: 'Что болит сегодня?', a: ['Голова', 'Живот', 'Грудь', 'Спина', 'Ничего'] },
      { q: 'Сила боли (0-10)?', a: ['0-2', '3-5', '6-8', '9-10'] },
      { q: 'Температура?', a: ['Нет', '37.0-37.5', '37.6-38.5', '38.6+'] },
      { q: 'Другие симптомы?', a: ['Нет', 'Кашель', 'Тошнота', 'Головокружение', 'Слабость'] },
      { q: 'Как долго?', a: ['<24ч', '1-3 дня', '4-7 дней', '>1 недели'] },
      { q: 'Принимали лекарства?', a: ['Нет', 'Анальгетик', 'Антибиотик', 'Другое'] },
      { q: 'Хронические болезни?', a: ['Нет', 'Диабет', 'Гипертония', 'Аллергия', 'Другое'] },
    ],
    en: [
      { q: 'How do you feel overall?', a: ['Great', 'Good', 'Average', 'Bad'] },
      { q: 'What hurts today?', a: ['Head', 'Abdomen', 'Chest', 'Back', 'Nothing'] },
      { q: 'Pain level (0-10)?', a: ['0-2', '3-5', '6-8', '9-10'] },
      { q: 'Any fever?', a: ['No', '37.0-37.5', '37.6-38.5', '38.6+'] },
      { q: 'Other symptoms?', a: ['None', 'Cough', 'Nausea', 'Dizziness', 'Fatigue'] },
      { q: 'How long?', a: ['<24h', '1-3 days', '4-7 days', '>1 week'] },
      { q: 'Taking meds?', a: ['No', 'Analgesic', 'Antibiotic', 'Other'] },
      { q: 'Chronic illness?', a: ['None', 'Diabetes', 'Hypertension', 'Allergy', 'Other'] },
    ],
  };
  return data[lang] ?? data.uz;
};

export default function HealthTestScreen() {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const language = (useAuthStore((s) => s.language) ?? 'uz') as 'uz' | 'ru' | 'en';
  const insets = useSafeAreaInsets();
  const tokens = getTokens(theme);
  const questions = useMemo(() => buildQuestions(language), [language]);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>(() => questions.map(() => null));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ condition: string; advice: string; severity: 'low' | 'medium' | 'high' } | null>(null);

  const pick = (value: string) => {
    const next = [...answers];
    next[step] = value;
    setAnswers(next);
    setTimeout(() => {
      if (step < questions.length - 1) setStep(step + 1);
    }, 140);
  };

  const runAi = async () => {
    setLoading(true);
    try {
      const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      const payload: Answer[] = questions.map((q, i) => ({ question: q.q, answer: answers[i] ?? '' }));
      let ai: { condition: string; advice: string; severity: 'low' | 'medium' | 'high' } | null = null;
      if (apiKey) {
        const prompt = `You are a cautious medical triage assistant. Given the user's answers to 8 health questions (JSON below), return STRICT JSON with keys: condition (short phrase, ${language}), advice (3-5 sentences of practical, safe advice in ${language}), severity ('low'|'medium'|'high'). Encourage seeking a doctor when appropriate. Answers: ${JSON.stringify(payload)}`;
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: 'You are a cautious medical triage assistant.' },
              { role: 'user', content: prompt },
            ],
          }),
        });
        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content ?? '{}';
        try {
          ai = JSON.parse(content);
        } catch {
          ai = { condition: 'N/A', advice: content, severity: 'low' };
        }
      } else {
        ai = {
          condition: language === 'uz' ? 'Umumiy holat' : language === 'ru' ? 'Общее состояние' : 'General status',
          advice:
            language === 'uz'
              ? "Javoblaringiz asosida, simptomlaringizni kuzatib boring va agar 48 soat ichida yaxshilanmasa shifokorga murojaat qiling."
              : language === 'ru'
              ? 'По вашим ответам: наблюдайте симптомы, обратитесь к врачу если состояние не улучшится за 48 часов.'
              : 'Monitor your symptoms and consult a doctor if no improvement within 48h.',
          severity: 'low',
        };
      }
      setResult(ai);
      try {
        await saveAssessment({
          answers: payload,
          condition: ai?.condition ?? null,
          advice: ai?.advice ?? null,
          severity: ai?.severity ?? null,
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
          {q.a.map((opt) => {
            const selected = answers[step] === opt;
            return (
              <TouchableOpacity
                key={opt}
                activeOpacity={0.85}
                onPress={() => pick(opt)}
                style={[
                  styles.option,
                  {
                    borderColor: selected ? tokens.brand.iris : tokens.colors.border,
                    backgroundColor: selected ? tokens.brand.iris : tokens.colors.surface,
                  },
                ]}
              >
                <Text style={{ color: selected ? '#fff' : tokens.colors.text, fontSize: 15, fontWeight: '700' }}>
                  {opt}
                </Text>
                {selected ? <Ionicons name="checkmark-circle" size={20} color="#fff" /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: tokens.colors.background, borderTopColor: tokens.colors.border, paddingBottom: insets.bottom + 14 }]}>
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
