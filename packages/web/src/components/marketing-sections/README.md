---
name: marketing-sections
title: Marketing sections
category: brand
status: beta
summary: Building blocks for a product page. How it works steps, a feature grid, a closing call to action banner, credit packs, aurora and grid backgrounds, a hero with an app mockup and a scripted AI session that plays back. They sit beside the existing feature story, plan cards and testimonials.
exports: [AuroraBackgroundProps, AuroraBackground, GridBackgroundProps, GridBackground, HowItWorksStep, HowItWorksProps, HowItWorks, FeatureGridItem, FeatureGridProps, FeatureGrid, CtaBannerProps, CtaBanner, PricingPack, PricingPacksLabels, PricingPacksProps, PricingPacks, AppMockupHeroProps, AppMockupHero, SessionPlaybackLabels, SessionPlaybackProps, SessionPlayback]
related: [feature-story, plan-card, testimonials, screenshot-frame, text-effects, subscription-landing]
story: components-brand-marketing-sections
keywords: [landing page, marketing, how it works, steps, feature grid, call to action, cta, pricing, credit packs, aurora, hero, mockup, ai session, playback, demo]
---

# Marketing sections

Pieces for building a landing page in the product's own brand. They are presentational: pass copy, icons and buttons, and they lay them out.

| Piece | What it is |
| --- | --- |
| `AppMockupHero` | Headline, buttons and a framed picture of the app over an aurora or grid backdrop. |
| `HowItWorks` | Three or four numbered steps joined by a line. |
| `FeatureGrid` | Short feature tiles: icon, title, one or two lines, optionally a link. |
| `PricingPacks` | One-off bundles of credits with a bonus, a unit price and a buy button. |
| `CtaBanner` | The closing ask: one title, one main button, an optional second. |
| `SessionPlayback` | A scripted AI conversation that types out like a recording, with play, pause and a scrubber. |
| `AuroraBackground` / `GridBackground` | Decorative backdrops you can put behind any section. |

Already in Nasaq and not repeated here: [`FeatureStory`](../feature-story/README.md) (one feature with a picture), [`PlanGrid` and `PlanCard`](../plan-card/README.md) (recurring
plans), [`TestimonialWall`](../testimonials/README.md) and [`SubscriptionLanding`](../subscription-landing/README.md).

## When to use

- A public product page, a launch page or an app-store style landing page.
- The empty or first-run screen of a product that must explain itself.

## When not to use

- Inside the working part of an app: use its own layout components.
- Recurring subscription plans: use `PlanGrid`.
- A live chat: use `Chat` or `CopilotChat`. `SessionPlayback` only replays a script.

## Import

```tsx
import { AppMockupHero, HowItWorks, FeatureGrid, PricingPacks, CtaBanner, SessionPlayback, AuroraBackground } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { AppMockupHero, Button, CtaBanner, FeatureGrid, HowItWorks } from "@fadymondy/nasaq/web";
import { Zap } from "lucide-react";

export function Page() {
  return (
    <main className="flex flex-col gap-20">
      <AppMockupHero
        title="Book seats in seconds"
        description="Plans, seat maps and payments in one place."
        actions={<Button variant="primary" size="lg">Start free</Button>}
        mockup={<img src="/app.png" alt="" />}
        mockupLabel="The seat map"
        frameTitle="app.example.com"
      />
      <HowItWorks title="How it works" steps={[{ title: "Create" }, { title: "Share" }, { title: "Sell" }]} />
      <FeatureGrid title="Everything you need" features={[{ icon: <Zap />, title: "Fast", description: "Pages load at once." }]} />
      <CtaBanner title="Ready to start?" action={<Button variant="primary">Create account</Button>} />
    </main>
  );
}
```

## Anatomy

```
AppMockupHero      data-slot="app-mockup-hero"    backdrop > eyebrow, h1, text, actions, proof, ScreenshotFrame (fades out at the bottom)
HowItWorks         data-slot="how-it-works"       intro + ol: number badge, line, title, text, optional media
FeatureGrid        data-slot="feature-grid"       intro + ul of tiles
PricingPacks       data-slot="pricing-packs"      intro + ul of article cards: name, credits, bonus, price, unit price, Buy
CtaBanner          data-slot="cta-banner"         panel (aurora when brand) with title, text, buttons, note
SessionPlayback    data-slot="session-playback"   header, role="log" transcript, play / scrubber / clock
AuroraBackground   data-slot="aurora-background"  drifting colour blobs behind children
GridBackground     data-slot="grid-background"    line or dot grid behind children
```

## API

### AppMockupHero

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `ReactNode` | none | Headline (renders the page's `h1`). |
| `eyebrow` / `description` / `actions` / `proof` | `ReactNode` | none | Small label, text, buttons and a line of proof. |
| `mockup` | `ReactNode` | none | The picture or live markup, inside a `ScreenshotFrame`. |
| `frame` | `"browser" \| "window" \| "phone"` | `"browser"` | Frame style. |
| `frameTitle` | `ReactNode` | none | Address or window title. |
| `mockupLabel` | `string` | none | Describes the mockup for screen readers; its content is then hidden and inert. |
| `background` | `"aurora" \| "grid" \| "none"` | `"aurora"` | Backdrop. |

### HowItWorks

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `steps` | `{ title, description?, icon?, media? }[]` | none | The steps. |
| `eyebrow` / `title` / `description` | `ReactNode` | none | Intro. |
| `layout` | `"row" \| "column"` | `"row"` | Side by side from a wide container, or always vertical. |
| `titleAs` | `"h2" \| "h3"` | `"h2"` | Heading level. |

### FeatureGrid

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `features` | `{ icon?, title, description?, href?, wide? }[]` | none | The tiles. `href` makes the tile a link; `wide` spans two columns. |
| `columns` | `2 \| 3 \| 4` | `3` | Columns at the widest. Sized by the container, not the screen. |
| `variant` | `"cards" \| "plain"` | `"cards"` | Bordered tiles or bare. |
| `align` | `"start" \| "center"` | `"start"` | Intro alignment. |
| `eyebrow` / `title` / `description` / `titleAs` | | | As `HowItWorks`. |

### CtaBanner

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `ReactNode` | none | The ask. |
| `description` / `note` | `ReactNode` | none | Supporting text and a line of reassurance. |
| `action` / `secondaryAction` | `ReactNode` | none | Buttons. Only one primary. |
| `tone` | `"brand" \| "neutral"` | `"brand"` | Brand panel with an aurora, or a quiet surface. |
| `layout` | `"center" \| "split"` | `"center"` | Buttons under the text, or at the inline end from a wide container. |

### PricingPacks

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `packs` | `PricingPack[]` | none | `{ id, name, credits, bonus?, price, currency?, highlighted?, badge?, description? }`. |
| `onPurchase` | `(pack) => void \| Promise<void>` | none | A pack was picked; the button shows loading until it settles. |
| `showUnitPrice` | `boolean` | `true` | Price per credit. |
| `labels` | `PricingPacksLabels` | en / ar | `buy`, `bonus`, `unit`, `perUnit`. |
| `eyebrow` / `title` / `description` / `titleAs` | | | Intro. |

### SessionPlayback

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `events` | `SessionEvent[]` | none | `{ role: "user" \| "assistant" \| "tool" \| "status", text, title?, delay? }`. |
| `title` | `ReactNode` | "AI session" | Header text. |
| `autoPlay` | `boolean` | `true` | Start when scrolled into view. Under reduced motion the whole session shows at once. |
| `loop` | `boolean` | `false` | Start again after the end. |
| `timing` | `{ wordMs?, gapMs?, holdMs? }` | 90 / 500 / 900 | Speed. |
| `names` | `{ user?, assistant? }` | You / Assistant | Names above messages. |
| `height` | `string` | `"22rem"` | Height of the transcript. |
| `onEnd` | `() => void` | none | The script finished. |
| `labels` / `lang` | | en / ar | Text overrides; language for word splitting. |

### AuroraBackground and GridBackground

`AuroraBackground`: `tone` (`"brand" \| "multi"`), `animate` (default true), `fade` (default true). `GridBackground`: `cell` (40), `pattern` (`"lines" \| "dots"`), `fade` (true). Both take `children`, which render above the backdrop.

### Helpers (pure, no React)

`sessionTimeline`, `sessionStateAt`, `sessionTimeFromRatio` and `formatSessionClock` are the timeline maths of `SessionPlayback`.

## Examples

```tsx
import { Button, PricingPacks } from "@fadymondy/nasaq/web";

export const Credits = () => (
  <PricingPacks
    title="Top up"
    packs={[
      { id: "s", name: "Starter", credits: 500, price: 9 },
      { id: "p", name: "Pro", credits: 2500, bonus: 250, price: 39, highlighted: true, badge: "Best value" },
    ]}
    onPurchase={async (pack) => { await fetch(`/buy/${pack.id}`, { method: "POST" }); }}
  />
);
```

## Accessibility

- One `h1` (the hero); sections use `h2` and their steps and tiles `h3`. Pass `titleAs="h3"` inside another section.
- The backdrops are `aria-hidden` and ignore the pointer. Motion in the aurora stops under reduced motion.
- `SessionPlayback` is a `role="log"` with live updates off, so it does not read itself out while typing. It has a labelled play / pause button and a labelled scrubber. Under reduced motion it shows the whole session and does not autoplay.
- A `mockupLabel` on the hero makes the framed picture one image with a description.

## RTL & i18n

- Everything uses logical placement (`start`, `end`), so steps, tiles and buttons mirror in Arabic; the connector line and play arrow mirror too.
- Step numbers, credit amounts and the playback clock use Latin digits in both languages.
- `SessionPlayback` reveals Arabic word by word, never letter by letter.

## Styling & tokens

Backdrops use `--nq-brand`, the tag colours and `--nq-line`. Panels use `bg-nq-selected`, `bg-card` and `border-border`. Layout follows the container width (`@container`), so a section works in a narrow column as well as a full page.

## Do / Don't

- Do give each page one hero and one final banner with one main button.
- Do describe steps with verbs ("Create", "Share", "Sell").
- Don't stack more than one aurora on a screen; it is a glow, not a pattern.
- Don't use `SessionPlayback` to promise features the product does not have.

## Related

- [`FeatureStory`](../feature-story/README.md)
- [`PlanCard`](../plan-card/README.md)
- [`TestimonialWall`](../testimonials/README.md)
- [`ScreenshotFrame`](../screenshot-frame/README.md)
- [`text-effects`](../text-effects/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-brand-marketing-sections--docs
