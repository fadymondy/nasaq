import { useEffect, useRef } from "react";
import { AccessibilityInfo, ActivityIndicator, Animated, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import { useNasaq } from "./provider";

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  /** Fully round (avatars, dots). */
  circle?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** A placeholder block that pulses (still when the OS asks for reduced motion). Hidden from screen readers. */
export function Skeleton({ width = "100%", height = 16, circle, style }: SkeletonProps) {
  const nq = useNasaq();
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!live || reduce) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    return () => {
      live = false;
      loop?.stop();
    };
  }, [pulse]);
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: circle ? height / 2 : nq.radius.control, backgroundColor: nq.colors.surfaceSoft, opacity: pulse }, style]}
    />
  );
}

/** A token-coloured activity indicator (splash, buttons, lists). */
export function Spinner({ size = "small", label }: { size?: "small" | "large"; label?: string }) {
  const nq = useNasaq();
  return <ActivityIndicator size={size} color={nq.colors.action} accessibilityLabel={label ?? (nq.script === "arabic" ? "جارٍ التحميل" : "Loading")} />;
}
