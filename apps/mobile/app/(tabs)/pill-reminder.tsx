import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, TextInput, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { getTranslations } from '../../lib/translations';
import { getColors } from '../../lib/theme';
import { getMyPrescriptions, getCustomReminders, addCustomReminder, deleteCustomReminder, type PrescriptionCard, type CustomReminder } from '../../lib/api';
import { useRouter } from 'expo-router';

const PillReminderScreen = () => {
    const language = useAuthStore((s) => s.language) ?? 'uz';
    const theme = useThemeStore((s) => s.theme);
    const t = getTranslations(language);
    const colors = getColors(theme);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [list, setList] = useState<PrescriptionCard[]>([]);
    const [customList, setCustomList] = useState<CustomReminder[]>([]);
    
    // Form State
    const [modalVisible, setModalVisible] = useState(false);
    const [pillName, setPillName] = useState('');
    const [pillTime, setPillTime] = useState('09:00');
    const [pillNotes, setPillNotes] = useState('');
    const [pillTimesPerDay, setPillTimesPerDay] = useState(1);
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
        } catch {
            setList([]);
            setCustomList([]);
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
        setSubmitting(true);
        try {
            await addCustomReminder({
                pillName: pillName.trim(),
                time: pillTime,
                notes: pillNotes.trim() || null,
                timesPerDay: pillTimesPerDay
            });
            setModalVisible(false);
            setPillName('');
            setPillNotes('');
            setPillTime('09:00');
            setPillTimesPerDay(1);
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
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
            >
                <View style={styles.header}>
                    <View style={[styles.iconWrap, { backgroundColor: colors.primaryBg }]}>
                        <Ionicons name="medical-outline" size={22} color={colors.primary} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={[styles.title, { color: colors.text }]}>{t.pillReminders}</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t.myPrescriptions}</Text>
                    </View>
                    <TouchableOpacity 
                        style={[styles.addButton, { backgroundColor: colors.primary }]}
                        onPress={() => setModalVisible(true)}
                    >
                        <Ionicons name="add" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

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
                        {customList.map((c) => (
                            <View
                                key={c.id}
                                style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                            >
                                <View style={styles.cardRow}>
                                    <View style={[styles.iconMini, { backgroundColor: colors.primaryBg }]}>
                                        <Ionicons name="notifications-outline" size={16} color={colors.primary} />
                                    </View>
                                    <View style={styles.cardBody}>
                                        <Text style={[styles.pillName, { color: colors.text }]} numberOfLines={1}>
                                            {c.pillName}
                                        </Text>
                                        <Text style={[styles.pillMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                                            {c.time} • {c.timesPerDay} {language === 'uz' ? 'marta/kun' : 'раз/день'}
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={() => handleDelete(c.id)}>
                                        <Ionicons name="trash-outline" size={18} color="#FF4D4D" />
                                    </TouchableOpacity>
                                </View>
                                {c.notes && (
                                    <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                                        {c.notes}
                                    </Text>
                                )}
                            </View>
                        ))}
                    </>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.backgroundCard }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {language === 'uz' ? 'Yangi eslatma' : 'Новое напоминание'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll}>
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

                            <View style={styles.rowInputs}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                                        {language === 'uz' ? 'Vaqti (m: 09:00)' : 'Время (н: 09:00)'}
                                    </Text>
                                    <TextInput
                                        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                                        value={pillTime}
                                        onChangeText={setPillTime}
                                        placeholder="08:30"
                                        placeholderTextColor={colors.textTertiary}
                                    />
                                </View>
                                <View style={{ width: 12 }} />
                                <View style={{ width: 100 }}>
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                                        {language === 'uz' ? 'Kunda' : 'В день'}
                                    </Text>
                                    <TextInput
                                        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                                        value={pillTimesPerDay.toString()}
                                        onChangeText={(v) => setPillTimesPerDay(parseInt(v) || 1)}
                                        keyboardType="number-pad"
                                        placeholder="1"
                                        placeholderTextColor={colors.textTertiary}
                                    />
                                </View>
                            </View>

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
                </View>
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
        gap: 12,
        marginTop: 6,
        marginBottom: 18,
    },
    iconWrap: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
    },
    subtitle: {
        marginTop: 4,
        fontSize: 13,
        fontWeight: '500',
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
        borderRadius: 18,
        borderWidth: 1,
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
    notesText: {
        marginTop: 8,
        fontSize: 13,
        fontStyle: 'italic',
        paddingLeft: 40,
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
