// nqDesktopNotification, nqDesktopNotificationEntry, nqNotificationPermission: the behaviour of the desktop notification card, its stack
// and the permission prompt. The markup is the React component's (rendered by <x-nq::desktop-notification>); the state lives here.
//
//   <div x-data="nqDesktopNotification(6000)" x-on:mouseenter="pause()" x-on:mouseleave="resume()">...</div>
//   card:   close() dispatches a bubbling, cancelable "nq-close" and, unless prevented, removes the card (and its stack slot);
//           act(id) dispatches "nq-action" { id }; activate() dispatches "nq-activate". Hover or focus pauses the dismissAfter clock.
//   entry:  nqDesktopNotificationEntry sets `shown` on the frame after it mounts (the slide-in).
//   prompt: nqNotificationPermission(initial, copy) holds permission/asking/step, reads and requests Notification.permission, and dispatches
//           "nq-dismiss", "nq-test", "nq-open-settings" and "nq-permission" { permission }.

import type { Magics, Register } from "./types";

type Permission = "default" | "granted" | "denied" | "unsupported";
type Step = "ask" | "asking" | "granted" | "denied" | "unsupported";

/** Maps the permission and whether the system dialog is open to the step of the flow. */
export function permissionStep(permission: Permission, asking: boolean): Step {
  if (permission === "unsupported") return "unsupported";
  if (permission === "granted") return "granted";
  if (permission === "denied") return "denied";
  return asking ? "asking" : "ask";
}

interface CardState extends Magics {
  paused: boolean;
  timer: ReturnType<typeof setTimeout> | undefined;
  arm(): void;
  clear(): void;
  pause(): void;
  resume(): void;
  close(): void;
  act(id: string): void;
  activate(): void;
}

interface PromptState extends Magics {
  permission: Permission;
  asking: boolean;
  copy: Record<string, [string, string]>;
  readonly step: Step;
  readonly off: boolean;
}

export const desktopNotification: Register = (Alpine) => {
  Alpine.data("nqDesktopNotification", (dismissAfter = 0) => ({
    paused: false,
    timer: undefined,
    init(this: CardState) {
      this.arm();
    },
    destroy(this: CardState) {
      this.clear();
    },
    arm(this: CardState) {
      this.clear();
      if (!dismissAfter || this.paused) return;
      this.timer = setTimeout(() => this.close(), dismissAfter);
    },
    clear(this: CardState) {
      clearTimeout(this.timer);
      this.timer = undefined;
    },
    pause(this: CardState) {
      this.paused = true;
      this.clear();
    },
    resume(this: CardState) {
      this.paused = false;
      this.arm();
    },
    close(this: CardState) {
      const card = this.$root;
      const slot = card.closest<HTMLElement>("[data-stack-entry]");
      this.clear();
      const event = new CustomEvent("nq-close", { bubbles: true, cancelable: true });
      if (card.dispatchEvent(event)) (slot ?? card).remove();
    },
    act(this: CardState, id: string) {
      this.$dispatch("nq-action", { id });
    },
    activate(this: CardState) {
      this.$dispatch("nq-activate");
    },
  }));

  Alpine.data("nqDesktopNotificationEntry", () => ({
    shown: false,
    init(this: Magics & { shown: boolean }) {
      requestAnimationFrame(() => (this.shown = true));
    },
  }));

  Alpine.data("nqNotificationPermission", (initial: Permission = "default", copy: Record<string, [string, string]> = {}) => ({
    permission: initial,
    asking: false,
    copy,
    init(this: PromptState) {
      this.permission = typeof Notification === "undefined" ? "unsupported" : (Notification.permission as Permission);
    },
    get step() {
      return permissionStep(this.permission, this.asking);
    },
    get off() {
      return this.step === "denied" || this.step === "unsupported";
    },
    async request(this: PromptState) {
      if (this.asking || typeof Notification === "undefined") return;
      this.asking = true;
      try {
        this.permission = (await Notification.requestPermission()) as Permission;
        this.$dispatch("nq-permission", { permission: this.permission });
      } finally {
        this.asking = false;
      }
    },
    dismiss(this: PromptState) {
      this.$dispatch("nq-dismiss");
    },
    test(this: PromptState) {
      this.$dispatch("nq-test");
    },
    openSettings(this: PromptState) {
      this.$dispatch("nq-open-settings");
    },
  }));
};
