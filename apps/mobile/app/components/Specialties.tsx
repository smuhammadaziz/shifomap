import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const categories = [
    { name: 'Diagnostics', icon: 'pulse' },
    { name: 'Dentist', icon: 'medkit' },
    { name: 'Cardiology', icon: 'heart' },
    { name: 'Neurology', icon: 'headset' },
];

const Specialties = () => {
    return (
        <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Quick Categories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {categories.map((item, index) => (
                    <TouchableOpacity key={index} style={[styles.chip, index === 0 && styles.chipActive]}>
                        <Ionicons
                            name={item.icon as any}
                            size={20}
                            color={index === 0 ? '#ffffff' : '#a1a1aa'}
                            style={styles.chipIcon}
                        />
                        <Text style={[styles.chipText, index === 0 && styles.chipTextActive]}>{item.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    sectionContainer: { marginTop: 24, paddingHorizontal: 0 },
    sectionTitle: { color: '#a1a1aa', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 15, paddingHorizontal: 20 },
    scrollContent: { paddingHorizontal: 20 },
    chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, marginRight: 12, borderWidth: 1, borderColor: '#27272a' },
    chipActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
    chipIcon: { marginRight: 8 },
    chipText: { color: '#a1a1aa', fontSize: 14, fontWeight: '500' },
    chipTextActive: { color: '#ffffff' },
});

export default Specialties;
