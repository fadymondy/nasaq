---
name: status-page-manager
title: StatusPageManager
category: health
status: beta
summary: Admin for the public status page - title, address and custom domain, which services show and in what order (staged until Save), and posting incidents that appear on the page.
exports: [StatusPageManagerLabels, StatusPageManagerResult, ManagedService, StatusPageSettings, IncidentInput, StatusPageManagerProps, StatusPageManager, isValidStatusSlug, moveItem, StatusPageSettingsDraft]
related: [status-page, uptime-monitors, domains-manager, switch]
story: components-health-status-page-manager
base-ui: [dialog, field, select, switch]
keywords: [status page, admin, publish, incident, services, visibility, order]
---

# StatusPageManager

Decide what the public status page shows. Set the page title, the address (a slug) and an optional custom domain; switch a service off to hide it and use the arrows to reorder. Changes are staged: Save and Discard appear when something differs from the saved settings. Post incident opens a dialog with a title, a message, impact, status and the services affected, and lists the incidents below. It has no backend: `onSave` and `onPostIncident` talk to the server and you pass the new `settings` back.

## When to use

- The settings side of a status page product.

## When not to use

- Monitors and their checks: use `UptimeMonitors`.
- The public page itself: use `StatusPage`.

## Import

```tsx
import { StatusPageManager } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { StatusPageManager, type StatusPageSettings } from "@fadymondy/nasaq/web";

declare const settings: StatusPageSettings;
declare const api: { save(s: StatusPageSettings): Promise<void> };

export const Manager = () => <StatusPageManager settings={settings} onSave={(next) => api.save(next)} />;
```

## Anatomy

```
StatusPageManager            data-slot="status-page-manager"
├─ header                    title, View public page, Post incident
├─ settings                  title, slug, custom domain
├─ services                  list: Switch (show), name, Move up, Move down
├─ Save bar                  Discard, Save changes
├─ incidents                 IncidentList
└─ incident Dialog           title, message, impact, status, affected services
```

## API

**StatusPageManager**: every `Card` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `settings` | `StatusPageSettings` | required | `{ title, slug, domain?, services: { id, name, visible }[] }`, services in display order. |
| `incidents` | `readonly Incident[]` | `[]` | Shown under the form. |
| `publicUrl` | `string` | | Shows a View public page link. |
| `onSave` | `(next) => Promise<void \| { error? }>` | required | Save the staged settings. |
| `onPostIncident` | `(input: IncidentInput) => Promise<void \| { error? }>` | | Shows Post incident. `{ title, body, impact, status, serviceIds }`. |
| `labels` | `Partial<StatusPageManagerLabels>` | | Override any string. |

**Helpers** (pure, tested): `isValidStatusSlug`, `moveItem(list, index, delta)`.

## Examples

**Validate a slug**

```tsx
import { isValidStatusSlug } from "@fadymondy/nasaq/web";

isValidStatusSlug("acme-status"); // true
isValidStatusSlug("Acme Status"); // false
```

## Accessibility

- Each switch and arrow has a name that includes the service. Invalid fields are described by their message.
- The incident dialog traps focus and returns it. Saved and error messages are alerts.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. The slug and domain fields stay left to right; the arrow icon mirrors.

## Styling & tokens

- Built on `Card`, `Switch`, `Dialog`, `Select`, `IncidentList` and `--nq-*` tokens. Target `[data-slot="status-page-manager"]`.

## Do / Don't

- Do make posting an incident one step: it is used in an emergency.
- Do keep hidden services out of the public page (hidden means hidden).
- Don't save an invalid slug: the form blocks it, so should the server.
- Don't reuse the admin names on the public page without a check.

## Related

- [`status-page`](../status-page/README.md)
- [`uptime-monitors`](../uptime-monitors/README.md)
- [`domains-manager`](../domains-manager/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-health-status-page-manager--docs
