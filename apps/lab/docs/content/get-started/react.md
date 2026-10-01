### React (Next.js, Vite, Remix)

Install the package. It needs React 19.

```bash
pnpm add @fadymondy/nasaq
```

Add the styles to your Tailwind v4 entry CSS. The `@source` line lets Tailwind see the classes the components use; its path is relative to the CSS file.

```css
@import "tailwindcss";
@import "@fadymondy/nasaq/tokens.css";
@import "@fadymondy/nasaq/theme.css";
@import "@fadymondy/nasaq/web/styles.css";
@source "../node_modules/@fadymondy/nasaq/dist/web";
```

Wrap the app in the provider. It sets the brand, theme, locale, direction and currency (USD, or SAR in Arabic).

```tsx
import { Button, NasaqProvider } from "@fadymondy/nasaq/web";

export function App() {
  return (
    <NasaqProvider brand="nasaq">
      <Button>Save changes</Button>
    </NasaqProvider>
  );
}
```

No Tailwind in the project? Import the precompiled `@fadymondy/nasaq/nasaq.css` instead of the four CSS lines. Fonts and the no-flash theme script are in [Project setup](?page=docs-installation-project-setup).
