# Nasaq framework kit

The components that exist outside React, with the same snippet in each stack. Each `## name` matches the React
component of the same name (`get_component("button")`). Setup is covered per stack: [HTML](./html.md), [Vue](./vue.md),
[Alpine](./alpine.md), [Laravel / Livewire / Filament](./filament.md).

<!-- Format (read by packages/mcp): "## <react component name>", a one-line summary, then "### html", "### alpine",
     "### vue", "### blade" sections, each holding one fenced block. A missing section means "use the html snippet". -->

## button
Actions. Variants primary, secondary (default), ghost, danger, link; sizes sm, md, lg, icon, icon-sm.

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
A modal on the native dialog element. `variant="sheet"` makes it a side sheet.

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

### html
```html
<div class="nq-card"><div class="nq-card-content nq-stat">
  <p class="nq-stat-label">Revenue</p>
  <p class="nq-stat-value"><span data-nq-money="48250"></span></p>
</div></div>
```

## separator
A divider.

### html
```html
<hr class="nq-separator">
```

### vue
```vue
<NqSeparator />
```
