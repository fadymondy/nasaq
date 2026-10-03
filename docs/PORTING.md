# Porting a component to Vue, Blade and HTML + Alpine

Every Nasaq component exists in React (`packages/web/src/components/<name>`). A port adds the same component to the other stacks. **The React component is the spec**: same markup, same `data-slot`s, same Tailwind classes copied verbatim, same states, same accessibility, same RTL behaviour. A screen built in any stack must look identical, and the React classes must keep working because the port emits the same state attributes.

Progress and the order to port in: [porting-progress.md](porting-progress.md). Port a component only after the components it imports.

## What one port contains

For component `<name>` (the React folder name):

| Stack | Files | Shown on the component's Docs page tab |
| --- | --- | --- |
| Vue | `packages/vue/src/components/<name>/` (`Nq*.vue`, `index.ts`, `variants.ts` if any, `<name>.test.ts`) + `packages/vue/examples/<name>.vue` | Vue, mounted live |
| Blade | `packages/php/resources/views/components/<name>/` (`<name>.blade.php` + one file per part) + `packages/php/examples/<name>.blade.php` | Blade |
| HTML + Alpine | `packages/html/src/alpine/<name>.ts` (only if the component has behaviour) + `packages/php/examples/rendered/<name>.html` (generated) | HTML + Alpine, run live |
| Tests | `packages/vue/src/components/<name>/<name>.test.ts`, `packages/html/test/<name>.test.ts` (behaviour only), PHP tests are automatic | — |

Never edit a generated index: `packages/vue/src/components/index.ts` (`node scripts/gen-index.mjs` in packages/vue) and `packages/html/src/alpine/index.ts` (`node scripts/gen-index.mjs` in packages/html) list every folder/module themselves.

Reference ports to copy the patterns from: **button** and **spinner** (static), **dialog** (overlay, portal, focus trap, presence animation), **tabs** (roving focus, keyboard, measured indicator, server-rendered state).

## Rules for every stack

- **Classes**: copy the Tailwind classes from the React source verbatim, including variants (`cva` → `variants.ts` with the same `cva` call in Vue; a PHP array match in Blade). User classes are merged last with tailwind-merge semantics (`cn()` in Vue, `$attributes->cn([...])` in Blade, which uses `Nasaq\Cn::merge`).
- **State attributes**: Base UI exposes state as data attributes and the React classes target them. Emit the same ones: `data-open` / `data-closed`, `data-starting-style` / `data-ending-style` (enter and exit animations), `data-active`, `data-selected`, `data-checked` / `data-unchecked`, `data-disabled`, `data-highlighted`, `data-orientation`, `data-side`, `data-align`, `data-state` where the React DOM has it. Inspect the React component's rendered DOM in the lab (or its tests) to get the exact list.
- **data-slot** on every part, same names as React.
- **Accessibility**: same roles, aria-* wiring, keyboard (arrows, Home/End, Escape, Enter/Space, type-ahead where React has it), focus management and focus return, labelled controls.
- **i18n**: user-visible built-in strings (aria-labels, "Close", empty states) are bilingual. Vue: `useT()("Close", "إغلاق")`. Blade: `Nasaq::t('Close', 'إغلاق')`. Alpine: `$nq.t('Close', 'إغلاق')`.
- **RTL**: logical classes only (`ms-`, `pe-`, `start-`, `text-start`), as React. Arrow-key direction flips in RTL. Directional icons get `rtl:-scale-x-100` exactly where React has it.
- **Money**: USD by default, SAR when the locale is Arabic. Vue `formatMoney`/`defaultCurrency` from `lib/money`, Blade `Nasaq::money()`, Alpine `$nq.money()` / `x-nq-money`. Never another default currency.
- **Icons**: Vue uses `lucide-vue-next`, Blade uses `<x-lucide-name />` (mallardduck/blade-lucide-icons), same icon names as React's `lucide-react`.
- **Props**: same names and defaults as React (camelCase in Vue props, kebab-case attributes in Blade). Controlled state: Vue `v-model` / `v-model:open` (`modelValue`/`open` + `update:*` + `default*`), Blade roots are `x-modelable` so `wire:model` and `x-model` work.
- **Context menus**: where React gives rows, cards or items a context menu (right-click, long-press, Shift+F10), the port has it too: Vue `NqContextMenuActions`, Blade `<x-nq::context-menu>` (and the data-table's row actions). It is not optional.
- **Not portable as-is** (React-only libraries such as recharts, tiptap, xyflow, shiki, dnd-kit): Vue uses the closest Vue library already in packages/vue's deps or a well-known Vue equivalent (ask before adding a heavy dependency; note it in the progress file). Blade renders the static markup and Alpine adds the behaviour; if the behaviour needs a big library, render the static/server state, load the library lazily from a CDN inside the Alpine module, or mark the stack as `n/a` in the progress file with a one-line reason. Never ship a visually different component.

## Vue

- `<script setup lang="ts">`, props interface with JSDoc copied from React, `class?: HTMLAttributes["class"]` merged with `cn`.
- Interactive primitives come from **reka-ui** (Dialog, Popover, Menu, Select, Tabs, Tooltip, Checkbox …); map Reka's `data-state` to the Base UI attributes the React classes need (see `NqTabsTab.vue`, `NqDialogContent.vue`). Enter/exit animations use `lib/presence.ts` (`data-starting-style` / `data-ending-style` hooks).
- Names: `Nq` + React name (`Button` → `NqButton`, `DialogTrigger` → `NqDialogTrigger`). Also export the non-component helpers React exports (`buttonVariants`, types).
- A generic component (`<script setup lang="ts" generic="T">`) declares its props inline, `defineProps<{ … }>()`, not through a named `interface Props` (vue-tsc fails with TS4025 on a private name). Do the same if vue-tsc reports TS4025 on any component.
- The package index re-exports every folder with `export *`, so helper names must be unique across components: prefix them (`journalTotals`, not `totals`).
- A component that renders a fragment or a wrapper without its own element (`v-if`/`v-else` roots, Reka roots) sets `inheritAttrs: false` and binds `$attrs` on the real element, so `data-slot` and `aria-*` overrides land.
- `index.ts` exports every part; the example `packages/vue/examples/<name>.vue` imports from `"@fadymondy/nasaq/vue"` and mirrors the README Quick start.
- Test with `@vue/test-utils` in happy-dom: markup, classes merge, state attributes, keyboard, aria wiring, v-model.

## Blade (Laravel, Livewire, Filament, TomatoPHP)

- Anonymous components, used as `<x-nq::<name>>` and parts as `<x-nq::<name>.<part>>` (folder `components/<name>/<name>.blade.php` is the root; `<part>.blade.php` the parts).
- First line: a `{{-- --}}` comment with usage, then `@props([...])` with React's defaults. Children read parent props with `@aware([...])`.
- Render the initial state on the server (active tab, open panel, selected item) so there is no flash before Alpine starts; Alpine takes over from there.
- Buttons inside parts render `<x-nq::button>` with a `data-slot` override, like `dialog/trigger.blade.php`.
- Portals use `<template x-teleport="body">`. Focus traps use `x-trap` (@alpinejs/focus), floating positioning `x-anchor` (@alpinejs/anchor), height animation `x-collapse` (@alpinejs/collapse). All three are bundled in the runtime.
- Root element: `x-data="nq<Name>(...)"`, `x-modelable` on the controlled value, `x-id` for generated ids.
- Let callers override the slot name (a part reused inside another component, like React's `data-slot` prop): `data-slot="{{ $attributes->get('data-slot', 'card') }}" {{ $attributes->except('data-slot')->cn([...]) }}`. Writing `data-slot="card" {{ $attributes->cn(...) }}` emits the attribute twice and the first one wins.

## HTML + Alpine runtime

- One module per behaviour: `packages/html/src/alpine/<name>.ts` exporting `export const <camelName>: Register = (Alpine) => Alpine.data("nq<Name>", ...)`. Use `x-bind` objects for parts (see `tabs.ts`: `list`, `tab(v)`, `panel(v)`), the `x-nq-presence` directive for enter/exit animation, `$nq` for locale and money.
- The module file name becomes the export name (`date-picker.ts` → `datePicker`). Avoid reserved words: `switch.ts` is `switch-control.ts`. Helper files without a `Register` export (`<name>-drag.ts`, `<name>-logic.ts`) can sit next to them; the index skips them.
- Never render a static value for an attribute that Alpine binds (`disabled`, `aria-*`, `data-*`, `role`, `src`): Alpine does not replace it on later updates. Server-render the initial state through the binding itself, or set it from `x-effect`. Bound boolean attributes take `null` to remove them (`undefined` becomes `""`).
- Inside a method, `$el` is the element that fired the event, not the `x-data` root (and events from a teleported part don't bubble to the host). Store the root in `init()` (`this.root = this.$el`) and dispatch from it.
- An `x-model` expression is read in the scope of the element that has it; don't reuse a name (`open`, `invalid`) that an inner component's scope already owns.
- Blade escapes `{{ }}` inside component attributes twice; use `{!! Js::from(...) !!}` or `{!! !!}` for JS values in attributes. `{!! !!}` only works on plain HTML tags, not inside an `<x-nq::…>` tag.
- An Alpine expression passed as an attribute to another `<x-nq::…>` component is escaped twice too: never put `&&`, `<`, `>` or an apostrophe in it. Use a ternary (`open ? close() : null`), backtick strings, or a method on the component.
- Don't bind `x-model` on a child component to a parent property with the same name as the child's own state (`rows` on a data-table): the child reads its own.
- Static components (badge, card, separator …) need no module; the rendered HTML is the whole port.
- The rendered example is produced from the Blade example: `php scripts/render-examples.php <name>` in packages/php. Never hand-edit `examples/rendered/*.html`. Examples render with a frozen clock (`TestCase::NOW`, 2026-09-29 09:00) and a counter for `Str::random`, so `now()` and generated ids are fine in examples and components.
- Test behaviour in `packages/html/test/<name>.test.ts` by loading `../php/examples/rendered/<name>.html` under real Alpine with the plugin (copy the setup from `alpine.test.ts`).

## Checklist (run in the worktree)

```bash
cd packages/vue  && node scripts/gen-index.mjs && npx vitest run && npx vue-tsc -p . --noEmit
cd packages/html && node scripts/gen-index.mjs && npx vitest run && npx tsc -p . --noEmit
cd packages/php  && php scripts/render-examples.php <name> && vendor/bin/phpunit
```

Then tick the component in [porting-progress.md](porting-progress.md). The lab picks the examples up by file name: open the component's Docs page and check the Vue, Blade and HTML + Alpine tabs next to React, in light and dark, LTR and RTL.
