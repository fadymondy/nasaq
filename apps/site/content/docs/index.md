---
title: "Getting started"
description: "Install Nasaq into any shadcn project, or use the npm package."
---

Nasaq is a design system with one product language for every surface. Components are copied into your project
with the shadcn CLI, so you own the code; tokens are `--nq-*` CSS variables that work in light, dark, LTR and RTL.

## Install from the registry

```bash
npx shadcn@latest add https://docs.nasaqui.com/r/nasaq.json
npx shadcn@latest add https://docs.nasaqui.com/r/button.json
```

Or register it once in `components.json` and use the short name:

```json
{
  "registries": {
    "@nasaq": "https://docs.nasaqui.com/r/{name}.json"
  }
}
```

```bash
npx shadcn@latest add @nasaq/button
```

## Install from npm

```bash
pnpm add @fadymondy/nasaq
```

Browse the [components](/docs/components) or pick a [brand theme](/themes).
