import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, LayoutChangeEvent, Animated } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/theme-store';
import { getColors } from '../../lib/theme';

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const theme = useThemeStore((s) => s.theme);
    const colors = getColors(theme);
    const [dimensions, setDimensions] = useState({ height: 20, width: 100 });

    const tabPositionX = useRef(new Animated.Value(0)).current;

    const arrangedRoutes = [
        state.routes.find(r => r.name === 'index'),
        state.routes.find(r => r.name === 'appointments'),
        { key: 'center-action', name: 'center-action' },
        { key: 'ai-chat-btn', name: 'ai-chat-btn' },
        state.routes.find(r => r.name === 'profile'),
    ].filter(Boolean) as any[];

    const buttonWidth = dimensions.width / arrangedRoutes.length;
    const visualIndex = arrangedRoutes.findIndex(r => r.name === state.routes[state.index]?.name);

    const onTabbarLayout = (e: LayoutChangeEvent) => {
        setDimensions({
            height: e.nativeEvent.layout.height,
            width: e.nativeEvent.layout.width,
        });
    };

    useEffect(() => {
        if (buttonWidth > 0 && visualIndex >= 0) {
            Animated.spring(tabPositionX, {
                toValue: visualIndex * buttonWidth,
                useNativeDriver: true,
                damping: 20,
                stiffness: 150,
            }).start();
        }
    }, [visualIndex, buttonWidth, tabPositionX]);

    return (
        <View style={[styles.tabBarContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={[styles.tabBar, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]} onLayout={onTabbarLayout}>
                {dimensions.width > 100 && (
                    <Animated.View
                        style={[
                            styles.activeTabIndicator,
                            {
                                width: buttonWidth,
                                transform: [{ translateX: tabPositionX }]
                            },
                        ]}
                    >
                        <View style={[styles.activeTabCircle, { backgroundColor: colors.primary }]} />
                    </Animated.View>
                )}
                
                {arrangedRoutes.map((route) => {
                    const isCenterAction = route.name === 'center-action';
                    const isAiChatBtn = route.name === 'ai-chat-btn';
                    const isFocused = !isCenterAction && !isAiChatBtn && state.routes[state.index]?.name === route.name;

                    if (isCenterAction) {
                        return (
                            <TouchableOpacity
                                key={route.key}
                                accessibilityRole="button"
                                onPress={() => navigation.navigate('pill-reminder')}
                                style={styles.tabItem}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.floatingActionCircle, { backgroundColor: colors.primary }]}>
                                    <Ionicons name="add" size={32} color="#ffffff" style={{ paddingLeft: 2 }} />
                                </View>
                            </TouchableOpacity>
                        );
                    }

                    if (isAiChatBtn) {
                         return (
                            <TouchableOpacity
                                key={route.key}
                                accessibilityRole="button"
                                onPress={() => navigation.navigate('ai-chat')}
                                style={styles.tabItem}
                                activeOpacity={0.8}
                            >
                                <Ionicons
                                    name="chatbubbles-outline"
                                    size={24}
                                    color={colors.textTertiary}
                                    style={{ zIndex: 1 }}
                                />
                            </TouchableOpacity>
                        );
                    }

                    const { options } = descriptors[route.key];

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name, route.params);
                        }
                    };

                    let IconComponent: any = Ionicons;
                    let iconName: any = 'home';

                    if (route.name === 'index') {
                        iconName = isFocused ? 'home' : 'home-outline';
                    } else if (route.name === 'appointments') {
                        iconName = isFocused ? 'calendar' : 'calendar-outline';
                    } else if (route.name === 'ai-chat') {
                        iconName = isFocused ? 'chatbubbles' : 'chatbubbles-outline';
                    } else if (route.name === 'profile') {
                        iconName = isFocused ? 'person' : 'person-outline';
                    }

                    return (
                        <TouchableOpacity
                            key={route.key}
                            accessibilityRole="button"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            accessibilityLabel={options.tabBarAccessibilityLabel}
                            testID={(options as any).tabBarTestID}
                            onPress={onPress}
                            style={styles.tabItem}
                            activeOpacity={0.8}
                        >
                            <IconComponent
                                name={iconName}
                                size={24}
                                color={isFocused ? '#ffffff' : colors.textTertiary}
                                style={{ zIndex: 1 }}
                            />
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    tabBarContainer: {
        position: 'absolute',
        bottom: 16,
        left: 20,
        right: 20,
        backgroundColor: 'transparent',
    },
    tabBar: {
        flexDirection: 'row',
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 10,
    },
    activeTabIndicator: {
        position: 'absolute',
        height: '100%',
        left: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeTabCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        zIndex: 10,
    },
    floatingActionCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -32, // pop out
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
        borderWidth: 4,
        borderColor: '#ffffff', // Or dynamic based on theme, ideally colors.backgroundCard
    },
});
