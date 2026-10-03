// nqInstallPrompt and nqPushOptIn: the behaviour behind the Blade install-prompt dialog and the per-device push opt-in.
//
//   <div x-data="nqInstallPrompt({ open, platform, appName, t })" x-modelable="open">…teleported dialog…</div>
//   <section x-data="nqPushOptIn({ permission, subscribed })">…</section>
//
// Install prompt. platform is "auto" (detect in the browser) or one of prompt | ios | installed | unsupported. Detecting reads the user agent and
// display-mode: standalone; the browser's "beforeinstallprompt" turns it into "prompt" and "appinstalled" into "installed".
// Events (bubbling, from the root):
//   "nq-install"         { outcome: "accepted" | "dismissed" | "none" }  after Install (outcome "none": the browser had no prompt to open)
//   "nq-install-dismiss" { nextAskAt }                                    "Not now": remember it, then ask again after snoozeDays (default 14)
//
// Push opt-in. The switch dispatches bubbling, cancelable events that carry the wallet-style outcome helpers
//   "nq-push-subscribe" { subscribed, resolve(result?), reject(message), waitUntil(promise) }
//   "nq-push-remove"    { id, resolve, reject, waitUntil }
//   "nq-push-test"
// Nobody claimed the event: it counts as done. A rejection / { error } puts the switch back and shows the message. The browser's permission comes
// from the soft ask inside (its "nq-permission" event); a window "nq-push-state" { permission, subscribed } event drives it from outside.

import { detectInstallPlatform, nextAskAt, type InstallPlatform } from "./install-prompt-logic";
import type { Magics, Register } from "./types";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallConfig {
  open?: boolean;
  platform?: InstallPlatform | "auto";
  snoozeDays?: number;
}

interface InstallState extends Magics {
  open: boolean;
  platform: InstallPlatform;
  busy: boolean;
  fixed: boolean;
  snoozeDays: number;
  deferred: BeforeInstallPromptEvent | null;
  root: HTMLElement;
  close(): void;
}

interface Outcome {
  error?: string;
}

/** Dispatches a cancelable event whose detail can claim the work, and resolves with the outcome (undefined when nobody claimed it). */
function claim(root: HTMLElement, name: string, extra: Record<string, unknown>): Promise<Outcome | void> {
  let claimed = false;
  let settle!: (outcome: Outcome | void) => void;
  const outcome = new Promise<Outcome | void>((resolve) => (settle = resolve));
  const detail: Record<string, unknown> = {
    ...extra,
    resolve(result?: Outcome) {
      claimed = true;
      settle(result);
    },
    reject(message?: string) {
      claimed = true;
      settle({ error: message || undefined });
    },
    waitUntil(promise: Promise<unknown>) {
      claimed = true;
      Promise.resolve(promise).then(
        (result) => settle(result && typeof result === "object" ? (result as Outcome) : undefined),
        (e) => settle({ error: e instanceof Error && e.message ? e.message : typeof e === "string" ? e : undefined }),
      );
    },
  };
  const event = new CustomEvent(name, { detail, bubbles: true, cancelable: true });
  root.dispatchEvent(event);
  return claimed || event.defaultPrevented ? outcome : Promise.resolve();
}

function standalone(): boolean {
  if (typeof window === "undefined") return false;
  const media = typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches;
  return media || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export const installPrompt: Register = (Alpine) => {
  Alpine.data("nqInstallPrompt", (config: InstallConfig = {}) => ({
    open: Boolean(config.open),
    platform: (config.platform && config.platform !== "auto" ? config.platform : "unsupported") as InstallPlatform,
    busy: false,
    fixed: Boolean(config.platform && config.platform !== "auto"),
    snoozeDays: config.snoozeDays ?? 14,
    deferred: null as BeforeInstallPromptEvent | null,
    root: null as unknown as HTMLElement,
    init(this: InstallState) {
      this.root = this.$el;
      if (!this.fixed) this.platform = detectInstallPlatform(navigator.userAgent, standalone(), false);
      const onPrompt = (e: Event) => {
        e.preventDefault();
        this.deferred = e as BeforeInstallPromptEvent;
        if (!this.fixed || this.platform !== "installed") this.platform = standalone() ? "installed" : "prompt";
      };
      const onInstalled = () => {
        this.deferred = null;
        this.platform = "installed";
      };
      window.addEventListener("beforeinstallprompt", onPrompt);
      window.addEventListener("appinstalled", onInstalled);
    },
    show(this: InstallState) {
      this.open = true;
    },
    close(this: InstallState) {
      this.open = false;
    },
    toggle(this: InstallState) {
      this.open = !this.open;
    },
    /** Opens the browser's install dialog (when it gave us one) and reports what the person chose. */
    async install(this: InstallState) {
      if (this.busy) return;
      this.busy = true;
      let outcome: "accepted" | "dismissed" | "none" = "none";
      try {
        const deferred = this.deferred;
        if (deferred) {
          await deferred.prompt();
          outcome = (await deferred.userChoice).outcome;
          this.deferred = null;
          if (outcome === "accepted") this.platform = "installed";
        }
      } finally {
        this.busy = false;
      }
      this.root.dispatchEvent(new CustomEvent("nq-install", { detail: { outcome }, bubbles: true }));
    },
    /** "Not now": tells you when to ask again, then closes. */
    notNow(this: InstallState) {
      this.root.dispatchEvent(new CustomEvent("nq-install-dismiss", { detail: { nextAskAt: nextAskAt(Date.now(), this.snoozeDays) }, bubbles: true }));
      this.open = false;
    },
    popup: {
      role: "dialog",
      "aria-modal": "true",
      tabindex: "-1",
      ":aria-labelledby"(this: Magics) {
        return this.$id("nq-dialog", "title");
      },
      ":aria-describedby"(this: Magics) {
        return this.$id("nq-dialog", "description");
      },
      "x-on:keydown.escape.prevent.stop"(this: InstallState) {
        this.close();
      },
    },
  }));

  Alpine.data(
    "nqPushOptIn",
    (config: { permission?: string; subscribed?: boolean; devices?: Array<{ id: string; current?: boolean }> } = {}) => ({
      permission: config.permission ?? "default",
      subscribed: Boolean(config.subscribed),
      saving: false,
      reverting: false,
      removing: null as string | null,
      error: "" as string,
      gone: [] as string[],
      init(this: Magics & PushState) {
        this.$watch("subscribed", (value: boolean) => {
          if (this.reverting) {
            this.reverting = false;
            return;
          }
          void this.change(value);
        });
        window.addEventListener("nq-push-state", (e) => {
          const detail = (e as CustomEvent<{ permission?: string; subscribed?: boolean }>).detail;
          if (!detail) return;
          if (detail.permission !== undefined) this.permission = detail.permission;
          if (detail.subscribed !== undefined && detail.subscribed !== this.subscribed) {
            this.reverting = true;
            this.subscribed = detail.subscribed;
          }
        });
      },
      granted(this: PushState) {
        return this.permission === "granted";
      },
      /** The soft ask inside reports the browser's answer. */
      onPermission(this: PushState, event: Event) {
        const detail = (event as CustomEvent<{ permission?: string }>).detail;
        if (detail?.permission) this.permission = detail.permission;
      },
      async change(this: Magics & PushState, on: boolean) {
        this.saving = true;
        this.error = "";
        const result = await claim(this.$el, "nq-push-subscribe", { subscribed: on });
        this.saving = false;
        if (result && result.error) {
          this.error = result.error;
          this.reverting = true;
          this.subscribed = !on;
        }
      },
      async remove(this: Magics & PushState, id: string) {
        this.removing = id;
        const result = await claim(this.$el, "nq-push-remove", { id });
        this.removing = null;
        if (result && result.error) this.error = result.error;
        else this.gone = [...this.gone, id];
      },
      test(this: Magics) {
        this.$el.dispatchEvent(new CustomEvent("nq-push-test", { bubbles: true }));
      },
      visibleDevices(this: PushState) {
        return (config.devices ?? []).filter((d) => !this.gone.includes(d.id)).length;
      },
    }),
  );
};

interface PushState {
  permission: string;
  subscribed: boolean;
  saving: boolean;
  reverting: boolean;
  removing: string | null;
  error: string;
  gone: string[];
  change(on: boolean): Promise<void>;
}
