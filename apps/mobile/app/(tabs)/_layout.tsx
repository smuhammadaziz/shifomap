import React from 'react';
import { Tabs } from 'expo-router';
import CustomTabBar from '../components/CustomTabBar';

export default function TabLayout() {
    return (
        <Tabs
            key={new Date().toISOString()}
            tabBar={props => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home'
                }}
            />
            <Tabs.Screen
                name="appointments"
                options={{
                    title: 'Schedule',
                }}
            />
            <Tabs.Screen
                name="pill-reminder"
                options={{
                    title: 'Pills',
                }}
            />
        </Tabs>
    );
}
