# Choosing a stack

Nasaq is a React design system first. The other stacks are added on top of it: they reuse the same tokens and render
the same markup, so a screen looks the same whichever stack built it. The shadcn look, Arabic/RTL, dark mode and brand palettes carry over everywhere.

| Stack | Package | Components | Guide |
| --- | --- | --- | --- |
| **React** (Next, Vite, Remix) | `@fadymondy/nasaq/web` | All of them (370+), including full screens and AI, delivery, admin and store parts | [npm package](https://nasaq-ui.fadymondy.com/?path=/story/docs-installation-npm-package--page) |
| **shadcn** (any React app with `components.json`) | `npx shadcn@latest add @nasaq/<name>` | All of them, copied into your app | [shadcn CLI](https://nasaq-ui.fadymondy.com/?path=/story/docs-installation-shadcn-cli--page) |
| **Laravel + Inertia** | React: `@fadymondy/nasaq/web`; Vue: `@fadymondy/nasaq/vue` | React: all. Vue: the core kit | [Laravel and Inertia](./inertia.md) |
| **Vue 3 / Nuxt** | `@fadymondy/nasaq/vue` | The core kit as `Nq*` components | [Vue](./vue.md) |
| **Plain HTML** (any backend, CDN or bundler) | `@fadymondy/nasaq/html.css` + `/html` | The core kit as `.nq-*` classes | [Plain HTML](./html.md) |
| **Alpine.js** | `@fadymondy/nasaq/alpine` | The core kit, with reactive state | [Alpine](./alpine.md) |
| **Laravel Blade, Livewire, FilamentPHP, TomatoPHP** | `<x-nq.*>` Blade components + the Alpine plugin | The core kit | [Laravel and Filament](./filament.md) |

**The core kit** is the 24 everyday components every stack has: button, badge, card, alert, field (input, textarea,
select), checkbox, switch, radio group, dialog and sheet, dropdown menu, tabs, accordion, tooltip, toast, table,
pagination, breadcrumb, avatar, progress, spinner, empty and loading states, price, stat card and separator.
The [component kit](./kit.md) shows each of them in every stack, side by side.

Need something outside the core kit (a data table with filters, charts, the app shell, chat) on a non-React stack?
Build it from the kit parts, or render that screen with React. Inertia and Livewire apps can mix both.

## For AI assistants

The MCP server answers per stack:

```text
get_setup({ framework: "vue" })                          # install guide for that stack
list_components({ framework: "filament" })               # what exists there
get_component({ name: "dialog", framework: "alpine" })   # the markup for that stack
get_component({ name: "dialog" })                        # the React manual (props, accessibility, RTL)
```

`framework` accepts react (default), shadcn, inertia, inertia-vue, html, alpine, vue, blade, livewire, filament, laravel and tomatophp.
