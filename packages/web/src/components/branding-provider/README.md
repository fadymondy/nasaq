---
name: branding-provider
title: BrandingProvider
category: brand
status: beta
summary: Applies a tenant's brand colours at runtime from data (an org's settings, a white-label customer) over the active brand manifest, with readable on-brand text, a derived dark step and the tenant logo and name shared through useBranding.
exports: [BrandingProvider, BrandingProviderProps, useBranding, BrandingValue, BrandColors, applyBrand, hexToHSL, hslToHex, readableOn, darkVariant]
related: [product-mark, product-switcher, color-picker, switchers]
story: components-brand-branding-provider
base-ui: []
keywords: [brand, white label, tenant, theme, colour, color, runtime, multi-tenant, logo, organization]
---

# BrandingProvider

`NasaqProvider brand="…"` picks a brand manifest at build time. BrandingProvider is for colours that arrive
at runtime: it writes the brand variables (`--nq-brand-l/d`, `--nq-action-l/d`, `--nq-on-action-l/d`,
`--nq-accent-brand`) so every primary button, link and badge follows the tenant.

## When to use

- Multi-tenant and white-label apps where each organisation picks its colour and logo.
- A settings page that previews a colour before saving (scope it with `target`).

## When not to use

- One fixed brand: use a manifest in `NasaqProvider`.
- Recolouring a single element: use a class or a style.

## Import

```tsx
import { BrandingProvider, useBranding, applyBrand } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { BrandingProvider, NasaqProvider, useBranding } from "@fadymondy/nasaq/web";
import type { ReactNode } from "react";

declare const org: { name: string; brandColor: string | null; logoUrl: string | null };

function OrgLogo() {
  const b = useBranding();
  return b?.logoUrl ? <img src={b.logoUrl} alt={b.name ?? ""} className="h-6" /> : <span>{b?.name}</span>;
}

export function App({ children }: { children: ReactNode }) {
  return (
    <NasaqProvider>
      <BrandingProvider brand={org.brandColor ?? undefined} logoUrl={org.logoUrl} name={org.name}>
        <OrgLogo />
        {children}
      </BrandingProvider>
    </NasaqProvider>
  );
}
```

## Anatomy

BrandingProvider renders no element. On mount it calls `applyBrand(target, colors)` and removes the
variables on unmount or change. A scoped `target` (not `<html>`) also gets `data-brand="runtime"`, so the
derived roles (`--nq-brand`, `--primary`) re-resolve inside it.

## API

**BrandingProvider**

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `brand` | `string` | manifest | Brand colour on light surfaces, `#RRGGBB` or `#RGB`. |
| `brandDark` | `string` | lighter step of `brand` | Brand colour on dark surfaces. |
| `action` / `actionDark` | `string` | the brand colours | Primary button fill. |
| `accent` | `string` | manifest | Featured / new accent. |
| `logoUrl` | `string \| null` | | Shared through `useBranding`. Blank becomes `null`. |
| `name` | `string` | | Tenant name, shared through `useBranding`. |
| `target` | `() => HTMLElement \| null` | `document.documentElement` | Scope the colours to one element. |

Invalid colours are skipped, so a bad value from the database falls back to the manifest.

**useBranding(): BrandingValue | null**: the colours, `logoUrl` and `name`; null outside a provider.

**applyBrand(root, colors): () => void**: the same, without React. Returns a cleanup.

**Helpers**: `hexToHSL(hex)`, `hslToHex({ h, s, l })`, `readableOn(background)` (ivory or indigo, whichever
has more contrast), `darkVariant(hex)` (same hue, lightness at least 62%).

## Accessibility

- Text on the action colour is picked by WCAG contrast (`readableOn`), so a pale tenant colour gets dark text.
- Still check the tenant colour against your surfaces; a very light brand colour is weak as link text on ivory.

## RTL & i18n

- Colours only; nothing to mirror.

## Styling & tokens

- Writes inline custom properties on the target. The server render uses the manifest; the tenant colours
  apply after hydration. To avoid the flash, also print the same variables in a `<style>` from the server.

## Do / Don't

- Do validate colours when the tenant saves them; the provider only skips invalid ones.
- Do keep your product mark somewhere when a tenant logo replaces it.
- Don't recolour status colours (success, danger); they keep their meaning across tenants.

## Related

- [`ProductMark`](../product-mark/README.md)
- [`ColorPicker`](../color-picker/README.md)
- [`Switchers`](../switchers/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-brand-branding-provider--docs
