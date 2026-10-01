# Nasaq framework kit

The kit shows each component in React (the main package), shadcn, plain HTML, Alpine, Vue and Blade, with the same snippet in each stack. Each `## name` matches the React
component of the same name (`get_component("button")`). Setup is covered per stack: [HTML](./html.md), [Vue](./vue.md),
[Alpine](./alpine.md), [Laravel / Livewire / Filament](./filament.md).

<!-- Format (read by packages/mcp): "## <react component name>", a one-line summary, then "### react", "### html", "### alpine",
     "### vue", "### blade" sections, each holding one fenced block. A missing section means "use the html snippet".
     "### shadcn" is generated: the react snippet with imports from @/components/ui/<file> after `npx shadcn@latest add @nasaq/<name>`. -->

## button
Actions. Variants primary, secondary (default), ghost, danger, link; sizes sm, md, lg, icon, icon-sm.

### react
```tsx
import { Button } from "@fadymondy/nasaq/web";

<Button variant="primary">Save</Button>
<Button size="icon" aria-label="Archive">…</Button>
<Button variant="primary" loading>Saving</Button>
```

### html
```html
<button class="nq-button" data-variant="primary">Save</button>
<button class="nq-button" data-size="icon" aria-label="Archive">…</button>
<button class="nq-button" data-variant="primary" aria-busy="true" disabled><span class="nq-spinner" aria-hidden="true"></span>Saving</button>
```

### vue
```vue
<NqButton variant="primary" @click="save">Save</NqButton>
<NqButton size="icon" aria-label="Archive">…</NqButton>
<NqButton variant="primary" loading>Saving</NqButton>
```

### blade
```blade
<x-nq.button variant="primary" wire:click="save">Save</x-nq.button>
<x-nq.button href="/orders/new">New order</x-nq.button>
<x-nq.button variant="primary" :loading="true">Saving</x-nq.button>
```

## badge
Status and tags. Variants secondary, outline, brand, accent, success, warning, danger, info; or a tag colour.

### react
```tsx
import { Badge } from "@fadymondy/nasaq/web";

<Badge variant="success">Paid</Badge>
<Badge variant="tag" hue="teal">New</Badge>
```

### html
```html
<span class="nq-badge" data-variant="success">Paid</span>
<span class="nq-badge" data-tag="teal">New</span>
```

### vue
```vue
<NqBadge variant="success">Paid</NqBadge>
<NqBadge tag="teal">New</NqBadge>
```

### blade
```blade
<x-nq.badge variant="success">Paid</x-nq.badge>
<x-nq.badge tag="teal">New</x-nq.badge>
```

## card
A surface with header, content and footer.

### react
```tsx
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@fadymondy/nasaq/web";

<Card>
  <CardHeader>
    <CardTitle as="h3">Profile</CardTitle>
    <CardDescription>Shown on invoices.</CardDescription>
  </CardHeader>
  <CardContent>…</CardContent>
  <CardFooter><Button variant="primary">Save</Button></CardFooter>
</Card>
```

### html
```html
<div class="nq-card">
  <div class="nq-card-header"><h3 class="nq-card-title">Profile</h3><p class="nq-card-description">Shown on invoices.</p></div>
  <div class="nq-card-content">…</div>
  <div class="nq-card-footer"><button class="nq-button" data-variant="primary">Save</button></div>
</div>
```

### vue
```vue
<NqCard>
  <NqCardHeader><NqCardTitle>Profile</NqCardTitle><NqCardDescription>Shown on invoices.</NqCardDescription></NqCardHeader>
  <NqCardContent>…</NqCardContent>
  <NqCardFooter><NqButton variant="primary">Save</NqButton></NqCardFooter>
</NqCard>
```

### blade
```blade
<x-nq.card title="Profile" description="Shown on invoices.">
    …
    <x-slot:footer><x-nq.button variant="primary">Save</x-nq.button></x-slot:footer>
</x-nq.card>
```

## alert
An inline message. Tones info, success, warning, danger.

### react
```tsx
import { Alert } from "@fadymondy/nasaq/web";

<Alert tone="warning" title="Payment overdue">
  Invoice #1042 is 5 days late.
</Alert>
```

### html
```html
<div class="nq-alert" data-tone="warning" role="status">
  <div><p class="nq-alert-title">Payment overdue</p><div class="nq-alert-description">Invoice #1042 is 5 days late.</div></div>
</div>
```

### vue
```vue
<NqAlert tone="warning" title="Payment overdue">Invoice #1042 is 5 days late.</NqAlert>
```

### blade
```blade
<x-nq.alert tone="warning" title="Payment overdue">Invoice #1042 is 5 days late.</x-nq.alert>
```

## field
Label, control, hint and error, wired for screen readers. Covers input, textarea and select.

### react
```tsx
import { Field, FieldError, FieldLabel, Input, Textarea } from "@fadymondy/nasaq/web";

<Field invalid>
  <FieldLabel>Email</FieldLabel>
  <Input type="email" aria-invalid />
  <FieldError match>Enter a full email address.</FieldError>
</Field>
<Field>
  <FieldLabel>Notes</FieldLabel>
  <Textarea rows={3} />
</Field>
```

### html
```html
<div class="nq-field">
  <label class="nq-field-label" for="email">Email</label>
  <input class="nq-input" id="email" type="email" aria-invalid="true" aria-describedby="email-error">
  <p class="nq-field-error" id="email-error">Enter a full email address.</p>
</div>
<textarea class="nq-textarea" rows="3"></textarea>
<select class="nq-select"><option>Starter</option><option>Team</option></select>
```

### alpine
```html
<div class="nq-field" x-data="{ email: '' }">
  <label class="nq-field-label" for="email">Email</label>
  <input class="nq-input" id="email" type="email" x-model="email" :aria-invalid="email && !email.includes('@')">
</div>
```

### vue
```vue
<NqField label="Email" :error="errors.email" hint="We never share it." required>
  <NqInput v-model="email" type="email" />
</NqField>
<NqField label="Plan"><NqSelect v-model="plan" :options="[{ value: 'team', label: 'Team' }]" /></NqField>
<NqField label="Notes"><NqTextarea v-model="notes" /></NqField>
```

### blade
```blade
<x-nq.field name="email" label="Email" hint="We never share it." required>
    <x-nq.input name="email" type="email" wire:model="email" />
</x-nq.field>
<x-nq.field name="plan" label="Plan"><x-nq.select name="plan" :options="['team' => 'Team']" wire:model="plan" /></x-nq.field>
<x-nq.field name="notes" label="Notes"><x-nq.textarea name="notes" wire:model="notes" /></x-nq.field>
```

## checkbox
A checkbox with its label.

### react
```tsx
import { Checkbox } from "@fadymondy/nasaq/web";

<label className="flex items-center gap-2">
  <Checkbox /> Send receipts
</label>
```

### html
```html
<label class="nq-choice"><input type="checkbox" class="nq-checkbox"> <span>Send receipts</span></label>
```

### vue
```vue
<NqCheckbox v-model="receipts" label="Send receipts" />
```

### blade
```blade
<x-nq.checkbox wire:model="receipts" label="Send receipts" />
```

## switch
An on/off setting.

### react
```tsx
import { Switch } from "@fadymondy/nasaq/web";

<label className="flex items-center gap-2">
  <Switch /> Weekly digest
</label>
```

### html
```html
<label class="nq-choice"><input type="checkbox" class="nq-switch" role="switch"> <span>Weekly digest</span></label>
```

### vue
```vue
<NqSwitch v-model="digest" label="Weekly digest" />
```

### blade
```blade
<x-nq.checkbox wire:model="digest" label="Weekly digest" switch />
```

## radio-group
One choice from a few.

### react
```tsx
import { Radio, RadioGroup } from "@fadymondy/nasaq/web";

<RadioGroup defaultValue="team" aria-label="Plan">
  <label className="flex items-center gap-2"><Radio value="starter" /> Starter</label>
  <label className="flex items-center gap-2"><Radio value="team" /> Team</label>
</RadioGroup>
```

### html
```html
<div role="radiogroup" aria-label="Plan">
  <label class="nq-choice"><input type="radio" class="nq-radio" name="plan" value="starter"> <span>Starter</span></label>
  <label class="nq-choice"><input type="radio" class="nq-radio" name="plan" value="team" checked> <span>Team</span></label>
</div>
```

### vue
```vue
<div role="radiogroup" aria-label="Plan">
  <NqRadio v-model="plan" value="starter" label="Starter" />
  <NqRadio v-model="plan" value="team" label="Team" />
</div>
```

## dialog
A modal with a title, body and footer actions. In HTML, Vue and Blade `variant="sheet"` makes it a side sheet.

### react
```tsx
import {
  Button, Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@fadymondy/nasaq/web";

<Dialog>
  <DialogTrigger render={<Button />}>Invite people</DialogTrigger>
  <DialogContent>
    <DialogHeader><DialogTitle>Invite people</DialogTitle></DialogHeader>
    …
    <DialogFooter>
      <DialogClose render={<Button />}>Cancel</DialogClose>
      <DialogClose render={<Button variant="primary" />}>Send invite</DialogClose>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### html
```html
<button class="nq-button" data-nq-open="invite">Invite people</button>
<dialog id="invite" class="nq-dialog" data-nq="dialog" aria-labelledby="invite-title">
  <div class="nq-dialog-header"><h2 class="nq-dialog-title" id="invite-title">Invite people</h2></div>
  …
  <div class="nq-dialog-footer">
    <button class="nq-button" data-nq-close>Cancel</button>
    <button class="nq-button" data-variant="primary" data-nq-close="send">Send invite</button>
  </div>
  <button class="nq-dialog-close" data-nq-close aria-label="Close">×</button>
</dialog>
```

### alpine
```html
<div x-data="nqDialog">
  <button class="nq-button" data-variant="primary" @click="show()">Invite people</button>
  <dialog class="nq-dialog" aria-labelledby="invite-title">
    <div class="nq-dialog-header"><h2 class="nq-dialog-title" id="invite-title">Invite people</h2></div>
    <div class="nq-dialog-footer"><button class="nq-button" @click="close()">Cancel</button></div>
  </dialog>
</div>
```

### vue
```vue
<NqButton variant="primary" @click="open = true">Invite people</NqButton>
<NqDialog v-model:open="open" title="Invite people" description="They get an email.">
  …
  <template #footer><NqButton @click="open = false">Cancel</NqButton></template>
</NqDialog>
```

### blade
```blade
<x-nq.button variant="primary" data-nq-open="invite">Invite people</x-nq.button>
<x-nq.dialog id="invite" title="Invite people" wire:ignore.self>
    …
    <x-slot:footer><x-nq.button data-nq-close>Cancel</x-nq.button></x-slot:footer>
</x-nq.dialog>
```

## dropdown-menu
A dropdown of actions.

### react
```tsx
import {
  Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@fadymondy/nasaq/web";

<DropdownMenu>
  <DropdownMenuTrigger render={<Button />}>Actions</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Edit</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="danger">Delete</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### html
```html
<button class="nq-button" data-nq="menu" aria-controls="row-actions">Actions</button>
<div class="nq-menu" id="row-actions" role="menu" hidden>
  <button class="nq-menu-item" role="menuitem">Edit</button>
  <div class="nq-menu-separator" role="separator"></div>
  <button class="nq-menu-item" role="menuitem" data-variant="danger">Delete</button>
</div>
```

### alpine
```html
<div x-data="nqMenu" style="display:inline-block">
  <button class="nq-button" x-bind="trigger">Actions</button>
  <div x-bind="menu" x-cloak aria-label="Row actions">
    <button x-bind="item" @click="edit()">Edit</button>
    <button x-bind="item" data-variant="danger" @click="remove()">Delete</button>
  </div>
</div>
```

### vue
```vue
<NqMenu label="Row actions" :items="[{ label: 'Edit', onSelect: edit }, { label: 'Delete', variant: 'danger', onSelect: remove }]">
  <template #trigger><NqButton>Actions</NqButton></template>
</NqMenu>
```

### blade
```blade
<x-nq.menu label="Row actions">
    <x-slot:trigger>Actions</x-slot:trigger>
    <x-nq.menu-item wire:click="edit">Edit</x-nq.menu-item>
    <x-nq.menu-item variant="danger" wire:click="delete">Delete</x-nq.menu-item>
</x-nq.menu>
```

## tabs
Switches between panels. `data-variant="underline"` on the list for the line style.

### react
```tsx
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "@fadymondy/nasaq/web";

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTab value="overview">Overview</TabsTab>
    <TabsTab value="items">Items</TabsTab>
    <TabsIndicator />
  </TabsList>
  <TabsPanel value="overview">…</TabsPanel>
  <TabsPanel value="items">…</TabsPanel>
</Tabs>
```

### html
```html
<div data-nq="tabs">
  <div class="nq-tabs-list" role="tablist" aria-label="Order">
    <button class="nq-tabs-trigger" role="tab" aria-controls="t-overview">Overview</button>
    <button class="nq-tabs-trigger" role="tab" aria-controls="t-items">Items</button>
  </div>
  <div class="nq-tabs-panel" role="tabpanel" id="t-overview">…</div>
  <div class="nq-tabs-panel" role="tabpanel" id="t-items" hidden>…</div>
</div>
```

### alpine
```html
<div x-data="nqTabs('overview')">
  <div class="nq-tabs-list" role="tablist" aria-label="Order">
    <button x-bind="tab('overview')">Overview</button>
    <button x-bind="tab('items')">Items</button>
  </div>
  <div x-bind="panel('overview')">…</div>
  <div x-bind="panel('items')">…</div>
</div>
```

### vue
```vue
<NqTabs v-model="tab" default-value="overview">
  <NqTabsList label="Order">
    <NqTabsTrigger value="overview">Overview</NqTabsTrigger>
    <NqTabsTrigger value="items">Items</NqTabsTrigger>
  </NqTabsList>
  <NqTabsPanel value="overview">…</NqTabsPanel>
  <NqTabsPanel value="items">…</NqTabsPanel>
</NqTabs>
```

### blade
```blade
<x-nq.tabs :tabs="['overview' => 'Overview', 'items' => 'Items']" label="Order">
    <x-slot:overview>…</x-slot:overview>
    <x-slot:items>…</x-slot:items>
</x-nq.tabs>
```

## accordion
Collapsible sections on native details elements.

### react
```tsx
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from "@fadymondy/nasaq/web";

<Accordion defaultValue={["plans"]}>
  <AccordionItem value="plans">
    <AccordionTrigger>Can I change plans later?</AccordionTrigger>
    <AccordionPanel>Yes, any time.</AccordionPanel>
  </AccordionItem>
  <AccordionItem value="sar">
    <AccordionTrigger>Do you invoice in SAR?</AccordionTrigger>
    <AccordionPanel>Yes.</AccordionPanel>
  </AccordionItem>
</Accordion>
```

### html
```html
<div data-nq="accordion">
  <details class="nq-accordion" open><summary>Can I change plans later?</summary><div class="nq-accordion-content">Yes, any time.</div></details>
  <details class="nq-accordion"><summary>Do you invoice in SAR?</summary><div class="nq-accordion-content">Yes.</div></details>
</div>
```

### vue
```vue
<NqAccordionItem title="Can I change plans later?" name="faq" open>Yes, any time.</NqAccordionItem>
<NqAccordionItem title="Do you invoice in SAR?" name="faq">Yes.</NqAccordionItem>
```

## tooltip
A short label on hover and focus.

### react
```tsx
import { Button, Tooltip } from "@fadymondy/nasaq/web";

<Tooltip content="Archive">
  <Button size="icon" aria-label="Archive">…</Button>
</Tooltip>
```

### html
```html
<button class="nq-button" data-size="icon" aria-label="Archive" data-nq-tooltip="Archive">…</button>
```

### vue
```vue
<NqTooltip content="Archive"><NqButton size="icon" aria-label="Archive">…</NqButton></NqTooltip>
```

## toast
Brief, polite notifications. Tones success, warning, danger, info.

### react
```tsx
import { Button, Toaster, toast } from "@fadymondy/nasaq/web";

<Button onClick={() => toast.success("Saved")}>Save</Button>
<Toaster /> {/* mount once, near the root */}
```

### html
```html
<button class="nq-button" onclick="Nasaq.toast({ title: 'Saved', tone: 'success' })">Save</button>
```

### alpine
```html
<button class="nq-button" @click="$nq.toast({ title: 'Saved', description: 'All changes are live.', tone: 'success' })">Save</button>
```

### vue
```vue
<script setup lang="ts">
import { useToast } from "@fadymondy/nasaq/vue";
const { success } = useToast();
</script>
<template><NqButton @click="success('Saved')">Save</NqButton></template>
```

### blade
```php
// In a Livewire component:
$this->dispatch('nq-toast', title: 'Saved', tone: 'success');
```

## table
A data table with numeric columns.

### react
```tsx
import { Price, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@fadymondy/nasaq/web";

<Table label="Orders">
  <TableHeader>
    <TableRow><TableHead>Order</TableHead><TableHead className="text-end">Total</TableHead></TableRow>
  </TableHeader>
  <TableBody>
    <TableRow><TableCell>#1042</TableCell><TableCell className="text-end tabular-nums"><Price amount={1280} /></TableCell></TableRow>
  </TableBody>
</Table>
```

### html
```html
<div class="nq-table-wrap">
  <table class="nq-table">
    <thead><tr><th>Order</th><th data-numeric>Total</th></tr></thead>
    <tbody><tr><td>#1042</td><td data-numeric><span data-nq-money="1280"></span></td></tr></tbody>
  </table>
</div>
```

### vue
```vue
<NqTable :columns="[{ key: 'id', label: 'Order' }, { key: 'total', label: 'Total', numeric: true }]" :rows="orders" caption="Orders">
  <template #cell-total="{ row }"><NqMoney :amount="row.total" /></template>
</NqTable>
```

### blade
```blade
<div class="nq-table-wrap">
  <table class="nq-table">
    <thead><tr><th>Order</th><th data-numeric>Total</th></tr></thead>
    <tbody>@foreach ($orders as $order)<tr><td>{{ $order->number }}</td><td data-numeric><x-nq.money :amount="$order->total" /></td></tr>@endforeach</tbody>
  </table>
</div>
```

## pagination
Page links.

### react
```tsx
import { useState } from "react";
import { Pagination } from "@fadymondy/nasaq/web";

const [page, setPage] = useState(2);

<Pagination page={page} pageCount={12} onPageChange={setPage} />
```

### html
```html
<nav class="nq-pagination" aria-label="Pages">
  <a class="nq-pagination-link" href="?page=1">Previous</a>
  <a class="nq-pagination-link" href="?page=2" aria-current="page">2</a>
  <a class="nq-pagination-link" href="?page=3">Next</a>
</nav>
```

### vue
```vue
<NqPagination v-model="page" :page-count="12" />
```

## breadcrumb
Where the page sits.

### react
```tsx
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@fadymondy/nasaq/web";

<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem><BreadcrumbLink href="/orders">Orders</BreadcrumbLink></BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem><BreadcrumbPage>#1042</BreadcrumbPage></BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

### html
```html
<nav aria-label="Breadcrumb"><ol class="nq-breadcrumb">
  <li><a href="/">Home</a></li><li><a href="/orders">Orders</a></li><li aria-current="page">#1042</li>
</ol></nav>
```

### vue
```vue
<NqBreadcrumb :items="[{ label: 'Home', href: '/' }, { label: 'Orders', href: '/orders' }, { label: '#1042' }]" />
```

## avatar
A person's photo or initials.

### react
```tsx
import { Avatar } from "@fadymondy/nasaq/web";

<Avatar name="Layla Haddad" />
<Avatar name="Layla Haddad" src="/u/layla.jpg" size="sm" />
```

### html
```html
<span class="nq-avatar"><span role="img" aria-label="Layla Haddad">LH</span></span>
```

### vue
```vue
<NqAvatar name="Layla Haddad" src="/u/layla.jpg" />
```

### blade
```blade
<x-nq.avatar :name="$user->name" :src="$user->avatar_url" size="sm" />
```

## progress
Progress toward a goal.

### react
```tsx
import { Progress } from "@fadymondy/nasaq/web";

<Progress value={64} label="Goal" />
```

### html
```html
<div class="nq-progress" role="progressbar" aria-valuenow="64" aria-valuemin="0" aria-valuemax="100" aria-label="Goal" style="--value:64%"><span></span></div>
```

### vue
```vue
<NqProgress :value="64" label="Goal" />
```

## spinner
Busy indicator.

### react
```tsx
import { Spinner } from "@fadymondy/nasaq/web";

<Spinner />
```

### html
```html
<span class="nq-spinner" aria-hidden="true"></span>
```

### vue
```vue
<NqSpinner />
```

## states
Empty and loading states.

### react
```tsx
import { Button, EmptyState, Skeleton } from "@fadymondy/nasaq/web";

<EmptyState
  title="No orders yet"
  description="Orders show up here once customers check out."
  actions={<Button variant="primary">Create order</Button>}
/>
<Skeleton className="h-4 w-32" />
```

### html
```html
<div class="nq-empty">
  <p class="nq-empty-title">No orders yet</p>
  <p class="nq-empty-description">Orders show up here once customers check out.</p>
  <button class="nq-button" data-variant="primary">Create order</button>
</div>
<span class="nq-skeleton" style="height:1rem;width:8rem"></span>
```

### vue
```vue
<NqEmpty title="No orders yet" description="Orders show up here once customers check out.">
  <NqButton variant="primary">Create order</NqButton>
</NqEmpty>
<NqSkeleton style="height:1rem;width:8rem" />
```

### blade
```blade
<x-nq.empty title="No orders yet" description="Orders show up here once customers check out.">
    <x-nq.button variant="primary" href="/orders/new">Create order</x-nq.button>
</x-nq.empty>
```

## price
Money. USD by default, SAR in Arabic, Latin digits.

### react
```tsx
import { Price } from "@fadymondy/nasaq/web";

<Price amount={1280} />
<Price amount={79} compareAt={99} />
<Price amount={12} period="seat-month" />
```

### html
```html
<span data-nq-money="1280"></span>
<span data-nq-money="14200" data-compact></span>
```

### alpine
```html
<span x-nq-money="qty * price"></span>
<span x-text="$nq.money(25)"></span>
```

### vue
```vue
<NqMoney :amount="1280" />
<NqMoney :amount="79" :compare-at="99" />
```

### blade
```blade
<x-nq.money :amount="$order->total" />
<x-nq.money :amount="$product->price" :compare-at="$product->list_price" />
```

## stat-card
A labelled number.

### react
```tsx
import { StatCard } from "@fadymondy/nasaq/web";

<StatCard
  label="Revenue"
  value={48250}
  format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
/>
```

### html
```html
<div class="nq-card"><div class="nq-card-content nq-stat">
  <p class="nq-stat-label">Revenue</p>
  <p class="nq-stat-value"><span data-nq-money="48250"></span></p>
</div></div>
```

## separator
A divider.

### react
```tsx
import { Separator } from "@fadymondy/nasaq/web";

<Separator />
```

### html
```html
<hr class="nq-separator">
```

### vue
```vue
<NqSeparator />
```
