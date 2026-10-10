import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import { radius, useTheme } from "../theme";

/** A pulsing placeholder. Holds still when the user has asked for reduced motion. */
export function Skeleton({ width = "100%", height = 16, style }: { width?: DimensionValue; height?: number; style?: StyleProp<ViewStyle> }) {
  const { scheme } = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;
  const [still, setStill] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((r) => alive && setStill(r));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, still]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius.md, backgroundColor: scheme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", opacity: still ? 0.7 : opacity }, style]}
    />
  );
}
