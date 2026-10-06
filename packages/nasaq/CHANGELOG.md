# @fadymondy/nasaq

## 1.2.0

### Minor Changes

- b285354: CopilotDock hosts any panel, not only a chat: `children` (or a render function given `{ controls, close, expanded, side }`) replaces `CopilotChat`, and `barContent` puts your own summary in the collapsed bar. `messages` and `onSend` are optional when `children` is set.
- b285354: CopilotDock `resizable`: drag the panel's inner edge to resize it — height only when docked at the bottom, width only on a side. The edge is a keyboard-operable separator (arrows, Home/End, double click resets), and `persistKey` remembers the size.
- b285354: EntityList gets a server mode for lists the server pages: `manual` hands sorting, filtering and paging to you, with `rowCount` for the true total, so a page of 25 from a list of 4,000 still shows the right count and page controls.
- a9e2980: KanbanBoard columns take optional `count`, `accent`, `meta` and `footer`: the real size of a paged column in its badge, a status dot, a line under the title (a stage's total value) and a slot below the cards (a "Load more" button). Boards that pass only `{ id, title }` render as before.

## 1.1.0

### Minor Changes

- c82b377: Add `AddressInput` (cascading country, city and area comboboxes with a pluggable `LocationsDataSource` and a CircleXO hub default) and `CountrySelect`.
- 57906c1: Adds six CircleXO business-app brands to `@fadymondy/nasaq/brands` and the theme tokens: `matjar`, `sanduq`, `mizan`, `qaima`, `makhzan` and `mawared`. Each has a cube-lattice mark (copied verbatim from the products' marks table), a manifest with English and Arabic names and its circlexo.com site, and brand and action colours that pass contrast in light and dark.
- ba98109: McpConnect gets `layout="steps"` (client select, numbered steps, no card). New `McpConnectSheet` side-over with connection-type tiles and a primary-colour `ConnectButton`.
  
  New `McpConnectApps`: a non-technical MCP setup � pick your app (Claude, ChatGPT, Claude Code, Cursor, VS Code, other) by its real logo, then plain numbered steps with one big button. OAuth apps need only the link; the rest take a key from `renderKeyForm`. Brand logos exported (`ClaudeLogo`, `OpenAILogo`, �, `McpAppLogo`). `ConnectButton` gains a light that travels around its edge (motion-safe).

## 1.0.0

### Major Changes

- 6625b9e: Nasaq 1.0: every component in every stack.
  
  - All 376 components now ship for React, shadcn, Vue 3 (`@fadymondy/nasaq/vue`) and HTML + Alpine (`@fadymondy/nasaq/html`, `@fadymondy/nasaq/alpine`), keeping the shadcn look, light/dark and RTL.
  - Blade, Livewire and Filament support lives in the Composer package `fadymondy/nasaq-php` (`<x-nq::…>` components, `wire:model` aware).
  - Each component page has React, shadcn, Vue, Blade and HTML/Alpine tabs; Get started covers every stack including Inertia.
  - The MCP server's `get_setup` and `get_component` return the setup and code for each stack.

## 0.5.0

### Minor Changes

- baa29aa: Migrate the ToGO core pieces (batch 5): `InterimBadge` for partial, still-arriving values; `LangTag` for the language of a piece of content; `LoadingState` `shape="grid" | "timeline"`, `columns` and a visible `caption`; Boxicons names (`bx:`, `bxs:`, `bxl:` and legacy `bx-*`) in `IconByName`; `TranslationsProvider` and `useT()` for app strings with plurals, fallback, a remembered choice and `seedLocale`; and theme presets (`ThemePresetPicker`, `useThemePreset`, `ThemePresetScope`) with Nasaq, purple, rose and emerald in dark and light, plus overrides.
- b95f6ff: Migrate the ToGO data views (batch 6). `DataTable` gains multi-column sorting (`multiSort`, Shift-click, `defaultSorting` / `sorting`), sticky pinned columns (`pin`, `pinning`, Pin to start / end in `DataTableViewOptions`), resizable columns (`resizable`, drag or arrow keys), expandable rows (`renderExpanded`, `canExpand`, → / ←), `DataTableRangeFilter` for number and date ranges, a density choice in `DataTableViewOptions` and a rows-per-page choice in `DataTablePagination` (`pageSizeOptions`). The pure helpers (`nextSorting`, `sortTableRows`, `inRange`, `pinOffsets`, …) are exported. `LogViewer` gains a time-range select (`ranges`, `LOG_RANGES`), server-side filtering (`manual`, `onFilterChange`, `counts`, `total`), loading older entries while keeping the reader's place (`hasOlder`, `onLoadOlder`) and pause / resume of the live tail (`liveTail`, `onLiveChange`).
- f9856a7: Add `IssueBoard`, a ready-made issue kanban with search, assignee and reporter filters, a header with the count and New issue, votes, and drops that keep hidden issues in order while filtered (`filterIssues`, `boardIndex`). Add `IssueCard` (type, key, priority, labels, due date, votes, comments, attachments, assignee), now also used by `ProjectView`'s board.
- 7b382e1: `FeedbackFloatingLauncher` can be `movable`: visitors drag it aside, it snaps to the nearer side and remembers the spot (`storageKey`, `spot`, `onSpotChange`), and Alt + arrow keys move it too. `FeedbackHub` adds a **Mine** tab for the visitor's own reports and server paging (`counts`, `onFilterChange`, `hasMore`, `onLoadMore`, `loadingMore`). New pure helpers: `snapLauncherSpot`, `moveLauncherSpot`, `spotFromPosition`, `parseLauncherSpot`, `filterHubIssues`.
- 7b382e1: Add `PluginCard` and `PluginCardGrid`: a plugin with its icon and colour, name, version, kind, enabled state and last activity, description, a compact headline count with a sparkline, and Page / Details actions. `selectable` turns it into a checkbox card (click, checkbox or long press) for bulk actions. Pure helpers `pluginActivity`, `humanizeKind`, `toggleSelected`, `selectionState`.
- 7b382e1: Add `DetailLayout`, a detail page for one thing: a sub-sidebar of tabs grouped in sections (a scrolling tab bar on small screens, arrow-key navigation), a header with icon, name, version, kind, status, description and an activity box (count, sparkline, last active), and loading and error states. Pure helpers `groupDetailTabs`, `stepDetailTab`.
- 0ec7cb8: Add `PlacementSettings`: where a plugin or module appears in the app shell (sidebar, header, side panel, floating widget or hidden) as radio cards with a small shell diagram each, its order, and an optional "Open on start" switch. Keeps a draft, shows unsaved changes, saves only what changed, with Discard, saving and error states. Pure helpers `canBeDefaultPage`, `isModeAvailable`, `parseOrder`, `withMode`, `placementChanges`.
- 14bc393: `Button` gets `shape="pill"`: fully rounded with a little more padding, circular at icon sizes, no effect on links. Also on `buttonVariants`.
- 3844fe4: Add `TestRunStream`: a test run that streams. Run and Stop, steps appearing and updating in place as the server reports them, a live elapsed time and summary, and what the run saved with its raw data behind a toggle. `run(handlers, signal)` fits an event stream or a promise. Pure helpers `testRunStepStatus`, `upsertTestRunStep`, `settleTestRunSteps`, `testRunCounts`, `formatTestRunDuration`.
- 7b638b0: Add `WorkflowViews`: one workflow shown three ways from the same nested steps, a numbered outline with loops and labelled branches, a pipeline diagram (`WorkflowNetwork`), and your editor, with a view switch that can remember the choice. Pure helpers `workflowToNetwork`, `numberWorkflow`, `countWorkflowSteps`, `workflowStepKind`.
- e5578d4: Add `SectionBoard`: an ordered set of AI-generated sections. View mode shows only the content; edit mode lets people reorder (drag, or the arrow keys on the handle), edit each section's title, tag, prompt, model and free key/value settings in a dialog, and remove it, with every change announced. Pure helpers `sectionSettingRows`, `sectionSettingsFromRows`, `duplicateSectionSettingKeys`, `boardSectionChanged`.
- 284d78d: Add `MapMonitor`: a `MapView` for watching what is happening, with region presets to jump between places, a time-range filter (24 hours, 7 days, 30 days, all, or your own), and an alerts panel by severity that stays in step with the pins (choosing an alert selects and centres it). Pure helpers `filterMapAlerts`, `countMapAlerts`, `mapAlertTime`, `mapAlertSeverity`, `isMapRegionView`, `DEFAULT_MAP_TIME_RANGES`.
- 9fe28c7: Add `desktopPowerMenu`: builds the system menu for `DesktopShell` (About, System Settings, then Sleep, Restart, Shut Down and Log out) from your handlers, with English and Arabic strings, separators between groups, Log out marked danger, and an optional `confirm` (pass `useConfirm()`) before Restart, Shut Down and Log out. Helpers `desktopPowerLabels`, `desktopPowerConfirm`, `DESKTOP_POWER_ACTIONS`, `DESKTOP_POWER_CONFIRMED`.

### Patch Changes

- 7d8e613: Avatar initials skip leading punctuation: "(Test) Driver" now shows "TD" instead of "(D".

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
