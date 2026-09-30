# @nasaq/native

Nasaq for React Native (Expo 57 / RN 0.86+). Plain `StyleSheet` and a `useNasaq()` context; no styling
runtime. Colours, spacing, radii, densities and type metrics come from `@nasaq/tokens`, so a phone and the web
read the same values.

## Install

```sh
pnpm add @nasaq/native react-native-svg
# optional: haptics on press
npx expo install expo-haptics
```

## Quick start

```tsx
import { Button, NasaqProvider, ProductMark, Screen, Text } from "@nasaq/native";
import * as Updates from "expo-updates";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function App() {
  return (
    <NasaqProvider brand="mahaam" locale="ar" fonts={{ arabic: "Lusail", latin: "Inter" }}
      onDirectionChangeRequiresReload={() => Updates.reloadAsync()}>
      <Home />
    </NasaqProvider>
  );
}

function Home() {
  const insets = useSafeAreaInsets();
  return (
    <Screen scroll insets={insets}>
      <ProductMark size={32} />
      <Text variant="h1">مرحبًا</Text>
      <Button variant="primary" onPress={() => {}}>متابعة</Button>
    </Screen>
  );
}
```

## API

| Export | What it does |
| --- | --- |
| `NasaqProvider` | `brand`, `scheme` (omit to follow the OS), `expression` (default `native`), `density`, `locale`, `direction`, `fonts`, `onDirectionChangeRequiresReload`. Paints the ground colour. |
| `useNasaq()` | The resolved theme: `colors` (camelCase theme tokens plus `brand`, `action`, `onAction`), `space`, `radius`, `size` (density), `isRtl`, `script`, `fonts`, `flip`. |
| `Text` | `variant` = display, h1–h3, body, body-sm, label, caption, eyebrow, code. `tone` = default, body, muted, accent, success, warning, danger, info. Metrics follow the script (Arabic runs larger and looser); `maxFontSizeMultiplier` defaults to 1.4. Headings get `accessibilityRole="header"`. |
| `Button` | `variant` primary, secondary (default), ghost, danger; `size` md (at least 44pt tall) or sm (shorter, hit area extended to 44pt); `loading`; `icon`; `haptic` (default true). |
| `Screen` | Ground colour, the density's page padding and safe-area `insets`; `scroll`, `bleed`. |
| `ProductMark` | A brand's cube-lattice mark via react-native-svg. Never mirrored or recoloured; the accent cube drops below 20pt. |
| `useHaptics()` | `impact`, `notify`, `selection`, `available`. A no-op on web and when expo-haptics is absent. |
| `resolveTheme()`, `textMetrics()` | The same values outside React (navigation themes, splash screens). |

## RTL

React Native fixes the layout direction at launch. When the locale's direction differs from the running one,
the provider calls `I18nManager.allowRTL(true)` and `forceRTL(...)` and then `onDirectionChangeRequiresReload`:
reload there (expo-updates `reloadAsync`, `DevSettings.reload`) or the change applies on the next launch. On
web (react-native-web) the provider writes `dir` and `lang` instead, which applies at once.

Directional icons (arrows, chevrons, back) take `useNasaq().flip`, which mirrors them in RTL. Marks, logos,
media controls and numbers are never flipped.

## Lab

Stories live under **Native/** in the lab and render through react-native-web with the toolbar's brand, theme,
locale, density and expression.
