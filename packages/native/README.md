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
| `Button` | `variant` primary, secondary (default), ghost, danger, success; `size` md (at least 44pt tall), sm (shorter, hit area extended to 44pt) or lg (52pt); `fullWidth`; `loading`; `icon`; `haptic`: `true` (light impact, default), `"success"` (notification) or `false`. |
| `Screen` | Ground colour, the density's page padding and safe-area `insets`; `scroll`, `bleed`. |
| `ProductMark` | A brand's cube-lattice mark via react-native-svg. Never mirrored or recoloured; the accent cube drops below 20pt. |
| `useHaptics()` | `impact`, `notify`, `selection`, `available`. A no-op on web and when expo-haptics is absent. |
| `resolveTheme()`, `textMetrics()` | The same values outside React (navigation themes, splash screens). |

## App components

All are token-driven, brand-aware through the provider, RTL-correct (start/end, direction-driven alignment, mirrored chevrons), dark-mode ready and at least 44pt to touch. Built-in strings (close, back, accept) default by script and can be overridden with `labels`.

| Export | Props that matter |
| --- | --- |
| `Card`, `CardHeader`, `CardContent`, `CardFooter` | `tone` default, success, warning, danger; `padded`; `onPress` makes the card a button. Header takes `title`, `description`, `action`. |
| `Input` | `label`, `error`, `hint`, `leading`, `trailing`, `multiline`, any TextInput prop. `secureTextEntry` adds a show/hide control. |
| `Badge` | `tone` neutral, success, warning, danger, info; `variant` soft or outline; `icon`. |
| `Notice` (`Alert`) | `tone`, `title`, `children`, `onDismiss`. Danger and warning are announced as alerts. |
| `SegmentedControl` | `value`, `onChange`, `options[{ value, label, icon? }]`. |
| `Sheet` | `visible`, `onClose`, `title`, `snapPoints` (fractions of the window, the largest is the max height), `bottomInset`. |
| `Switch` | `value`, `onValueChange`, `label`, `description`. |
| `ListRow`, `Separator` | `title`, `subtitle`, `leading`, `trailing`, `chevron` (mirrors in RTL), `onPress`. |
| `AppHeader` | `title`, `logo` (your own node), `canGoBack`, `onBack`, `trailing`, `topInset`. The back chevron points to the start edge. |
| `IconButton` | `accessibilityLabel` (required), `icon` (`bell`, ...) or `children` for your own icon, `count` (badge at the end-top corner, `99+` above `maxCount`). Put it in `AppHeader trailing`. |
| `useTabBarOptions()`, `tabBarOptions()` | Tab-bar `screenOptions` for expo-router / React Navigation: tints, surface, hairline, label font. |
| `useNasaqStatusBarStyle()` | `"light"` or `"dark"` for expo-status-bar. |
| `EmptyState` | `icon`, `title`, `description`, `action`. |
| `Skeleton`, `Spinner` | `width`, `height`, `circle`; a pulse that stops under reduced motion. |
| `MoneyText` | `cents` (integer minor units), `currency` (USD, or SAR in Arabic), `tone` (`"sign"` colours by sign), `showPlus`, `arabicIndic`. Tabular numerals. |
| `StepProgress` | `steps` (labels), `current`. |
| `OfferCountdown` | `seconds`, `total`, `onExpire` (fires once), `variant` ring or bar. Danger at 10 seconds or fewer. |
| `OfferCard` | `pickup`, `dropoff`, `zone`, `feeCents`, `orderTotalMinor` (shows the cash to collect: total plus fee), `distanceMeters`, `etaSeconds`, `seconds`, `total`, `onAccept` (success haptic), `onDecline`, `loading`. |
| `RouteStops` | `stops[{ kind, label, address, done }]`, `onNavigate`, `renderActions`. The first pending stop is current. |
| `CashCollect` | `amountDue`, `breakdown`, `value`, `onChange`, `onConfirm`, `currency`, `allowShort`. Shows change or what is still owed. |
| `PinInput` | `value`, `onChange`, `length` (4), `error`, `onComplete`, `secure`, `readOnly`. One hidden field, so autofill and paste work; boxes always run left to right, while the error line and the label follow the layout direction. |

### Client brand and appearance

`NasaqProvider` takes `brandColors={{ brand, action, onAction, accent }}` (each "#RRGGBB" or `{ light, dark }`) or a
`brand` object, so an app can apply its own colours (for example from `GET /api/brand`) without a registered brand.
Missing dark steps and the on-colours are derived for contrast (`resolveCustomBrandColors` in `@nasaq/tokens`).

`useSchemePreference({ storage, storageKey })` returns `{ preference, setPreference, scheme, ready }` for a
system / light / dark choice. `storage` is any `{ getItem, setItem }` (AsyncStorage, MMKV, SecureStore), injected by
the app, so the kit adds no dependency. Pass `scheme` to `NasaqProvider`; `system` is `undefined`, so the OS decides.

### Shared logic

Money, distance, ETA, offer timing, cash and route maths come from `packages/web/src/lib/delivery.ts` (pure, no
imports) and are re-exported from `@nasaq/native`, so a phone and the web agree to the minor unit. Native-only
pure helpers (`parseAmountMinor`, `sanitizePin`, `countdownTone`, `alpha`, digit conversion) are in `src/logic.ts`
and covered by `pnpm --filter @nasaq/native test`.

Not yet in the kit: photo capture and a map wrapper. Haptics need the optional
`expo-haptics` peer; icons draw with `react-native-svg`, already a peer.

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
