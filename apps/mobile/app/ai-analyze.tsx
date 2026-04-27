import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../store/theme-store';
import { useAuthStore } from '../store/auth-store';
import { getTokens } from '../lib/design';
import { Button, Card, IconButton } from '../components/ui';
import { uploadFile } from '../lib/api';

export default function AiAnalyzeScreen() {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const language = (useAuthStore((s) => s.language) ?? 'uz') as 'uz' | 'ru' | 'en';
  const insets = useSafeAreaInsets();
  const tokens = getTokens(theme);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [advice, setAdvice] = useState<string | null>(null);

  const tr = (u: string, r: string, e: string) =>
    language === 'uz' ? u : language === 'ru' ? r : e;

  const pick = async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert(tr('Ruxsat kerak', 'Нужно разрешение', 'Permission needed'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setImageUri(result.assets[0].uri);
        setSummary(null);
        setAdvice(null);
      }
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  };

  const takePhoto = async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert(tr('Ruxsat kerak', 'Нужно разрешение', 'Permission needed'));
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setImageUri(result.assets[0].uri);
        setSummary(null);
        setAdvice(null);
      }
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  };

  const analyze = async () => {
    if (!imageUri) return;
    setAnalyzing(true);
    try {
      try {
        await uploadFile(imageUri, `analysis-${Date.now()}.jpg`, 'image/jpeg');
      } catch {
        /* uploads to server are optional for AI step */
      }

      const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      if (!apiKey) {
        setSummary(
          tr(
            'API kalit topilmadi. Tahlilni shifokor bilan muhokama qiling.',
            'API ключ не найден. Обсудите анализ с врачом.',
            'API key not found. Discuss the analysis with a doctor.'
          )
        );
        setAdvice(null);
        return;
      }

      const toBase64 = async (uri: string): Promise<string> => {
        const res = await fetch(uri);
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1] ?? '');
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
      };
      const b64 = await toBase64(imageUri);

      const prompt = tr(
        'Siz tibbiy tahlillarni yordamchi tushuntiradigan modelsiz. Rasm — tahlil natijasi. Javobni STRICT JSON kabi bering: { "summary": "...", "advice": "..." }. Tilini: oʻzbek. Qisqa va aniq qiling, agar normal qiymatdan chetlanish bo‘lsa yozing. Shifokor bilan maslahat shartligini eslating.',
        'Ты медицинский ассистент, который объясняет анализы обычному человеку. На изображении — результат анализа. Ответ СТРОГО JSON: { "summary": "...", "advice": "..." }. Язык: русский. Кратко и ясно, отметь отклонения. Напомни обратиться к врачу.',
        'You explain medical test results to laypeople. The image is a lab result. Respond STRICT JSON: { "summary": "...", "advice": "..." } in English. Be concise, flag abnormalities, remind to consult a doctor.'
      );

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } },
              ],
            },
          ],
        }),
      });
      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content ?? '{}';
      try {
        const parsed = JSON.parse(content);
        setSummary(parsed.summary ?? null);
        setAdvice(parsed.advice ?? null);
      } catch {
        setSummary(content);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <IconButton icon="chevron-back" onPress={() => router.back()} />
        <Text style={[tokens.type.title, { color: tokens.colors.text }]}>
          {tr('AI Tahlil', 'AI Анализ', 'AI Analyzer')}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}>
        {!imageUri ? (
          <LinearGradient
            colors={tokens.gradients.hero as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Ionicons name="document-text" size={28} color="#fff" />
            <Text style={[tokens.type.titleLg, { color: '#fff', marginTop: 12 }]}>
              {tr('Tahlil rasmingizni yuklang', 'Загрузите фото анализа', 'Upload your test result')}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 6, lineHeight: 19 }}>
              {tr(
                'AI natijalarni soddalashtiradi va keyingi qadamlarni tushuntiradi.',
                'AI упростит результат и объяснит дальнейшие шаги.',
                'AI simplifies results and explains what to do next.'
              )}
            </Text>
          </LinearGradient>
        ) : (
          <View style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: tokens.colors.backgroundCard }}>
            <Image source={{ uri: imageUri }} style={styles.preview} />
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title={tr('Galereya', 'Галерея', 'Gallery')} variant="outline" leftIcon="images" onPress={pick} fullWidth={false} style={{ flex: 1 }} />
          <Button title={tr('Kamera', 'Камера', 'Camera')} variant="outline" leftIcon="camera" onPress={takePhoto} fullWidth={false} style={{ flex: 1 }} />
        </View>

        {imageUri ? (
          <Button
            title={analyzing ? tr('Tahlil qilinmoqda...', 'Анализируем...', 'Analyzing...') : tr('Tahlil qilish', 'Анализировать', 'Analyze')}
            variant="gradient"
            rightIcon="sparkles"
            loading={analyzing}
            onPress={analyze}
          />
        ) : null}

        {summary ? (
          <Card>
            <Text style={[tokens.type.caption, { color: tokens.colors.textTertiary, marginBottom: 8 }]}>
              {tr('NATIJA', 'ОБЗОР', 'SUMMARY')}
            </Text>
            <Text style={{ color: tokens.colors.text, fontSize: 14, lineHeight: 22 }}>{summary}</Text>
          </Card>
        ) : null}
        {advice ? (
          <Card>
            <Text style={[tokens.type.caption, { color: tokens.colors.textTertiary, marginBottom: 8 }]}>
              {tr('MASLAHAT', 'СОВЕТ', 'ADVICE')}
            </Text>
            <Text style={{ color: tokens.colors.text, fontSize: 14, lineHeight: 22 }}>{advice}</Text>
          </Card>
        ) : null}
      </ScrollView>
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
  hero: { padding: 22, borderRadius: 24 },
  preview: { width: '100%', height: 280, resizeMode: 'cover' },
});
