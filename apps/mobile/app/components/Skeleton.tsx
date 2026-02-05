import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  style?: ViewStyle;
  borderRadius?: number;
}

export function Skeleton({ width, height = 16, style, borderRadius = 8 }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.65, useNativeDriver: true, duration: 800 }),
        Animated.timing(opacity, { toValue: 0.35, useNativeDriver: true, duration: 800 }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View style={[styles.outer, { width: width ?? ('100%' as const), height, borderRadius, overflow: 'hidden' as const }, style]}>
      <Animated.View style={[StyleSheet.absoluteFillObject, styles.skeleton, { borderRadius, opacity }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {},
  skeleton: {
    backgroundColor: '#3f3f46',
  },
});

export default Skeleton;
