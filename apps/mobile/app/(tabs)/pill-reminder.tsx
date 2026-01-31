import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PillReminderScreen = () => {
    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.text}>Pills</Text>
            <Text style={styles.subText}>Manage your medication schedule here.</Text>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#09090b',
    },
    text: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    subText: {
        fontSize: 16,
        color: '#a1a1aa',
        marginTop: 8,
    },
});

export default PillReminderScreen;
