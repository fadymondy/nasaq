---
name: status-page
title: StatusPage
category: monitoring
status: beta
summary: The public status page - an overall banner, each service with a daily history bar and uptime, active and past incidents with their updates, and scheduled maintenance. No admin controls and no sign-in.
exports: [StatusPageLabels, StatusPageService, StatusPageMaintenance, StatusPageProps, StatusPage]
related: [uptime-monitors, status-page-manager, timeline, alert]
story: components-monitoring-status-page
base-ui: []
keywords: [status page, public, incident, maintenance, uptime, outage, operational]
---

# StatusPage

What a customer sees when they check whether you are up. A banner shows the worst thing happening (operational, degraded, partial or major outage, or maintenance in progress); below it are active incidents, every service with a daily history bar and its uptime, scheduled maintenance and past incidents. Give it `services`, `incidents` and `maintenance` from your own data. It draws no logo: pass yours as `logo`. Place it in your own layout; it sets its own max width.

## When to use

- A public status site, on its own domain.
- A status section inside a help centre.

## When not to use

- The admin view with edit controls: use `UptimeMonitors`.
- Choosing what appears here: use `StatusPageManager`.

## Import

```tsx
import { StatusPage } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { StatusPage, type StatusPageService } from "@fadymondy/nasaq/web";

declare const services: StatusPageService[];

export const Status = () => <StatusPage title="Acme status" services={services} updatedAt={Date.now()} />;
```

## Anatomy

```
StatusPage                   data-slot="status-page"
├─ header                    optional logo, title (h1)
├─ banner                    role="status", overall state
├─ active incidents          IncidentList
├─ services                  name, description, status Badge, UptimeBar, uptime Badge
├─ maintenance               Timeline of upcoming windows
├─ past incidents            IncidentList
└─ footer                    your `footer`, attribution
```

## API

**StatusPage**: every `div` prop except `children` and `title`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `ReactNode` | required | Product or company name. |
| `logo` | `ReactNode` | | Your own mark. Nothing is drawn if left out. |
| `services` | `readonly StatusPageService[]` | required | `{ id, name, description?, status, days?, uptime? }`. `days` is the daily result, oldest first (usually 90). |
| `incidents` | `readonly Incident[]` | `[]` | Open ones show first, resolved ones under Past incidents. |
| `maintenance` | `readonly StatusPageMaintenance[]` | `[]` | `{ id, title, startsAt, endsAt, description? }`. A window that is running turns the banner to maintenance. |
| `updatedAt` | `Date \| number \| string` | | Shown in the banner. |
| `footer` | `ReactNode` | | For example a subscribe link. |
| `labels` | `Partial<StatusPageLabels>` | | Override any string. |

## Examples

**With a logo and a link**

```tsx
import { StatusPage } from "@fadymondy/nasaq/web";

export const Branded = () => (
  <StatusPage
    title="Acme status"
    logo={<img src="/acme.svg" alt="" className="size-8" />}
    services={[{ id: "web", name: "Website", status: "up" }]}
    footer={<a href="/subscribe">Subscribe to updates</a>}
  />
);
```

## Accessibility

- One `h1` and `h2` per section. The banner is `role="status"`. Every state is text as well as colour.
- Each history bar has a text alternative and each segment a title.
- Contrast of the banner text is the normal foreground colour: only the icon is tinted.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. The history bar runs right to left; percentages and dates keep Latin digits inside their own isolate.

## Styling & tokens

- Built on `Badge`, `Timeline`, `UptimeBar` and `--nq-*` tokens. Target `[data-slot="status-page"]`.

## Do / Don't

- Do put incidents above the services while they are open.
- Do give honest dates: use the real start and resolve times.
- Don't show internal names of servers: name services the way customers know them.
- Don't leave the page without `updatedAt`: people want to know it is fresh.

## Related

- [`uptime-monitors`](../uptime-monitors/README.md)
- [`status-page-manager`](../status-page-manager/README.md)
- [`timeline`](../timeline/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-monitoring-status-page--docs
