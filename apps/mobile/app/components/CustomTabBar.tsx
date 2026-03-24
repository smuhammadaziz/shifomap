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

    const buttonWidth = dimensions.width / state.routes.length;

    const onTabbarLayout = (e: LayoutChangeEvent) => {
        setDimensions({
            height: e.nativeEvent.layout.height,
            width: e.nativeEvent.layout.width,
        });
    };

    useEffect(() => {
        if (buttonWidth > 0) {
            Animated.spring(tabPositionX, {
                toValue: state.index * buttonWidth,
                useNativeDriver: true,
                damping: 20,
                stiffness: 150,
            }).start();
        }
    }, [state.index, buttonWidth, tabPositionX]);

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
                
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const isFocused = state.index === index;

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
                    } else if (route.name === 'pill-reminder') {
                        IconComponent = MaterialCommunityIcons;
                        iconName = isFocused ? 'pill' : 'pill';
                    } else if (route.name === 'profile') {
                        iconName = 'person';
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
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'transparent',
        paddingHorizontal: 24,
    },
    tabBar: {
        flexDirection: 'row',
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 10,
        overflow: 'hidden',
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
});
