---
name: app-update
title: AppUpdate
category: alerts
status: beta
summary: An update pill with download progress, an update sheet with release notes and speed, a forced-update gate for unsupported builds, and an admin release manager with the minimum supported build.
exports: [AppUpdateLabels, UpdatePillProps, UpdatePill, UpdateSheetProps, UpdateSheet, ForcedUpdateGateProps, ForcedUpdateGate, ReleaseStatus, ManagedRelease, ReleaseManagerProps, ReleaseManager]
related: [progress, sheet, alert, install-prompt]
story: components-alerts-notifications-app-update
base-ui: [dialog, progress]
keywords: [update, auto update, electron, release notes, download progress, forced update, minimum version, release manager, rollout, restart]
---

# AppUpdate

Four pieces for an app that updates itself (Electron, Tauri or a PWA with a service worker). `UpdatePill` sits in the
header and shows the state. `UpdateSheet` gives the release notes and the download. `ForcedUpdateGate` blocks builds
that are too old. `ReleaseManager` is the admin side: releases, rollout, and the minimum supported build. They only
draw: your updater downloads and restarts, and you feed `status`, `progress` and `speed` in.

## When to use

- A desktop or installed app with its own update channel.
- A mobile or web app where old clients must be stopped after a breaking API change.

## When not to use

- A one-off announcement of what is new: use a [`Dialog`](../dialog/README.md) or [`Alert`](../alert/README.md).
- Asking people to install the app: use [`InstallPrompt`](../install-prompt/README.md).

## Import

```tsx
import { UpdatePill, UpdateSheet } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { UpdatePill, UpdateSheet } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Updates({ updater }: { updater: MyUpdater }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <UpdatePill status={updater.status} progress={updater.percent} onClick={() => setOpen(true)} />
      <UpdateSheet
        open={open}
        onOpenChange={setOpen}
        release={updater.release}
        status={updater.status}
        progress={updater.percent}
        speed={updater.bytesPerSecond}
        onDownload={updater.download}
        onRestart={updater.restart}
      />
    </>
  );
}
```

## Anatomy

```
UpdatePill           data-slot="update-pill" (data-status), a button with a download fill
UpdateSheet          data-slot="update-sheet", Sheet with notes, size, progress, Later and Restart
ForcedUpdateGate     data-slot="forced-update-gate", renders children unless the build is too old
ReleaseManager       data-slot="release-manager": minimum build field, warning, releases table
```

## API

**UpdatePill**: button props except `children` and `type`, plus `status` (`"available" | "downloading" | "ready" | "error"`), `progress` (0 to 100), `version`, `labels`.

**UpdateSheet**: `open`, `onOpenChange`, `release` (`AppRelease`: `version`, `build`, `date`, `notes`, `size` in bytes, `channel`), `status`, `progress`, `speed` (bytes per second), `onDownload`, `onRestart`, `onLater`, `side` (`"end"`), `labels`.

**ForcedUpdateGate**: `currentBuild`, `minSupportedBuild`, `release`, `status`, `progress`, `speed`, `onDownload`, `onRestart`, `logo`, `children`, `labels`.

**ReleaseManager**: `releases` (`ManagedRelease[]`: an `AppRelease` plus `id`, `status`, `rollout`), `minSupportedBuild`, `usage` (`{ build, users }[]`, optional), `onSetMinSupportedBuild(build)`, `onPublish(id)`, `onRollback(id)`, `labels`. The async callbacks return `void` or `{ error }`.

**Helpers** (pure, in `app-update-format.ts`): `isUpdateRequired`, `clampUpdatePercent`, `formatUpdateSize`, `formatUpdateSpeed`, `secondsLeft`, `formatUpdateTime`, `countBelow`, `minBuildProblem`.

## Examples

**Block old builds**

```tsx
<ForcedUpdateGate currentBuild={APP_BUILD} minSupportedBuild={config.minBuild} release={latest} status={status} onDownload={download} onRestart={restart}>
  <App />
</ForcedUpdateGate>
```

## Accessibility

- The pill announces changes through a polite live region; the download is a real `progressbar` with a name.
- The sheet is a dialog with focus trapped and Escape to close. The forced gate is a `<main>` with the only action being update.
- Note types are words (New, Improved, Fixed), not colour alone.

## RTL & i18n

- English and Arabic follow the locale. Speeds, sizes, versions and builds stay left-to-right with Latin digits. The pill fill grows from the inline start.

## Styling & tokens

- Uses `bg-card`, `border-border`, the success and danger soft tokens, and `Progress`. Target `[data-slot="update-pill"]`, `[data-slot="release-manager"]`.

## Do / Don't

- Do offer "Later" for ordinary updates and keep the forced gate for builds the server really cannot serve.
- Do warn before raising the minimum build: pass `usage` so the admin sees how many people it blocks.
- Don't restart without telling: the restart is a button, not a timer.

## Related

- [`Progress`](../progress/README.md)
- [`Sheet`](../sheet/README.md)
- [`Alert`](../alert/README.md)
