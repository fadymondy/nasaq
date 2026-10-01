---
name: desktop-locations
title: DesktopLocations
category: platforms
status: beta
summary: Manage the folders a desktop app may use, such as Orchestra workspace roots. Add and remove folders, set read, write and index permissions per folder, see status and the default, plus a DesktopLocationPicker.
exports: [DesktopLocationsLabels, DesktopLocationStatus, DesktopLocationPermissions, DesktopLocation, LocationResult, DesktopLocationsProps, DesktopLocations, DesktopLocationPickerProps, DesktopLocationPicker, baseName, checkLocationPath, isAbsolutePath, LocationCheck, LocationProblem, LocationWarning, normalizePath, pathContains, samePath, shortenPath]
related: [file-explorer, select, alert-dialog, status, switch]
story: components-apps-platforms-desktop-locations
base-ui: [dialog, alert-dialog, select]
keywords: [desktop, folders, workspace, roots, orchestra, permissions, sandbox, index, local files, paths]
---

# DesktopLocations

The settings screen for "which folders can this app touch". Each location is an absolute path on the user's
computer with a status (ready, indexing, missing, not a folder, access denied), three permissions (read,
write, include in the search index) and an optional default mark. It matches how an Orchestra workspace
works: the roots confine the file tools and the search index, the first root is the default and relative
paths resolve against it.

Add opens a dialog that checks the path as you type: it must be absolute, must not repeat an existing
location, and it warns when the folder is inside or contains another one. `onBrowse` plugs in the system
folder picker from the desktop bridge. Removing a location only stops the app using it, files on disk stay.

`DesktopLocationPicker` is a small `Select` to choose one of the locations elsewhere in the app.

## When to use

- A desktop app or local agent settings page where the user grants folder access.

## When not to use

- Server storage or cloud files: use `FileExplorer`.
- A single path text field: use `Input`.

## Import

```tsx
import { DesktopLocations, DesktopLocationPicker } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { DesktopLocations, type DesktopLocation } from "@fadymondy/nasaq/web";

declare const locations: DesktopLocation[];
declare const bridge: { pickFolder(): Promise<string | null>; add(path: string): Promise<void>; remove(id: string): Promise<void> };

export function Roots() {
  return (
    <DesktopLocations
      locations={locations}
      onBrowse={bridge.pickFolder}
      onAdd={async (path) => bridge.add(path)}
      onRemove={bridge.remove}
    />
  );
}
```

## Anatomy

```
DesktopLocations               data-slot="desktop-locations"
├─ heading, description, Add folder
├─ list                        data-slot="desktop-location": name, path, Status, Default badge, counts
│  ├─ permissions              Read, Write, Index switches
│  └─ actions                  Make default, Re-index, Remove
├─ Alert                       explains an unusable location (missing, not a folder, denied)
└─ Dialog, AlertDialog         add (with path check and Browse), remove confirm
DesktopLocationPicker                 Select of usable locations
```

## API

**DesktopLocations**: every `section` prop except `children` and `title`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `locations` | `DesktopLocation[]` | required | `{ id, path, label?, status, permissions: { read, write, index }, primary?, fileCount?, indexedAt?, addedAt? }`. |
| `onAdd` | `(path, permissions) => Promise<void \| { error? }>` | | Shows Add folder. `{ error }` keeps the dialog open. |
| `onRemove` | `(id) => Promise<...>` | | Shows Remove, after a confirm. |
| `onPermissionsChange` | `(id, permissions) => Promise<...>` | | Makes the switches editable. |
| `onMakeDefault` | `(id) => Promise<...>` | | Shows Make default on the other locations. |
| `onReindex` | `(id) => Promise<...>` | | Shows a refresh on ready locations that have Index on. |
| `onBrowse` | `() => Promise<string \| null>` | | Opens the system picker. Shows Browse in the dialog. |
| `loading` | `boolean` | `false` | Skeleton rows. |
| `title`, `description` | `ReactNode` | | Replace the heading and the line under it. |
| `labels` | `Partial<DesktopLocationsLabels>` | | Override any string. |

**DesktopLocationPicker**: `locations`, `value`, `onValueChange(id, location)`, `requires` (`read`, `write` or `index`, default `read`), `disabled`, `placeholder`, `aria-label`, `labels`.

**Helpers** (pure, tested): `checkLocationPath`, `isAbsolutePath`, `normalizePath`, `samePath`, `pathContains`, `baseName`, `shortenPath`.

## Examples

**Choose where to save**

```tsx
<DesktopLocationPicker locations={locations} requires="write" value={target} onValueChange={(id) => setTarget(id)} aria-label="Save to" />
```

## Accessibility

- Each permission is a labelled switch that names its folder. Status is a word plus a shape, not colour alone.
- Dialog errors and path problems are announced with `role="alert"`. Remove asks through an `AlertDialog`.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. Paths are always `<bdi dir="ltr">`, with Windows and POSIX styles both supported.
- Windows paths compare case-insensitively, POSIX paths do not.

## Styling & tokens

- Built on `Status`, `Badge`, `Switch`, `Dialog`, `AlertDialog`, `Select`, `Alert` and `--nq-*` tokens.
- Target `[data-slot="desktop-locations"]` and `[data-slot="desktop-location"]`.

## Do / Don't

- Do check the path again in the desktop app: the component cannot see the disk.
- Do report a missing or denied folder through `status`, so the user can fix or remove it.
- Don't add a broad folder such as the drive root without a warning of your own.
- Don't treat the permissions here as the sandbox: enforce them in the app that reads files.

## Related

- [`FileExplorer`](../file-explorer/README.md)
- [`Select`](../select/README.md)
- [`Status`](../status/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-apps-platforms-desktop-locations--docs
