import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

const ProfileDashboard = () => {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile Dashboard</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                {/* User Info */}
                <View style={styles.userSection}>
                    <View style={styles.avatarContainer}>
                        <Image source={{ uri: 'https://i.pravatar.cc/150?u=a' }} style={styles.avatar} />
                        <View style={styles.onlineBadge} />
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>Alex Morgan</Text>
                        <View style={styles.premiumTag}>
                            <FontAwesome5 name="crown" size={12} color="#8b5cf6" style={{ marginRight: 6 }} />
                            <Text style={styles.premiumText}>Premium Member</Text>
                        </View>
                    </View>
                </View>

                {/* Up Next Card */}
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Up Next</Text>
                    <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
                </View>

                <View style={styles.upNextCard}>
                    <View style={styles.upNextHeader}>
                        <View style={styles.consultationTag}>
                            <Text style={styles.consultationText}>CONSULTATION</Text>
                        </View>
                        <TouchableOpacity style={styles.videoButton}>
                            <Ionicons name="videocam" size={20} color="#ffffff" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.timeText}>10:00 AM</Text>
                    <Text style={styles.dateText}>Today, Oct 24</Text>

                    <View style={styles.doctorRow}>
                        <Image source={{ uri: 'https://i.pravatar.cc/150?u=dr' }} style={styles.doctorAvatar} />
                        <View style={styles.doctorInfo}>
                            <Text style={styles.doctorName}>Dr. Sarah Jenkins</Text>
                            <Text style={styles.doctorSpecialty}>Cardiologist</Text>
                        </View>
                    </View>
                </View>

                {/* Visit History Button */}
                <TouchableOpacity style={styles.historyCard}>
                    <View style={styles.historyIconBox}>
                        <Ionicons name="time-outline" size={24} color="#ffffff" />
                    </View>
                    <View style={styles.historyInfo}>
                        <Text style={styles.historyTitle}>Visit History</Text>
                        <Text style={styles.historySubtitle}>View past consultations & notes</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#a1a1aa" />
                </TouchableOpacity>

                {/* Daily Meds */}
                <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 16 }]}>Daily Meds</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.medsScroll}>
                    <MedCard
                        name="Vitamin D"
                        schedule="8:00 AM • Taken"
                        icon="capsules"
                        color="#22c55e"
                        bgColor="rgba(34, 197, 94, 0.1)"
                    />
                    <MedCard
                        name="Amoxicillin"
                        schedule="2:00 PM • Upcoming"
                        icon="pills"
                        color="#f97316"
                        bgColor="rgba(249, 115, 22, 0.1)"
                    />
                    <MedCard
                        name="Iron Supp"
                        schedule="8:00 PM • Upcoming"
                        icon="glass-whiskey"
                        color="#3b82f6"
                        bgColor="rgba(59, 130, 246, 0.1)"
                    />
                </ScrollView>

                {/* Settings Links */}
                <View style={styles.settingsGroup}>
                    <TouchableOpacity
                        style={styles.settingRow}
                        onPress={() => router.push('/settings')}
                    >
                        <Ionicons name="settings-outline" size={22} color="#a1a1aa" style={styles.settingIcon} />
                        <Text style={styles.settingLabel}>Settings</Text>
                        <Ionicons name="chevron-forward" size={20} color="#52525b" />
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.settingRow}>
                        <Ionicons name="card-outline" size={22} color="#a1a1aa" style={styles.settingIcon} />
                        <Text style={styles.settingLabel}>Payment Methods</Text>
                        <Ionicons name="chevron-forward" size={20} color="#52525b" />
                    </TouchableOpacity>
                </View>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutButton}>
                    <Ionicons name="log-out-outline" size={20} color="#ef4444" style={{ marginRight: 8 }} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
};

const MedCard = ({ name, schedule, icon, color, bgColor }: any) => (
    <View style={styles.medCard}>
        <View style={[styles.medIconBox, { backgroundColor: bgColor }]}>
            <FontAwesome5 name={icon} size={18} color={color} />
        </View>
        <Text style={styles.medName}>{name}</Text>
        <Text style={[styles.medSchedule, { color: color }]}>{schedule}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#09090b' },
    content: { flex: 1, padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingHorizontal: 20, paddingVertical: 15 },
    backButton: { padding: 4 },
    headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
    headerRight: { color: '#a1a1aa', fontSize: 14 },

    userSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
    avatarContainer: { position: 'relative' },
    avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#27272a' },
    onlineBadge: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#09090b' },
    userInfo: { marginLeft: 16 },
    userName: { color: '#ffffff', fontSize: 22, fontWeight: 'bold' },
    premiumTag: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    premiumText: { color: '#8b5cf6', fontSize: 14, fontWeight: '600' },

    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { color: '#a1a1aa', fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    seeAll: { color: '#8b5cf6', fontSize: 14 },

    upNextCard: {
        backgroundColor: '#18181b',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#27272a',
        marginBottom: 16,
    },
    upNextHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    consultationTag: { backgroundColor: 'rgba(139, 92, 246, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    consultationText: { color: '#a78bfa', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
    videoButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2e1065', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#4c1d95' },
    timeText: { color: '#ffffff', fontSize: 32, fontWeight: 'bold', letterSpacing: -1 },
    dateText: { color: '#a1a1aa', fontSize: 14, marginBottom: 20 },
    doctorRow: { flexDirection: 'row', alignItems: 'center' },
    doctorAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
    doctorInfo: { justifyContent: 'center' },
    doctorName: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
    doctorSpecialty: { color: '#a1a1aa', fontSize: 12 },

    historyCard: {
        backgroundColor: '#18181b',
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#27272a'
    },
    historyIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#27272a', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    historyInfo: { flex: 1 },
    historyTitle: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
    historySubtitle: { color: '#a1a1aa', fontSize: 12, marginTop: 2 },

    medsScroll: { paddingRight: 20 },
    medCard: {
        backgroundColor: '#18181b',
        width: 130,
        padding: 16,
        borderRadius: 20,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#27272a'
    },
    medIconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    medName: { color: '#ffffff', fontSize: 14, fontWeight: '600', marginBottom: 4 },
    medSchedule: { fontSize: 10, fontWeight: '500' },

    settingsGroup: {
        marginTop: 30,
        backgroundColor: '#18181b',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#27272a',
        overflow: 'hidden'
    },
    settingRow: { flexDirection: 'row', alignItems: 'center', padding: 18 },
    settingIcon: { marginRight: 16 },
    settingLabel: { flex: 1, color: '#ffffff', fontSize: 16 },
    divider: { height: 1, backgroundColor: '#27272a', marginLeft: 56 },

    logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 40, marginBottom: 40 },
    logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },

});

export default ProfileDashboard;
