---
name: detail-layout
title: Detail Layout
category: layout
status: beta
summary: A detail page for one thing (a plugin, a customer, a server). A sub-sidebar of tabs grouped in sections that becomes a tab bar on small screens, a header with icon, name, version, kind, status and recent activity, the active tab's content, and loading and error states.
exports: [DetailLayoutLabels, DetailTab, DetailStatusTone, DetailIdentity, DetailActivity, DetailLayoutProps, DetailLayout]
related: [page-header, sidebar-layout, tabs, plugin-card, states]
story: components-layout-detail-layout
base-ui: []
keywords: [detail, entity, record, plugin, settings, sub-sidebar, secondary navigation, tabs, hero, header, activity, sparkline, sections]
---

# Detail Layout

The page you land on after picking one item from a list. Its sections run down a second sidebar next to the app's
own menu, grouped under small headings ("General", "Settings"). On small screens the sidebar becomes a scrolling tab
bar. Above the content sits a header: the item's icon on its colour, its name and version, what kind of thing it is,
its status, a short description, and a box with its headline count, a sparkline and when it was last active.

## When to use

- A plugin's, integration's or resource's detail page with several sections.
- Any record with enough settings to need a second level of navigation.

## When not to use

- A page with two or three views of the same data: use `Tabs`.
- A list page: use `PageHeader` and a table or grid.
- The app's main navigation: use `SidebarLayout`.

## Import

```tsx
import { DetailLayout } from "@fadymondy/nasaq";
```

## Quick start

```tsx
const [tab, setTab] = useState("overview");

<DetailLayout
  tabs={[
    { key: "overview", label: "Overview", icon: "layout-dashboard", section: "General" },
    { key: "logs", label: "Logs", icon: "scroll-text", section: "General", badge: 12 },
    { key: "settings", label: "Settings", icon: "settings", section: "Settings" },
  ]}
  activeTab={tab}
  onTabChange={setTab}
  identity={{ name: "Postgres", version: "2.4.1", kind: "Source", status: { label: "Enabled", tone: "success" }, icon: "database", hue: "blue" }}
  activity={{ count: 128430, countLabel: "records", series, lastActiveAt }}
  actions={<Button>Disable</Button>}
  loading={query.isLoading}
  error={query.isError}
  onRetry={query.refetch}
>
  {tab === "overview" ? <Overview /> : tab === "logs" ? <Logs /> : <Settings />}
</DetailLayout>
```

## Anatomy

- `data-slot="detail-layout"`: a row on wide screens, a column on small ones.
- `detail-sidebar` (from `md`): `nav` with section headings and `detail-tab` buttons.
- `detail-tabbar` (below `md`): the same tabs in one scrolling row.
- `detail-hero`: icon tile, name, version, kind and status badges, description, slug; `detail-activity`; `actions`.
- `detail-content`: the active tab's content.

## API

| Prop | Type | Notes |
| --- | --- | --- |
| `tabs` | `DetailTab[]` | `{ key, label, icon?, section?, badge?, disabled? }`. `icon` is a name, image URL or node. |
| `activeTab`, `onTabChange` | `string`, `(key) => void` | Controlled. Sync with the URL if you like. |
| `identity` | `DetailIdentity` | `{ name, description?, version?, kind?, status?: { label, tone? }, icon?, hue?, slug? }`. Leave it out for no header. |
| `activity` | `DetailActivity` | `{ count?, countLabel?, series?, lastActiveAt? }`. |
| `actions` | `ReactNode` | At the end of the header. |
| `loading` | `boolean` | Header skeleton and a loading state for the content. The tabs stay usable. |
| `error`, `onRetry` | `boolean \| ReactNode`, `() => void` | Replaces header and content with an `ErrorState` and **Try again**. |
| `headingAs` | `ElementType` | The name's element. Default `h1`. |
| `labels` | `Partial<DetailLayoutLabels>` | |

Status tones: `success`, `warning`, `danger`, `info`, `neutral`.

### Helpers

From `detail-layout-logic.ts`, pure: `groupDetailTabs(tabs)` gives `{ section, tabs }[]` in first-appearance order
with unsectioned tabs first; `stepDetailTab(tabs, active, 1 | -1 | "first" | "last")` skips disabled tabs and wraps.

## Accessibility

- The sidebar and the tab bar are `nav`s named "Sections". The active tab has `aria-current="page"` and controls
  the content region.
- One tab is in the tab order; arrow keys move between tabs (up and down in the sidebar, left and right in the bar,
  mirrored in Arabic), Home and End jump to the ends. Moving also opens the tab.
- Activity reads as words ("Last active: 5 minutes ago"); the sparkline has a label and the count's full value is in
  its title.
- The loading header is hidden from assistive tech; the content's loading state announces itself.

## RTL & i18n

English and Arabic strings follow the locale. The sidebar sits on the start side, so it moves to the right in
Arabic. Versions, slugs and the count stay left to right.

## Styling & tokens

`bg-card`, `border-border`; the active tab uses `bg-nq-selected`, hovered ones `bg-nq-hover`. The icon tile and
sparkline use the `--nq-tag-*` hue tokens.

## Do / Don't

- Do keep section names short; they are headings, not descriptions.
- Do keep the tabs while loading, so people can pick a section before the data arrives.
- Don't put more than one primary action in `actions`.

## Related

`page-header`, `sidebar-layout`, `tabs`, `plugin-card`, `states`.

## Lab

Layout › Detail Layout: Default, Loading, Load error, Arabic.
