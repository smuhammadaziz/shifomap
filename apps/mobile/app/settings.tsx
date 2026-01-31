import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
    const router = useRouter();
    const [toggles, setToggles] = useState({
        appointments: true,
        pills: true,
        general: false,
    });

    const toggleSwitch = (key: keyof typeof toggles) => {
        setToggles(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <TouchableOpacity>
                    <Ionicons name="notifications-outline" size={24} color="#ffffff" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* User Mini Card */}
                <View style={styles.userCard}>
                    <Image source={{ uri: 'https://i.pravatar.cc/150?u=aziz' }} style={styles.avatar} />
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>Aziz Rahmad</Text>
                        <View style={styles.badgeContainer}>
                            <Text style={styles.badgeText}>Patient account</Text>
                        </View>
                    </View>
                </View>

                {/* Account Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>ACCOUNT SETTINGS</Text>
                    <View style={styles.card}>
                        <SettingItem icon="person-circle-outline" label="Edit Profile" />
                        <SettingItem icon="document-text-outline" label="Personal Information" />
                        <SettingItem icon="globe-outline" label="Language" value="English" />
                    </View>
                </View>

                {/* Notifications */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>NOTIFICATIONS</Text>
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <View style={[styles.iconBox, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                                    <Ionicons name="calendar-outline" size={20} color="#22c55e" />
                                </View>
                                <Text style={styles.rowLabel}>Appointment reminders</Text>
                            </View>
                            <Switch
                                value={toggles.appointments}
                                onValueChange={() => toggleSwitch('appointments')}
                                trackColor={{ false: '#3f3f46', true: '#8b5cf6' }}
                                thumbColor={'#ffffff'}
                            />
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <View style={[styles.iconBox, { backgroundColor: 'rgba(167, 139, 250, 0.1)' }]}>
                                    <Ionicons name="medical-outline" size={20} color="#a78bfa" />
                                </View>
                                <Text style={styles.rowLabel}>Pill reminders</Text>
                            </View>
                            <Switch
                                value={toggles.pills}
                                onValueChange={() => toggleSwitch('pills')}
                                trackColor={{ false: '#3f3f46', true: '#8b5cf6' }}
                                thumbColor={'#ffffff'}
                            />
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <View style={[styles.iconBox, { backgroundColor: 'rgba(113, 113, 122, 0.1)' }]}>
                                    <Ionicons name="notifications-outline" size={20} color="#a1a1aa" />
                                </View>
                                <Text style={styles.rowLabel}>General notifications</Text>
                            </View>
                            <Switch
                                value={toggles.general}
                                onValueChange={() => toggleSwitch('general')}
                                trackColor={{ false: '#3f3f46', true: '#8b5cf6' }}
                                thumbColor={'#ffffff'}
                            />
                        </View>
                    </View>
                </View>

                {/* Health & Security */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>HEALTH & SECURITY</Text>
                    <View style={styles.card}>
                        <SettingItem icon="alarm-outline" label="Pill reminder settings" />
                        <SettingItem icon="shield-checkmark-outline" label="Privacy Policy" />
                        <SettingItem icon="lock-closed-outline" label="Change password" />
                    </View>
                </View>

                {/* Support */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>SUPPORT</Text>
                    <View style={styles.card}>
                        <SettingItem icon="help-circle-outline" label="Help & Support" isExternal />
                        <SettingItem icon="mail-outline" label="Contact us" />
                    </View>
                </View>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutButton}>
                    <Ionicons name="log-out-outline" size={20} color="#a1a1aa" style={{ marginRight: 8 }} />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Version 2.4.1 (Stable Build)</Text>
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const SettingItem = ({ icon, label, value, isExternal }: { icon: string; label: string; value?: string; isExternal?: boolean }) => (
    <>
        <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
                <View style={styles.iconBox}>
                    <Ionicons name={icon as any} size={20} color="#a78bfa" />
                </View>
                <Text style={styles.rowLabel}>{label}</Text>
            </View>
            <View style={styles.rowRight}>
                {value && <Text style={styles.valueText}>{value}</Text>}
                <Ionicons name={isExternal ? "open-outline" : "chevron-forward"} size={18} color="#52525b" />
            </View>
        </TouchableOpacity>
        <View style={styles.divider} />
    </>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#09090b' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
    content: { flex: 1, paddingHorizontal: 20 },
    userCard: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
    avatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#27272a' },
    userInfo: { marginLeft: 16 },
    userName: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
    badgeContainer: { backgroundColor: '#2e1065', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 4, alignSelf: 'flex-start' },
    badgeText: { color: '#a78bfa', fontSize: 12, fontWeight: '600' },
    section: { marginBottom: 24 },
    sectionHeader: { color: '#a1a1aa', fontSize: 12, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
    card: { backgroundColor: '#18181b', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#27272a' },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    rowLeft: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(167, 139, 250, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    rowLabel: { color: '#ffffff', fontSize: 15, fontWeight: '500' },
    rowRight: { flexDirection: 'row', alignItems: 'center' },
    valueText: { color: '#a1a1aa', fontSize: 14, marginRight: 8 },
    divider: { height: 1, backgroundColor: '#27272a', marginLeft: 64 },
    logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 10, paddingBottom: 6 },
    logoutText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
    versionText: { textAlign: 'center', color: '#52525b', fontSize: 12, marginTop: 10 },
});
