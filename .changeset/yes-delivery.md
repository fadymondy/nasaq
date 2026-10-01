---
"@fadymondy/nasaq": minor
"@fadymondy/nasaq-mcp": minor
---

Add a generic delivery component set (delivery-tracker, courier-card, dispatch-offer, route-stops, cash-collect). map-view gains `areas` (zone polygons) and live pins.

Client brands: an app that is not a registered Nasaq brand themes Nasaq with its own colours. `NasaqProvider` (web and native) takes `brandColors={{ brand, action, onAction, accent }}` or a `brand` object (`data-brand="custom"`), with dark steps and on-colours derived for contrast (`resolveCustomBrandColors` in `@nasaq/tokens`). `AuthLayout` gains `logo`, native `AppHeader` gains `logo`, and `ProductMark` takes `src` / `logoUrl`.

The React Native kit (`@fadymondy/nasaq/native`) gains the app components a delivery app needs: Card, Input, Badge, Notice (Alert), SegmentedControl, Sheet, Switch, ListRow, Separator, AppHeader, IconButton (with a count badge), tab-bar options and `useNasaqStatusBarStyle`, EmptyState, Skeleton, Spinner, MoneyText, StepProgress, OfferCountdown, OfferCard (`orderTotalMinor` shows the cash to collect), RouteStops, CashCollect and PinInput. `useSchemePreference` keeps the system / light / dark choice through an adapter you inject. Button gains `success`, `size="lg"`, `fullWidth` and `haptic="success"`; Text aligns by layout direction instead of `auto`. Delivery maths is shared with the web components.

Gaps found rebuilding a delivery app, all additive:

- MapView: `onMapClick`, `onAreaClick`, `onPinClick`, a controlled draggable pin (`pickedPoint`), area editing (`editing`, `editPoints`, `onAreaChange`, `onAreaDone`), `layersPanel="collapsed" | "expanded" | "hidden"` and the `mapPointInPolygon` helper. The layers panel now starts collapsed.
- PhoneInput: `onBlur` and `onFocus`; local-format numbers are kept (`defaultCountry` plus lenient `parsePhoneLenient`). TwoFactorSetup: recovery codes are optional. ColorPicker: `mode="hex"` and `swatches={[]}`. ProductMark: `src` / `logoUrl` with fallback to the mark.
- `nasaqThemeScriptProps({ nonce })` and the static `@fadymondy/nasaq/theme-script.js` for strict CSP.
- AppShell: `offset` / `--nasaq-shell-offset`; SidebarItem `render`. Electron `windowChrome`: `size` and `overrides`.
- Select shows the selected label without `items`; DropdownMenuLabel works outside a group; Avatar `fallback`, `children`, `AvatarImage`, `AvatarFallback`.
- DispatchOffer: optional `expiresAt`, `mode="dispatcher"` and `onOffer`. Toast: documented how to share Sonner with an app.
