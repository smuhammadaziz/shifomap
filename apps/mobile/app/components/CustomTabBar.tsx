import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, LayoutChangeEvent, Animated, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const [dimensions, setDimensions] = useState({ height: 20, width: 100 });

    // Animated value for the sliding indicator
    const tabPositionX = useRef(new Animated.Value(0)).current;

    const buttonWidth = dimensions.width / state.routes.length;

    const onTabbarLayout = (e: LayoutChangeEvent) => {
        setDimensions({
            height: e.nativeEvent.layout.height,
            width: e.nativeEvent.layout.width,
        });
    };

    useEffect(() => {
        // Animate the indicator to the new position
        Animated.spring(tabPositionX, {
            toValue: state.index * buttonWidth,
            useNativeDriver: true,
            damping: 15,
            stiffness: 80,
        }).start();
    }, [state.index, buttonWidth]);

    return (
        <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom }]}>
            <View style={styles.tabBar} onLayout={onTabbarLayout}>
                <Animated.View
                    style={[
                        styles.activeTabBackground,
                        {
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

                    // Dedicated animated value for the label opacity
                    const labelOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

                    useEffect(() => {
                        Animated.timing(labelOpacity, {
                            toValue: isFocused ? 1 : 0,
                            duration: 200,
                            useNativeDriver: true,
                        }).start();
                    }, [isFocused]);

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
                                color={isFocused ? '#ffffff' : '#a1a1aa'}
                            />
                            {/* Always render the text but animate its opacity */}
                            <Animated.Text
                                style={[
                                    styles.tabLabel,
                                    { opacity: labelOpacity, display: isFocused ? 'flex' : 'none' }
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
        backgroundColor: '#18181b', // Zinc-950
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#27272a',
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 5,
        overflow: 'hidden',
    },
    activeTabBackground: {
        position: 'absolute',
        backgroundColor: '#7c3aed', // Violet-600
        height: '100%',
        borderRadius: 40,
        left: 5,
        // We can't use shadow easily on native driver animated view inside overflow hidden, 
        // so we rely on the background color pop.
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
