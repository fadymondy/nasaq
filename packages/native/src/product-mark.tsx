import { type BrandKey, BRANDS, markGeometry, type MarkSpec, resolveBrand } from "@nasaq/brands";
import { View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { useNasaq } from "./provider";

/** Below this size the accent cube stops reading and is drawn in the body colour. */
export const MARK_ACCENT_MIN_SIZE = 20;

export interface ProductMarkProps {
  /** Brand key or legacy alias. Defaults to the provider's brand. */
  brand?: BrandKey | (string & {});
  /** Or pass a MarkSpec directly (previews of unreleased marks). */
  mark?: MarkSpec;
  size?: number;
  /** Force the on-dark body. Defaults to the provider scheme. */
  onDark?: boolean;
  /** Accessible name. Defaults to the brand name; pass "" when a visible name sits beside it. */
  title?: string;
}

/**
 * A brand's cube-lattice mark from its MarkSpec. Never recoloured, mirrored or transformed, so never
 * give it `flip`. SVG geometry ignores layout direction, so RTL does not flip it either.
 */
export function ProductMark({ brand, mark: markProp, size = 24, onDark, title }: ProductMarkProps) {
  const nq = useNasaq();
  const mark = markProp ?? (brand ? resolveBrand(brand)?.mark : nq.brand.mark) ?? BRANDS.nasaq.mark;
  const body = (onDark ?? nq.scheme === "dark") ? (mark.bodyOnDark ?? mark.body) : mark.body;
  const showAccent = size >= MARK_ACCENT_MIN_SIZE;
  const { unit, rects } = markGeometry(mark);
  const label = title ?? mark.name;

  return (
    <View
      accessible={!!label}
      accessibilityRole={label ? "image" : undefined}
      accessibilityLabel={label || undefined}
      importantForAccessibility={label ? "yes" : "no-hide-descendants"}
      style={{ width: size, height: size }}
    >
      <Svg viewBox="0 0 100 100" width={size} height={size}>
        {rects.map(({ x, y, accent }) => (
          <Rect key={`${x},${y}`} x={x} y={y} width={unit} height={unit} fill={accent && showAccent ? mark.accent : body} />
        ))}
      </Svg>
    </View>
  );
}
