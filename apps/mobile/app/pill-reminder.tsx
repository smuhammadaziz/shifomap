import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, TextInput, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/auth-store';
import { useThemeStore } from '../store/theme-store';
import { getTranslations } from '../lib/translations';
import { getColors } from '../lib/theme';
import { getMyPrescriptions, getCustomReminders, addCustomReminder, deleteCustomReminder, type PrescriptionCard, type CustomReminder } from '../lib/api';
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
            setModalVisible(false);
            setPillName('');
            setPillNotes('');
            setPillTime('09:00');
            load();
        } catch (err) {
            Alert.alert('Error', 'Failed to add reminder');
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
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
            >

                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : list.length === 0 ? (
                    <View style={styles.centered}>
                        <Ionicons name="file-tray-outline" size={48} color={colors.textTertiary} />
                        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                            {t.noPrescriptionsYet}
                        </Text>
                    </View>
                ) : (
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
                            return (
                            <View
                                key={c.id}
                                style={[
                                    styles.card,
                                    {
                                        backgroundColor: tone.bg,
                                        borderColor: tone.ring,
                                        borderWidth: 1.2,
                                    },
                                ]}
                            >
                                <View style={styles.cardRow}>
                                    <View style={[styles.iconMini, { backgroundColor: tone.iconBg }]}>
                                        <Ionicons name="notifications-outline" size={16} color={tone.icon} />
                                    </View>
                                    <View style={styles.cardBody}>
                                        <Text style={[styles.pillName, { color: colors.text }]} numberOfLines={1}>
                                            {c.pillName}
                                        </Text>
                                        <Text style={[styles.pillMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                                            {language === 'uz' ? "Vaqt" : "Время"}: {c.time}
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={() => handleDelete(c.id)} style={styles.deleteWrap}>
                                        <Ionicons name="trash-outline" size={17} color="#ef4444" />
                                    </TouchableOpacity>
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

            <TouchableOpacity 
                style={[styles.fab, { backgroundColor: colors.primary, bottom: Math.max(insets.bottom, 20) + 16 }]}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={32} color="#FFF" />
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.backgroundCard }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {language === 'uz' ? 'Yangi eslatma' : 'Новое напоминание'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                                {language === 'uz' ? 'Dori nomi' : 'Название лекарства'}
                            </Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                                value={pillName}
                                onChangeText={setPillName}
                                placeholder="..."
                                placeholderTextColor={colors.textTertiary}
                            />

                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                                {language === 'uz' ? 'Vaqti (m: 09:00)' : 'Время (н: 09:00)'}
                            </Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
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
                                placeholderTextColor={colors.textTertiary}
                                keyboardType="number-pad"
                                maxLength={5}
                            />

                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                                {language === 'uz' ? 'Eslatma' : 'Заметка'}
                            </Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border, height: 80, textAlignVertical: 'top' }]}
                                value={pillNotes}
                                onChangeText={setPillNotes}
                                multiline
                                placeholder="..."
                                placeholderTextColor={colors.textTertiary}
                            />

                            <TouchableOpacity 
                                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                                onPress={handleAdd}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={styles.submitButtonText}>
                                        {language === 'uz' ? 'Saqlash' : 'Сохранить'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
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
    deleteWrap: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.62)',
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
    },
    modalScroll: {
        marginBottom: 20,
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
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        marginBottom: 40,
    },
    submitButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default PillReminderScreen;
