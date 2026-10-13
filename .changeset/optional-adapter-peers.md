---
"@fadymondy/nasaq": minor
---

Install contract change: the Vue and Alpine adapters' libraries are now optional peer dependencies instead of dependencies, so React apps no longer install Vue (`reka-ui`, `@floating-ui/vue`, `vue-demi`, `lucide-vue-next`, `vue-sonner`) or the Alpine plugins. If you use `@fadymondy/nasaq/vue`, add `vue reka-ui lucide-vue-next vue-sonner`; if you use `@fadymondy/nasaq/alpine` with a bundler, add `@alpinejs/anchor @alpinejs/collapse @alpinejs/focus`. React, Electron, React Native and the CDN Alpine script need nothing new.
