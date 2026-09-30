---
name: tabs
title: Tabs
category: navigation
status: beta
summary: Switches between views of the same subject without leaving the page; segmented or underline style with a sliding indicator, built on Base UI Tabs.
exports: [Tabs, TabsList, TabsTab, TabsIndicator, TabsPanel, TabsListProps]
related: [button, card, screenshot-frame]
story: components-navigation-tabs
base-ui: [tabs]
keywords: [tabs, tablist, panel, segmented, underline, switch, sections, views]
---

# Tabs

Shows one panel at a time out of several that describe the same subject: screenshots of a product, the sections of a settings page. It wraps Base UI Tabs, so roles, focus and keyboard behaviour come from Base UI. Nasaq adds two visual variants and a sliding indicator that follows the active tab.

## When to use

- Two to six views of the same thing, where the user compares or switches back and forth.
- Page sections on one URL (`variant="underline"`).
- A few short options inside a card or dialog (`variant="segmented"`).

## When not to use

- Site or app navigation between pages: use links in [`AppShell`](../app-shell/README.md) navigation, not tabs.
- Content that should all be visible at once or read in order: use plain sections.
- Choosing a value in a form: use a radio group or select.

## Import

```tsx
import { Tabs, TabsList, TabsTab, TabsIndicator, TabsPanel, type TabsListProps } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "@fadymondy/nasaq/web";

export function ProductTabs() {
  return (
    <Tabs defaultValue="board">
      <TabsList>
        <TabsTab value="board">Board</TabsTab>
        <TabsTab value="timeline">Timeline</TabsTab>
        <TabsIndicator />
      </TabsList>
      <TabsPanel value="board">Board view</TabsPanel>
      <TabsPanel value="timeline">Timeline view</TabsPanel>
    </Tabs>
  );
}
```

## Anatomy

```
Tabs                     data-slot="tabs"            Base UI Tabs.Root (flex column, gap-4)
├─ TabsList              data-slot="tabs-list"       data-variant="segmented|underline"
│  ├─ TabsTab            data-slot="tabs-tab"        one per panel (button, role=tab)
│  └─ TabsIndicator      data-slot="tabs-indicator"  put last inside the list
└─ TabsPanel             data-slot="tabs-panel"      one per tab (role=tabpanel)
```

## API

All parts forward their remaining props to the matching Base UI part (`Tabs.Root`, `Tabs.List`, `Tabs.Tab`, `Tabs.Indicator`, `Tabs.Panel`), including `className`, which is merged with the defaults.

### `Tabs`

`ComponentProps<typeof BaseTabs.Root>`. Common props from Base UI:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value?` | `string \| number` | none | Controlled active tab. |
| `defaultValue?` | `string \| number` | first tab | Initial active tab when uncontrolled. |
| `onValueChange?` | `(value) => void` | none | Called when the active tab changes. |
| `orientation?` | `"horizontal" \| "vertical"` | `"horizontal"` | Sets which arrow keys move between tabs. |
| `className?` | `string` | none | Merged onto the root (`flex flex-col gap-4`). |

### `TabsList`

`TabsListProps extends ComponentProps<typeof BaseTabs.List>`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `variant?` | `"segmented" \| "underline"` | `"segmented"` | `segmented`: tabs in a tinted track, for a few short options. `underline`: a line under the active tab, for page sections. Also applied to `TabsTab` and `TabsIndicator`. |
| `activateOnFocus?` | `boolean` | `false` | Base UI: select a tab as soon as it is focused with the arrow keys. |
| `className?` | `string` | none | Merged onto the list. The list scrolls sideways when tabs do not fit. |

### `TabsTab`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `string \| number` | required | Matches the `value` of its `TabsPanel`. |
| `disabled?` | `boolean` | `false` | Not selectable; dimmed. |
| `className?` | `string` | none | Merged onto the tab. |

### `TabsIndicator`

Takes Base UI `Tabs.Indicator` props. Renders the sliding highlight (behind the tab in `segmented`, a 2px line under it in `underline`). Place it last inside `TabsList`.

### `TabsPanel`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `string \| number` | required | Matches the `value` of its `TabsTab`. |
| `keepMounted?` | `boolean` | `false` | Base UI: keep the hidden panel in the DOM. |
| `className?` | `string` | none | Merged onto the panel. |

## Examples

### Underline variant for page sections

```tsx
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "@fadymondy/nasaq/web";

export function SettingsTabs() {
  return (
    <Tabs defaultValue="general">
      <TabsList variant="underline">
        <TabsTab value="general">General</TabsTab>
        <TabsTab value="members">Members</TabsTab>
        <TabsTab value="billing" disabled>
          Billing
        </TabsTab>
        <TabsIndicator />
      </TabsList>
      <TabsPanel value="general">General settings</TabsPanel>
      <TabsPanel value="members">Members</TabsPanel>
    </Tabs>
  );
}
```

### Controlled, Arabic

```tsx
import { useState } from "react";
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "@fadymondy/nasaq/web";

export function ArabicTabs() {
  const [value, setValue] = useState<string | number>("board");
  return (
    <Tabs value={value} onValueChange={setValue} dir="rtl">
      <TabsList>
        <TabsTab value="board">اللوحة</TabsTab>
        <TabsTab value="timeline">الجدول الزمني</TabsTab>
        <TabsIndicator />
      </TabsList>
      <TabsPanel value="board">عرض اللوحة</TabsPanel>
      <TabsPanel value="timeline">عرض الجدول الزمني</TabsPanel>
    </Tabs>
  );
}
```

## Accessibility

Base UI provides `role="tablist"`, `role="tab"` with `aria-selected` and `aria-controls`, and `role="tabpanel"` with `aria-labelledby`.

| Key | Action |
| --- | --- |
| `Tab` | Moves focus into the tab list (to the active tab), then into the active panel. |
| `ArrowRight` / `ArrowLeft` | Next / previous tab. They follow the reading direction: in RTL, `ArrowLeft` moves to the next tab. |
| `Home` / `End` | First / last tab. |
| `ArrowDown` / `ArrowUp` | Next / previous tab when `orientation="vertical"`. |
| `Enter` / `Space` | Selects the focused tab (when `activateOnFocus` is off). |

- `TabsPanel` is focusable and shows a focus ring, so keyboard users can reach panel content.
- The caller localises every tab label. Keep them short; the list does not wrap.
- Disabled tabs cannot be selected and are dimmed to 50%.

## RTL & i18n

- Tab order, the indicator and the scroll direction mirror with `dir="rtl"`. The indicator uses Base UI's measured left and width, so it follows the active tab in both directions.
- Arrow keys follow the reading direction, as in the table above.
- Numbers in labels ("Issues 12"): isolate with `Num` from the numeric component.
- No built-in strings.

## Styling & tokens

- Tokens: `bg-secondary` (segmented track), `bg-background` and `shadow-xs` (segmented indicator), `bg-primary` (underline indicator), `border-border`, `text-muted-foreground`, `text-foreground`, `text-label`, `outline-nq-focus`, `rounded-control`.
- State attributes: `data-active` on the active tab, `data-disabled` on disabled tabs, `data-variant` on the list.
- Target with `[data-slot=tabs-tab]`, `[data-slot=tabs-indicator]`. Extend with `className`. Do not recolour with raw hex.
- Icons inside a tab are sized to `size-4` automatically.

## Do / Don't

- **Do** put `TabsIndicator` last inside `TabsList`.
- **Do** match every `TabsTab` `value` to one `TabsPanel` `value`.
- **Do** use `segmented` for a few short options and `underline` for page sections.
- **Don't** use tabs for navigation between routes.
- **Don't** hide required form fields inside inactive tabs.
- **Don't** add so many tabs that the list must scroll.

## Related

- [Button](../button/README.md) · [Card](../card/README.md) · [ScreenshotFrame](../screenshot-frame/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-navigation-tabs--docs
