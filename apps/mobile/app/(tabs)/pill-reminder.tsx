import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { getTranslations } from '../../lib/translations';
import { getColors } from '../../lib/theme';

const PillReminderScreen = () => {
    const language = useAuthStore((s) => s.language) ?? 'uz';
    const theme = useThemeStore((s) => s.theme);
    const t = getTranslations(language);
    const colors = getColors(theme);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View style={[styles.iconWrap, { backgroundColor: colors.primaryBg }]}>
                        <Ionicons name="medical-outline" size={22} color={colors.primary} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={[styles.title, { color: colors.text }]}>{t.pillReminders}</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t.pillsRemaining}</Text>
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.dailyMeds}</Text>

                <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                    <View style={styles.cardRow}>
                        <View style={[styles.pillDot, { backgroundColor: colors.primary }]} />
                        <View style={styles.cardBody}>
                            <Text style={[styles.pillName, { color: colors.text }]}>Vitamin D3</Text>
                            <Text style={[styles.pillMeta, { color: colors.textSecondary }]}>1 tablet • 1000 IU</Text>
                        </View>
                        <View style={styles.timePill}>
                            <Ionicons name="time-outline" size={16} color={colors.textTertiary} />
                            <Text style={[styles.timeText, { color: colors.textTertiary }]}>08:00</Text>
                        </View>
                    </View>
                </View>

                <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                    <View style={styles.cardRow}>
                        <View style={[styles.pillDot, { backgroundColor: colors.success }]} />
                        <View style={styles.cardBody}>
                            <Text style={[styles.pillName, { color: colors.text }]}>Amoxicillin</Text>
                            <Text style={[styles.pillMeta, { color: colors.textSecondary }]}>1 capsule • 500 mg</Text>
                        </View>
                        <View style={styles.timePill}>
                            <Ionicons name="time-outline" size={16} color={colors.textTertiary} />
                            <Text style={[styles.timeText, { color: colors.textTertiary }]}>13:00</Text>
                        </View>
                    </View>
                </View>

                <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                    <View style={styles.cardRow}>
                        <View style={[styles.pillDot, { backgroundColor: colors.warning }]} />
                        <View style={styles.cardBody}>
                            <Text style={[styles.pillName, { color: colors.text }]}>Magnesium</Text>
                            <Text style={[styles.pillMeta, { color: colors.textSecondary }]}>1 tablet • 250 mg</Text>
                        </View>
                        <View style={styles.timePill}>
                            <Ionicons name="time-outline" size={16} color={colors.textTertiary} />
                            <Text style={[styles.timeText, { color: colors.textTertiary }]}>21:00</Text>
                        </View>
                    </View>
                </View>

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
