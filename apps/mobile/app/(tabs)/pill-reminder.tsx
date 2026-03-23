import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { getTranslations } from '../../lib/translations';
import { getColors } from '../../lib/theme';
import { getMyPrescriptions, type PrescriptionCard } from '../../lib/api';
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

    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const data = await getMyPrescriptions();
            setList(data);
        } catch {
            setList([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

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

                <View style={{ height: 24 }} />
            </ScrollView>
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
});

export default PillReminderScreen;
