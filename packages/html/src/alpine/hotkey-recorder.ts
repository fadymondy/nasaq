// nqHotkeyRecorder and nqHotkeyBindings: record a keyboard shortcut. The markup is the React HotkeyRecorder's (rendered
// by <x-nq::hotkey-recorder> and <x-nq::hotkey-recorder.bindings>); the state lives here.
//
//   <div data-slot="hotkey-recorder" x-data="nqHotkeyRecorder('Mod+K', { requireModifier: true, resetTo: 'Mod+K', strings: {…} })" x-modelable="value" x-bind="root">
//     <button x-bind="button">…<template x-for="(caps, i) in capSteps(value)">…</template></button>
//     <ul x-show="hasProblems()"> <li role="alert" x-text="error"> <template x-for="c in conflicts()">…</template> </ul>
//   </div>
//
// Click the button (or focus it and press Enter or Space), then press the keys. The physical key is read, so it works on
// an Arabic layout; shortcuts the browser or OS keeps are refused unless allowReserved; Escape cancels, Backspace
// clears. `value` is x-modelable (x-model="$wire.shortcut"); every change bubbles `nq-hotkey-change` ({ value }).
// Options: sequence, requireModifier, allowReserved, resetTo, platform (auto | mac | windows), disabled, bindingId,
// bindings (an array, or a function returning the live list of { id, shortcut, label }), strings (the words).
//
// nqHotkeyBindings(items, { onChange, locale, strings }): a settings list of recorders. `current` maps id to shortcut
// (each recorder is x-model="current['id']"), clashes are warned across the list, and Reset all restores the defaults.
// onChange(id, shortcut) may return or resolve { error } (or throw) to keep the old shortcut.

import type { Magics, Register } from "./types";
import {
  type HotkeyConflict,
  type HotkeyIssueCode,
  type HotkeyStep,
  hotkeyCaps,
  hotkeyConflicts,
  hotkeyFormat,
  hotkeyLabel,
  hotkeyParse,
  hotkeyRecordKey,
  hotkeyReservedBy,
  hotkeyValidate,
} from "./hotkey-recorder-logic";

type Platform = "auto" | "mac" | "windows";

interface Binding {
  id: string;
  shortcut: string;
  label: string;
}

interface RecorderOptions {
  sequence?: boolean;
  requireModifier?: boolean;
  allowReserved?: boolean;
  resetTo?: string | null;
  platform?: Platform;
  disabled?: boolean;
  bindingId?: string;
  bindings?: readonly Binding[] | (() => readonly Binding[]);
  strings?: Record<string, string>;
}

interface RecorderState extends Magics {
  value: string | null;
  recording: boolean;
  steps: HotkeyStep[];
  error: string | null;
  announce: string;
  auto: boolean;
  platform: Platform;
  sequence: boolean;
  requireModifier: boolean;
  allowReserved: boolean;
  resetTo: string | null | undefined;
  disabled: boolean;
  bindingId: string | undefined;
  strings: Record<string, string>;
  root: HTMLElement | null;
  readonly apple: boolean;
  t(key: string, vars?: Record<string, string>): string;
  begin(): void;
  stop(): void;
  commit(next: string | null): void;
  conflicts(): HotkeyConflict[];
  nameOf(c: HotkeyConflict): string;
  list(): readonly Binding[];
  capSteps(shortcut: string | null): string[][];
}

const APPLE_PLATFORMS = new Set(["darwin", "macos", "ios"]);
const BROWSER_PLATFORMS = new Set(["web", "extension"]);

/** True on a Mac, iPhone or iPad, or when `<html data-platform>` says so. */
function isApplePlatform(): boolean {
  const platform = document.documentElement.dataset.platform;
  if (platform && !BROWSER_PLATFORMS.has(platform)) return APPLE_PLATFORMS.has(platform);
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}

const SPOKEN: Record<string, string> = {
  "⌘": "Command",
  "⌃": "Control",
  "⌥": "Option",
  "⇧": "Shift",
  "↑": "Up arrow",
  "↓": "Down arrow",
  "←": "Left arrow",
  "→": "Right arrow",
  "↵": "Return",
  "⌫": "Delete",
  "⌦": "Forward delete",
  "⇥": "Tab",
  "/": "slash",
  "?": "question mark",
  ",": "comma",
  ".": "period",
  "+": "plus",
  "-": "minus",
  "=": "equals",
  "\\": "backslash",
  "[": "left bracket",
  "]": "right bracket",
};

const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");

export const hotkeyRecorder: Register = (Alpine) => {
  Alpine.data("nqHotkeyRecorder", (initial: string | null = null, options: RecorderOptions = {}) => ({
    value: initial ?? null,
    recording: false,
    steps: [] as HotkeyStep[],
    error: null as string | null,
    announce: "",
    auto: false,
    platform: options.platform ?? "auto",
    sequence: Boolean(options.sequence),
    requireModifier: Boolean(options.requireModifier),
    allowReserved: Boolean(options.allowReserved),
    resetTo: options.resetTo,
    disabled: Boolean(options.disabled),
    bindingId: options.bindingId,
    strings: options.strings ?? {},
    root: null as HTMLElement | null,
    stopWatching: null as (() => void) | null,
    get apple() {
      const self = this as unknown as RecorderState;
      return self.platform === "mac" ? true : self.platform === "windows" ? false : self.auto;
    },
    init(this: RecorderState & { stopWatching: (() => void) | null }) {
      this.root = this.$el;
      this.auto = isApplePlatform();
      const observer = new MutationObserver(() => (this.auto = isApplePlatform()));
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-platform"] });
      this.stopWatching = () => observer.disconnect();
    },
    destroy(this: { stopWatching: (() => void) | null }) {
      this.stopWatching?.();
    },
    t(this: RecorderState, key: string, vars: Record<string, string> = {}) {
      return fill(this.strings[key] ?? key, vars);
    },
    begin(this: RecorderState) {
      if (this.disabled) return;
      this.error = null;
      this.recording = true;
      this.announce = this.t("recording");
    },
    stop(this: RecorderState) {
      this.recording = false;
      this.steps = [];
    },
    commit(this: RecorderState, next: string | null) {
      this.value = next;
      this.announce = next ? this.t("saved", { shortcut: hotkeyLabel(next, this.apple, this.t("then")) }) : this.t("cleared");
      (this.root ?? this.$el).dispatchEvent(new CustomEvent("nq-hotkey-change", { bubbles: true, detail: { value: next } }));
    },
    clear(this: RecorderState) {
      this.error = null;
      this.commit(null);
    },
    reset(this: RecorderState) {
      this.error = null;
      this.commit(this.resetTo || null);
    },
    canReset(this: RecorderState) {
      return !this.disabled && this.resetTo !== undefined && this.resetTo !== null && (this.resetTo || null) !== (this.value || null);
    },
    messageFor(this: RecorderState, code: HotkeyIssueCode) {
      return code === "modifier-required"
        ? this.t("modifierRequired")
        : code === "sequence-not-allowed"
          ? this.t("sequenceNotAllowed")
          : code === "too-long"
            ? this.t("tooLong")
            : code === "empty"
              ? this.t("empty")
              : this.t("invalid");
    },
    onKeyDown(this: RecorderState & { messageFor(code: HotkeyIssueCode): string }, event: KeyboardEvent) {
      if (this.disabled) return;
      if (!this.recording) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.begin();
        }
        return;
      }
      // While recording, the page must not see the keys: Ctrl+S would save the page, Tab would leave the control.
      event.preventDefault();
      event.stopPropagation();
      const result = hotkeyRecordKey(this.steps, event, { apple: this.apple, sequence: this.sequence });
      if (result.status === "ignored") return;
      if (result.status === "cancelled") {
        this.stop();
        return;
      }
      if (result.status === "cleared") {
        this.stop();
        this.error = null;
        this.commit(null);
        return;
      }
      if (result.status === "recording") {
        this.steps = result.steps;
        return;
      }
      const next = hotkeyFormat(result.steps);
      const issue = hotkeyValidate(next, { requireModifier: this.requireModifier, sequence: this.sequence });
      const owner = this.allowReserved ? null : hotkeyReservedBy(next, this.apple);
      this.stop();
      if (issue) {
        this.error = this.messageFor(issue);
        return;
      }
      if (owner) {
        this.error = owner === "browser" ? this.t("browser") : this.t("system");
        return;
      }
      this.error = null;
      this.commit(next);
    },
    list(this: RecorderState): readonly Binding[] {
      const b = options.bindings;
      return typeof b === "function" ? b() : (b ?? []);
    },
    conflicts(this: RecorderState) {
      return this.value && this.list().length ? hotkeyConflicts(this.value, this.list(), { apple: this.apple, ignoreId: this.bindingId }) : [];
    },
    nameOf(this: RecorderState, c: HotkeyConflict) {
      return this.list().find((b: Binding) => b.id === c.id)?.label ?? c.id;
    },
    conflictText(this: RecorderState, c: HotkeyConflict) {
      return this.t(c.kind, { label: this.nameOf(c) });
    },
    hasProblems(this: RecorderState) {
      return Boolean(this.error) || this.conflicts().length > 0;
    },
    /** The key caps of a shortcut, one list per step, for the platform in view. */
    capSteps(this: RecorderState, shortcut: string | null) {
      return (hotkeyParse(shortcut) ?? []).map((s) => hotkeyCaps(s, this.apple));
    },
    /** The steps being recorded, as a shortcut string. */
    stepsShortcut(this: RecorderState) {
      return this.steps.length ? hotkeyFormat(this.steps) : null;
    },
    spoken(this: RecorderState, shortcut: string | null) {
      return this.capSteps(shortcut)
        .map((caps) => caps.map((c) => SPOKEN[c] ?? c).join(" "))
        .join(` ${this.t("then")} `);
    },
    ariaLabel(this: RecorderState, label: string) {
      if (label) return `${label}: ${this.value ? hotkeyLabel(this.value, this.apple, this.t("then")) : this.t("notSet")}`;
      return this.value ? this.t("change") : this.t("record");
    },
    resetTitle(this: RecorderState) {
      return this.resetTo ? `${this.t("defaultIs")}: ${hotkeyLabel(this.resetTo, this.apple, this.t("then"))}` : this.t("reset");
    },
    errorId(this: RecorderState) {
      return this.$id("nq-hotkey", "error");
    },
    /** Bind on the root: x-bind="rootAttrs". */
    rootAttrs: {
      ":data-recording"(this: RecorderState) {
        return this.recording ? "" : null;
      },
    },
    /** Bind on the recording button; `label` is the accessible name (what the shortcut does). */
    button(label: string = "") {
      return {
        ":aria-label"(this: RecorderState & { ariaLabel(l: string): string }) {
          return this.ariaLabel(label);
        },
        ":aria-describedby"(this: RecorderState & { hasProblems(): boolean; errorId(): string }) {
          return this.hasProblems() ? this.errorId() : null;
        },
        ":aria-invalid"(this: RecorderState) {
          return this.error ? "true" : null;
        },
        ":data-invalid"(this: RecorderState) {
          return this.error ? "" : null;
        },
        ":disabled"(this: RecorderState) {
          return this.disabled ? true : null;
        },
        ":class"(this: RecorderState) {
          return (this.error ? "border-nq-danger" : this.recording ? "border-nq-focus" : "border-input") + (this.recording ? " outline-1 outline-nq-focus" : "");
        },
        "x-on:click"(this: RecorderState) {
          this.begin();
        },
        "x-on:keydown"(this: RecorderState & { onKeyDown(e: KeyboardEvent): void }, event: KeyboardEvent) {
          this.onKeyDown(event);
        },
        "x-on:blur"(this: RecorderState) {
          this.stop();
        },
      };
    },
  }));

  Alpine.data(
    "nqHotkeyBindings",
    (
      items: { id: string; label: string; shortcut: string | null; defaultShortcut?: string | null; locked?: boolean }[] = [],
      options: { onChange?: (id: string, shortcut: string | null) => unknown; strings?: Record<string, string> } = {},
    ) => ({
      items,
      current: Object.fromEntries(items.map((i) => [i.id, i.shortcut ?? null])) as Record<string, string | null>,
      failure: null as string | null,
      strings: options.strings ?? {},
      root: null as HTMLElement | null,
      init(this: { root: HTMLElement | null } & Magics) {
        this.root = this.$el;
      },
      /** Everything bound, for the clash warnings of each recorder. */
      others(this: { items: typeof items; current: Record<string, string | null> }): Binding[] {
        return this.items.filter((i) => this.current[i.id]).map((i) => ({ id: i.id, shortcut: this.current[i.id] as string, label: i.label }));
      },
      differing(this: { items: typeof items; current: Record<string, string | null> }) {
        return this.items.filter((i) => !i.locked && i.defaultShortcut !== undefined && (i.defaultShortcut ?? null) !== (this.current[i.id] ?? null));
      },
      async change(this: { current: Record<string, string | null>; failure: string | null; strings: Record<string, string>; root: HTMLElement | null }, id: string, shortcut: string | null, previous: string | null) {
        this.failure = null;
        try {
          const result = (await options.onChange?.(id, shortcut)) as { error?: string } | undefined | void;
          if (result && typeof result === "object" && result.error) {
            this.failure = result.error;
            this.current[id] = previous;
            return;
          }
        } catch {
          this.failure = this.strings.invalid ?? "";
          this.current[id] = previous;
          return;
        }
        this.root?.dispatchEvent(new CustomEvent("nq-hotkeys-change", { bubbles: true, detail: { id, shortcut } }));
      },
      /** Bound on a row's recorder: `@nq-hotkey-change` reports the new value; the old one is kept in `last`. */
      onRow(this: { current: Record<string, string | null>; last: Record<string, string | null>; change(id: string, s: string | null, p: string | null): void }, id: string, event: CustomEvent<{ value: string | null }>) {
        if (event.target !== event.currentTarget) return;
        const previous = this.last[id] ?? null;
        this.last[id] = event.detail.value;
        void this.change(id, event.detail.value, previous);
      },
      last: Object.fromEntries(items.map((i) => [i.id, i.shortcut ?? null])) as Record<string, string | null>,
      resetAll(this: { differing(): typeof items; current: Record<string, string | null>; last: Record<string, string | null>; change(id: string, s: string | null, p: string | null): void }) {
        for (const i of this.differing()) {
          const previous = this.current[i.id] ?? null;
          this.current[i.id] = i.defaultShortcut ?? null;
          this.last[i.id] = i.defaultShortcut ?? null;
          void this.change(i.id, i.defaultShortcut ?? null, previous);
        }
      },
    }),
  );
};
