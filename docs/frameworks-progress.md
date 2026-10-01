# Framework support: progress

Working branch `feat/frameworks` in the worktree `E:\Sites\nasaq-wt-frameworks`. The loop picks the next unchecked item.

- [x] `packages/html`: `nasaq.css`, the plain-CSS component layer (`.nq-*` classes on Nasaq tokens, no Tailwind needed)
- [x] `packages/html`: vanilla behaviours (`data-nq` auto-init): dialog, menu, tabs, tooltip, toast, accordion, theme/locale, money (USD, or SAR in Arabic)
- [x] `packages/html`: Alpine.js plugin (`Alpine.plugin(nasaq)`): `nqDialog`, `nqMenu`, `nqTabs`, `nqToast` store, `$nq` magic
- [x] `packages/vue`: Vue 3 components rendering the same classes, `NasaqProvider` / `useNasaq` / `useCurrency`
- [x] `@fadymondy/nasaq` exports: `./html`, `./html.css`, `./alpine`, `./vue`, IIFE/CDN builds, Blade component stubs
- [x] Tests: core logic plus DOM behaviours (html 31, vue 11)
- [x] Lab stories: Frameworks/HTML, Frameworks/Alpine, Frameworks/Vue
- [ ] Docs: `docs/frameworks/{html,vue,alpine,filament}.md`, package README, component README sections
- [ ] MCP: `get_setup({ framework })`, `get_component` returns framework snippets, `list_components({ framework })`
- [ ] Changeset, PR, merge, release, redeploy docs
