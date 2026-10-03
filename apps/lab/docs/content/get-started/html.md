### Plain HTML + Alpine.js

No build step: one stylesheet and one script from the CDN, then Alpine. The script registers the Nasaq components with Alpine before it starts.

```html
<!doctype html>
<html lang="en" dir="ltr" data-brand="nasaq">
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fadymondy/nasaq/dist/nasaq.css">
  <script defer src="https://cdn.jsdelivr.net/npm/@fadymondy/nasaq/dist/cdn/nasaq-alpine.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js"></script>
</head>
<body class="bg-background text-foreground">
  <!-- paste a component's HTML + Alpine tab here -->
</body>
</html>
```

Pin a version in production (`@fadymondy/nasaq@0.5`). Set `lang="ar" dir="rtl"` for Arabic. `$nq` is available in every Alpine expression: `$nq.setLocale('ar')`, `$nq.toggleTheme()`, and `$nq.money(12)` (USD, or SAR in Arabic).

**With a bundler** (Vite, esbuild), install the package and register the plugin yourself:

```ts
import Alpine from "alpinejs";
import nasaq from "@fadymondy/nasaq/alpine";
import "@fadymondy/nasaq/nasaq.css";

Alpine.plugin(nasaq);
Alpine.start();
```

The HTML on each component page is exactly what the Blade components render, so you can also write it by hand in any server language (Django, Rails, Go templates).
