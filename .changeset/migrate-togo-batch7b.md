---
"@fadymondy/nasaq": minor
---

`FeedbackFloatingLauncher` can be `movable`: visitors drag it aside, it snaps to the nearer side and remembers the spot (`storageKey`, `spot`, `onSpotChange`), and Alt + arrow keys move it too. `FeedbackHub` adds a **Mine** tab for the visitor's own reports and server paging (`counts`, `onFilterChange`, `hasMore`, `onLoadMore`, `loadingMore`). New pure helpers: `snapLauncherSpot`, `moveLauncherSpot`, `spotFromPosition`, `parseLauncherSpot`, `filterHubIssues`.
