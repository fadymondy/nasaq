// nqCopilotDock: the app-wide assistant dock. The markup is in the Blade component copilot-dock; the state lives here.
//
//   <div x-data="nqCopilotDock(config)" x-modelable="isOpen" x-on:keydown.window="onHotkey($event)" x-on:nq-close="closeDock()" class="contents">launcher, bar, panel with the copilot chat</div>
//
// config: open, side (end | start | bottom | float), expanded, hotkey (a letter, or false), persistKey (localStorage key of the side), collapsedBar, width, height, model, context, words { open, send, expand, collapse }.
// isOpen is x-modelable. Ctrl+J / Cmd+J toggles; Escape in the panel leaves the full page first, then closes and returns focus to the launcher (or the bar).
// Events, from the panel (so they bubble through it to the root): nq-dock-open { open }, nq-dock-side { side }, nq-dock-expanded { expanded }; the bar sends nq-send like the chat does.

import { isApplePlatform } from "./command-palette-logic";
import type { Magics, Register } from "./types";

type Side = "end" | "start" | "bottom" | "float";
interface DockConfig {
  open: boolean;
  side: Side;
  sides: Side[];
  expanded: boolean;
  hotkey: string | false;
  persistKey: string | null;
  collapsedBar: boolean;
  width: string;
  height: string | null;
  model: string | null;
  context: unknown[];
  words: { open: string; send: string; expand: string; collapse: string };
}

const SHAPE: Record<Side, string> = {
  end: "inset-y-0 end-0 border-s",
  start: "inset-y-0 start-0 border-e",
  bottom: "inset-x-0 bottom-0 border-t",
  float: "bottom-4 end-4 max-h-[calc(100%-2rem)] max-w-[calc(100%-2rem)] rounded-card border",
};

interface DockState extends Magics {
  isOpen: boolean;
  dockSide: Side;
  isExpanded: boolean;
  barText: string;
  shortcut: string | null;
  panel(): HTMLElement | null;
  emit(name: string, detail: unknown): void;
  closeDock(): void;
}

export const copilotDock: Register = (Alpine) => {
  Alpine.data("nqCopilotDock", (cfg: DockConfig) => ({
    isOpen: Boolean(cfg.open),
    dockSide: cfg.side,
    isExpanded: Boolean(cfg.expanded),
    barText: "",
    shortcut: null as string | null,

    init(this: DockState) {
      // A saved position is only readable in the browser, after the first render.
      if (cfg.persistKey) {
        try {
          const saved = window.localStorage.getItem(cfg.persistKey) as Side | null;
          if (saved && cfg.sides.includes(saved)) this.dockSide = saved;
        } catch {
          // Storage can be off; the choice still holds for this visit.
        }
      }
      // The modifier depends on the platform, which is only known in the browser.
      if (cfg.hotkey) this.shortcut = `${isApplePlatform() ? "⌘" : "Ctrl+"}${cfg.hotkey.toUpperCase()}`;

      this.$watch("isOpen", (open: boolean) => {
        this.emit("nq-dock-open", { open });
        if (!open) return;
        // Move focus into the panel on open, so keyboard users land in the conversation.
        this.$nextTick(() => {
          const panel = this.panel();
          (panel?.querySelector<HTMLElement>("textarea, [contenteditable='true']") ?? panel)?.focus();
        });
      });
      this.$watch("dockSide", (side: Side) => {
        this.emit("nq-dock-side", { side });
        if (!cfg.persistKey) return;
        try {
          window.localStorage.setItem(cfg.persistKey, side);
        } catch {
          // Storage can be off.
        }
      });
      this.$watch("isExpanded", (expanded: boolean) => this.emit("nq-dock-expanded", { expanded }));
    },

    panel(this: Magics): HTMLElement | null {
      return this.$refs.panel ?? null;
    },
    emit(this: DockState, name: string, detail: unknown) {
      this.panel()?.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
    },

    setOpen(this: DockState, next: boolean) {
      this.isOpen = next;
    },
    setExpanded(this: DockState, next: boolean) {
      this.isExpanded = next;
    },
    closeDock(this: DockState) {
      this.isOpen = false;
      this.isExpanded = false;
      requestAnimationFrame(() => (cfg.collapsedBar ? this.$refs.bar : this.$refs.launcher)?.focus());
    },
    onHotkey(this: DockState, event: KeyboardEvent) {
      if (cfg.hotkey === false || !cfg.hotkey) return;
      const key = cfg.hotkey;
      const mod = isApplePlatform() ? event.metaKey : event.ctrlKey;
      if (!mod || event.altKey || event.shiftKey) return;
      const code = key.length === 1 ? `Key${key.toUpperCase()}` : key;
      if (event.code !== code && event.key.toLowerCase() !== key.toLowerCase()) return;
      event.preventDefault();
      this.isOpen = !this.isOpen;
    },
    onPanelKey(this: DockState, event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.stopPropagation();
      if (this.isExpanded) this.isExpanded = false;
      else this.closeDock();
    },
    sendBar(this: DockState) {
      const text = this.barText.trim();
      if (!text) {
        this.isOpen = true;
        return;
      }
      this.barText = "";
      this.isOpen = true;
      this.emit("nq-send", { text, mentions: [], context: [...cfg.context], model: cfg.model ?? undefined, attachments: [], commands: [], toggles: [], waitUntil() {} });
    },

    launcherName(this: DockState): string {
      return this.shortcut ? `${cfg.words.open} (${this.shortcut})` : cfg.words.open;
    },
    barLabel(this: DockState): string {
      return this.barText.trim() ? cfg.words.send : cfg.words.open;
    },
    expandLabel(this: DockState): string {
      return this.isExpanded ? cfg.words.collapse : cfg.words.expand;
    },
    shapeClass(this: DockState): string {
      return this.isExpanded ? "inset-0" : SHAPE[this.dockSide];
    },
    sizeStyle(this: DockState): string {
      if (this.isExpanded) return "";
      if (this.dockSide === "bottom") return `height: min(100%, ${cfg.height ?? "50vh"})`;
      if (this.dockSide === "float") return `width: ${cfg.width}; height: ${cfg.height ?? "40rem"}`;
      return `width: min(100%, ${cfg.width})`;
    },
  }));
};
