# Nasaq for plain HTML

The same Nasaq look as the React kit, as plain CSS classes (`.nq-*`) on the Nasaq tokens, plus a small vanilla
script for the parts that need behaviour (dialogs, menus, tabs, tooltips, toasts, money). No React, no Tailwind and
no build step. Vue, Alpine, Blade, Livewire and FilamentPHP all sit on this layer, so a page styled here looks the
same in every stack.

## Install

With a bundler:

```bash
npm i @fadymondy/nasaq
```

```js
import "@fadymondy/nasaq/html.css";            // tokens + base + components, one file
import { start } from "@fadymondy/nasaq/html";
start();                                          // binds every data-nq element, now and later
```

Without a bundler (CDN):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fadymondy/nasaq/dist/html.css">
<script src="https://cdn.jsdelivr.net/npm/@fadymondy/nasaq/dist/cdn/nasaq.global.js" defer></script>
```

The CDN script sets `window.Nasaq`, restores the saved theme and calls `start()` for you.

### Which stylesheet

| File | Use it when |
| --- | --- |
| `@fadymondy/nasaq/html.css` | Default. Tokens, a small base (box-sizing, fonts, body) and the components, in CSS layers. |
| `@fadymondy/nasaq/html/components.css` + `tokens.css` | You already have a reset (Tailwind v4 preflight) and only want the components. |
| `@fadymondy/nasaq/html.unlayered.css` | The host uses Tailwind v3 (FilamentPHP v3). Its preflight is unlayered and would beat layered rules. |

The components live in `@layer components`, the layer Tailwind v4 uses. Tailwind utilities and your own unlayered
CSS therefore override a `.nq-*` rule without `!important`, e.g. `<button class="nq-button mt-4">`.

## The page

```html
<html lang="en" dir="ltr" data-brand="nasaq" data-theme="light">
```

| Attribute | Values | Effect |
| --- | --- | --- |
| `lang` / `dir` | `en` + `ltr`, `ar` + `rtl` | Fonts, direction, Arabic letter spacing, and the default currency (USD, or SAR in Arabic). |
| `data-theme` | `light`, `dark` | The colour scheme. `Nasaq.setTheme("system")` follows the OS. |
| `data-brand` | `nasaq`, `mahaam`, `zekra`, … | The brand palette from the tokens. |
| `data-density` | `comfortable`, `compact`, `dense` | Control heights and spacing. |

Change them from script with `Nasaq.setLocale("ar")`, `Nasaq.setTheme("dark")`, `Nasaq.toggleTheme()` and
`Nasaq.setBrand("mahaam")`. A button with `data-nq-theme="toggle"` (or `light`, `dark`, `system`) does it with no script.

## Components

Every component is a class on ordinary markup. Variants, sizes and tones are data attributes with the same names
and values as the React props.

### Button

```html
<button class="nq-button" data-variant="primary">Save</button>
<button class="nq-button">Cancel</button>                      <!-- secondary is the default -->
<button class="nq-button" data-variant="ghost">Skip</button>
<button class="nq-button" data-variant="danger">Delete</button>
<a class="nq-button" data-variant="link" href="/docs">Learn more</a>
<button class="nq-button" data-size="sm">Small</button>        <!-- xs, sm, md (default), lg, icon, icon-sm -->
<button class="nq-button" data-size="icon" aria-label="Archive">…svg…</button>
<button class="nq-button" data-variant="primary" aria-busy="true" disabled>
  <span class="nq-spinner" aria-hidden="true"></span>Saving
</button>
```

Variants: `primary`, `secondary` (the default), `ghost`, `danger`, `link`. `data-full` stretches it to the row.

### Badge

```html
<span class="nq-badge" data-variant="success">Paid</span>      <!-- secondary, outline, brand, accent, success, warning, danger, info -->
<span class="nq-badge" data-tag="teal">New</span>              <!-- gray, red, orange, amber, green, teal, blue, violet, pink -->
```

### Card

```html
<div class="nq-card">
  <div class="nq-card-header">
    <h3 class="nq-card-title">Profile</h3>
    <p class="nq-card-description">Shown on invoices.</p>
    <div class="nq-card-action"><button class="nq-button" data-size="sm">Edit</button></div>
  </div>
  <div class="nq-card-content">…</div>
  <div class="nq-card-footer"><button class="nq-button" data-variant="primary">Save</button></div>
</div>
```

### Form fields

```html
<div class="nq-field">
  <label class="nq-field-label" for="email">Email</label>
  <input class="nq-input" id="email" type="email" aria-invalid="true" aria-describedby="email-error">
  <p class="nq-field-description" id="email-hint">We never share it.</p>
  <p class="nq-field-error" id="email-error">Enter a full email address.</p>
</div>

<textarea class="nq-textarea" rows="3"></textarea>
<select class="nq-select"><option>Starter</option><option>Team</option></select>

<label class="nq-choice"><input type="checkbox" class="nq-checkbox"> <span>Send receipts</span></label>
<label class="nq-choice"><input type="radio" class="nq-radio" name="plan"> <span>Team</span></label>
<label class="nq-choice"><input type="checkbox" class="nq-switch" role="switch"> <span>Weekly digest</span></label>
```

`aria-invalid="true"` draws the error state; point `aria-describedby` at the hint and error so screen readers read them.

### Dialog and sheet

A native `<dialog>`: focus trap, Escape and the top layer come from the browser.

```html
<button class="nq-button" data-nq-open="invite">Invite people</button>

<dialog id="invite" class="nq-dialog" data-nq="dialog" aria-labelledby="invite-title">
  <div class="nq-dialog-header">
    <h2 class="nq-dialog-title" id="invite-title">Invite people</h2>
    <p class="nq-dialog-description">They get an email with a link to join.</p>
  </div>
  …
  <div class="nq-dialog-footer">
    <button class="nq-button" data-nq-close>Cancel</button>
    <button class="nq-button" data-variant="primary" data-nq-close="send">Send invite</button>
  </div>
  <button class="nq-dialog-close" data-nq-close aria-label="Close">×</button>
</dialog>
```

- `data-nq-open="id"` opens it; `data-nq-close="value"` closes it and sets `dialog.returnValue` to `value`.
- A click on the backdrop closes it. `data-dismissible="false"` keeps it open until a button closes it.
- `data-size="sm" | "lg"`; `data-variant="sheet"` turns it into a side sheet (it follows `dir`).
- From script: `Nasaq.openDialog("invite")`, `Nasaq.closeDialog("invite", "send")`.

### Dropdown menu

```html
<button class="nq-button" data-nq="menu" aria-controls="row-actions">Actions</button>
<div class="nq-menu" id="row-actions" role="menu" hidden>
  <div class="nq-menu-label">Row</div>
  <button class="nq-menu-item" role="menuitem">Edit</button>
  <div class="nq-menu-separator" role="separator"></div>
  <button class="nq-menu-item" role="menuitem" data-variant="danger">Delete</button>
</div>
```

Arrow keys move between items, Escape closes and returns focus, and an outside click closes. The menu is placed
under the trigger and flips its alignment in RTL.

### Tabs

```html
<div data-nq="tabs">
  <div class="nq-tabs-list" role="tablist" aria-label="Order">   <!-- data-variant="underline" for the line style -->
    <button class="nq-tabs-trigger" role="tab" aria-controls="t-overview">Overview</button>
    <button class="nq-tabs-trigger" role="tab" aria-controls="t-items">Items</button>
  </div>
  <div class="nq-tabs-panel" role="tabpanel" id="t-overview">…</div>
  <div class="nq-tabs-panel" role="tabpanel" id="t-items" hidden>…</div>
</div>
```

Arrow keys follow reading direction (reversed in RTL), Home and End jump. The root fires `nq:change` with
`event.detail.value` set to the selected panel id.

### Accordion

```html
<div data-nq="accordion">                        <!-- data-nq="accordion" makes it one-at-a-time -->
  <details class="nq-accordion" open><summary>Can I change plans later?</summary>
    <div class="nq-accordion-content">Yes, any time.</div></details>
  <details class="nq-accordion"><summary>Do you invoice in SAR?</summary>
    <div class="nq-accordion-content">Yes, Arabic accounts default to SAR.</div></details>
</div>
```

### Tooltip

```html
<button class="nq-button" data-size="icon" aria-label="Archive" data-nq-tooltip="Archive">…</button>
```

Shows on hover and keyboard focus, hides on Escape, and is linked with `aria-describedby`.

### Toast

```js
Nasaq.toast("Saved");
Nasaq.toast({ title: "Invoice sent", description: "Omar gets it by email.", tone: "success" });   // success, warning, danger, info
```

Toasts appear in a polite live region created on first use. `duration` is in milliseconds (default 5000; `0` keeps the toast until it is closed).

### Money

```html
<span data-nq-money="1280"></span>                       <!-- $1,280.00; in Arabic the same amount in SAR -->
<span data-nq-money="14200" data-compact></span>         <!-- whole amounts without decimals -->
<span data-nq-money="99" data-currency="EUR"></span>     <!-- explicit currency -->
```

The default currency is USD, or SAR when the page language is Arabic. Digits stay Latin in Arabic so prices
are easy to scan. From script: `Nasaq.formatMoney(12.5, { locale: "ar" })`.

### Table, pagination and breadcrumb

```html
<div class="nq-table-wrap">
  <table class="nq-table">
    <thead><tr><th>Order</th><th data-numeric>Total</th></tr></thead>
    <tbody><tr><td>#1042</td><td data-numeric><span data-nq-money="1280"></span></td></tr></tbody>
  </table>
</div>

<nav class="nq-pagination" aria-label="Pages">
  <a class="nq-pagination-link" href="?page=1">Previous</a>
  <a class="nq-pagination-link" href="?page=1">1</a>
  <a class="nq-pagination-link" href="?page=2" aria-current="page">2</a>
  <a class="nq-pagination-link" href="?page=3">Next</a>
</nav>

<nav aria-label="Breadcrumb"><ol class="nq-breadcrumb">
  <li><a href="/">Home</a></li><li><a href="/orders">Orders</a></li><li aria-current="page">#1042</li>
</ol></nav>
```

`data-numeric` right-aligns a column with tabular figures (it is left-aligned in RTL).

### Status and feedback

```html
<div class="nq-alert" data-tone="warning" role="status">
  <div><p class="nq-alert-title">Payment overdue</p><div class="nq-alert-description">Invoice #1042 is 5 days late.</div></div>
</div>

<div class="nq-empty">
  <p class="nq-empty-title">No orders yet</p>
  <p class="nq-empty-description">Orders show up here once customers check out.</p>
  <button class="nq-button" data-variant="primary">Create order</button>
</div>

<div class="nq-progress" role="progressbar" aria-valuenow="64" aria-valuemin="0" aria-valuemax="100" aria-label="Goal"
     style="--value:64%"><span></span></div>

<span class="nq-spinner" aria-hidden="true"></span>
<span class="nq-skeleton" style="height:1rem;width:8rem"></span>
```

### Small parts

```html
<span class="nq-avatar"><img src="/u/layla.jpg" alt="Layla Haddad"></span>
<span class="nq-avatar"><span role="img" aria-label="Layla Haddad">LH</span></span>   <!-- data-size xs, sm, lg; data-shape="square" -->
<kbd class="nq-kbd">⌘K</kbd>
<hr class="nq-separator">
<div class="nq-stat"><p class="nq-stat-label">Revenue</p><p class="nq-stat-value"><span data-nq-money="48250"></span></p></div>
<h1 class="nq-h1">…</h1> <h2 class="nq-h2">…</h2> <h3 class="nq-h3">…</h3>
<p class="nq-body">…</p> <p class="nq-body-sm">…</p> <p class="nq-caption">…</p> <span class="nq-muted">…</span>
<span class="nq-num">1,280</span>                                                   <!-- tabular figures -->
```

## Script API

`@fadymondy/nasaq/html` (or `window.Nasaq` from the CDN build):

| Function | Does |
| --- | --- |
| `start()` | `delegate()` + `init(document)` + `observe(document.body)`, after DOMContentLoaded. Returns a cleanup. |
| `init(root)` | Binds every `[data-nq]`, `[data-nq-tooltip]` and `[data-nq-money]` under `root`, once each. |
| `delegate()` | Document-level handlers for `data-nq-open`, `data-nq-close` and `data-nq-theme`. |
| `observe(root)` | Runs `init` on nodes added later (HTMX, Turbo, Livewire morphs). |
| `openDialog(id)`, `closeDialog(id, value?)` | Opens or closes a `<dialog>` by id or element. |
| `tabs(el)`, `menu(trigger)`, `tooltip(el)`, `dialog(el)` | Bind one element by hand; each returns a handle or a cleanup. |
| `toast(options)` | Shows a toast. |
| `formatMoney(n, { currency, locale, compact })`, `defaultCurrency(locale)` | Money text; USD, or SAR for Arabic. |
| `setLocale`, `setTheme`, `toggleTheme`, `restoreTheme`, `setBrand` | Page attributes. The theme is saved in `localStorage` (`nq-theme`). |

## Rules

- Colours come from tokens (`var(--nq-…)`, or the shadcn names such as `var(--primary)`). Never hard-code hex.
- Use the classes as documented and don't restyle a component's internals. Layout utilities (margins, grid, width) are fine.
- Give icon-only buttons an `aria-label`.
- Arabic pages need `lang="ar" dir="rtl"`. Everything mirrors through logical properties, and nothing needs an RTL class.
