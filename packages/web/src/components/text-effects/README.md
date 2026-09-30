---
name: text-effects
title: Text effects
category: typography
status: beta
summary: Small motion effects for words on marketing and product pages, a flipping phrase, a shimmer, a marquee, a word by word reveal and handwritten notes and marks. All of them hold still under reduced motion and never split Arabic into letters.
exports: [TextFlipProps, TextFlip, TextShimmerProps, TextShimmer, MarqueeProps, Marquee, TextRevealProps, TextReveal, HandwrittenTone, HandwrittenNoteProps, HandwrittenNote, HandwrittenMarkKind, HandwrittenMarkTone, HandwrittenMarkProps, HandwrittenMark]
related: [ai-states, screenshot-frame, marketing-sections]
story: components-typography-text-effects
keywords: [text flip, rotating words, shimmer, marquee, ticker, reveal, handwritten, sticky note, underline, highlight, animation, reduced motion]
---

# Text effects

Six effects that give text a little life. Each one keeps the real text in the page for search engines and screen readers, and each one holds still when the visitor
prefers reduced motion. Arabic and other joining scripts are cut into words, never letters, because a letter animated alone breaks the joins and reads wrongly.

| Effect | Use it for |
| --- | --- |
| `TextFlip` | One word or phrase in a headline that rotates ("Built for teams / freelancers / clinics"). |
| `TextShimmer` | A light sweep across one line: a status such as "Thinking", or a highlighted word. For AI streaming states use `AiShimmer`. |
| `Marquee` | A row of logos or short items that slides sideways without end. |
| `TextReveal` | A paragraph or headline that appears word by word when it scrolls into view. |
| `HandwrittenNote` | A sticky note with a tape strip, for an aside or an annotation on a screenshot. |
| `HandwrittenMark` | A drawn underline, circle, highlight or strike over a few words. |

## When to use

- Marketing pages, empty states and onboarding where one moving element helps the eye.
- One effect per screen area. Two flipping phrases in one headline compete.

## When not to use

- Body text, tables, forms and anything read closely: motion there is a cost.
- Meaning that only motion carries. Every effect has static text that says the same thing.
- Streaming AI output: use the states in [`ai-states`](../ai-states/README.md).

## Import

```tsx
import { TextFlip, TextShimmer, Marquee, TextReveal, HandwrittenNote, HandwrittenMark, splitText } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { TextFlip } from "@fadymondy/nasaq/web";

export const Headline = () => (
  <h1>
    Run your clinic like a <TextFlip phrases={["team", "studio", "practice"]} />
  </h1>
);
```

## Anatomy

```
TextFlip         data-slot="text-flip"      visible phrase (aria-hidden) + one sr-only list of all phrases
TextShimmer      data-slot="text-shimmer"   text with a moving gradient clipped to it
Marquee          data-slot="marquee"        track with the children repeated; extra copies are aria-hidden and inert
TextReveal       data-slot="text-reveal"    real text for assistive tech + animated word spans (aria-hidden)
HandwrittenNote  data-slot="handwritten-note"   aside with a tape strip and an optional author
HandwrittenMark  data-slot="handwritten-mark"   the words plus an SVG stroke that draws itself
```

## API

### TextFlip

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `phrases` | `readonly string[]` | none | The words to rotate through. Give at least two. |
| `interval` | `number` | `2600` | Milliseconds each phrase stays. |
| `by` | `"word" \| "grapheme"` | `"word"` | How the phrase splits for the flip. Joining scripts always use words. |
| `paused` | `boolean` | `false` | Stop rotating. Hover and focus also stop it. |
| `loop` | `boolean` | `true` | Go back to the first phrase; when `false` it stops on the last. |
| `onIndexChange` | `(index: number) => void` | none | The visible phrase changed. |
| `lang` | `string` | active locale | Language of the phrases, for splitting. |

### TextShimmer

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `children` | `ReactNode` | none | The text. |
| `duration` | `number` | `2.4` | Seconds per sweep. |
| `paused` | `boolean` | `false` | Hold still. |

The sweep runs in the reading direction (right to left in Arabic).

### Marquee

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `speed` | `number` | `48` | Pixels per second. |
| `direction` | `"start" \| "end"` | `"start"` | Which way items travel, logical so it flips in RTL. |
| `pauseOnHover` | `boolean` | `true` | Pause while the pointer or focus is inside. |
| `paused` | `boolean` | `false` | Hold still. |
| `gap` | `number` | `32` | Pixels between items. |
| `fade` | `boolean` | `true` | Fade the edges. |

Under reduced motion the items wrap into a static row.

### TextReveal

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `text` | `string` | none | The text. |
| `by` | `"word" \| "grapheme"` | `"word"` | Grapheme is ignored for Arabic. |
| `as` | `"p" \| "h1".."h6" \| "span" \| "div"` | `"span"` | Element to render. |
| `immediate` | `boolean` | `false` | Play now instead of when scrolled into view. |
| `step` | `number` | `45` | Milliseconds between units (capped to a total). |
| `lang` | `string` | active locale | Language of the text. |

### HandwrittenNote

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `tone` | `"note" \| "info" \| "success" \| "brand" \| "neutral"` | `"note"` | Paper colour from the tag tokens. |
| `rotate` | `number` | `-2` | Tilt in degrees. |
| `tape` | `boolean` | `true` | The tape strip. |
| `author` | `ReactNode` | none | A signature line. |

Set `--nq-font-handwriting` to load a handwriting face you are licensed to use; the default is the system cursive stack. No font file ships with Nasaq.

### HandwrittenMark

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `kind` | `"underline" \| "circle" \| "highlight" \| "strike"` | `"underline"` | The stroke. |
| `tone` | `"brand" \| "danger" \| "warning" \| "success" \| "info"` | `"brand"` | Stroke colour. |
| `animate` | `boolean` | `true` | Draw the stroke when it mounts; drawn at once under reduced motion. |
| `delay` | `number` | `0` | Milliseconds before drawing. |

### Helpers (pure, no React)

`splitText(text, mode, locale)` returns tokens that join back to the input. `countTextTokens`, `revealTextTokens`, `nextFlipIndex`, `marqueeDuration`,
`marqueeCopies` and `textStaggerDelay` are the maths behind the effects.

## Examples

```tsx
import { Marquee, TextReveal } from "@fadymondy/nasaq/web";

export const Logos = () => (
  <Marquee speed={40}>
    {["Seatfor", "Mahaam", "Zekra", "Hosbah"].map((n) => <span key={n} className="text-h3">{n}</span>)}
  </Marquee>
);
export const Story = () => <TextReveal as="p" text="Nasaq draws the same product in every language." />;
```

## Accessibility

- Screen readers get the full text once: `TextFlip` lists every phrase in visually hidden text, `TextReveal` keeps the real string, `Marquee` hides its duplicate copies.
- Rotation and sliding stop while a person hovers or focuses inside, so they can read and click.
- Reduced motion: `TextFlip` shows the first phrase, `TextShimmer` and `Marquee` hold still, `TextReveal` and `HandwrittenMark` show the finished result at once.
- No effect carries information that the plain text does not.

## RTL & i18n

- Arabic and other joining scripts split into words (`hasJoiningScript`), never letters.
- The shimmer and the marquee follow the reading direction; the marquee direction is logical (`start` / `end`).
- Numbers inside phrases stay in their own order; use `<bdi>` around codes.

## Styling & tokens

Colours come from `--nq-*` tokens and the tag colours (notes and marks). Target the `data-slot` values above, or use `className` and `style`.

## Do / Don't

- Do keep phrases of similar length so the headline does not jump.
- Do use `HandwrittenMark` once or twice a page; it is a highlighter, not a texture.
- Don't flip long sentences; flip a word or a short phrase.
- Don't put a marquee of important links where people must click them while they move.

## Related

- [`ai-states`](../ai-states/README.md)
- [`screenshot-frame`](../screenshot-frame/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-typography-text-effects--docs
