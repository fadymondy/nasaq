### shadcn

Use this when you want each component's source in your project. You need React 19, Tailwind v4 and a `components.json` (`npx shadcn@latest init`).

Add the registry to `components.json` once:

```json
{
  "registries": {
    "@nasaq": "https://nasaq-ui.fadymondy.com/r/{name}.json"
  }
}
```

Then add components by name. The first one also adds the `nasaq` preset: the tokens, `cn`, and `components/nasaq/nasaq-provider.tsx`.

```bash
npx shadcn@latest add @nasaq/button @nasaq/dialog
```

```tsx
import { NasaqProvider } from "@/components/nasaq/nasaq-provider";
import { Button } from "@/components/ui/button";

export function App() {
  return (
    <NasaqProvider brand="nasaq">
      <Button>Save changes</Button>
    </NasaqProvider>
  );
}
```

The shadcn tab on each component page shows its `add` command and its code with these import paths. Use either shadcn or the npm package in a project, not both. More in [Install with the shadcn CLI](?page=docs-installation-shadcn-cli).
