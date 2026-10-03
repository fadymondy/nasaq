# Changelog

## 1.0.0

First release.

- Blade components as `<x-nq::name>` and `<x-nq::name.part>`, with the same markup and Tailwind classes as the React components.
- Alpine behaviours (`resources/dist/nasaq-alpine.js`) that register on `alpine:init` and never start Alpine themselves, so they work with Livewire 3 and Filament.
- Livewire 3: `wire:model` and `wire:model.live` on every form control (x-modelable roots and native controls), covered by tests.
- FilamentPHP plugin: `Nasaq\Filament\NasaqPlugin`.
- `@nasaqStyles` and `@nasaqScripts` directives, publishable assets, views and config.
- RTL and Arabic labels; currency defaults to USD, or SAR in Arabic.
