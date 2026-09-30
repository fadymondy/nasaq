---
name: accordion
title: Accordion
category: layout
status: beta
summary: Stack of collapsible sections, one open at a time or several, with a rotating chevron and animated height. Wraps Base UI Accordion.
exports: [Accordion, AccordionItem, AccordionTrigger, AccordionPanel]
related: [collapsible, tabs, card]
story: components-layout-accordion
base-ui: [accordion]
keywords: [accordion, faq, expand, collapse, sections, disclosure]
---

# Accordion

A vertical list of headings that each reveal a panel. By default opening one closes the others; with `multiple`
any number can stay open. The panel animates height and opacity over 200ms, the same motion as `Collapsible`.

## When to use

- FAQs, settings groups, and long content the user scans by heading.

## When not to use

- One independent show/hide: use `Collapsible`.
- Switching between peer views: use `Tabs`.

## Import

```tsx
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from "@fadymondy/nasaq/web";

export function Faq() {
  return (
    <Accordion defaultValue={["plan"]}>
      <AccordionItem value="plan">
        <AccordionTrigger>Can I change my plan later?</AccordionTrigger>
        <AccordionPanel>Yes, any time from the billing page.</AccordionPanel>
      </AccordionItem>
      <AccordionItem value="pay">
        <AccordionTrigger>Which payment methods do you accept?</AccordionTrigger>
        <AccordionPanel>Mada, Visa and Mastercard.</AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
}
```

## Anatomy

```
<Accordion>            data-slot="accordion"
└─ <AccordionItem>     data-slot="accordion-item"
   ├─ <AccordionTrigger>  data-slot="accordion-trigger" (inside accordion-header), data-panel-open when open
   └─ <AccordionPanel>    data-slot="accordion-panel"
```

## API

### Accordion

All Base UI `Accordion.Root` props:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `multiple` | `boolean` | `false` | Allow several open panels. |
| `value` / `defaultValue` | `string[]` | none | Values of the open items. Always an array. |
| `onValueChange` | `(value, details) => void` | none | Called when the open set changes. |
| `disabled` | `boolean` | `false` | Disable every item. |
| `keepMounted` | `boolean` | `false` | Keep closed panels in the DOM. |
| `hiddenUntilFound` | `boolean` | `false` | Let browser find-in-page open panels. |
| `loopFocus` | `boolean` | `true` | Wrap arrow-key focus at the ends. |

### AccordionItem

Base UI `Accordion.Item`: `value` (required to control it), `disabled`.

### AccordionTrigger / AccordionPanel

Base UI `Trigger` and `Panel` props. The trigger adds the chevron; the panel wraps children in a padded block.

## Examples

Several open, in Arabic:

```tsx
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from "@fadymondy/nasaq/web";

export function SettingsAr() {
  return (
    <Accordion multiple defaultValue={["n", "l"]}>
      <AccordionItem value="n">
        <AccordionTrigger>الإشعارات</AccordionTrigger>
        <AccordionPanel>اختر متى نراسلك.</AccordionPanel>
      </AccordionItem>
      <AccordionItem value="l">
        <AccordionTrigger>اللغة</AccordionTrigger>
        <AccordionPanel>العربية أو الإنجليزية.</AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
}
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Moves between triggers. |
| Enter / Space | Toggles the focused panel. |
| ArrowDown / ArrowUp | Moves focus to the next / previous trigger. |
| Home / End | First / last trigger. |

- Triggers are buttons inside headings with `aria-expanded` and `aria-controls`. Localise the trigger text.

## RTL & i18n

The title sits at the inline start and the chevron at the inline end. The chevron points down and rotates 180 degrees, so it never needs mirroring.

## Styling & tokens

`border-border`, `bg-card`, `hover:bg-nq-hover`, focus ring `nq-focus`, `text-muted-foreground` panel text. State attributes:
`data-panel-open` (trigger), `data-open`, `data-disabled`. `className` merges onto each part. Reduced motion turns the animation off.

## Do / Don't

- Do write trigger titles as questions or short nouns.
- Don't hide content the user must see to complete a task.

## Related

[collapsible](../collapsible/README.md), [tabs](../tabs/README.md).

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-layout-accordion--docs
