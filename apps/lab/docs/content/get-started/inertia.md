### Laravel + Inertia (React or Vue)

Inertia pages are ordinary React or Vue components, so you use the JavaScript packages. Laravel only sends the props.

```bash
npm install @fadymondy/nasaq
```

In `resources/css/app.css` (Tailwind v4 through `@tailwindcss/vite`), keep the `@source` line for your stack's build:

```css
@import "tailwindcss";
@import "@fadymondy/nasaq/tokens.css";
@import "@fadymondy/nasaq/theme.css";
@import "@fadymondy/nasaq/web/styles.css";
@source "../../node_modules/@fadymondy/nasaq/dist/web";   /* React */
@source "../../node_modules/@fadymondy/nasaq/dist/vue";   /* Vue */
```

**React** (`resources/js/app.tsx`): wrap the page in the provider.

```tsx
import { createInertiaApp } from "@inertiajs/react";
import { NasaqProvider } from "@fadymondy/nasaq/web";
import { createRoot } from "react-dom/client";

createInertiaApp({
  resolve: (name) => import.meta.glob("./Pages/**/*.tsx", { eager: true })[`./Pages/${name}.tsx`],
  setup({ el, App, props }) {
    createRoot(el).render(
      <NasaqProvider brand="nasaq" locale={document.documentElement.lang}>
        <App {...props} />
      </NasaqProvider>,
    );
  },
});
```

**Vue** (`resources/js/app.ts`): install the plugin, which registers every `Nq*` component.

```ts
import { createInertiaApp } from "@inertiajs/vue3";
import { Nasaq, NasaqProvider } from "@fadymondy/nasaq/vue";
import { createApp, h } from "vue";

createInertiaApp({
  resolve: (name) => import.meta.glob("./Pages/**/*.vue", { eager: true })[`./Pages/${name}.vue`],
  setup({ el, App, props, plugin }) {
    createApp({ render: () => h(NasaqProvider, { brand: "nasaq" }, () => h(App, props)) })
      .use(plugin)
      .use(Nasaq)
      .mount(el);
  },
});
```

Pass the app locale from Laravel (`<html lang="{{ app()->getLocale() }}">`). An Arabic locale switches the direction to RTL and the currency to SAR.
