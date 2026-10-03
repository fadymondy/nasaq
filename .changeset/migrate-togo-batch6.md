---
"@fadymondy/nasaq": minor
---

Migrate the ToGO data views (batch 6). `DataTable` gains multi-column sorting (`multiSort`, Shift-click, `defaultSorting` / `sorting`), sticky pinned columns (`pin`, `pinning`, Pin to start / end in `DataTableViewOptions`), resizable columns (`resizable`, drag or arrow keys), expandable rows (`renderExpanded`, `canExpand`, → / ←), `DataTableRangeFilter` for number and date ranges, a density choice in `DataTableViewOptions` and a rows-per-page choice in `DataTablePagination` (`pageSizeOptions`). The pure helpers (`nextSorting`, `sortTableRows`, `inRange`, `pinOffsets`, …) are exported. `LogViewer` gains a time-range select (`ranges`, `LOG_RANGES`), server-side filtering (`manual`, `onFilterChange`, `counts`, `total`), loading older entries while keeping the reader's place (`hasOlder`, `onLoadOlder`) and pause / resume of the live tail (`liveTail`, `onLiveChange`).
