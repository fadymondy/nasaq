---
name: testimonials
title: Testimonials
category: forms
status: beta
summary: A public form for people to leave a testimonial with a rating and consent, and a display as masonry wall, equal grid or spotlight, with a menu for moderation.
exports: [TestimonialForm, TestimonialFormProps, TestimonialSubmission, TestimonialWall, TestimonialWallProps, TestimonialLayout, TestimonialLabels]
related: [public-form, form-builder, avatar, rating]
story: components-forms-testimonials
base-ui: [field, checkbox]
keywords: [testimonial, review, quote, social proof, wall, spotlight, rating, consent, submit]
---

# Testimonials

Two pieces. `TestimonialForm` collects a testimonial from a customer: name, optional role and company, a star rating,
their words, consent to publish, and a hidden honeypot. `TestimonialWall` shows the approved ones as a masonry
**wall**, an equal **grid**, or a **spotlight** that steps through one large quote at a time.

## When to use

- A "share your experience" page and the social-proof section of a landing page.

## When not to use

- Product reviews with votes and replies: build those on `Field` and lists.
- An average score in a header: use [Rating](../rating/README.md).

## Import

```tsx
import { TestimonialForm, TestimonialWall, validateTestimonial } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { TestimonialForm, TestimonialWall } from "@fadymondy/nasaq/web";

export const Page = ({ items }: { items: React.ComponentProps<typeof TestimonialWall>["items"] }) => (
  <>
    <TestimonialWall items={items} layout="wall" />
    <TestimonialForm onSubmit={(s) => fetch("/api/testimonials", { method: "POST", body: JSON.stringify(s) })} />
  </>
);
```

## Anatomy

```
TestimonialForm     data-slot="testimonial-form": name, role, company, (email), rating group, quote + counter, consent, honeypot
TestimonialWall     data-slot="testimonial-wall" data-layout="wall|grid|spotlight"
└─ figure           data-slot="testimonial": stars, blockquote, figcaption (Avatar, name, role and company)
```

## API

### `TestimonialForm`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `onSubmit?` | `(submission) => void \| Promise<void>` | none | `{ name, role, company, email, quote, rating, consent }`, trimmed. Bots never reach it. |
| `askRating?` / `requireRating?` | `boolean` | `true` / `false` | |
| `askEmail?` / `askRole?` | `boolean` | `false` / `true` | |
| `requireConsent?` | `boolean` | `true` | Must agree before sending. |
| `thanks?` | `ReactNode` | localised | Shown after sending. |
| `locale?` / `labels?` | | provider locale | |

### `TestimonialWall`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `items` | `Testimonial[]` | required | `{ id, name, role?, company?, quote, rating?, avatarUrl?, featured?, date? }`. |
| `layout?` | `"wall" \| "grid" \| "spotlight"` | `"wall"` | Spotlight orders featured first, then rating, then newest. |
| `itemActions?` | `(item) => ContextMenuAction[]` | none | Approve, feature, hide, delete. Opens on context-click, long-press, Shift+F10 or the Menu key. |
| `autoAdvance?` | `number` (ms) | off | Spotlight only. Pauses on hover and focus, never runs with reduced motion. |
| `empty?` | `ReactNode` | localised | |

### Logic (exported)

`validateTestimonial(input, { requireConsent?, requireRating? })`, `testimonialStats(list)`, `testimonialOrder(list)`, `testimonialStep(index, step, length)`, `TESTIMONIAL_QUOTE_MIN` and `TESTIMONIAL_QUOTE_MAX`.

## Examples

### Moderation menu

```tsx
import { TestimonialWall, type Testimonial } from "@fadymondy/nasaq/web";

export const Moderate = ({ items, hide }: { items: Testimonial[]; hide: (id: string) => void }) => (
  <TestimonialWall items={items} layout="grid" itemActions={(t) => [{ id: "hide", label: "Hide", danger: true, onSelect: () => hide(t.id) }]} />
);
```

## Accessibility

- The rating is a group of five labelled toggle buttons ("3 stars"); a rated testimonial reads "Rated 5 out of 5".
- Cards with actions are focusable so the keyboard can open their menu.
- The spotlight is a carousel with previous and next buttons and one dot button per quote, each named.

## RTL & i18n

- All text has Arabic and English defaults; quotes are shown as written, in their own direction.
- Previous and next arrows flip in Arabic. The quote length counts characters, so Arabic is not penalised.

## Styling & tokens

Cards use `--nq-card`/border tokens; stars use the accent token. The wall uses CSS columns (1, 2, then 3 from `lg`).

## Do / Don't

- **Do** ask for consent and only show approved testimonials.
- **Do** keep the honeypot.
- **Don't** invent testimonials or ratings.

## Related

- [PublicForm](../public-form/README.md) · [Avatar](../avatar/README.md) · [Rating](../rating/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-forms-testimonials--docs
