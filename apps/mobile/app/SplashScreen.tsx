import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

const SplashScreen = () => {
    const router = useRouter();

    useEffect(() => {
        const timer = setTimeout(() => {
            router.replace('/(tabs)');
        }, 3000);

        return () => clearTimeout(timer);
    }, []);
    return (
        <View style={styles.container}>
            <Text style={styles.text}>ShifoYo'l</Text>
            <ActivityIndicator size="large" color="#ffffff" style={styles.spinner} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#09090b', // Zinc-950
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    spinner: {
        position: 'absolute',
        bottom: 50,
    },
});

export default SplashScreen;
