// nqWorkflowViews: the view switch of x-nq::workflow-views. Blade renders every view (outline, pipeline, editor)
// and the first one visible; this module shows the picked one, remembers it in localStorage and tells the page.
//
//   <section data-slot="workflow-views" x-data="nqWorkflowViews({ view: 'steps', views: ['steps','pipeline'], storageKey: 'wf:view' })" x-modelable="view">
//     <div x-data="nqToggleGroup(['steps'], false)" x-effect="value = reconcile(value)"> (the toggle group)
//     <div data-view-panel="steps" x-show="view === 'steps'">…</div>
//
// view is x-modelable (x-model="$wire.view"). The toggle group keeps its own array value; `reconcile` runs as an
// effect on it: a different value is a user pick (saved to storageKey, `nq-view-change` ({ view }) fires from the
// root) and the group is always handed back [view], so pressing the pressed item keeps the view. The saved view is
// read at init, without firing the event. Step clicks fire `nq-step-click` ({ id }).

import type { Register } from "./types";

interface Config {
  view: string;
  views: string[];
  storageKey?: string | null;
}

interface State {
  view: string;
  views: string[];
  storageKey: string | null;
}

export const workflowViews: Register = (Alpine) => {
  Alpine.data("nqWorkflowViews", (config: Config) => {
    // Kept outside the reactive state: Alpine would wrap an element in a proxy.
    let host: HTMLElement | null = null;
    let handed: string | null = null;
    return {
      view: config.view,
      views: [...(config.views ?? [])],
      storageKey: config.storageKey ?? null,
      init(this: State & { $el: HTMLElement }) {
        host = this.$el;
        if (!this.storageKey) return;
        try {
          const saved = localStorage.getItem(this.storageKey);
          if (saved && this.views.includes(saved)) this.view = saved;
        } catch {
          // Storage can be blocked; the first view is fine.
        }
      },
      /** Reads the toggle group's value, applies a user pick, and returns what the group should hold. */
      reconcile(this: State, value: string[]): string[] {
        const picked = (value ?? [])[0] ?? null;
        const current = this.view;
        if (handed !== null && picked !== handed && picked !== null && this.views.includes(picked) && picked !== current) {
          this.view = picked;
          if (this.storageKey) {
            try {
              localStorage.setItem(this.storageKey, picked);
            } catch {
              // Ignore: the choice just is not remembered.
            }
          }
          host?.dispatchEvent(new CustomEvent("nq-view-change", { detail: { view: picked }, bubbles: true }));
        }
        handed = this.view;
        return [this.view];
      },
    };
  });
};
