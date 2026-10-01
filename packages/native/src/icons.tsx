import Svg, { Circle, Path } from "react-native-svg";

export type IconName = "chevron-right" | "chevron-down" | "close" | "check" | "eye" | "eye-off" | "navigate" | "alert" | "inbox" | "clock";

const PATHS: Record<IconName, string[]> = {
  "chevron-right": ["M9 6l6 6-6 6"],
  "chevron-down": ["M6 9l6 6 6-6"],
  close: ["M6 6l12 12M18 6L6 18"],
  check: ["M5 12.5l4.5 4.5L19 7.5"],
  eye: ["M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"],
  "eye-off": ["M3 3l18 18", "M10.6 6.2A9.8 9.8 0 0112 6c6.4 0 10 6 10 6a17 17 0 01-3 3.6M6.6 6.9C3.8 8.7 2 12 2 12s3.6 6 10 6a9.6 9.6 0 003.6-.7"],
  navigate: ["M12 3l7 17-7-4-7 4 7-17z"],
  alert: ["M12 8v5M12 16.5v.5", "M10.3 4.2L2.8 17.5A2 2 0 004.5 20.5h15a2 2 0 001.7-3L13.7 4.2a2 2 0 00-3.4 0z"],
  inbox: ["M3 13l3-8h12l3 8v6H3v-6z", "M3 13h5l1 3h6l1-3h5"],
  clock: ["M12 7v5l3 2"],
};

export interface IconProps {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}

/**
 * The few glyphs the kit itself draws. Decorative (hidden from screen readers); the control that holds one
 * carries the label. Directional glyphs (chevron-right, navigate) are mirrored by the caller with `flip`.
 */
export function Icon({ name, size = 20, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {name === "clock" ? <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={strokeWidth} /> : null}
      {name === "eye" ? <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={strokeWidth} /> : null}
      {PATHS[name].map((d) => (
        <Path key={d} d={d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
}
