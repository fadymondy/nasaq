# Nasaq (نسق) — Architecture

> One product language. Every surface. — نسق واحد. كل المنتجات.

- Status: **Phase 0 proposal, awaiting Fady's review** (MH-716). Written 2026-09-29.
- Inputs: Product UI audit (internal, not published), Brand audit (internal, not published), and tooling research (internal, not published).
- Decisions are numbered `A-n`. Open questions for Fady are `D-n` (§17).

## 1. Identity

| | |
|---|---|
| Repository | `github.com/fadymondy/nasaq` (not created yet; D-7) |
| npm | `@fadymondy/nasaq`, one package with subpaths `/tokens`, `/web`, `/native`, `/electron` (+ `/brands`, `/tokens/*.css`) |
| Landing, docs, registry, MCP | Landing `https://nasaqui.com`. Docs (the static Storybook) and registry `https://docs.nasaqui.com`, registry at `/r/{name}.json`, index at `/registry.json`. MCP `https://mcp.nasaqui.com/mcp` |
| Lab (Storybook) | `https://docs.nasaqui.com` (dev server via win-tunnel) |
| Mahaam project | `Nasaq` |
| Zekra brain | namespace `nasaq` |

## 2. Principles, made operational

| Principle | What enforces it |
|---|---|
| Familiar before clever | shadcn anatomy and prop names; Base UI primitives; no novel interaction models in P0 |
| Quiet by default | One `action` per view; gold `accent` only for active or selected; no shadows, gradients or glow in the `grid` expression; colour-only 150ms motion |
| Density with hierarchy | `data-density` changes sizes, never hierarchy; readability floor is 12px |
| Fast by perception | Skeleton rows over spinners; optimistic patterns documented; `prefers-reduced-motion` honoured |
| Progressive disclosure | Sheets and collapsibles for secondary detail; command palette for breadth |
| Keyboard-first and touch-first | A hotkey layer and command registry (P1); touch targets ≥ 44 at `comfortable` density |
| Arabic native | Arabic metrics are their own token set, not Latin plus a fudge; lint bans physical properties |
| Direction-aware | Logical properties only; directional icons mirror; marks, digits and code never mirror |
| Adaptive, not identical | *Expressions* per platform over one token core (§6) |
| Brand-aware | `data-brand` switches brand, action and accent; semantics never change meaning |
| Accessible by default | Contrast pairs tested in CI; Storybook a11y addon; status is never colour-only |
| AI-native without clutter | Provenance, streaming and "agent did this" patterns as components (P2), not a chatbot bolted on |

## 3. Relationship to "the grid"

The audit found that all eight products already run on fmv2's **grid** system. Nasaq will not fork it or ignore it.

**A-1. Nasaq is the grid's successor.**
- Nasaq's token core **contains the grid's values** as its primitive and semantic layers.
- Nasaq emits `--grid-*` compatibility aliases, so products can migrate file by file.
- Once Nasaq is stable, `grid-web` and `grid-native` in fmv2 can become *generated from Nasaq* instead of hand-maintained (D-2).
- The grid's look (square, hairline, hatch, ivory and ink) becomes Nasaq's **`grid` expression**. Nasaq also defines a **`native` expression** (rounded 6–8px, no hatch, native-feeling), which Zekra and Mahaam desktop and mobile already use informally.
- The brief asks for Nasaq to have its own visual language rather than one brand's skin. That is satisfied by separating three things:
  - **core**: structure, roles and scales, neutral in naming.
  - **expression**: geometry, texture and motion.
  - **brand**: identity and action colour.

  The default grounds (ivory and ink) are the *Nasaq palette*, because the family already speaks it. A cooler neutral palette can be added later without touching any component (D-3).

## 4. Repository layout

```
nasaq/
├─ packages/
│  ├─ tokens/     DTCG 2025.10 source → Style Dictionary 5 → CSS vars, TS, RN objects (+ Swift/Kotlin later)
│  ├─ brands/     BrandManifest type, 9 manifests, MarkSpec data, markSvg(), icon generator
│  ├─ web/        React DOM: NasaqProvider, theme script, components (Base UI + Tailwind v4)
│  ├─ native/     React Native: NasaqProvider, components (StyleSheet, no styling runtime)
│  ├─ electron/   main-process chrome factory + renderer title bar, drag and controls components
│  ├─ icons/      directional-icon metadata + <Icon> wrapper over lucide (web + native)
│  ├─ feedback/   vendored @mahaam/feedback-core (generated copy, synced; see §14)
│  ├─ tooling/    eslint plugin (logical props, no raw colours), tsconfig, token contrast tests
│  └─ nasaq/      the ONE published package @fadymondy/nasaq: tsdown bundles the packages above into subpaths
├─ apps/
│  ├─ lab/        Storybook 10 (react-vite): the documentation site, plus web + native + electron-renderer stories. Builds the static docs and the registry (`/r`)
│  └─ site/       Next.js 16 + fumadocs landing/brand site (see the apps/site recommendation)
├─ registry/      generated shadcn registry sources (gitignored): registry.json + items, built by scripts/build-registry.mjs
└─ docs/          audits, architecture, decisions
```

**A-2. The monorepo deviates from the brief's sketch in three ways.**
- `charts` is deferred. It becomes a P1 wrapper inside `web`, because recharts is already the de-facto choice and a separate package is unjustified today.
- `apps/native-lab` is folded into `lab` via react-native-web. A real on-device Storybook comes later, if needed.
- `feedback` and `nasaq` (the publish aggregate) are added.

Internal packages are private workspace packages (`@nasaq/tokens`, …). Only `@fadymondy/nasaq` is published. Consumers see one version, and the internals stay free to move.

**A-3. Tooling**
- pnpm 12 workspaces, Turborepo 2, changesets 3, TypeScript (current stable).
- tsdown 0.23 per subpath, validated with publint and `@arethetypeswrong/cli`.
- Vite 8, Tailwind 4.3, React 19.

## 5. Distribution: registry vs npm

| Concern | shadcn registry (copy-in, app owns the code) | npm `@fadymondy/nasaq` (versioned dependency) |
|---|---|---|
| Web UI components (button, dialog, …) | ✅ primary channel | ✅ same components, prebuilt (`/web`) |
| Blocks (app shell, states, auth) | ✅ | ✅ |
| Tokens | ✅ as `registry:style` `nasaq` (cssVars for light and dark) + `registry:theme` per brand | ✅ `/tokens` (TS) + `/tokens/nasaq.css` |
| NasaqProvider, theme script | ✅ small `registry:lib` | ✅ |
| Brand manifests, marks, `<ProductMark>` | ✅ `registry:component` with inlined data for one brand | ✅ all brands |
| React Native kit | ❌ (the shadcn CLI targets the DOM) | ✅ `/native` |
| Electron main-process helpers | ❌ | ✅ `/electron` |

**A-4. Single source.**
- Registry items are **generated from `packages/web` sources** by a build step that rewrites imports to shadcn aliases (`@/lib/utils`, `@/components/ui/*`). There is no second copy to drift.
- Registry items **never depend on `@fadymondy/nasaq`**. Their dependencies are limited to `@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, and `sonner` / `cmdk` / `recharts` where the component needs them. This keeps the "no huge runtime" rule.
- The registry is **flat**, and `/registry.json` has no `content` in its files, as the shadcn directory requires.
- The preset item is `nasaq`: `https://docs.nasaqui.com/r/nasaq.json`, type `registry:style`. It installs the cssVars, the `cn` util and the provider.
- Namespace config for consumers: `"@nasaq": "https://docs.nasaqui.com/r/{name}.json"`.
- Submission to the shadcn directory (`apps/v4/registry/directory.json` + `pnpm validate:registries` + a PR) happens after the P1 catalog is stable. It is outward-facing, so it waits for Fady's approval.

## 6. Tokens

**A-5.** Tokens are authored in **DTCG 2025.10 JSON** and built by **Style Dictionary 5** into:
- `nasaq.css`: CSS custom properties, `@theme inline` for Tailwind v4, and a shadcn variable bridge.
- `tokens.ts`: typed values for JS.
- `native.ts`: a resolved RN object per theme × brand.
- Swift and Kotlin exports later, for Health Debug's Layer C.

**Layers**

| Layer | Examples | Who may reference it |
|---|---|---|
| Primitive | `color.ink.950 #0B1429`, `color.ink.900 #0E1A3C`, `color.ivory.100 #F0EBE1`, `color.gold.500 #C9A227`, `color.orange.600 #E2661C`, `space.4`, `radius.6`, `duration.150` | semantic layer only |
| Semantic | `bg`, `surface`, `surface-soft`, `line`, `fg`, `fg-body`, `fg-muted`, `elevated{,-soft,-line,-hover}`, `brand`, `action`, `on-action`, `accent`, `focus`, `ok/warn/danger` + `*-text`, `tag.{9 hues}.{solid,soft,text}`, `chart.1–5` | components |
| Component | `button.height`, `control.radius`, `row.height`, `titlebar.height.{darwin,win32,linux}` | the component itself |

**CSS naming**
- `--nq-*` is canonical: `--nq-bg`, `--nq-action`, ….
- The shadcn bridge (`--background`, `--primary`, `--ring`, `--radius`, `--sidebar-*`) is mapped from `--nq-*`.
- `--grid-*` aliases exist for migration (A-1).

**Selectors**

```html
<html data-brand="mahaam" data-theme="dark" data-expression="grid" data-density="compact" dir="rtl" lang="ar">
```

`class="dark"` is also set, for Tailwind's `dark:` variant.

**Light and dark** are each designed. Dark is navy, never black. Text-safe shades are separate tokens from fills. CI checks every `fg/bg` and `on-action/action` pair for every brand in both themes: ≥ 4.5:1 for text and ≥ 3:1 for UI.

**A-6. Spacing scale.** The core scale is **4, 8, 12, 16, 24, 32, 48, 64** (`space.1`…`space.16`), as the brief asks. Three named layout tokens are kept because the family's layouts depend on them:
- `space.hair` = 2
- `layout.rail` = 20: the RN rails.
- `layout.pad` = 28: the grid gutter.

`layout.column` = 860 and `layout.gap` = 16 carry over.

**A-7. Expressions** (`data-expression`)

| Token | `grid` (web default) | `native` (Electron, RN, extension default) |
|---|---|---|
| `radius.surface` | 0 | 0 (panes) / 10 (cards) |
| `radius.control` | 6 | 7 (desktop) / 8 (RN) |
| `radius.floating` | 12 | 12 |
| `radius.sheet` | — | 14 (top corners) |
| hatch separators | on | off |
| mono uppercase micro labels | on | off (sentence-case caption) |
| shadows | none | none (vibrancy / Mica surfaces on desktop) |
| motion | 150ms colour; 200ms spatial for disclosure (height), sheets (edge slide) and the sidebar rail (width) | 150ms colour + platform transitions (sheets, reanimated) |

*Revised by Fady (2026-09-29): the grid expression was colour-only, which made group toggles and the notifications side-over feel abrupt. Spatial motion is now allowed for those three cases only, always `ease-nq`, and always off under `prefers-reduced-motion`. Popovers, menus and dialogs still only fade.*

**A-8. Densities** (`data-density`)

| | comfortable | compact (default web) | dense |
|---|---|---|---|
| control height | 40 (RN 46) | 32 | 28 |
| icon button | 40 (RN 44) | 32 | 28 |
| table row | 48 | 40 | 32 |
| sidebar row | 36 | 32 | 28 |
| page pad | 28 | 24 | 16 |
| app header | 56 | 48 | 40 |
| shell pad (sidebar padding, gaps, rail inset) | 16 | 12 | 8 |
| use | marketing, portals, native, extension side panel | apps | ops consoles, desktop, extension popup |

Density never changes the type scale, and it never shrinks touch targets below 44 on touch devices. The `pointer: coarse` media query clamps it.

## 7. Brands

**A-9. Brand manifest**

```ts
export interface BrandManifest {
  key: BrandKey;                         // "nasaq" | "fadymondy" | "mahaam" | "zekra" | "moharrik" | "seatfor" | "health-debug" | "circlexo" | "hosbah" | "orchestra" | "togo"
  aliases?: string[];                    // legacy keys: "managy", "cabrain", "cloudy", "claude-digital-twin", "booki", "orchestra-mcp", "togo-framework"
  name: { en: string; ar?: string };
  wordmark: { latin: string; arabic?: string };   // typeset text, never an image
  mark: MarkSpec;                        // cells, accentCells, body, bodyOnDark?, accent (verbatim from fmv2 marks.ts)
  color: {
    brand:    { light: string; dark: string };   // identity: marks, brand surfaces, never generic UI paint
    action:   { light: string; dark: string };   // the one primary action
    onAction: { light: string; dark: string };   // contrast-tested
    accent?:  string;                             // defaults to gold
    chart?:   { light: string[]; dark: string[] };
  };
  typography?: { latin?: "lusail" | "inter" }; // Arabic is always the Arabic face
  links?: { site?: string; brandPage?: string };
}
```

- The manifests for the 8 products plus `nasaq` and the parent `fadymondy` are transcribed verbatim from code (BRAND-AUDIT §3 (internal, not published)).
- SeatFor's action colour is undefined, so it uses the parent default (B6).
- Tenants (SeatFor) override `action`, `onAction` and the font at runtime through the same variables. `NasaqProvider` accepts a partial `brandOverride` and **rejects pairs that fail contrast** in development.

**A-10. `<ProductMark>` and `<ProductLogo>`**
- `<ProductMark brand size onDark? mono?>` renders SVG `<rect>`s from `MarkSpec`.
- The dark variant uses `bodyOnDark`, selected by the theme. It is never a CSS filter, recolour or transform.
- Below 20px the accent drops, matching existing behaviour.
- The mark never mirrors in RTL.
- `<ProductLogo>` is the mark plus the typeset name as a UI label (B10). There is no exported lockup image.
- Native: the same API on `react-native-svg`.

## 8. Web layer (`/web`)

**A-11. Primitives are Base UI (`@base-ui/react` 1.x), style `base-nova`, `rtl: true`.**
- 6 of the 8 products already use it, so Radix-first would force migrations.
- The research agent recommended Radix as shadcn's historical default. That recommendation was overruled by the audit evidence.
- A Radix build of the registry can be generated later if directory consumers ask for it (D-4).

**Other web choices**
- Tailwind v4 CSS-first, `tw-animate-css`, cva, `cn`, lucide.
- sonner for toasts, cmdk for the command palette, recharts for charts, dnd-kit for DnD, TanStack Table + Virtual for the data table (P1), react-day-picker 10.

**Providers**
- `NasaqProvider({ brand, theme: "system"|"light"|"dark", direction, density, expression, locale })` sets the `<html>` attributes, persists the theme (`nasaq-theme`), and exposes `useNasaq()`.
- `nasaqThemeScript()` is an inline no-flash script, for Next.js `<head>` and static exports.
- The provider sets `<meta name="theme-color">` from tokens.

**Next.js and static-export safety.** Components are client components where needed. Nothing depends on server-only APIs, because Orchestra ships a static export.

## 9. Typography

**A-12. Roles, not fonts.**
- Roles: `display`, `h1`, `h2`, `h3`, `body`, `body-sm`, `label`, `caption`, `numeric`, `code`.
- `caption` has an `eyebrow` variant: uppercase mono Latin micro-label in the grid expression, and a plain caption in Arabic.

| Role | Latin size / line-height / weight | Arabic size / line-height / weight |
|---|---|---|
| display | 40 / 1.1 / 500 | 40 / 1.5 / 500 |
| h1 | 30 / 1.2 / 500 | 30 / 1.6 / 500 |
| h2 | 24 / 1.25 / 500 | 24 / 1.6 / 500 |
| h3 | 19 / 1.3 / 500 | 20 / 1.7 / 500 |
| body | 15 / 1.55 / 400 | 16 / 1.85 / 400 |
| body-sm | 13 / 1.5 / 400 | 14 / 1.8 / 400 |
| label | 13 / 1.3 / 500 | 14 / 1.6 / 500 |
| caption | 12 / 1.4 / 400 (eyebrow: mono 11, +0.14em, uppercase) | 13 / 1.7 / 400, no tracking, never mono |
| numeric | tabular-nums, `dir=ltr` isolated | Latin digits, isolated |
| code | JetBrains Mono 13 | JetBrains Mono (Latin only) |

**Rules**
- Weights are 300, 400 and 500 only. Bold is not used; the Lusail Bold file exists, but the grid rule bans weight 700.
- Arabic letter-spacing is always 0.
- The floor is 12px.
- The raised scale matches the products' 2026-09-23 readability decision.

**Font stacks**
- `--nq-font-sans`: `"Lusail", "Inter", "Alexandria", system-ui, sans-serif`
- `--nq-font-arabic`: `"Lusail", "Alexandria", "IBM Plex Sans Arabic", system-ui, sans-serif`
- `--nq-font-mono`: `"JetBrains Mono", "Lusail", ui-monospace, monospace`. Lusail sits before generic mono so Arabic never falls into a system mono.

A brand manifest can put Inter first for Latin text, as Mahaam, Zekra, Moharrik and Hosbah do today.

**Licensing**
- Nasaq depends only on OFL fonts via `@fontsource`: Inter, JetBrains Mono and Alexandria.
- **Lusail is never bundled** until its licence is verified (D-5). The host app provides it.
- The Inter `calt` feature is disabled for numerals, per the Moharrik finding.

## 10. Layout, RTL and theming

- **Logical properties only.** `packages/tooling` ships an ESLint rule and a Stylelint rule that ban `ml-/mr-/pl-/pr-/left-/right-/text-left/text-right/border-l/border-r` and physical CSS properties. Exceptions need an inline justification.
- **Icons.** `<Icon name dir-aware>` mirrors directional icons using a curated list: arrows, chevrons, undo/redo, send, reply, log-in/out and external. Non-directional icons are never mirrored. On native, the same list drives `scaleX(-1)` from `useNasaq().isRtl`.
- **Bidi primitives.** `<Ltr>` (isolate), `<Bdi>`, and `<BidiText>` (`dir="auto"`, `unicode-bidi: plaintext`) handle user text.
- **Library direction adapters.** Recharts gets a flipped YAxis orientation. Sonner position and dir, Sheet side, and the xyflow and xterm surfaces are LTR-locked.
- **RN RTL.** `I18nManager.allowRTL/forceRTL`, a single reload per direction change, and `dir` on the root `View` for react-native-web.
- **Responsive.** Popup is 320–400. Breakpoints are `sm 640`, `md 768` (sidebar becomes a Sheet), `lg 1024`, `xl 1280` and `2xl 1536`. Multi-pane layouts (resizable panes) apply above `xl`.

## 11. Native layer (`/native`)

**A-13.**
- Expo SDK 57, RN 0.86, expo-router, and React Native components built on RN primitives. There are no DOM wrappers.
- Styling uses **plain `StyleSheet` plus a `useNasaq()` theme context** with memoised style factories. **No Unistyles, NativeWind or Tamagui.** A design-system library must not force a native styling runtime or a dev-client build on every consumer, and the grid-native kit already proves StyleSheet is enough.
- Required peers: `react-native-svg` (marks). Optional peers: reanimated, gesture-handler, expo-haptics.
- Haptics come through an optional `useHaptics()` that no-ops when the module is absent. There are none anywhere today.
- The P0 native set is `NasaqProvider`, `Text` (roles, per-script resolution, `maxFontSizeMultiplier` 1.4), `Button`, `Screen`, `ProductMark`.
- Porting from grid-native later: Rails, Row, Sheet, TabBar, ListItem, Field, OTP, StateRow.

## 12. Electron layer (`/electron`)

**A-14. Desktop-specific only.** Everything else comes from `/web`.

**Main process** (`@fadymondy/nasaq/electron/main`)
- `windowChrome({ platform, theme, direction, kind: "main"|"panel"|"settings" })` returns `BrowserWindowConstructorOptions`:
  - **darwin**: `titleBarStyle: "hiddenInset"`, `trafficLightPosition`, `vibrancy: "sidebar"`, `visualEffectState: "followWindow"`, transparent background.
  - **win32**: `titleBarStyle: "hidden"`, `titleBarOverlay { color: transparent, symbolColor from tokens, height: 40 }`, `backgroundMaterial: "mica"` on Windows 11. Never `frame: false`.
  - **linux**: OS frame, `autoHideMenuBar`.
- `updateTitleBarOverlay(win, theme)` re-colours the overlay on theme change.
- `chromeInfo()` is passed to the renderer through the preload.

**Renderer**
- `<WindowTitleBar>`, `<DragRegion>`, `<NoDrag>` (interactive children are no-drag automatically), and `<WindowControlsInset>`, which reserves the caption area.
  - In RTL on macOS the traffic lights sit on the right.
  - On Windows the caption area is always on the right, 138px.
- `<WindowControls>` is for custom frames, such as Linux or frameless panels.
- `useWindowChrome()` sets `<html data-platform data-chrome data-material>`.

**Tokens**: `titlebar.height.{darwin 52, win32 40, linux 46}` and `window.controls.inset`.

**Later (P2)**: a command registry that bridges menus, tray and shortcuts, plus floating panel helpers.

## 13. Extensions

**A-15. No separate package.**
- Extensions use `/web` and `/tokens/nasaq.css`. The CSS is static, with no runtime, which makes it MV3 CSP-safe.
- Surface presets come from `data-surface="popup|sidepanel|options"`: popup uses `dense` at 360px, the side panel uses `compact`, and options uses `comfortable`.
- Fonts are bundled from the OFL `@fontsource` files. There are no remote fonts and no inline styles.
- Injected UI must use Shadow DOM and adopt `nasaq.css` as a constructable stylesheet. The Mahaam feedback widget and the Moharrik chat widget move onto this.

## 14. Mahaam Feedback from day 0

- **Install.** The registry item `https://console.mahaam.app/r/feedback.json` goes into `apps/lab` and `apps/site`. The component files land in `components/mahaam/*`.
- **Core package.** `@mahaam/feedback-core` is **not on npm** (404). It is vendored into `packages/feedback` as a generated copy of `fadymondy/mahaam-feedback/packages/core`, via `scripts/sync-feedback.mjs` with `--check`, the same pattern fmv2 uses. A follow-up issue tracks switching to npm once it is published.
- **Key.** The key is read from `VITE_MAHAAM_FEEDBACK_KEY` / `NEXT_PUBLIC_MAHAAM_FEEDBACK_KEY`, set in `.env.local` and never committed. It is sent as the `X-Mahaam-Key` header.
- **Allowed origins.** The key's allowed origins must include `https://nasaqui.com`, `https://docs.nasaqui.com` and `http://localhost:*`. **Fady has to add them**, because the MCP token cannot edit keys.
- **Verification.** Submit a test report and expect an `MG-n` key back, then delete the test issue.

## 15. Lab (Storybook) and site

- **`apps/lab`**
  - Storybook 10.6 with react-vite, addon-a11y and addon-themes.
  - Toolbar globals: brand, theme, direction, density, expression and locale, applied through a `NasaqProvider` decorator.
  - **Platform** (web, macOS, Windows, Linux, iOS, Android, extension) sets `<html data-platform>`, as `useWindowChrome()` would. Shortcut labels and matching (⌘ or Ctrl) read it first and fall back to the browser's own platform.
  - **Viewport** presets: mobile 390, tablet 768, laptop 1280, desktop 1440, extension popup 360×600, side panel 400×800.
  - **Brand / Brand matrix** renders the same primitives under the eight product manifests side by side, with the primary action's contrast ratio. Upstream colours below AA are marked as decision B15.
  - Native components render through react-native-web aliases. Electron renderer components render with a simulated `data-platform`.
  - **Every component has a story.** CI fails if a component in `packages/web` or `packages/native` lacks a `*.stories.tsx`.
  - Served as a dev server by win-tunnel `create_project` with subdomain `nasaq-ui`, giving `docs.nasaqui.com`.
- **`apps/site`**
  - Next.js 16 + fumadocs: docs, a brand page (marks from `MarkSpec`, downloadable, generated), `/registry.json` and `/r/*.json` (`shadcn build` output).
  - The docs and the registry are served from the static Storybook build (`pnpm --filter @nasaq/lab build`) at `docs.nasaqui.com`; `nasaqui.com` is the landing site.

## 16. Quality gates (CI)

- typecheck, lint (logical properties, no raw hex in components), unit tests.
- **Token contrast matrix** across every brand × theme × pair.
- publint + attw on `@fadymondy/nasaq`.
- Registry validation against the schema, confirmation that the index has no `content`, and `shadcn add` smoke-installed into a temporary Next app.
- A story exists for every component; Storybook a11y runs with no violations.
- `sync-feedback --check`.
- Changesets for the version.

## 17. Open decisions for Fady

| # | Decision | Proposal |
|---|---|---|
| D-1 | Nasaq's own **action colour**: parent orange `#E2661C`, or a new Nasaq hue? | Parent orange + ink/ivory body mark (Nasaq = the family's system) |
| D-2 | Should fmv2 `grid-web` and `grid-native` become **generated from Nasaq** (Nasaq replaces the grid), or should they coexist? | Nasaq replaces the grid after P1; `--grid-*` aliases bridge the migration |
| D-3 | Default **expression** for web: square `grid`, or `native`? Add a cooler neutral palette? | `grid` on web; `native` on desktop, mobile and extension; no new palette yet |
| D-4 | Base UI only, or also a Radix registry build? | Base UI only; revisit if directory users ask |
| D-5 | **Lusail licence**: can Nasaq redistribute it? | Not bundled until confirmed |
| D-6 | Approve the **Nasaq mark** (BRAND-AUDIT §4 (internal, not published)) and adding `nasaq` to fmv2 `marks.ts` | Approve, then upstream |
| D-7 | Create the **GitHub repo** `fadymondy/nasaq` (public) and publish **npm** `@fadymondy/nasaq`. Both are outward-facing; npm is not logged in on this machine. | Create the repo after the review; publish 0.1.0 after the P1 catalog |
| D-8 | **Hosting** | Decided: the docs and registry are one static folder (`apps/lab/storybook-static`) on `docs.nasaqui.com`, served by `apps/lab/scripts/serve-static.mjs`; the landing stays on `nasaqui.com` |
| D-9 | Latin UI face default: Lusail or Inter? | Lusail first, with a per-brand Inter option (as the 4 products do) |
| D-10 | Brand ambiguities B1–B14 | Defaults as listed in the brand audit |

## 18. Implementation plan (Mahaam)

The plan is phased, with one issue per phase. Nothing beyond Phase 5 starts before Fady's review.

1. **MH-716** Phase 0: audits and architecture (this document).
2. Phase 1: monorepo scaffold (pnpm, turbo, tsdown, changesets, tooling lint rules, CI skeleton).
3. Phase 2: `tokens` (DTCG source, Style Dictionary build, CSS/TS/RN outputs, `--grid-*` aliases, contrast tests).
4. Phase 3: `brands` (manifests, marks, Nasaq mark assets, `ProductMark` / `ProductLogo`).
5. Phase 4: web foundation plus the P0 components, each with a story.
6. Phase 5: lab (Storybook, `docs.nasaqui.com`, Mahaam Feedback verified).
7. Phase 6: native foundation (provider, Text, Button, Screen, ProductMark).
8. Phase 7: Electron layer (chrome factory, title bar, drag region, controls inset).
9. Phase 8: registry and site (`nasaq.json`, `/r/*`, validation).
10. **Review gate: Fady** (human). Catalog expansion (P1 inventory), the extension preset, the directory submission and npm publishing follow only after approval.
