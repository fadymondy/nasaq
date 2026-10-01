# @fadymondy/nasaq

## 0.4.0

### Minor Changes

- 1ac9c5c: Add components migrated from the ToGO UI kit: DataState, ConfirmProvider, ActiveSessions, BrandingProvider, SourceBadge, AspectRatio, NativeSelect, MarkdownEditor, Form (with useForm) and hooks (useDebounce, useDebouncedCallback, useMediaQuery, useIsMobile, useInfiniteScroll). The shadcn registry's tokens lib now includes `color` and the contrast helpers.
- c1cc87e: Migrate more ToGO UI kit components: DesktopIconGrid, TypingTerminal and DesktopLoginScreen; NotificationCenter gains a side-panel (sheet) variant; DesktopShell children can open apps through a render function.
- 946c7ac: Migrate ToGO UI kit, batch 3 (AI assistant): CopilotProvider with useCopilot and CopilotLauncher; CopilotChat attachments, "/" commands, toggles, history, artifacts in messages, stream-error retry, share and disclaimer; CopilotDock positions (end, start, bottom, float) with persistence, expand to page and a collapsed input bar; WeightedCriteriaCard; pie and donut chart artifacts, stats tone and sparkline, card items and footer.
- 16e7d9a: PasswordInput gains a requirement checklist (`rules`, `ruleLabels`) with `computePasswordRules`, `computeRuleScore` and `passwordMeetsPolicy`. ResetPasswordForm gains `rules`, a Password changed screen with a Sign in button, and an expired-link screen (`{ expired: true }` or `defaultState="expired"`) with a Send a new link button.
- aa45329: Auth and admin parity with the ToGO UI kit: `LoginForm` gains magic-link sign-in (`onMagicLink`, `methods`), a blocked state and a dev-login button; `SignInFlow` gains two-factor, magic-link, forgot-password and blocked steps plus per-step `alternatives`; `AddUserDialog` gains an optional password field and free-form roles; new `UserActionsMenu` for per-user admin actions (edit, impersonate, password, sign-in link, delete).
- 4723a38: Add a generic delivery component set (delivery-tracker, courier-card, dispatch-offer, route-stops, cash-collect). map-view gains `areas` (zone polygons) and live pins.
  
  Client brands: an app that is not a registered Nasaq brand themes Nasaq with its own colours. `NasaqProvider` (web and native) takes `brandColors={{ brand, action, onAction, accent }}` or a `brand` object (`data-brand="custom"`), with dark steps and on-colours derived for contrast (`resolveCustomBrandColors` in `@nasaq/tokens`). `AuthLayout` gains `logo`, native `AppHeader` gains `logo`, and `ProductMark` takes `src` / `logoUrl`.
  
  The React Native kit (`@fadymondy/nasaq/native`) gains the app components a delivery app needs: Card, Input, Badge, Notice (Alert), SegmentedControl, Sheet, Switch, ListRow, Separator, AppHeader, IconButton (with a count badge), tab-bar options and `useNasaqStatusBarStyle`, EmptyState, Skeleton, Spinner, MoneyText, StepProgress, OfferCountdown, OfferCard (`orderTotalMinor` shows the cash to collect), RouteStops, CashCollect and PinInput. `useSchemePreference` keeps the system / light / dark choice through an adapter you inject. Button gains `success`, `size="lg"`, `fullWidth` and `haptic="success"`; Text aligns by layout direction instead of `auto`. Delivery maths is shared with the web components.
  
  Gaps found rebuilding a delivery app, all additive:
  
  - MapView: `onMapClick`, `onAreaClick`, `onPinClick`, a controlled draggable pin (`pickedPoint`), area editing (`editing`, `editPoints`, `onAreaChange`, `onAreaDone`), `layersPanel="collapsed" | "expanded" | "hidden"` and the `mapPointInPolygon` helper. The layers panel now starts collapsed.
  - PhoneInput: `onBlur` and `onFocus`; local-format numbers are kept (`defaultCountry` plus lenient `parsePhoneLenient`). TwoFactorSetup: recovery codes are optional. ColorPicker: `mode="hex"` and `swatches={[]}`. ProductMark: `src` / `logoUrl` with fallback to the mark.
  - `nasaqThemeScriptProps({ nonce })` and the static `@fadymondy/nasaq/theme-script.js` for strict CSP.
  - AppShell: `offset` / `--nasaq-shell-offset`; SidebarItem `render`. Electron `windowChrome`: `size` and `overrides`.
  - Select shows the selected label without `items`; DropdownMenuLabel works outside a group; Avatar `fallback`, `children`, `AvatarImage`, `AvatarFallback`.
  - DispatchOffer: optional `expiresAt`, `mode="dispatcher"` and `onOffer`. Toast: documented how to share Sonner with an app.

### Patch Changes

- 84d42c8: Currency defaults are now US dollars, or Saudi riyals in Arabic, across every component. The delivery kit (cash collect, courier card, dispatch offer, route stops, native cash collect) no longer defaults to shekels. Store, checkout, cart, payments, loyalty, rates and payroll components take `currency` as optional with the same default. New helpers: `defaultCurrency(locale)`, `useCurrency(currency?)` and `deliveryCurrency(locale)`.

## 0.3.1

### Patch Changes

- Republish with the built `dist`: the 0.3.0 tarball shipped only the CSS files, so `@fadymondy/nasaq/web` and the other entry points could not be resolved.

## 0.3.0

### Minor Changes

- f159f1b: `PhoneInput` now looks and works like a real phone field: SVG flags, every country with its calling code, names in English and Arabic from `Intl.DisplayNames`, numbers grouped as written in each country, a real example number as the placeholder, Arabic-Indic and Persian digits, and shared codes (`+1`, `+7`, `+44`) placed by number range. New helpers `isValidE164`, `formatNational`, `phoneExample`, `phoneCountryName` and `parsePhone`. New `CountryFlag` component (the flag set loads lazily, once). Adds `libphonenumber-js` and `country-flag-icons` as dependencies.
  
  Also new: `PricingTable`, `UpgradePrompt` and `SignInFlow`. The profile page and profile form are redesigned (owner view with apps and account details), `Table` gains `density`, `frame`, `bordered`, `striped` and `hover`, the app shell sidebar can show icons on mobile only, and the active-item accent border is gone. Component categories are reorganised.

## 0.2.0

### Minor Changes

- 5f3fb40: New components: `PageHeader` (layout), `ViewToggle` (actions), `ProviderSwitcher` (developer tools) and `CopilotDock` (AI). Adds the ToGO brand theme (`brand="togo"`) and its mark. `IconByName` now accepts kebab-case and prefixed icon names and image URLs, and shows a fallback for unknown names.
