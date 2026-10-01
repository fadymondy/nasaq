# Nasaq for Vue 3

`@fadymondy/nasaq/vue` is a set of Vue 3 components (`Nq*`) that render the same `.nq-*` markup as the
[plain HTML layer](./html.md), so a Vue screen and a React screen look the same. The components follow Vue conventions:
`v-model`, slots and emits. Arabic, RTL, dark mode and brand palettes work the same way as in React.

## Install

```bash
npm i @fadymondy/nasaq vue
```

```ts
// main.ts
import { createApp } from "vue";
import Nasaq from "@fadymondy/nasaq/vue";
import "@fadymondy/nasaq/html.css";
import App from "./App.vue";

createApp(App).use(Nasaq).mount("#app");   // registers NasaqProvider and every Nq* component globally
```

Or import only what a file uses (tree-shaken):

```vue
<script setup lang="ts">
import { NqButton, NqCard } from "@fadymondy/nasaq/vue";
</script>
```

With Tailwind v4 in the app, import Tailwind first and then `@fadymondy/nasaq/html.css`. The components sit in
`@layer components`, so utilities still win: `<NqButton class="mt-4">`.

## Provider

Wrap the app once. The provider writes `lang`, `dir`, `data-theme`, `data-brand` and `data-density` to `<html>`,
and the tokens and components follow those attributes.

```vue
<template>
  <NasaqProvider brand="nasaq" default-theme="system" default-locale="en">
    <RouterView />
  </NasaqProvider>
</template>
```

| Prop | Default | |
| --- | --- | --- |
| `brand` | `"nasaq"` | A brand key: nasaq, fadymondy, mahaam, zekra, moharrik, seatfor, health-debug, circlexo, hosbah, orchestra, togo. |
| `theme` / `v-model:theme` | — | `"light" \| "dark" \| "system"`. Omit it and the provider owns the theme (saved in `localStorage`). |
| `defaultTheme` | `"system"` | |
| `locale` / `v-model:locale` | — | `"en"`, `"ar"`, … Arabic sets `dir="rtl"`. |
| `defaultLocale` | `"en"` | |
| `direction` | from the locale | Force `"ltr"` or `"rtl"`. |
| `density` | `"compact"` | `"compact" \| "comfortable"`. |
| `currency` | USD, or SAR in Arabic | ISO 4217 code used by every `NqMoney` below it. |
| `target` | `"document"` | `"scope"` puts the attributes on a wrapping `<div>` instead (embeds, previews). |

Inside the provider:

```ts
import { useNasaq, useCurrency, useToast } from "@fadymondy/nasaq/vue";

const nasaq = useNasaq();      // { locale, direction, isRtl, theme, resolvedTheme, brand, currency, setTheme, setLocale }
nasaq.setLocale("ar");
const currency = useCurrency(); // ComputedRef<string>: the provider's currency
const { toast, success, error } = useToast();
success("Saved", "Your profile is up to date.");
```

## Components

### Actions and display

```vue
<NqButton variant="primary" @click="save">Save</NqButton>     <!-- primary, secondary (default), ghost, danger, link -->
<NqButton size="icon" aria-label="Archive"><ArchiveIcon /></NqButton>   <!-- sm, md, lg, icon, icon-sm -->
<NqButton variant="primary" loading>Saving</NqButton>
<NqButton as="a" href="/docs" variant="link">Docs</NqButton>
<NqButton type="submit" full>Continue</NqButton>

<NqBadge variant="success">Paid</NqBadge>                     <!-- secondary, outline, brand, accent, success, warning, danger, info -->
<NqBadge tag="teal">New</NqBadge>

<NqAvatar name="Layla Haddad" src="/u/layla.jpg" size="sm" />   <!-- initials when there is no src -->
<NqKbd>⌘K</NqKbd> <NqSeparator /> <NqSpinner /> <NqSkeleton style="height:1rem;width:8rem" />
<NqProgress :value="64" label="Goal" tone="success" />
```

### Card

```vue
<NqCard>
  <NqCardHeader>
    <NqCardTitle>Profile</NqCardTitle>
    <NqCardDescription>Shown on invoices.</NqCardDescription>
    <NqCardAction><NqButton size="sm">Edit</NqButton></NqCardAction>
  </NqCardHeader>
  <NqCardContent>…</NqCardContent>
  <NqCardFooter><NqButton variant="primary">Save</NqButton></NqCardFooter>
</NqCard>
```

### Forms

`NqField` wires the label, hint and error to the control inside it (`id`, `aria-describedby` and `aria-invalid`), so the
control needs no ids.

```vue
<NqField label="Email" hint="We never share it." :error="errors.email" required>
  <NqInput v-model="email" type="email" />
</NqField>
<NqField label="Notes"><NqTextarea v-model="notes" :rows="4" /></NqField>
<NqField label="Plan">
  <NqSelect v-model="plan" placeholder="Choose…" :options="[{ value: 'starter', label: 'Starter' }, { value: 'team', label: 'Team' }]" />
</NqField>

<NqCheckbox v-model="receipts" label="Send receipts" />
<NqSwitch v-model="digest" label="Weekly digest" />
<NqRadio v-model="plan" value="starter" label="Starter" />
<NqRadio v-model="plan" value="team" label="Team" />
```

### Overlays

```vue
<NqButton variant="primary" @click="open = true">Invite people</NqButton>
<NqDialog v-model:open="open" title="Invite people" description="They get an email with a link to join.">
  <NqField label="Email"><NqInput v-model="email" type="email" /></NqField>
  <template #footer>
    <NqButton @click="open = false">Cancel</NqButton>
    <NqButton variant="primary" @click="send">Send invite</NqButton>
  </template>
</NqDialog>
```

`NqDialog` props: `title` (required), `description`, `size` (`sm`, `md`, `lg`), `variant` (`dialog` or `sheet`),
`dismissible` (default `true`) and `closeLabel`. It emits `update:open` and `close`.

```vue
<NqMenu label="Row actions" :items="[
  { label: 'Edit', onSelect: edit },
  { label: 'Open', href: '/orders/1042' },
  { separator: true, label: '' },
  { label: 'Delete', variant: 'danger', onSelect: remove },
]">
  <template #trigger><NqButton>Actions</NqButton></template>
</NqMenu>

<NqTooltip content="Archive"><NqButton size="icon" aria-label="Archive">…</NqButton></NqTooltip>   <!-- side="top" | "bottom" -->
```

### Navigation

```vue
<NqTabs v-model="tab" default-value="overview">
  <NqTabsList label="Order">
    <NqTabsTrigger value="overview">Overview</NqTabsTrigger>
    <NqTabsTrigger value="items">Items</NqTabsTrigger>
  </NqTabsList>
  <NqTabsPanel value="overview">…</NqTabsPanel>
  <NqTabsPanel value="items">…</NqTabsPanel>
</NqTabs>

<NqAccordionItem title="Can I change plans later?" name="faq" open>Yes, any time.</NqAccordionItem>   <!-- same name = one open at a time -->

<NqBreadcrumb :items="[{ label: 'Home', href: '/' }, { label: 'Orders', href: '/orders' }, { label: '#1042' }]" />
<NqPagination v-model="page" :page-count="12" />
```

### Table and money

```vue
<NqTable :columns="columns" :rows="rows" row-key="id" caption="Recent orders" density="compact">
  <template #cell-status="{ row }"><NqBadge :variant="row.status === 'Paid' ? 'success' : 'warning'">{{ row.status }}</NqBadge></template>
  <template #cell-total="{ row }"><NqMoney :amount="row.total" /></template>
  <template #empty>No orders yet.</template>
</NqTable>
```

```ts
const columns: TableColumn[] = [
  { key: "id", label: "Order" },
  { key: "status", label: "Status" },
  { key: "total", label: "Total", numeric: true },        // right-aligned, tabular figures (left in RTL)
];
```

```vue
<NqMoney :amount="1280" />                     <!-- $1,280.00; SAR under an Arabic provider -->
<NqMoney :amount="79" :compare-at="99" />      <!-- sale price with the old price struck through -->
<NqMoney :amount="14200" currency="EUR" compact />
```

### Status

```vue
<NqAlert tone="warning" title="Payment overdue">Invoice #1042 is 5 days late.</NqAlert>   <!-- slots: icon, action -->
<NqEmpty title="No orders yet" description="Orders show up here once customers check out.">
  <NqButton variant="primary">Create order</NqButton>
</NqEmpty>
```

## Nuxt

Add a plugin file and the stylesheet:

```ts
// plugins/nasaq.ts
import Nasaq from "@fadymondy/nasaq/vue";
export default defineNuxtPlugin((nuxt) => nuxt.vueApp.use(Nasaq));
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({ css: ["@fadymondy/nasaq/html.css"] });
```

## Rules

- Use only the props listed here. To customise, pass a class for layout, or drop to the [plain HTML classes](./html.md).
- Colours come from tokens; never hard-code hex.
- Money is USD by default and SAR in Arabic. Set `currency` on the provider or on `NqMoney` only when the business needs another currency.
- Icon-only buttons need an `aria-label`.
