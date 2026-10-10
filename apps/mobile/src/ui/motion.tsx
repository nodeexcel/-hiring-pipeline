import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

/** True when the phone asks for reduced motion; every animation here then jumps straight to its end state. */
export function useReduceMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((r) => alive && setReduced(r)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

/** Animates a 0..1 value toward `to`. Returns the value so callers can interpolate colours or sizes. */
export function useTween(to: number, duration = 180) {
  const reduced = useReduceMotion();
  const value = useRef(new Animated.Value(to)).current;
  useEffect(() => {
    if (reduced) return value.setValue(to);
    Animated.timing(value, { toValue: to, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [to, duration, reduced, value]);
  return value;
}

/** Fades and lifts its children in whenever `trigger` changes (and on mount). `delay` staggers siblings. */
export function Reveal({
  trigger,
  delay = 0,
  distance = 8,
  style,
  children,
}: {
  trigger?: string | number;
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const reduced = useReduceMotion();
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return value.setValue(1);
    value.setValue(0);
    const run = Animated.timing(value, { toValue: 1, duration: 240, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    run.start();
    return () => run.stop();
  }, [trigger, delay, reduced, value]);
  return (
    <Animated.View style={[{ opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** A Pressable that sinks slightly under the finger. Layout styles pass straight through. */
export function PressableScale({
  style,
  scaleTo = 0.97,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: Omit<PressableProps, "style"> & { style?: StyleProp<ViewStyle>; scaleTo?: number }) {
  const reduced = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const to = useCallback(
    (v: number) => {
      if (reduced) return;
      Animated.spring(scale, { toValue: v, speed: 40, bounciness: 0, useNativeDriver: true }).start();
    },
    [reduced, scale],
  );
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled) to(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale }] }]}
    />
  );
}
