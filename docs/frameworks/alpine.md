# Nasaq for Alpine.js

Alpine pages use the [plain HTML classes](./html.md) for the look. The Alpine plugin adds reactive state on top:
`x-data` components for tabs, menus and dialogs, an `x-nq-money` directive, and a `$nq` store for toasts, money,
theme and locale. Livewire, FilamentPHP and TomatoPHP run Alpine, so all of this works there too
(see [Laravel, Livewire and Filament](./filament.md)).

## Install

With a bundler:

```js
import Alpine from "alpinejs";
import nasaq from "@fadymondy/nasaq/alpine";
import "@fadymondy/nasaq/html.css";

Alpine.plugin(nasaq);
Alpine.start();
```

Without a bundler, load the Nasaq script **before** Alpine so the plugin is in place when Alpine starts:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fadymondy/nasaq/dist/html.css">
<script src="https://cdn.jsdelivr.net/npm/@fadymondy/nasaq/dist/cdn/nasaq-alpine.global.js"></script>
<script src="https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js" defer></script>
```

`nasaq-alpine.global.js` includes everything in `nasaq.global.js` (`window.Nasaq`, the `data-nq` behaviours) and
registers the plugin on `alpine:init`.

If Alpine is already running in your bundle (for example Livewire 3's ESM build), register the plugin yourself before it starts:

```js
import { Livewire, Alpine } from "../../vendor/livewire/livewire/dist/livewire.esm";
import nasaq from "@fadymondy/nasaq/alpine";
Alpine.plugin(nasaq);
Livewire.start();
```

## What the plugin adds

| API | Kind | Gives |
| --- | --- | --- |
| `nqTabs('first')` | `x-data` | `active`, `select(v)`, and the `tab(v)` / `panel(v)` bindings |
| `nqMenu` | `x-data` | `open`, `toggle()`, `close()`, and the `trigger` / `menu` / `item` bindings |
| `nqDialog` | `x-data` | `open`, `show()`, `close()`, `toggle()` for the `<dialog>` inside |
| `x-nq-money="expr"` | directive | Reactive price text (USD, or SAR in Arabic; `data-currency` overrides) |
| `x-nq:tabs`, `x-nq:menu`, `x-nq:dialog`, `x-nq:tooltip`, `x-nq:accordion` | directive | Binds the vanilla behaviour to existing markup, cleaned up with the element |
| `$nq` / `$store.nq` | magic / store | `locale`, `dir`, `theme`, `currency`, `setLocale(l)`, `setTheme(t)`, `toggleTheme()`, `money(n, currency?)`, `toast(o)`, `openDialog(id)`, `closeDialog(id)` |
| `nq-toast` | window event | `toast(detail)`. Livewire can send it with `$this->dispatch('nq-toast', …)` |

## Tabs

```html
<div x-data="nqTabs('overview')">
  <div class="nq-tabs-list" role="tablist" aria-label="Order">
    <button x-bind="tab('overview')">Overview</button>
    <button x-bind="tab('items')">Items</button>
  </div>
  <div x-bind="panel('overview')">Paid on 12 Sep.</div>
  <div x-bind="panel('items')">3 items.</div>
</div>
```

`tab(v)` adds the class, role, ids, `aria-selected`, roving `tabindex` and arrow-key handling (reversed in RTL).
`panel(v)` adds the class, role, `aria-labelledby` and `x-show`. Read or set `active` from anywhere inside, e.g. `@click="select('items')"`.

## Dropdown menu

```html
<div x-data="nqMenu" style="display:inline-block">
  <button class="nq-button" x-bind="trigger">Actions</button>
  <div x-bind="menu" x-cloak aria-label="Order actions">
    <button x-bind="item" @click="$nq.toast('Archived')">Archive</button>
    <div class="nq-menu-separator" role="separator"></div>
    <button x-bind="item" data-variant="danger" @click="$nq.toast({ title: 'Deleted', tone: 'danger' })">Delete</button>
  </div>
</div>
```

The menu opens under the trigger and focuses its first item. Arrow keys move, Escape closes and returns focus, and an
outside click or choosing an item closes it.

## Dialog

```html
<div x-data="nqDialog">
  <button class="nq-button" data-variant="primary" @click="show()">Invite people</button>
  <dialog class="nq-dialog" aria-labelledby="invite-title">
    <div class="nq-dialog-header"><h2 class="nq-dialog-title" id="invite-title">Invite people</h2></div>
    …
    <div class="nq-dialog-footer">
      <button class="nq-button" @click="close()">Cancel</button>
      <button class="nq-button" data-variant="primary" @click="close(); $nq.toast('Invite sent')">Send invite</button>
    </div>
  </dialog>
</div>
```

`open` follows the dialog itself: Escape and backdrop clicks update it. To open a dialog from elsewhere on the page,
give it an id and call `$nq.openDialog('invite')`.

## Money, store and toasts

```html
<div x-data="{ qty: 2, price: 49 }">
  <input class="nq-input" type="number" x-model.number="qty">
  Total: <span x-nq-money="qty * price"></span>        <!-- $98.00, or the SAR amount when $nq.locale is Arabic -->
</div>

<button class="nq-button" @click="$nq.setLocale($nq.locale === 'ar' ? 'en' : 'ar')">العربية / English</button>
<button class="nq-button" @click="$nq.toggleTheme()">Theme</button>
<button class="nq-button" @click="$nq.toast({ title: 'Saved', description: 'All changes are live.', tone: 'success' })">Save</button>
<span x-text="$nq.money(25)"></span>
```

`$nq.setLocale` updates `lang` and `dir` on `<html>`. Every `x-nq-money` and `$nq.money` on the page then re-renders in the new locale's currency.

## Existing markup

Already have the vanilla markup from the HTML docs? Bind it with a directive instead of `data-nq`. This is useful in
Livewire components, where Alpine owns the element's lifetime:

```html
<div x-nq:tabs> … same markup as data-nq="tabs" … </div>
<button class="nq-button" x-nq:tooltip data-nq-tooltip="Archive" aria-label="Archive">…</button>
```

## Rules

- Hide menus with `x-cloak` before Alpine starts. The stylesheet includes the `[x-cloak]` rule.
- Use the bindings (`x-bind="tab('…')"`, `x-bind="item"`) rather than copying their attributes by hand, so ARIA stays right.
- Money is USD by default and SAR in Arabic. Set `data-currency` only when the business needs another currency.
