// nqInlineEdit: edit in place. The markup is the React InlineEdit's (the Blade component renders it), the draft,
// validation, save and focus handling live here.
//
//   <div x-data="nqInlineEdit('Launch plan', { type: 'text', required: true })" x-modelable="value" x-bind="root" data-slot="inline-edit">
//     <div x-show="!editing" x-on:click="open()"><button x-ref="display"><span x-bind="text">Launch plan</span></button></div>
//     <div x-show="editing" x-ref="editor" x-bind="group">
//       <input x-model="draft" x-bind="input">
//       <button x-bind="saveButton">Save</button> <button x-bind="cancelButton">Cancel</button>
//       <p x-show="error" x-text="error"></p>
//     </div>
//   </div>
//
// value is x-modelable (x-model / wire:model). Save fires a `save` event with `{ value, wait(promise) }`: hand it the
// work, resolve with `{ error }` (or reject) to keep editing. Without a listener the value is accepted as is.
// Self-contained: the commit and key logic below are those of inline-edit-logic.ts in @fadymondy/nasaq.

import type { Magics, Register } from "./types";

type EditType = "text" | "number" | "url" | "email";
type Reason = "required" | "type" | "length";
type Commit = { kind: "unchanged" } | { kind: "invalid"; reason: Reason } | { kind: "save"; value: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isHttpUrl = (value: string) => {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeDigits = (value: string) => value.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

function resolveCommit(draft: string, initial: string, type: EditType, required: boolean, maxLength: number | null): Commit {
  let value = draft.trim();
  if (type === "number") value = normalizeDigits(value).replace(/٫/g, ".").replace(/٬/g, "");
  if (!value) {
    if (required) return { kind: "invalid", reason: "required" };
    return value === initial ? { kind: "unchanged" } : { kind: "save", value };
  }
  if (type === "number" && !Number.isFinite(Number(value))) return { kind: "invalid", reason: "type" };
  if (type === "email" && !EMAIL.test(value)) return { kind: "invalid", reason: "type" };
  if (type === "url" && !isHttpUrl(value)) return { kind: "invalid", reason: "type" };
  if (maxLength !== null && [...value].length > maxLength) return { kind: "invalid", reason: "length" };
  return value === initial ? { kind: "unchanged" } : { kind: "save", value };
}

/** Enter saves a single line; a multi-line field saves with Ctrl/Cmd+Enter. Escape cancels. */
function keyAction(e: KeyboardEvent, multiline: boolean): "save" | "cancel" | null {
  if (e.isComposing) return null;
  if (e.key === "Escape") return "cancel";
  if (e.key === "Enter") {
    if (!multiline) return e.shiftKey ? null : "save";
    return e.metaKey || e.ctrlKey ? "save" : null;
  }
  return null;
}

interface InlineInit {
  type?: EditType;
  multiline?: boolean;
  required?: boolean;
  maxLength?: number | null;
  /** What happens when focus leaves the open editor. Default save. */
  blur?: "save" | "cancel" | "none";
  /** Read-only or disabled: never opens. */
  locked?: boolean;
}

interface InlineScope extends Magics {
  value: string;
  draft: string;
  editing: boolean;
  error: string;
  pending: boolean;
  type: EditType;
  multiline: boolean;
  required: boolean;
  maxLength: number | null;
  blur: "save" | "cancel" | "none";
  locked: boolean;
  alive: boolean;
  restoreFocus: boolean;
  placeholder: string;
  $nq: { t(en: string, ar: string): string };
  open(): void;
  close(focusBack: boolean): void;
  commit(focusBack: boolean): Promise<void>;
}

export const inlineEdit: Register = (Alpine) => {
  Alpine.data("nqInlineEdit", (initial: string = "", init: InlineInit = {}) => ({
    value: initial ?? "",
    draft: initial ?? "",
    editing: false,
    error: "",
    pending: false,
    type: (init.type ?? "text") as EditType,
    multiline: Boolean(init.multiline),
    required: Boolean(init.required),
    maxLength: init.maxLength ?? null,
    blur: init.blur ?? "save",
    locked: Boolean(init.locked),
    alive: true,
    restoreFocus: false,

    init(this: InlineScope) {
      // The empty-state text is the server's: keep it to show again when the value is cleared.
      const span = this.$el.querySelector<HTMLElement>("[x-bind='text']");
      this.placeholder = this.value === "" ? (span?.textContent ?? "") : "";
    },
    destroy(this: InlineScope) {
      this.alive = false;
    },
    open(this: InlineScope) {
      if (this.locked || this.editing) return;
      this.draft = this.value;
      this.error = "";
      this.editing = true;
      void this.$nextTick(() => {
        const field = this.$refs.editor?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
        field?.focus();
        if (!this.multiline) field?.select();
      });
    },
    close(this: InlineScope, focusBack: boolean) {
      this.error = "";
      this.editing = false;
      if (focusBack) void this.$nextTick(() => this.$refs.display?.focus());
    },
    async commit(this: InlineScope, focusBack: boolean) {
      if (this.pending) return;
      const result = resolveCommit(this.draft, this.value, this.type, this.required, this.maxLength);
      if (result.kind === "unchanged") return this.close(focusBack);
      if (result.kind === "invalid") {
        this.error =
          result.reason === "required"
            ? this.$nq.t("This cannot be empty.", "لا يمكن ترك هذا الحقل فارغًا.")
            : result.reason === "length"
              ? this.$nq.t(`Too long: at most ${this.maxLength} characters.`, `النص طويل: ${this.maxLength} حرفًا كحد أقصى.`)
              : this.type === "number"
                ? this.$nq.t("Enter a number.", "أدخل رقمًا.")
                : this.type === "email"
                  ? this.$nq.t("Enter a valid email address.", "أدخل بريدًا إلكترونيًا صحيحًا.")
                  : this.$nq.t("Enter a link starting with http:// or https://.", "أدخل رابطًا يبدأ بـ http:// أو https://.");
        return;
      }
      this.pending = true;
      let pending: Promise<unknown> | undefined;
      this.$dispatch("save", {
        value: result.value,
        wait: (p: unknown) => {
          pending = Promise.resolve(p);
        },
      });
      try {
        const outcome = (await pending) as { error?: string } | undefined;
        if (outcome && typeof outcome === "object" && outcome.error) {
          this.error = outcome.error;
          return;
        }
        this.value = result.value;
        this.close(focusBack);
      } catch {
        if (this.alive) this.error = this.$nq.t("Could not save. Try again.", "تعذر الحفظ. حاول مرة أخرى.");
      } finally {
        if (this.alive) this.pending = false;
      }
    },
    isEmpty(this: InlineScope) {
      return this.value === "";
    },

    /** Bind on the root. */
    root: {
      ":data-state"(this: InlineScope) {
        return this.editing ? "editing" : "display";
      },
      ":data-pending"(this: InlineScope) {
        return this.pending ? "" : undefined;
      },
    },
    /** Bind on the display text: the value, or the empty text. */
    text: {
      "x-text"(this: InlineScope) {
        return this.value === "" ? this.placeholder : this.value;
      },
      ":class"(this: InlineScope) {
        return this.value === "" ? "text-muted-foreground" : "";
      },
    },
    /** Bind on the editor group: leaving it applies the blur action. */
    group: {
      "x-on:focusout"(this: InlineScope, e: FocusEvent) {
        const editor = this.$refs.editor;
        if (!this.editing || this.pending || this.blur === "none" || editor?.contains(e.relatedTarget as Node | null)) return;
        if (this.blur === "cancel") this.close(false);
        else void this.commit(false);
      },
    },
    /** Bind on the input or textarea. */
    input: {
      ":readonly"(this: InlineScope) {
        return this.pending ? "" : undefined;
      },
      ":aria-invalid"(this: InlineScope) {
        return this.error ? "true" : undefined;
      },
      "x-on:input"(this: InlineScope) {
        if (this.error) this.error = "";
      },
      "x-on:keydown"(this: InlineScope, e: KeyboardEvent) {
        const action = keyAction(e, this.multiline);
        if (!action) return;
        e.preventDefault();
        e.stopPropagation();
        if (action === "save") void this.commit(true);
        else this.close(true);
      },
    },
    /** Bind on the Save button. */
    saveButton: {
      ":aria-busy"(this: InlineScope) {
        return this.pending ? "true" : undefined;
      },
      ":data-disabled"(this: InlineScope) {
        return this.pending ? "" : undefined;
      },
      "x-on:mousedown.prevent"() {},
      "x-on:click"(this: InlineScope) {
        void this.commit(true);
      },
    },
    /** Bind on the Cancel button. */
    cancelButton: {
      ":disabled"(this: InlineScope) {
        return this.pending;
      },
      "x-on:mousedown.prevent"() {},
      "x-on:click"(this: InlineScope) {
        this.close(true);
      },
    },
  }));
};
