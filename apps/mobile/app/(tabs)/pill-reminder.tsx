import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/theme-store';
import { getColors } from '../../lib/theme';

const PillReminderScreen = () => {
    const theme = useThemeStore((s) => s.theme);
    const colors = getColors(theme);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={[styles.text, { color: colors.text }]}>Pills</Text>
            <Text style={[styles.subText, { color: colors.textSecondary }]}>Manage your medication schedule here.</Text>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    subText: {
        fontSize: 16,
        marginTop: 8,
    },
});

export default PillReminderScreen;
