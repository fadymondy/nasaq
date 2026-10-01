### Laravel, Livewire, Filament and TomatoPHP

`fadymondy/nasaq-php` ships Blade components (`<x-nq::button>`, `<x-nq::dialog>` …), a precompiled stylesheet and the Alpine behaviours. The markup and classes are the React components', rendered on the server.

```bash
composer require fadymondy/nasaq-php
php artisan vendor:publish --tag=nasaq-assets
```

**Blade or Livewire layouts**: add the assets in `<head>`. Livewire already starts Alpine, and `@nasaqScripts` registers before it does.

```blade
<html lang="{{ app()->getLocale() }}" dir="{{ \Nasaq\Nasaq::rtl() ? 'rtl' : 'ltr' }}" data-brand="nasaq">
<head>
    @nasaqStyles
    @nasaqScripts
</head>
```

If the app has no Alpine (plain Blade, no Livewire), also load it after `@nasaqScripts`: `<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js"></script>`.

```blade
<x-nq::dialog>
    <x-nq::dialog.trigger>Edit profile</x-nq::dialog.trigger>
    <x-nq::dialog.content>
        <x-nq::dialog.header>
            <x-nq::dialog.title>Edit profile</x-nq::dialog.title>
        </x-nq::dialog.header>
    </x-nq::dialog.content>
</x-nq::dialog>
```

**Livewire state**: components with an open or selected state can be bound with `wire:model`, for example `<x-nq::dialog wire:model="showEdit">` or `<x-nq::tabs wire:model.live="tab">`.

**Filament panels (TomatoPHP included)**: register the plugin. It loads the stylesheet and the behaviours on every panel page, so `<x-nq::*>` works in pages, widgets, infolist entries and custom fields.

```php
use Nasaq\Filament\NasaqPlugin;

public function panel(Panel $panel): Panel
{
    return $panel->plugin(NasaqPlugin::make());
}
```

The stylesheet already contains every class the components use, so no Tailwind setup is needed.

**Your own Tailwind v4 build** (a custom Filament theme, or Vite in the app): call `NasaqPlugin::make()->withoutStyles()` (or drop `@nasaqStyles`), install the tokens from npm (`npm install @fadymondy/nasaq`) and let Tailwind scan the Blade views:

```css
@import "@fadymondy/nasaq/tokens.css";
@import "@fadymondy/nasaq/theme.css";
@import "@fadymondy/nasaq/web/styles.css";
@source "../../vendor/fadymondy/nasaq-php/resources/views";
```

Arabic locales get RTL, Arabic labels and SAR prices. Set `NASAQ_CURRENCY` to override, or `NASAQ_CDN` to serve the assets from a CDN. Every component's Blade tab shows its usage.
