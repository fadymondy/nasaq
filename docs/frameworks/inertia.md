# Nasaq for Laravel + Inertia (React or Vue)

Inertia renders React or Vue pages from Laravel routes, so it uses the regular Nasaq packages, not the Blade layer:

- **Inertia + React:** the main package `@fadymondy/nasaq/web` (or the shadcn registry). Every Nasaq component is available.
- **Inertia + Vue:** `@fadymondy/nasaq/vue`, the [Vue kit](./vue.md).

Laravel's React and Vue starter kits already ship Vite, Tailwind v4 and a shadcn `components.json`, so Nasaq drops straight in.

## Inertia + React

```bash
npm i @fadymondy/nasaq
```

`resources/css/app.css` (the starter kit's Tailwind entry):

```css
@import "tailwindcss";
@import "@fadymondy/nasaq/tokens.css";
@import "@fadymondy/nasaq/theme.css";
@import "@fadymondy/nasaq/web/styles.css";
@source "../../node_modules/@fadymondy/nasaq/dist/web";
```

The `@source` path is relative to the CSS file. Without it the components render unstyled.

### Root view: language, direction and no-flash theme

```blade
{{-- resources/views/app.blade.php --}}
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="{{ str_starts_with(app()->getLocale(), 'ar') ? 'rtl' : 'ltr' }}">
<head>
    <script src="{{ asset('vendor/nasaq/theme-script.js') }}" data-default-theme="system"></script>
    @viteReactRefresh
    @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
    @inertiaHead
</head>
<body>@inertia</body>
</html>
```

Copy `node_modules/@fadymondy/nasaq/dist/theme-script.js` to `public/vendor/nasaq/` once. It is a plain, synchronous
script (no `defer`), so the saved theme applies before first paint. If the starter kit already has its own appearance
script, remove it: the two would fight over the `dark` class.

### Share the locale

```php
// app/Http/Middleware/HandleInertiaRequests.php
public function share(Request $request): array
{
    return [
        ...parent::share($request),
        'locale' => app()->getLocale(),
        'flash' => ['success' => $request->session()->get('success')],
    ];
}
```

### Provider in a persistent layout

The provider goes in a layout that reads the shared props, so a locale change on the server reaches it on the next visit:

```tsx
// resources/js/layouts/nasaq-layout.tsx
import { usePage } from "@inertiajs/react";
import { useEffect, type ReactNode } from "react";
import { NasaqProvider, Toaster, toast } from "@fadymondy/nasaq/web";

type Shared = { locale: string; flash: { success?: string | null } };

export function NasaqLayout({ children }: { children: ReactNode }) {
  const { locale, flash } = usePage<Shared>().props;
  useEffect(() => {
    if (flash.success) toast.success(flash.success);
  }, [flash.success]);
  return (
    <NasaqProvider brand="nasaq" locale={locale}>
      {children}
      <Toaster />
    </NasaqProvider>
  );
}
```

```tsx
// resources/js/app.tsx
import { createInertiaApp } from "@inertiajs/react";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { createRoot } from "react-dom/client";
import { NasaqLayout } from "./layouts/nasaq-layout";
import "../css/app.css";

createInertiaApp({
  resolve: async (name) => {
    const page: any = await resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob("./pages/**/*.tsx"));
    page.default.layout ??= (p: React.ReactNode) => <NasaqLayout>{p}</NasaqLayout>;
    return page;
  },
  setup: ({ el, App, props }) => createRoot(el).render(<App {...props} />),
});
```

Pages that set their own `layout` should wrap it in `NasaqLayout` too, e.g. `layout: (p) => <NasaqLayout><AppLayout>{p}</AppLayout></NasaqLayout>`.

### Forms, links and money

```tsx
import { Link, useForm } from "@inertiajs/react";
import { Button, Field, FieldError, FieldLabel, Input, Price } from "@fadymondy/nasaq/web";

export default function Invite() {
  const form = useForm({ email: "" });
  return (
    <form onSubmit={(e) => { e.preventDefault(); form.post("/invites"); }} className="grid gap-4">
      <Field invalid={Boolean(form.errors.email)}>
        <FieldLabel>Email</FieldLabel>
        <Input type="email" value={form.data.email} onChange={(e) => form.setData("email", e.target.value)} />
        <FieldError match>{form.errors.email}</FieldError>
      </Field>
      <Button type="submit" variant="primary" disabled={form.processing}>Send invite</Button>
      <Button render={<Link href="/invites" />} nativeButton={false} variant="link">All invites</Button>
      <Price amount={1280} />
    </form>
  );
}
```

- Server validation errors go to `Field invalid` + `FieldError match`, the same way client errors do.
- Inertia's `Link` is rendered through the Base UI `render` prop, so it keeps the button styles and stays an `<a>`.
- `Price` formats in USD, or SAR when the locale is Arabic.

### Or copy the components (shadcn)

The starter kit's `components.json` already works with the Nasaq registry. Add the namespace and install by name:

```json
{ "registries": { "@nasaq": "https://nasaq-ui.fadymondy.com/r/{name}.json" } }
```

```bash
npx shadcn@latest add @nasaq/nasaq @nasaq/button @nasaq/dialog
```

The files land in `resources/js/components/ui`, so imports become `@/components/ui/button`. The starter kit ships
shadcn's own `button`, `dialog` and so on in the same folder: the CLI asks before replacing each one, so say yes to
take the Nasaq version. With the registry copy, `NasaqProvider` comes from `@/components/nasaq/nasaq-provider`.

## Inertia + Vue

```bash
npm i @fadymondy/nasaq
```

```ts
// resources/js/app.ts
import { createInertiaApp } from "@inertiajs/vue3";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { createApp, h, type DefineComponent } from "vue";
import Nasaq from "@fadymondy/nasaq/vue";
import NasaqLayout from "./layouts/NasaqLayout.vue";
import "../css/app.css";

createInertiaApp({
  resolve: async (name) => {
    const page = await resolvePageComponent(`./pages/${name}.vue`, import.meta.glob<DefineComponent>("./pages/**/*.vue"));
    page.default.layout ??= NasaqLayout;
    return page;
  },
  setup: ({ el, App, props, plugin }) => createApp({ render: () => h(App, props) }).use(plugin).use(Nasaq).mount(el),
});
```

```css
/* resources/css/app.css */
@import "tailwindcss";
@import "@fadymondy/nasaq/html.css";
```

```vue
<!-- resources/js/layouts/NasaqLayout.vue -->
<script setup lang="ts">
import { usePage } from "@inertiajs/vue3";
import { computed } from "vue";
import FlashToasts from "../components/FlashToasts.vue";

const page = usePage<{ locale: string; flash: { success?: string | null } }>();
const locale = computed(() => page.props.locale);
</script>

<template>
  <NasaqProvider brand="nasaq" :locale="locale">
    <FlashToasts :message="page.props.flash.success" />
    <slot />
  </NasaqProvider>
</template>
```

`useToast` needs the provider above it, so the flash watcher lives in a small child component:

```vue
<!-- resources/js/components/FlashToasts.vue -->
<script setup lang="ts">
import { watch } from "vue";
import { useToast } from "@fadymondy/nasaq/vue";
const props = defineProps<{ message?: string | null }>();
const { success } = useToast();
watch(() => props.message, (m) => m && success(m), { immediate: true });
</script>
<template><span hidden /></template>
```

Forms and links:

```vue
<script setup lang="ts">
import { Link, useForm } from "@inertiajs/vue3";
const form = useForm({ email: "" });
</script>

<template>
  <form class="grid gap-4" @submit.prevent="form.post('/invites')">
    <NqField label="Email" :error="form.errors.email">
      <NqInput v-model="form.email" type="email" />
    </NqField>
    <NqButton type="submit" variant="primary" :loading="form.processing">Send invite</NqButton>
    <Link href="/invites" class="nq-button" data-variant="link">All invites</Link>
    <NqMoney :amount="1280" />
  </form>
</template>
```

`NqButton`'s `as` takes a tag name, so for Inertia's `Link` put the button classes on the `Link` itself
(`class="nq-button" data-variant="…"`), as above.

The Vue starter kit ships shadcn-vue in `resources/js/components/ui`. Both can live side by side; use `Nq*` for new
screens so they match the React and Blade products.

## Rules

- Pick one theme owner: Nasaq's provider and theme script. Remove the starter kit's appearance toggle code, or wire its
  toggle to `setTheme` (`useNasaq()` in React and Vue).
- Share `locale` from Laravel and pass it to the provider; don't keep a second locale in the client.
- Money is USD by default and SAR in Arabic.
- Everything else (props, accessibility, content rules) is in each component's manual: `get_component({ name })` for
  React, `get_component({ name, framework: "vue" })` for Vue.
