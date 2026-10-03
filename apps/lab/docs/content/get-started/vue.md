### Vue 3 and Nuxt

The Vue components (`NqButton`, `NqDialog` …) are built on [Reka UI](https://reka-ui.com) and use the same Tailwind classes as the React ones. They ship in the same package.

```bash
pnpm add @fadymondy/nasaq vue
```

Add the styles to your Tailwind v4 entry CSS:

```css
@import "tailwindcss";
@import "@fadymondy/nasaq/tokens.css";
@import "@fadymondy/nasaq/theme.css";
@import "@fadymondy/nasaq/web/styles.css";
@source "../node_modules/@fadymondy/nasaq/dist/vue";
```

Install the plugin to register every component, or import components one by one:

```ts
import { createApp } from "vue";
import { Nasaq } from "@fadymondy/nasaq/vue";
import App from "./App.vue";

createApp(App).use(Nasaq).mount("#app");
```

```vue
<script setup lang="ts">
import { NasaqProvider, NqButton } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NasaqProvider brand="nasaq">
    <NqButton>Save changes</NqButton>
  </NasaqProvider>
</template>
```

Using `NqToaster`? Also `import "vue-sonner/style.css"` once.

`NasaqProvider` takes `v-model:theme` and `v-model:locale`. Arabic switches the direction to RTL and the currency to SAR.

**Nuxt**: add the plugin in `plugins/nasaq.ts` (`export default defineNuxtPlugin((app) => app.vueApp.use(Nasaq))`), and the CSS in `nuxt.config` `css`. **No Tailwind**: import `@fadymondy/nasaq/nasaq.css` instead of the CSS block.
