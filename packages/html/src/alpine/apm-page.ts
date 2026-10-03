// nqApmPage: the hooks of <x-nq::apm-page>, matching the React ApmPage callbacks. The page's panels dispatch a generic bubbling "nq-select"
// ({ id }); this wrapper tells them apart by the panel they came from and re-dispatches one named event from its root, with the full row:
//
//   endpoint row clicked  -> nq-endpoint-click { id, row }   (onEndpointClick)
//   top error clicked     -> nq-error-click { id, row }      (onErrorClick)
//   trace chosen / closed -> nq-trace-select { id, row }     (onTraceSelect; id and row are null when the open trace is closed)
//
//   <div class="contents" x-data="nqApmPage({ endpoints: [...], errors: [...], traces: [...] })" x-on:nq-select="route($event)">…panels…</div>
//
// The period toggle's own event, "nq-period-change" ({ period: hours }), comes from nqPageToggle.

import type { Magics, Register } from "./types";

type Row = { id: string | number; [key: string]: unknown };
interface PageRows {
  endpoints?: Row[];
  errors?: Row[];
  traces?: Row[];
}
interface PageState extends Magics {
  root: HTMLElement;
  rows: PageRows;
}

const PANELS: Record<string, { slot: string; list: keyof PageRows; event: string }> = {
  endpoint: { slot: "endpoint-table", list: "endpoints", event: "nq-endpoint-click" },
  error: { slot: "error-rate-panel", list: "errors", event: "nq-error-click" },
  trace: { slot: "trace-list", list: "traces", event: "nq-trace-select" },
};

export const apmPage: Register = (Alpine) => {
  Alpine.data("nqApmPage", (rows: PageRows = {}) => ({
    root: null as unknown as HTMLElement,
    rows,
    init(this: PageState) {
      this.root = this.$el;
    },
    route(this: PageState, event: CustomEvent<{ id: string | number | null }>) {
      const from = event.target instanceof Element ? event.target : null;
      const panel = Object.values(PANELS).find((p) => from?.closest(`[data-slot="${p.slot}"]`));
      if (!panel) return;
      event.stopPropagation();
      const id = event.detail?.id ?? null;
      const row = id === null ? null : ((this.rows[panel.list] ?? []).find((r) => String(r.id) === String(id)) ?? null);
      this.root.dispatchEvent(new CustomEvent(panel.event, { bubbles: true, detail: { id, row } }));
    },
  }));
};
