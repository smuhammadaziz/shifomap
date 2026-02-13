import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, LayoutChangeEvent, Animated } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/theme-store';
import { getColors } from '../../lib/theme';

const NUM_TABS = 3;

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const theme = useThemeStore((s) => s.theme);
    const colors = getColors(theme);
    const [dimensions, setDimensions] = useState({ height: 20, width: 100 });

    const tabPositionX = useRef(new Animated.Value(0)).current;
    const labelOpacities = useRef(
        Array.from({ length: NUM_TABS }, () => new Animated.Value(0))
    ).current;

    const buttonWidth = dimensions.width / state.routes.length;

    const onTabbarLayout = (e: LayoutChangeEvent) => {
        setDimensions({
            height: e.nativeEvent.layout.height,
            width: e.nativeEvent.layout.width,
        });
    };

    useEffect(() => {
        Animated.spring(tabPositionX, {
            toValue: state.index * buttonWidth,
            useNativeDriver: true,
            damping: 15,
            stiffness: 80,
        }).start();
    }, [state.index, buttonWidth, tabPositionX]);

    useEffect(() => {
        state.routes.forEach((_, index) => {
            Animated.timing(labelOpacities[index], {
                toValue: state.index === index ? 1 : 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        });
    }, [state.index, state.routes]);

    return (
        <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom }]}>
            <View style={[styles.tabBar, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]} onLayout={onTabbarLayout}>
                <Animated.View
                    style={[
                        styles.activeTabBackground,
                        {
                            backgroundColor: colors.primary,
                            width: buttonWidth - 10,
                            transform: [{ translateX: tabPositionX }]
                        },
                    ]}
                />
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const label =
                        options.tabBarLabel !== undefined
                            ? options.tabBarLabel
                            : options.title !== undefined
                                ? options.title
                                : route.name;

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

                    const onLongPress = () => {
                        navigation.emit({
                            type: 'tabLongPress',
                            target: route.key,
                        });
                    };

                    let IconComponent: any = Ionicons;
                    let iconName: any = 'home-outline';

                    if (route.name === 'index') {
                        iconName = isFocused ? 'home' : 'home-outline';
                    } else if (route.name === 'appointments') {
                        iconName = isFocused ? 'calendar' : 'calendar-outline';
                    } else if (route.name === 'pill-reminder') {
                        IconComponent = MaterialCommunityIcons;
                        iconName = isFocused ? 'pill' : 'pill';
                    }

                    return (
                        <TouchableOpacity
                            key={route.key}
                            accessibilityRole="button"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            accessibilityLabel={options.tabBarAccessibilityLabel}
                            testID={(options as any).tabBarTestID}
                            onPress={onPress}
                            onLongPress={onLongPress}
                            style={styles.tabItem}
                            activeOpacity={0.7}
                        >
                            <IconComponent
                                name={iconName}
                                size={22}
                                color={isFocused ? '#ffffff' : colors.textSecondary}
                            />
                            <Animated.Text
                                style={[
                                    styles.tabLabel,
                                    { opacity: labelOpacities[index], display: isFocused ? 'flex' : 'none' }
                                ]}
                            >
                                {label as string}
                            </Animated.Text>
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
    },
    tabBar: {
        flexDirection: 'row',
        height: 65,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 5,
        overflow: 'hidden',
    },
    activeTabBackground: {
        position: 'absolute',
        height: '100%',
        borderRadius: 40,
        left: 5,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        zIndex: 10,
        flexDirection: 'row',
        gap: 6
    },
    tabLabel: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    }
});
