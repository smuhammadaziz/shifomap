import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Modal,
    TextInput,
    Alert,
    Platform,
    KeyboardAvoidingView,
    Keyboard,
    TouchableWithoutFeedback,
    Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/auth-store';
import { useThemeStore } from '../store/theme-store';
import { getTranslations } from '../lib/translations';
import { getColors } from '../lib/theme';
import {
  getMyPrescriptions,
  getCustomReminders,
  addCustomReminder,
  deleteCustomReminder,
  submitCustomReminderPillEvent,
  getApiErrorMessage,
  type PrescriptionCard,
  type CustomReminder,
} from '../lib/api';
import { syncPillReminderNotifications } from '../lib/pill-local-notifications';
import { useRouter } from 'expo-router';

const REMINDER_COLORS = [
    { bg: '#EEF2FF', iconBg: '#E0E7FF', icon: '#4F46E5', ring: '#C7D2FE' },
    { bg: '#ECFEFF', iconBg: '#CFFAFE', icon: '#0891B2', ring: '#A5F3FC' },
    { bg: '#F0FDF4', iconBg: '#DCFCE7', icon: '#16A34A', ring: '#BBF7D0' },
    { bg: '#FFF7ED', iconBg: '#FFEDD5', icon: '#EA580C', ring: '#FED7AA' },
    { bg: '#FDF2F8', iconBg: '#FCE7F3', icon: '#DB2777', ring: '#FBCFE8' },
];

function pickReminderColor(i: number) {
    return REMINDER_COLORS[i % REMINDER_COLORS.length];
}

const PillReminderScreen = () => {
    const language = useAuthStore((s) => s.language) ?? 'uz';
    const theme = useThemeStore((s) => s.theme);
    const t = getTranslations(language);
    const colors = getColors(theme);
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [list, setList] = useState<PrescriptionCard[]>([]);
    const [customList, setCustomList] = useState<CustomReminder[]>([]);
    
    // Form State
    const [modalVisible, setModalVisible] = useState(false);
    const [pillName, setPillName] = useState('');
    const [pillTime, setPillTime] = useState('09:00');
    const [pillNotes, setPillNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const pillNameRef = useRef<TextInput>(null);
    const pillTimeRef = useRef<TextInput>(null);
    const pillNotesRef = useRef<TextInput>(null);

    const QUICK_TIMES = ['08:00', '12:00', '14:00', '18:00', '21:00'];

    const openAddModal = () => {
        setPillName('');
        setPillTime('09:00');
        setPillNotes('');
        setModalVisible(true);
        // Auto-focus the first field once the modal slides in.
        setTimeout(() => pillNameRef.current?.focus(), 220);
    };

    const closeAddModal = () => {
        Keyboard.dismiss();
        setModalVisible(false);
    };

    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const [pData, cData] = await Promise.all([
                getMyPrescriptions(),
                getCustomReminders()
            ]);
            setList(pData);
            setCustomList(cData);
            await syncPillReminderNotifications(cData);
        } catch {
            setList([]);
            setCustomList([]);
            await syncPillReminderNotifications([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const todayStr = () => new Date().toISOString().slice(0, 10);

    const handleIchdim = async (reminderId: string, time: string) => {
        try {
            await submitCustomReminderPillEvent({
                reminderId,
                action: 'taken',
                date: todayStr(),
                time,
            });
            load();
        } catch (err) {
            const msg =
                err instanceof Error ? err.message : getApiErrorMessage(err) ?? 'Failed';
            Alert.alert(language === 'uz' ? 'Xato' : 'Ошибка', msg);
        }
    };

    const handleAdd = async () => {
        if (!pillName.trim()) {
            Alert.alert(language === 'uz' ? 'Xato' : 'Ошибка', language === 'uz' ? 'Dori nomi kiritilishi shart' : 'Название лекарства обязательно');
            return;
        }
        if (!/^\d{2}:\d{2}$/.test(pillTime)) {
            Alert.alert(language === 'uz' ? 'Xato' : 'Ошибка', language === 'uz' ? 'Vaqtni HH:MM formatda kiriting (m: 09:00)' : 'Введите время в формате ЧЧ:ММ (н: 09:00)');
            return;
        }
        setSubmitting(true);
        try {
            await addCustomReminder({
                pillName: pillName.trim(),
                time: pillTime,
                notes: pillNotes.trim() || null,
                timesPerDay: 1
            });
            closeAddModal();
            setPillName('');
            setPillNotes('');
            setPillTime('09:00');
            load();
        } catch (err) {
            const msg =
                err instanceof Error ? err.message : getApiErrorMessage(err) ?? 'Failed to add reminder';
            Alert.alert(language === 'uz' ? 'Xato' : 'Ошибка', msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            language === 'uz' ? 'O\'chirish' : 'Удалить',
            language === 'uz' ? 'Ushbu eslatmani o\'chirmoqchimisiz?' : 'Вы уверены, что хотите удалить это напоминание?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'OK', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteCustomReminder(id);
                            load();
                        } catch {
                            Alert.alert('Error', 'Failed to delete');
                        }
                    }
                }
            ]
        );
    };

    useEffect(() => {
        load();
    }, [load]);

    const isEmpty = !loading && list.length === 0 && customList.length === 0;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} hitSlop={15}>
                    <Ionicons name="chevron-back" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t.pillReminders}</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    isEmpty && { flexGrow: 1, paddingTop: 0 },
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
            >

                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : isEmpty ? (
                    <View style={styles.emptyHeroWrap}>
                        <View
                            style={[
                                styles.emptyIconCircle,
                                {
                                    backgroundColor: theme === 'dark' ? colors.primaryBg : '#EEF2FF',
                                    borderColor: theme === 'dark' ? colors.border : '#C7D2FE',
                                },
                            ]}
                        >
                            <Ionicons name="medical" size={44} color={colors.primary} />
                        </View>

                        <Text style={[styles.emptyTitle, { color: colors.text }]}>
                            {language === 'uz'
                                ? "Doringizni hech qachon unutmang"
                                : 'Никогда не забывайте принимать лекарства'}
                        </Text>
                        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                            {language === 'uz'
                                ? "Dori nomi va vaqtini qo'shing — vaqt kelganda telefoningizga eslatma yuboramiz."
                                : 'Добавьте название и время — мы отправим уведомление, когда придёт время принять.'}
                        </Text>

                        <View
                            style={[
                                styles.benefitsCard,
                                {
                                    backgroundColor: colors.backgroundCard,
                                    borderColor: colors.border,
                                },
                            ]}
                        >
                            {[
                                {
                                    icon: 'add-circle-outline' as const,
                                    title: language === 'uz' ? 'Dori qo\'shing' : 'Добавьте лекарство',
                                    desc: language === 'uz' ? "Nomi va vaqtini ko'rsating" : 'Укажите название и время',
                                },
                                {
                                    icon: 'notifications-outline' as const,
                                    title: language === 'uz' ? 'Push-eslatma oling' : 'Получайте уведомления',
                                    desc: language === 'uz' ? "Vaqt kelganda darhol bildiramiz" : 'Сообщим, когда наступит время',
                                },
                                {
                                    icon: 'checkmark-done-outline' as const,
                                    title: language === 'uz' ? 'Belgilab boring' : 'Отмечайте приём',
                                    desc: language === 'uz' ? "Har bir qabulni bir tugma bilan" : 'Один тап — и приём отмечен',
                                },
                            ].map((b, i, arr) => (
                                <View
                                    key={b.icon}
                                    style={[
                                        styles.benefitRow,
                                        i < arr.length - 1 && {
                                            borderBottomColor: colors.borderLight,
                                            borderBottomWidth: StyleSheet.hairlineWidth,
                                        },
                                    ]}
                                >
                                    <View style={[styles.benefitIcon, { backgroundColor: colors.primaryBg }]}>
                                        <Ionicons name={b.icon} size={18} color={colors.primary} />
                                    </View>
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <Text style={[styles.benefitTitle, { color: colors.text }]} numberOfLines={1}>
                                            {b.title}
                                        </Text>
                                        <Text style={[styles.benefitDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                                            {b.desc}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[styles.emptyCta, { backgroundColor: colors.primary }]}
                            activeOpacity={0.88}
                            onPress={openAddModal}
                        >
                            <Ionicons name="add" size={22} color="#fff" />
                            <Text style={styles.emptyCtaText}>
                                {language === 'uz' ? "Birinchi eslatmani qo'shish" : 'Добавить первое напоминание'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : list.length === 0 ? null : (
                    <>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.myPrescriptions}</Text>
                        {list.map((p) => (
                            <TouchableOpacity
                                key={p._id}
                                style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                                activeOpacity={0.85}
                                onPress={() => router.push({ pathname: '/prescription/[id]', params: { id: p._id } })}
                            >
                                <View style={styles.cardRow}>
                                    <View style={[styles.iconMini, { backgroundColor: colors.primaryBg }]}>
                                        <Ionicons name="person-outline" size={16} color={colors.primary} />
                                    </View>
                                    <View style={styles.cardBody}>
                                        <Text style={[styles.pillName, { color: colors.text }]} numberOfLines={1}>
                                            {p.doctorName || '—'}
                                        </Text>
                                        <Text style={[styles.pillMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                                            {p.clinicName || '—'} • {t.medicines}: {p.medicinesCount}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </>
                )}

                {!loading && customList.length > 0 && (
                    <>
                        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
                            {language === 'uz' ? 'Mening eslatmalarim' : 'Мои напоминания'}
                        </Text>
                        {customList.map((c, idx) => {
                            const tone = pickReminderColor(idx);
                            const cardBg = theme === 'dark' ? colors.backgroundCard : tone.bg;
                            const cardBorder = theme === 'dark' ? colors.border : tone.ring;
                            const iconBg = theme === 'dark' ? colors.primaryBg : tone.iconBg;
                            const iconCol = theme === 'dark' ? colors.primary : tone.icon;
                            return (
                            <View
                                key={c.id}
                                style={[
                                    styles.card,
                                    {
                                        backgroundColor: cardBg,
                                        borderColor: cardBorder,
                                        borderWidth: 1.2,
                                    },
                                ]}
                            >
                                <View style={styles.cardRow}>
                                    <View style={[styles.iconMini, { backgroundColor: iconBg }]}>
                                        <Ionicons name="notifications-outline" size={16} color={iconCol} />
                                    </View>
                                    <View style={styles.cardBody}>
                                        <Text style={[styles.pillName, { color: colors.text }]} numberOfLines={1}>
                                            {c.pillName}
                                        </Text>
                                        <Text style={[styles.pillMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                                            {language === 'uz' ? "Vaqt" : "Время"}: {c.time}
                                        </Text>
                                    </View>
                                    <View style={styles.cardActions}>
                                    <TouchableOpacity
                                        onPress={() => handleIchdim(c.id, c.time)}
                                        style={[styles.ichdimBtn, { backgroundColor: colors.primary }]}
                                        activeOpacity={0.85}
                                    >
                                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                                        <Text style={styles.ichdimBtnText}>
                                            {language === 'uz' ? 'Ichdim' : 'Принял(а)'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleDelete(c.id)}
                                        style={[styles.deleteWrap, { backgroundColor: colors.backgroundSecondary }]}
                                    >
                                        <Ionicons name="trash-outline" size={17} color="#ef4444" />
                                    </TouchableOpacity>
                                    </View>
                                </View>
                                {c.notes && (
                                    <Text style={[styles.notesText, { color: colors.textSecondary }]} numberOfLines={2}>
                                        {c.notes}
                                    </Text>
                                )}
                            </View>
                        )})}
                    </>
                )}

                <View style={{ height: Math.max(insets.bottom, 20) + 80 }} />
            </ScrollView>

            {!isEmpty && !loading ? (
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: colors.primary, bottom: Math.max(insets.bottom, 20) + 16 }]}
                    onPress={openAddModal}
                    activeOpacity={0.85}
                >
                    <Ionicons name="add" size={32} color="#FFF" />
                </TouchableOpacity>
            ) : null}

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent
                onRequestClose={closeAddModal}
            >
                <Pressable style={styles.modalOverlay} onPress={closeAddModal}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        keyboardVerticalOffset={0}
                        style={styles.kbAvoidWrap}
                        pointerEvents="box-none"
                    >
                        <Pressable
                            style={[
                                styles.modalContent,
                                {
                                    backgroundColor: colors.backgroundCard,
                                    paddingBottom: Math.max(insets.bottom, 14) + 14,
                                    borderColor: colors.border,
                                },
                            ]}
                            onPress={(e) => e.stopPropagation()}
                        >
                            <View style={styles.modalHandle} />
                            <View style={styles.modalHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                                        {language === 'uz' ? 'Yangi eslatma' : 'Новое напоминание'}
                                    </Text>
                                    <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                                        {language === 'uz'
                                            ? "Vaqti kelganda telefoningizga bildirishnoma kelib turadi"
                                            : 'Уведомление придёт в указанное время'}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={closeAddModal} hitSlop={10} style={styles.modalCloseBtn}>
                                    <Ionicons name="close" size={22} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()} accessible={false}>
                                <ScrollView
                                    style={styles.modalScroll}
                                    keyboardShouldPersistTaps="handled"
                                    showsVerticalScrollIndicator={false}
                                >
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                                        {language === 'uz' ? 'Dori nomi' : 'Название лекарства'}
                                    </Text>
                                    <TextInput
                                        ref={pillNameRef}
                                        style={[
                                            styles.input,
                                            {
                                                color: colors.text,
                                                borderColor: colors.border,
                                                backgroundColor: colors.backgroundInput,
                                            },
                                        ]}
                                        value={pillName}
                                        onChangeText={setPillName}
                                        placeholder={language === 'uz' ? 'Masalan, Paratsetamol 500mg' : 'Например, Парацетамол 500мг'}
                                        placeholderTextColor={colors.textPlaceholder}
                                        returnKeyType="next"
                                        onSubmitEditing={() => pillTimeRef.current?.focus()}
                                    />

                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                                        {language === 'uz' ? 'Qabul qilish vaqti' : 'Время приёма'}
                                    </Text>
                                    <TextInput
                                        ref={pillTimeRef}
                                        style={[
                                            styles.input,
                                            {
                                                color: colors.text,
                                                borderColor: colors.border,
                                                backgroundColor: colors.backgroundInput,
                                            },
                                        ]}
                                        value={pillTime}
                                        onChangeText={(text) => {
                                            const digits = text.replace(/\D/g, '').slice(0, 4);
                                            if (digits.length <= 2) {
                                                setPillTime(digits);
                                            } else {
                                                setPillTime(digits.slice(0, 2) + ':' + digits.slice(2));
                                            }
                                        }}
                                        placeholder="09:00"
                                        placeholderTextColor={colors.textPlaceholder}
                                        keyboardType="number-pad"
                                        maxLength={5}
                                        returnKeyType="next"
                                        onSubmitEditing={() => pillNotesRef.current?.focus()}
                                    />
                                    <View style={styles.quickTimesRow}>
                                        {QUICK_TIMES.map((qt) => {
                                            const active = pillTime === qt;
                                            return (
                                                <TouchableOpacity
                                                    key={qt}
                                                    onPress={() => setPillTime(qt)}
                                                    activeOpacity={0.85}
                                                    style={[
                                                        styles.quickTimeChip,
                                                        {
                                                            backgroundColor: active ? colors.primary : colors.backgroundSecondary,
                                                            borderColor: active ? colors.primary : colors.border,
                                                        },
                                                    ]}
                                                >
                                                    <Text
                                                        style={{
                                                            color: active ? '#fff' : colors.text,
                                                            fontSize: 12,
                                                            fontWeight: '700',
                                                        }}
                                                    >
                                                        {qt}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                                        {language === 'uz' ? 'Eslatma (ixtiyoriy)' : 'Заметка (необязательно)'}
                                    </Text>
                                    <TextInput
                                        ref={pillNotesRef}
                                        style={[
                                            styles.input,
                                            {
                                                color: colors.text,
                                                borderColor: colors.border,
                                                backgroundColor: colors.backgroundInput,
                                                height: 80,
                                                textAlignVertical: 'top',
                                            },
                                        ]}
                                        value={pillNotes}
                                        onChangeText={setPillNotes}
                                        multiline
                                        placeholder={language === 'uz' ? "Ovqatdan keyin..." : 'После еды...'}
                                        placeholderTextColor={colors.textPlaceholder}
                                        returnKeyType="done"
                                        blurOnSubmit
                                        onSubmitEditing={() => Keyboard.dismiss()}
                                    />

                                    <TouchableOpacity
                                        style={[
                                            styles.submitButton,
                                            {
                                                backgroundColor: colors.primary,
                                                opacity: !pillName.trim() || submitting ? 0.55 : 1,
                                            },
                                        ]}
                                        onPress={handleAdd}
                                        disabled={submitting || !pillName.trim()}
                                        activeOpacity={0.88}
                                    >
                                        {submitting ? (
                                            <ActivityIndicator size="small" color="#FFF" />
                                        ) : (
                                            <>
                                                <Ionicons name="checkmark" size={20} color="#fff" />
                                                <Text style={styles.submitButtonText}>
                                                    {language === 'uz' ? 'Saqlash' : 'Сохранить'}
                                                </Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </ScrollView>
                            </TouchableWithoutFeedback>
                        </Pressable>
                    </KeyboardAvoidingView>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 24,
        paddingTop: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
        marginTop: 8,
    },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
    emptyText: { marginTop: 12, fontSize: 14 },
    emptyHeroWrap: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        paddingVertical: 24,
        gap: 14,
    },
    emptyIconCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.2,
        marginBottom: 4,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: -0.3,
        paddingHorizontal: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 16,
        marginBottom: 4,
    },
    benefitsCard: {
        width: '100%',
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 14,
        marginVertical: 4,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
    },
    benefitIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    benefitTitle: { fontSize: 14, fontWeight: '700' },
    benefitDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
    emptyCta: {
        width: '100%',
        height: 54,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 6,
        shadowColor: '#0A2FB8',
        shadowOpacity: 0.22,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 14,
        elevation: 5,
    },
    emptyCtaText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: -0.1 },
    card: {
        borderRadius: 20,
        borderWidth: 1.2,
        padding: 14,
        marginBottom: 12,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pillDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 12,
    },
    iconMini: {
        width: 28,
        height: 28,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    cardBody: {
        flex: 1,
        minWidth: 0,
    },
    pillName: {
        fontSize: 16,
        fontWeight: '700',
    },
    pillMeta: {
        marginTop: 3,
        fontSize: 13,
        fontWeight: '500',
    },
    timePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginLeft: 10,
    },
    timeText: {
        fontSize: 13,
        fontWeight: '700',
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notesText: { fontSize: 13, marginTop: 12, fontStyle: 'italic', paddingHorizontal: 4 },
    cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    ichdimBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 10,
    },
    ichdimBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
    deleteWrap: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fab: {
        position: 'absolute',
        right: 20,
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    kbAvoidWrap: {
        width: '100%',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 22,
        paddingTop: 8,
        maxHeight: '90%',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderLeftWidth: StyleSheet.hairlineWidth,
        borderRightWidth: StyleSheet.hairlineWidth,
    },
    modalHandle: {
        width: 44,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(120,120,128,0.35)',
        alignSelf: 'center',
        marginTop: 4,
        marginBottom: 12,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 18,
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    modalSubtitle: { fontSize: 12, marginTop: 4, lineHeight: 16 },
    modalScroll: {
        marginBottom: 4,
    },
    quickTimesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    quickTimeChip: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
    },
    rowInputs: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    submitButton: {
        height: 52,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 22,
        marginBottom: 8,
    },
    submitButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default PillReminderScreen;
