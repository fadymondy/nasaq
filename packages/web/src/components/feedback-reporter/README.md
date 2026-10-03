---
name: feedback-reporter
title: FeedbackReporter
category: feedback-sdk
status: beta
summary: The interface around the feedback dialog. A floating launcher as a pill, circle or edge tab that visitors can drag aside, a hub of reports already made on this page, a launcher configurator with install code, and a shake-to-report sheet for phones.
exports: [FeedbackReporterLabels, FeedbackFloatingLauncherProps, FeedbackFloatingLauncher, FeedbackHubProps, FeedbackHubFilter, FeedbackHub, FeedbackLauncherConfiguratorProps, FeedbackLauncherConfigurator, ShakeToReportOptions, useShakeToReport, ShakeReportSheetProps, ShakeReportSheet]
related: [sheet, dialog, chat-widget, alert]
story: components-feedback-sdk-feedback-reporter
base-ui: [dialog, toggle-group, tabs, switch]
keywords: [feedback, report a problem, floating button, launcher, draggable, movable, my reports, pagination, shake to report, bug report, hub, votes, mahaam]
---

# FeedbackReporter

Everything around a feedback dialog that a design system can own. The dialog itself, with screenshot capture, the
element picker and the console and network log, already exists in the `@nasaq/feedback` package (`ReportDialog`,
`FeedbackLauncher`, `mahaamSubmitter`). This component does not repeat it: it adds the floating launcher, the list of
reports already made on the page, the launcher configurator with its install code, and the shake-to-report sheet. Open
`ReportDialog` from any of them.

## When to use

- A persistent "Feedback" control on a product or a client's site.
- Showing visitors what has been reported on the page, so they vote instead of duplicating.
- Letting a mobile user shake the phone to report.

## When not to use

- Capturing the report (title, screenshot, logs): use `ReportDialog` from `@nasaq/feedback`.
- Live support chat: use [`ChatWidget`](../chat-widget/README.md).

## Import

```tsx
import { FeedbackFloatingLauncher, FeedbackHub } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"; the dialog comes from "@nasaq/feedback"
```

## Quick start

```tsx
import { ReportDialog, mahaamSubmitter, submit } from "@nasaq/feedback";
import { FeedbackFloatingLauncher } from "@fadymondy/nasaq/web";
import { useState } from "react";

const target = mahaamSubmitter(process.env.NEXT_PUBLIC_MAHAAM_FEEDBACK_KEY!);

export function Feedback() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <FeedbackFloatingLauncher shape="pill" position="bottom-end" onClick={() => setOpen(true)} />
      <ReportDialog open={open} onOpenChange={setOpen} onSubmit={(report) => submit(target, report)} />
    </>
  );
}
```

## Anatomy

```
FeedbackFloatingLauncher      data-slot="feedback-launcher" (data-shape, data-position or data-side, data-movable, data-dragging)
FeedbackHub                   data-slot="feedback-hub": header, status / Mine filter, report list with votes, Load more
FeedbackLauncherConfigurator  data-slot="feedback-configurator": shape, position, text, preview, install code
ShakeReportSheet              data-slot="shake-report-sheet": bottom sheet, report, not now, setting
useShakeToReport              devicemotion listener, counts jolts
```

## API

**FeedbackFloatingLauncher**: button props except `children` and `type`, plus `shape` (`"pill" | "circle" | "tab"`), `position` (`"bottom-end" | "bottom-start" | "top-end" | "top-start" | "edge-end" | "edge-start"`), `label`, `count`, `placement` (`"fixed"`), `icon`. A tab always sits on an edge and a pill or circle never does: `normalizePosition` settles a mismatch.

With `movable` the visitor can drag the launcher out of the way. On release it snaps to the nearer side and keeps its height (`FeedbackLauncherSpot`: `{ side: "start" | "end", y }`, `y` a fraction of the height); a drag never counts as a click. Alt + arrow keys move it too. The spot is saved in `localStorage` under `storageKey` (default `"nasaq-feedback-launcher"`, `null` to keep it in memory) and read back after mount. `spot` makes it controlled, `defaultSpot` sets the first one, `onSpotChange(spot)` reports drops and key moves.

**FeedbackHub**: `issues` (`FeedbackHubIssue[]`: `id`, `title`, `status` `"open" | "in-progress" | "resolved"`, `createdAt`, `votes`, `voted`, `author`), `page`, `onVote(id)`, `onReportNew`, `onOpenIssue(id)`, `labels`. Issues with `mine: true` are the visitor's own: they get a "Yours" badge and a **Mine** tab (`mineTab` forces it on or off).

For a server-paged list pass the first page as `issues`, the totals as `counts` (`{ all, open, "in-progress", resolved, mine }`), refetch on `onFilterChange(filter)`, and set `hasMore`, `onLoadMore` and `loadingMore` for the **Load more** row.

**FeedbackLauncherConfigurator**: `value` (`{ shape, position, label }`), `onChange`, `labels`.

**ShakeReportSheet**: `open`, `onOpenChange`, `onReport`, `enabled`, `onEnabledChange`, `labels`.

**useShakeToReport({ onShake, enabled, threshold, jolts, cooldown })** returns `{ supported, permission, requestPermission }`. On iOS call `requestPermission()` from a tap.

Pure helpers in `feedback-reporter-utils.ts`: `feedbackInstallSnippet`, `normalizePosition`, `isShake`, `motionDelta`, `countByStatus`, `filterHubIssues`, and for the movable launcher `snapLauncherSpot`, `moveLauncherSpot`, `spotFromPosition`, `parseLauncherSpot`.

## Examples

**Shake to report**

```tsx
const [sheet, setSheet] = useState(false);
const shake = useShakeToReport({ onShake: () => setSheet(true) });
// on iOS: <Button onClick={shake.requestPermission}>Enable shake</Button>
<ShakeReportSheet open={sheet} onOpenChange={setSheet} onReport={() => setDialog(true)} />;
```

## Accessibility

- The launcher is a real button with a name (the circle gets an `aria-label`). A movable one also moves with Alt + arrow keys (`aria-keyshortcuts`, and a title that says so). The status filter is a labelled toggle group and votes are pressed-state buttons.
- The sheet is a dialog: focus is trapped and Escape closes it. Shaking is optional and can be switched off from the sheet.

## RTL & i18n

- English and Arabic follow the locale. `end` and `start` positions flip in Arabic, and the tab text turns the right way for its side. The page address stays left-to-right.

## Styling & tokens

- Uses `bg-primary`, `shadow-floating`, card and border tokens. Target `[data-slot="feedback-launcher"]`, `[data-slot="feedback-hub"]`.

## Do / Don't

- Do keep the public feedback key in an environment variable. The install code reads it from one.
- Do show the hub before the dialog when a page already has reports.
- Don't put a floating launcher over a primary action: move it to the other side, or make it `movable`.
- Don't rely on shaking alone: it is not available on desktops or when motion access is refused.

## Related

- [`Sheet`](../sheet/README.md)
- [`Dialog`](../dialog/README.md)
- [`ChatWidget`](../chat-widget/README.md)
