---
name: error-pages
title: ErrorPage
category: feedback
status: beta
summary: Full-page states for 404, 500, offline, maintenance, no access, unknown workspace and a module that is coming soon, with sensible actions, an error ID to quote and English and Arabic copy.
exports: [ErrorPageLabels, useOnlineStatus, ErrorPageProps, ErrorPage, NotFoundPage, ServerErrorPage, OfflinePage, MaintenancePage, ForbiddenPage, UnknownWorkspacePage, ComingSoonPage]
related: [states, alert, impersonation-banner]
story: pages-system-error-pages
base-ui: []
keywords: [404, 500, 403, 503, error page, not found, offline, maintenance, forbidden, no access, unknown workspace, coming soon]
---

# ErrorPage

The screens a product shows when it cannot show what was asked for. One `ErrorPage` takes a `kind`, and seven named
wrappers (`NotFoundPage`, `ServerErrorPage`, `OfflinePage`, `MaintenancePage`, `ForbiddenPage`,
`UnknownWorkspacePage`, `ComingSoonPage`) save you typing it. Each says what happened, what to do next and offers the
right buttons. It never shows a stack trace. It is presentational: it takes handlers and never navigates itself.

## When to use

- Your router's not-found and error boundaries, the offline fallback, the maintenance switch.
- A workspace URL that does not match, or a module behind a coming-soon flag.

## When not to use

- An empty list or a failed panel inside a page: use [`EmptyState` and `ErrorState`](../states/README.md).
- A notice above content that still works: use [`Alert`](../alert/README.md).

## Import

```tsx
import { NotFoundPage } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { NotFoundPage, ServerErrorPage } from "@fadymondy/nasaq/web";

export const NotFound = () => <NotFoundPage onHome={() => router.push("/")} onBack={() => router.back()} />;

export const Crashed = ({ id }: { id: string }) => (
  <ServerErrorPage errorId={id} onRetry={() => router.refresh()} onContactSupport={() => openChat()} />
);
```

## Anatomy

```
ErrorPage            data-slot="error-page" (data-kind), a <main>
├─ logo              ProductLogo of the provider brand, or your own
├─ icon tile
├─ status code       data-slot="error-page-code", always LTR
├─ title + text      the h1 and the sentence
├─ extras            maintenance ETA, error ID with copy, "we will tell you" confirmation
└─ actions           defaults per kind, or your own
```

## API

Every `main` prop except `title` and `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `kind` | `"not-found" \| "server-error" \| "offline" \| "maintenance" \| "forbidden" \| "unknown-workspace" \| "coming-soon"` | required | Which page. Not needed on the named wrappers. |
| `title` / `description` | `ReactNode` | by kind | Replace the copy. |
| `code` | `string \| null` | 404, 500, 403, 503 by kind | The big number. `null` hides it. |
| `logo` | `ReactNode` | provider brand | Your logo, or `null`. |
| `errorId` | `string` | | 500: shown with a copy button. |
| `workspace` | `string` | | Unknown workspace: the address that failed. |
| `moduleName` | `string` | | Coming soon: what is coming. |
| `eta` | `number \| Date \| string` | | Maintenance: when it is back. |
| `online` | `boolean` | `false` | Offline: `true` turns it into "back online, reload". |
| `onHome` `onBack` `onRetry` `onContactSupport` `onSwitchWorkspace` `onRequestAccess` `onNotify` | `() => void \| Promise` | | Each shows its button only when passed. Async ones show a spinner while pending. |
| `actions` | `ReactNode` | by kind | Replace all buttons. |
| `fullScreen` | `boolean` | `true` | `min-h-dvh`. Turn off inside a panel. |
| `labels` | `Partial<ErrorPageLabels>` | | Override any string. |

**useOnlineStatus()** returns a boolean from `navigator.onLine` and the `online` / `offline` events. **statusCodeFor(kind)** returns the default code.

## Examples

**Offline that notices the connection coming back**

```tsx
import { OfflinePage, useOnlineStatus } from "@fadymondy/nasaq/web";

export function Offline() {
  const online = useOnlineStatus();
  return <OfflinePage online={online} onRetry={() => location.reload()} />;
}
```

## Accessibility

- The page is a `<main>` with one `<h1>`. The 500 page announces itself as an alert. Status is icon plus words, not colour alone.
- Async buttons show a spinner and cannot be pressed twice.

## RTL & i18n

- English and Arabic follow the locale. The status code and error ID stay left-to-right. The "back" arrow mirrors. The logo never mirrors.

## Styling & tokens

- Uses `bg-background`, `bg-card`, `text-display`, and the danger and warning text tokens. Target `[data-slot="error-page"]`.

## Do / Don't

- Do give a way forward on every page: home, retry, switch workspace.
- Do show an error ID on 500 so support can find the log.
- Don't show stack traces or internal messages.
- Don't reuse the 403 page to hide that something exists if that is sensitive: use not found instead.

## Related

- [`States`](../states/README.md)
- [`Alert`](../alert/README.md)
