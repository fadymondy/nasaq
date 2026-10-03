// nqAccountSettings: the account settings page, a section nav (a list on wide screens, tabs on narrow ones) beside
// one panel per item. nqDangerZone: the account-deletion dialog's typed-phrase confirmation. The markup is the React
// AccountSettings' and DangerZone's; the state lives here.
//
//   <div x-data="nqAccountSettings({ value: 'profile' })" x-modelable="value" x-id="['nq-account-settings']" data-uid="…">
//     <div role="tablist" x-bind="tablist"> <button x-bind="tab('profile')">Profile</button> <span data-slot="tabs-indicator"></span> </div>
//     <button x-bind="nav('profile')">Profile</button>
//     <div x-bind="panel('profile')">…</div>
//   </div>
//
//   <div x-data="nqDangerZone({ phrase: 'DELETE' })" x-on:nq-account-delete="$event.detail.waitUntil(deleteAccount())">
//     <div x-data="nqAlertDialog()" x-modelable="open" x-model="confirming"> … <form x-on:submit.prevent="remove()"> … </div>
//   </div>
//
// Deleting is yours: listen for nq-account-delete on the root and call event.detail.waitUntil(promise). Resolve
// { error: "…" } or reject to keep the dialog open and show the message.

import type { Magics, Register } from "./types";

interface SettingsState extends Magics {
  value: string;
  select(id: string): void;
  measure(): void;
}

const ids = (el: HTMLElement) => el.dataset.uid ?? "";

export const accountSettings: Register = (Alpine) => {
  Alpine.data("nqAccountSettings", (config: { value?: string } = {}) => ({
    value: config.value ?? "",
    init(this: SettingsState) {
      if (!this.value) {
        this.value = this.$el.querySelector<HTMLElement>('[role="tab"]')?.dataset.value ?? "";
      }
      this.$watch("value", () => this.$nextTick(() => this.measure()));
      this.$nextTick(() => this.measure());
      if (typeof ResizeObserver !== "undefined") {
        const list = this.$el.querySelector('[role="tablist"]');
        if (list) new ResizeObserver(() => this.measure()).observe(list);
      }
    },
    select(this: SettingsState, id: string) {
      this.value = id;
    },
    /** Puts the active tab's box on the indicator as --active-tab-left/width. */
    measure(this: SettingsState) {
      const indicator = this.$el.querySelector<HTMLElement>('[data-slot="tabs-indicator"]');
      const tab = indicator?.parentElement?.querySelector<HTMLElement>('[role="tab"][data-active]');
      if (!indicator) return;
      if (!tab) {
        indicator.style.display = "none";
        return;
      }
      indicator.style.removeProperty("display");
      indicator.style.setProperty("--active-tab-left", `${tab.offsetLeft}px`);
      indicator.style.setProperty("--active-tab-width", `${tab.offsetWidth}px`);
    },
    /** Bind on the narrow-screen tab row: arrow keys move focus in reading order (flipped in RTL). */
    tablist: {
      "x-on:keydown"(this: SettingsState, event: KeyboardEvent) {
        const list = event.currentTarget as HTMLElement;
        const rtl = getComputedStyle(list).direction === "rtl";
        const items = [...list.querySelectorAll<HTMLElement>('[role="tab"]')];
        const at = items.indexOf(document.activeElement as HTMLElement);
        let to = -1;
        if (event.key === (rtl ? "ArrowLeft" : "ArrowRight")) to = (at + 1) % items.length;
        else if (event.key === (rtl ? "ArrowRight" : "ArrowLeft")) to = (at - 1 + items.length) % items.length;
        else if (event.key === "Home") to = 0;
        else if (event.key === "End") to = items.length - 1;
        if (to < 0 || !items.length) return;
        event.preventDefault();
        items[to]!.focus();
        this.select(items[to]!.dataset.value ?? "");
      },
    },
    /** Bind on one tab of the narrow-screen row. */
    tab(this: SettingsState, id: string) {
      return {
        ":aria-selected"(this: SettingsState) {
          return String(this.value === id);
        },
        ":tabindex"(this: SettingsState) {
          return this.value === id ? 0 : -1;
        },
        ":data-active"(this: SettingsState) {
          return this.value === id ? "" : undefined;
        },
        "x-on:click"(this: SettingsState) {
          this.select(id);
        },
      };
    },
    /** Bind on one wide-screen nav button. */
    nav(this: SettingsState, id: string) {
      return {
        ":data-active"(this: SettingsState) {
          return String(this.value === id);
        },
        ":aria-current"(this: SettingsState) {
          return this.value === id ? "page" : null;
        },
        "x-on:click"(this: SettingsState) {
          this.select(id);
        },
      };
    },
    /** Bind on the region holding one item's content. */
    panel(this: SettingsState, id: string) {
      return {
        ":id"(this: SettingsState) {
          return `${ids(this.$root)}-panel-${id}`;
        },
        ":aria-labelledby"(this: SettingsState) {
          return `${ids(this.$root)}-nav-${id}`;
        },
        ":hidden"(this: SettingsState) {
          return this.value !== id;
        },
      };
    },
  }));

  interface DangerState extends Magics {
    confirming: boolean;
    typed: string;
    busy: boolean;
    error: string;
    bad: boolean;
    matches: boolean;
    type(value: string): void;
    reset(): void;
    fail(message: string): void;
  }

  Alpine.data("nqDangerZone", (config: { phrase: string; failed?: string }) => {
    let root: HTMLElement | undefined;
    return {
      confirming: false,
      typed: "",
      /** True when the typed text equals the phrase. Kept as plain state, set by the typed watcher. */
      matches: false,
      busy: false,
      error: "",
      bad: false,
      init(this: DangerState) {
        root = this.$el;
        this.$watch("confirming", (open: boolean) => {
          // The dialog cannot be dismissed while the request runs.
          if (!open && this.busy) this.confirming = true;
          else if (!open) this.reset();
        });
      },
      /** Input handler: x-on:input="type($event.target.value)". */
      type(this: DangerState, value: string) {
        this.typed = value;
        this.matches = value.trim() === config.phrase;
        this.error = "";
        this.bad = false;
      },
      reset(this: DangerState) {
        this.typed = "";
        this.matches = false;
        this.error = "";
        this.bad = false;
      },
      fail(this: DangerState, message: string) {
        this.error = message;
        this.bad = true;
      },
      async remove(this: DangerState) {
        if (!this.matches || this.busy) return;
        this.busy = true;
        this.error = "";
        this.bad = false;
        const pending: unknown[] = [];
        root?.dispatchEvent(new CustomEvent("nq-account-delete", { bubbles: true, detail: { waitUntil: (p: unknown) => void pending.push(p) } }));
        try {
          const results = await Promise.all(pending);
          const failed = results.find((r) => r && typeof r === "object" && (r as { error?: string }).error) as { error: string } | undefined;
          this.busy = false;
          if (failed) {
            this.fail(failed.error);
            return;
          }
          this.confirming = false;
        } catch (e) {
          this.busy = false;
          this.fail(e instanceof Error && e.message ? e.message : (config.failed ?? "Your account could not be deleted. Try again."));
        }
      },
    };
  });
};
