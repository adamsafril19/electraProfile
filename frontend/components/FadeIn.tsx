import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform } from 'react-native';

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  // Jarak geser awal (px); positif = muncul dari bawah
  distance?: number;
  duration?: number;
  style?: any;
}

// Animasi masuk ringan. Menghormati preferensi "kurangi gerakan" di web.
export const FadeIn: React.FC<FadeInProps> = ({ children, delay = 0, distance = 14, duration = 480, style }) => {
  const reduce =
    Platform.OS === 'web' && typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const progress = useRef(new Animated.Value(reduce ? 1 : 0)).current;

  useEffect(() => {
    if (reduce) return;
    Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [progress, delay, duration, reduce]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};
