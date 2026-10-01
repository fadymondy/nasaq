# Nasaq for Laravel, Livewire, FilamentPHP and TomatoPHP

Laravel views get the Nasaq look three ways, and all three can be mixed on one page:

1. **Blade components** (`<x-nq.button>`, `<x-nq.dialog>`, …) shipped in the npm package.
2. **The plain classes** (`class="nq-button"`) from the [HTML docs](./html.md), in any Blade view.
3. **Alpine state** (`x-data="nqTabs"`, `$nq.toast(...)`) from the [Alpine plugin](./alpine.md). Livewire and Filament already run Alpine.

## 1. Install the assets

```bash
npm i @fadymondy/nasaq
```

The simplest setup is the script-tag build, loaded in `<head>` (before `@livewireScripts` and before Filament's scripts):

```blade
{{-- resources/views/components/layouts/app.blade.php --}}
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="{{ str_starts_with(app()->getLocale(), 'ar') ? 'rtl' : 'ltr' }}" data-brand="nasaq">
<head>
    <link rel="stylesheet" href="{{ asset('vendor/nasaq/html.css') }}">
    <script src="{{ asset('vendor/nasaq/nasaq-alpine.global.js') }}"></script>
    @livewireStyles
</head>
<body>
    {{ $slot }}
    @livewireScripts
</body>
</html>
```

Copy the files to `public/vendor/nasaq` on install. A composer script or an npm `postinstall` does it:

```bash
mkdir -p public/vendor/nasaq
cp node_modules/@fadymondy/nasaq/dist/html.css node_modules/@fadymondy/nasaq/dist/html.unlayered.css public/vendor/nasaq/
cp node_modules/@fadymondy/nasaq/dist/cdn/nasaq-alpine.global.js public/vendor/nasaq/
```

You can also skip the copy and point at jsDelivr (`https://cdn.jsdelivr.net/npm/@fadymondy/nasaq/dist/...`).

`nasaq-alpine.global.js` registers the Alpine plugin on `alpine:init` and starts the vanilla `data-nq` behaviours,
so `<x-nq.dialog>` and `data-nq-open` work with no further script.

### With Vite instead

```js
// resources/js/app.js
import "@fadymondy/nasaq/html.css";
import { start } from "@fadymondy/nasaq/html";
import nasaq from "@fadymondy/nasaq/alpine";
import { Livewire, Alpine } from "../../vendor/livewire/livewire/dist/livewire.esm";

start();               // data-nq behaviours: dialogs, data-nq-open, tooltips, money
Alpine.plugin(nasaq);  // nqTabs, nqMenu, nqDialog, $nq, x-nq-money
Livewire.start();
```

Use `@livewireScriptConfig` instead of `@livewireScripts` in this setup (Livewire's manual-bundling mode).

## 2. Register the Blade components

In `AppServiceProvider::boot()`:

```php
use Illuminate\Support\Facades\Blade;

Blade::anonymousComponentPath(base_path('node_modules/@fadymondy/nasaq/dist/blade'));
```

The components are now available as `<x-nq.button>`, `<x-nq.card>`, and so on. If you'd rather own the files,
copy `node_modules/@fadymondy/nasaq/dist/blade/nq` to `resources/views/components/nq`. The tag names stay the same.

| Component | Props |
| --- | --- |
| `<x-nq.button>` | `variant` (primary, secondary, ghost, danger, link), `size` (sm, md, lg, icon, icon-sm), `href`, `type`, `loading`, `full` |
| `<x-nq.badge>` | `variant` (secondary, outline, brand, accent, success, warning, danger, info) or `tag` (a colour) |
| `<x-nq.card>` | `title`, `description`; slots `action`, `footer` |
| `<x-nq.alert>` | `tone` (info, success, warning, danger), `title`; slot `icon` |
| `<x-nq.field>` | `name`, `label`, `hint`, `error`, `required`. Reads `$errors->first($name)` |
| `<x-nq.input>` / `<x-nq.textarea>` | `name`, `type`, `invalid` (defaults to `$errors->has($name)`); `id` defaults to `nq-{name}` |
| `<x-nq.select>` | `name`, `options` (`value => label`), `placeholder`, `value`, `invalid` |
| `<x-nq.checkbox>` | `label`, `switch` (renders a switch) |
| `<x-nq.dialog>` | `id`, `title`, `description`, `size` (sm, md, lg), `variant` (dialog, sheet), `dismissible`, `closeLabel`; slot `footer` |
| `<x-nq.menu>` / `<x-nq.menu-item>` | menu: `label`, `triggerLabel`, `variant`, `size`; slot `trigger`. item: `href`, `variant="danger"` |
| `<x-nq.tabs>` | `tabs` (`key => label`), `active`, `variant` (default, underline), `label`; one named slot per key |
| `<x-nq.money>` | `amount`, `currency` (USD, or SAR when the app locale is Arabic), `compareAt`, `locale` |
| `<x-nq.avatar>` | `name`, `src`, `size` (xs, sm, md, lg), `shape` (circle, square) |
| `<x-nq.empty>` | `title`, `description`; slot `icon`, default slot for actions |

Every component passes extra attributes through, so `wire:model`, `wire:click`, `x-on`, `class` and `data-*` work as usual.

```blade
<x-nq.card title="Profile" description="Shown on invoices and receipts.">
    <form wire:submit="save" class="grid gap-4">
        <x-nq.field name="name" label="Name" required>
            <x-nq.input name="name" wire:model="name" />
        </x-nq.field>
        <x-nq.field name="plan" label="Plan">
            <x-nq.select name="plan" wire:model="plan" :options="['starter' => 'Starter', 'team' => 'Team']" />
        </x-nq.field>
        <x-nq.checkbox wire:model="receipts" label="Send receipts" switch />
        <x-nq.button type="submit" variant="primary" wire:loading.attr="aria-busy">Save</x-nq.button>
    </form>
</x-nq.card>

<x-nq.tabs :tabs="['overview' => 'Overview', 'items' => 'Items']" label="Order">
    <x-slot:overview>Paid <x-nq.money :amount="$order->total" /></x-slot:overview>
    <x-slot:items>{{ $order->items_count }} items</x-slot:items>
</x-nq.tabs>

<x-nq.menu label="Order actions">
    <x-slot:trigger>Actions</x-slot:trigger>
    <x-nq.menu-item wire:click="archive">Archive</x-nq.menu-item>
    <x-nq.menu-item variant="danger" wire:click="delete" wire:confirm="Delete this order?">Delete</x-nq.menu-item>
</x-nq.menu>

<x-nq.button variant="primary" data-nq-open="invite">Invite people</x-nq.button>
<x-nq.dialog id="invite" title="Invite people" wire:ignore.self>
    <x-nq.field name="email" label="Email"><x-nq.input name="email" type="email" wire:model="email" /></x-nq.field>
    <x-slot:footer>
        <x-nq.button data-nq-close>Cancel</x-nq.button>
        <x-nq.button variant="primary" wire:click="invite">Send invite</x-nq.button>
    </x-slot:footer>
</x-nq.dialog>
```

## 3. Livewire

- **Toasts from PHP.** `$this->dispatch('nq-toast', title: 'Saved', tone: 'success');`. The plugin listens for
  `nq-toast` on `window` and handles both the Livewire 3 and Livewire 2 payload shapes.
- **Dialogs.** Put `wire:ignore.self` on `<x-nq.dialog>` so a re-render does not close it. To close it from PHP, dispatch
  a browser event and listen for it: `<div x-on:invite-sent.window="$nq.closeDialog('invite')">`, with
  `$this->dispatch('invite-sent')` on the PHP side.
- **Morphs.** `x-data` components (`nqTabs`, `nqMenu`) survive morphs because Alpine owns them. Plain `data-nq` markup
  that Livewire inserts later is bound by the `observe()` that `start()` runs.
- **Validation.** `<x-nq.field name="email">` shows `$errors->first('email')`, and `<x-nq.input name="email">` sets
  `aria-invalid` on its own.

## 4. FilamentPHP

Filament panels already load Alpine and Livewire. Register the assets with a render hook in the panel provider:

```php
use Filament\Panel;
use Filament\View\PanelsRenderHook;

public function panel(Panel $panel): Panel
{
    return $panel
        // …
        ->renderHook(PanelsRenderHook::HEAD_END, fn (): string => '
            <link rel="stylesheet" href="'.asset('vendor/nasaq/html.unlayered.css').'">
            <script src="'.asset('vendor/nasaq/nasaq-alpine.global.js').'"></script>
        ');
}
```

**Which stylesheet in Filament:**

| Filament | Tailwind | Load |
| --- | --- | --- |
| v3 | v3 (unlayered preflight) | `html.unlayered.css`. Tailwind v3's preflight is unlayered, so it would beat the layered `html.css` (`button { background: transparent }` would win over `.nq-button`). The unlayered file leaves out the Nasaq base, so Filament keeps its own reset. |
| v4 | v4 (layered) | `html.unlayered.css` too, or `tokens.css` + `html/components.css` if you build a custom Filament theme with Vite. Skip the full `html.css` there: its base layer would compete with Filament's base. |

Filament's dark mode puts `.dark` on `<html>`, and the Nasaq tokens respond to `.dark`, so Nasaq parts follow the
panel's theme switch. Filament's own colours (`--primary-500` and so on) do not collide with Nasaq's (`--primary`, `--nq-*`).

Use Nasaq inside Filament wherever Blade is allowed:

```php
// Custom pages and widgets: their Blade view can use <x-nq.*> and the .nq-* classes directly.

// An infolist or form entry
\Filament\Infolists\Components\ViewEntry::make('total')->view('filament.entries.money');
\Filament\Forms\Components\View::make('filament.forms.shipping-summary');

// A table column
\Filament\Tables\Columns\ViewColumn::make('status')->view('filament.columns.status-badge');
```

```blade
{{-- resources/views/filament/columns/status-badge.blade.php --}}
<x-nq.badge :variant="$getState() === 'paid' ? 'success' : 'warning'">{{ ucfirst($getState()) }}</x-nq.badge>

{{-- resources/views/filament/entries/money.blade.php --}}
<x-nq.money :amount="$getState()" />
```

Keep Filament's own form fields and tables for CRUD. Use Nasaq for custom pages, widgets, entries and columns, where you want the product's look.

## 5. TomatoPHP

TomatoPHP plugins are Filament plugins, so section 4 applies. Inside a plugin, register the assets once with
`FilamentAsset` so every panel that installs the plugin gets them:

```php
use Filament\Support\Assets\Css;
use Filament\Support\Assets\Js;
use Filament\Support\Facades\FilamentAsset;

FilamentAsset::register([
    Css::make('nasaq', __DIR__.'/../../resources/dist/nasaq/html.unlayered.css'),
    Js::make('nasaq-alpine', __DIR__.'/../../resources/dist/nasaq/nasaq-alpine.global.js'),
], package: 'tomatophp/your-plugin');
```

Also register the Blade components from the plugin's service provider. Point the path at the plugin's own copy of
`dist/blade`, so the plugin does not depend on the host app's `node_modules`:

```php
Blade::anonymousComponentPath(__DIR__.'/../../resources/views/nasaq');   // contains nq/button.blade.php, …
```

## Arabic and money

- Set `lang` and `dir` on `<html>` from `app()->getLocale()`, as in the layout above. Everything mirrors through logical properties.
- `<x-nq.money>` uses PHP `intl` with Latin digits. It formats in USD, or SAR when the app locale starts with `ar`.
  Pass `currency` only when the business needs another currency.
- In Alpine, `$nq.setLocale('ar')` switches the page to Arabic without a reload. To make the change stick, store the choice in the session on the server side.
