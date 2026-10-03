// nqSchemaForm: the browser side of the schema form. The markup is the React SchemaForm's (see the Blade schema-form component, which draws
// the tree of fields from the JSON Schema on the server); the pure logic is schema-form-logic.ts and its siblings, copied from the React package.
//
//   <form data-slot="schema-form" x-data="nqSchemaForm({ tree, value, rules, ar, disabled, submitLabel, labels })"
//         x-on:nq-schema-form-submit="$event.detail.waitUntil(save($event.detail.value))">
//
// `tree` is the schema as objects, lists and fields (nq_sf_tree() in PHP, schemaFormTree() in JS). Every control binds to a path through
// m[path] (x-model), and the lists work on the nested values in place, so a row keeps its identity (and focus) while it is edited or moved.
// The Save button validates, fires nq-schema-form-submit ({ value, waitUntil(promise) }) and shows the errors in the promise's result
// ({ error, fieldErrors }). nq-schema-form-change ({ value }) fires after every edit; output() returns the current value.

import { dropIndex, moveItem, shiftFor } from "./repeater";
import { SCHEMA_FORM_STRINGS } from "./schema-form-strings-logic";
import { validateField } from "./schema-repeater-logic";
import { schemaPathGet, schemaPathInside, schemaPathParse, schemaPathPattern } from "./schema-form-path-logic";
import {
  SCHEMA_FORM_MESSAGES,
  schemaFormItemSummary,
  schemaFormItemTitle,
  schemaFormMapErrors,
  schemaFormPathLabel,
  schemaFormTreeDefaults,
  schemaFormTreeHasData,
  schemaFormTreeInitial,
  schemaFormTreeOutput,
  schemaFormTreeStates,
  schemaFormTreeValidate,
  type FormRule,
  type SchemaTreeLeaf,
  type SchemaTreeList,
  type SchemaTreeNode,
  type SchemaTreeObject,
  type SchemaTreeState,
} from "./schema-form-logic";
import type { Register } from "./types";

interface Config {
  tree: SchemaTreeObject;
  value?: Record<string, unknown>;
  rules?: FormRule[];
  ar?: boolean;
  disabled?: boolean;
  submitLabel?: string;
  /** Overrides of the browser-side texts (the keys of SCHEMA_FORM_STRINGS). Only plain strings are taken. */
  labels?: Record<string, unknown>;
}

interface Row {
  key: string;
  index: number;
  path: string;
  title: string;
  summary: string;
}

interface SubmitResult {
  error?: string;
  fieldErrors?: Record<string, string>;
}

const FOCUSABLE = ':is(input, textarea, button, [role="combobox"], [role="switch"], [role="checkbox"]):not([disabled])';
const DRAG_DISTANCE = 3;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type State = Record<string, any>;

export const schemaForm: Register = (Alpine) => {
  Alpine.data("nqSchemaForm", (config: Config) => {
    const ar = !!config.ar;
    const root = config.tree;
    const strings = { ...SCHEMA_FORM_STRINGS[ar ? "ar" : "en"] } as Record<string, unknown>;
    for (const [k, v] of Object.entries(config.labels ?? {})) if (typeof v === "string" && typeof strings[k] === "string") strings[k] = v;
    const t = strings as unknown as (typeof SCHEMA_FORM_STRINGS)["en"];
    const messages = SCHEMA_FORM_MESSAGES[ar ? "ar" : "en"];
    const digits = new Intl.NumberFormat(ar ? "ar-u-nu-arab" : "en");
    const fmt = (n: number) => digits.format(n);
    const fmtDate = (iso: string) => {
      const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
      return new Intl.DateTimeFormat(ar ? "ar" : "en", { dateStyle: "medium" }).format(new Date(y, m - 1, d));
    };

    // The nodes by path pattern ("contacts[].phones[]"); list items are registered under their own pattern.
    const nodes: Record<string, SchemaTreeNode> = {};
    const index = (node: SchemaTreeNode) => {
      if (node.path) nodes[node.path] = node;
      if (node.kind === "object") node.children.forEach(index);
      else if (node.kind === "list") index(node.item);
    };
    index(root);
    const nodeAt = (path: string): SchemaTreeNode | undefined => nodes[schemaPathPattern(path)];
    const listAt = (path: string): SchemaTreeList | undefined => {
      const n = nodeAt(path);
      return n && n.kind === "list" ? n : undefined;
    };

    const keys = new WeakMap<object, string>();
    let serial = 0;
    let self: State;
    let session: { path: string; from: number; startY: number; centers: number[]; size: number; id: number; active: boolean } | null = null;
    let stopDrag: (() => void) | null = null;
    let focusAfter: { kind: "row"; path: string; key: string } | { kind: "add"; path: string } | { kind: "move"; path: string; key: string; dir: "up" | "down" } | null = null;

    const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
    const read = (path: string) => (self ? schemaPathGet(self.values, path) : undefined);
    const arrayAt = (path: string): unknown[] => {
      const v = read(path);
      return Array.isArray(v) ? v : [];
    };

    /** Writes into the nested values in place, so objects in lists keep their identity. */
    function setIn(path: string, value: unknown) {
      const segs = schemaPathParse(path);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cur: any = self.values;
      for (let i = 0; i < segs.length - 1; i++) {
        const seg = segs[i] as string | number;
        if (cur[seg] === null || typeof cur[seg] !== "object") cur[seg] = typeof segs[i + 1] === "number" ? [] : {};
        cur = cur[seg];
      }
      cur[segs[segs.length - 1] as string | number] = value;
    }

    const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

    /** What a control writes into a path, by the type of the field there. */
    function coerce(node: SchemaTreeNode | undefined, v: unknown): unknown {
      if (!node || node.kind !== "field") return v;
      const f = node.field;
      if (f.relation) return f.relation.multiple ? (Array.isArray(v) ? v.map(String) : []) : v === null || v === undefined ? "" : String(v);
      if (f.type === "number") {
        if (v === "" || v === null || v === undefined) return null;
        const num = Number(v);
        return Number.isFinite(num) ? num : null;
      }
      if (f.type === "select") return v === "" || v === undefined ? null : v;
      if (f.type === "switch") return v === true;
      if (f.type === "text") return v === null || v === undefined ? "" : String(v);
      return v === "" || v === undefined ? null : v;
    }

    const m = new Proxy({} as Record<string, unknown>, {
      get: (_t, p) => {
        if (typeof p !== "string") return undefined;
        const node = nodeAt(p);
        const v = read(p);
        if (node && node.kind === "field" && node.field.relation && !node.field.relation.multiple) return v === "" ? null : v;
        return v;
      },
      set: (_t, p, v) => {
        if (typeof p === "string" && self) self.write(p, v);
        return true;
      },
    });

    // One boolean per option of a checkbox group: c["tags::a"].
    const optionOf = (key: string) => {
      const at = key.indexOf("::");
      return { path: key.slice(0, at), option: key.slice(at + 2) };
    };
    const c = new Proxy({} as Record<string, unknown>, {
      get: (_t, p) => {
        if (typeof p !== "string" || !p.includes("::")) return false;
        const { path, option } = optionOf(p);
        return arrayAt(path).map(String).includes(option);
      },
      set: (_t, p, v) => {
        if (typeof p !== "string" || !p.includes("::") || !self) return true;
        const { path, option } = optionOf(p);
        self.toggleOption(path, option, v === true);
        return true;
      },
    });

    // The remove confirmation: dlg[path] is true while the dialog of that list is open.
    const dlg = new Proxy({} as Record<string, unknown>, {
      get: (_t, p) => typeof p === "string" && !!self && self.pendOpen === true && self.pend?.path === p,
      set: (_t, p, v) => {
        if (v !== true && self) self.pendOpen = false;
        return true;
      },
    });

    return {
      values: {} as Record<string, unknown>,
      touched: {} as Record<string, boolean>,
      showAll: false,
      status: "idle" as "idle" | "saving" | "saved" | "failed",
      formError: null as string | null,
      serverErrors: {} as Record<string, string>,
      states: {} as Record<string, SchemaTreeState>,
      issues: {} as Record<string, string>,
      mapped: { fields: {} as Record<string, string>, unmatched: [] as { path: string; message: string }[] },
      shown: {} as Record<string, string>,
      collapsed: {} as Record<string, boolean>,
      pend: null as { path: string; index: number } | null,
      pendOpen: false,
      drag: null as { path: string; from: number; over: number; dy: number; size: number } | null,
      disabled: !!config.disabled,
      submitLabel: config.submitLabel ?? t.submit,
      t,
      m,
      c,
      dlg,
      root: null as HTMLElement | null,

      init(this: State) {
        self = this;
        this.root = this.$el;
        this.values = schemaFormTreeInitial(root, config.value && Object.keys(config.value).length ? config.value : undefined) as Record<string, unknown>;
        this.refresh();
      },

      destroy() {
        stopDrag?.();
      },

      fmt,

      /* ------------------------------------------------------------ derived state */
      refresh(this: State) {
        const values = this.values;
        this.states = schemaFormTreeStates(root, values, config.rules);
        this.issues = schemaFormTreeValidate(root, values, { messages, states: this.states, formatDate: fmtDate, formatIndex: fmt });
        this.mapped = schemaFormMapErrors(root, values, this.serverErrors);
        const out: Record<string, string> = {};
        for (const [path, message] of Object.entries(this.issues as Record<string, string>)) if (this.showAll || this.touched[path]) out[path] = message;
        for (const [path, message] of Object.entries(this.mapped.fields as Record<string, string>)) out[path] = message;
        this.shown = out;
      },

      output(this: State) {
        return schemaFormTreeOutput(root, this.values, { visible: (p) => this.states[p]?.visible !== false }) as Record<string, unknown>;
      },

      visible(this: State, path: string) {
        return this.states[path]?.visible !== false;
      },
      required(this: State, path: string) {
        return this.states[path]?.required ?? nodeAt(path)?.required ?? false;
      },
      objHidden(this: State, path: string): boolean {
        const hidden = (node: SchemaTreeObject, p: string, value: unknown): boolean => {
          if (this.states[p]?.visible === false) return true;
          if (node.children.length === 0) return false;
          const src = isRecord(value) ? value : {};
          return node.children.every((ch) => {
            const cp = p ? `${p}.${ch.key}` : ch.key;
            return ch.kind === "object" ? hidden(ch, cp, src[ch.key]) : this.states[cp]?.visible === false;
          });
        };
        const node = nodeAt(path);
        return node && node.kind === "object" ? hidden(node, path, read(path)) : false;
      },

      msg(this: State, path: string) {
        return this.shown[path] || "";
      },
      ariaInvalid(this: State, path: string) {
        return this.shown[path] ? "true" : null;
      },
      invalidAttr(this: State, path: string) {
        return this.shown[path] ? "" : null;
      },
      issueCount(this: State, path: string) {
        return Object.keys(this.shown).filter((p) => schemaPathInside(p, path)).length;
      },
      hasIssues(this: State, path: string) {
        return this.issueCount(path) > 0;
      },
      issuesText(this: State, path: string) {
        return t.issues(fmt(this.issueCount(path)));
      },

      num(this: State, path: string) {
        const v = read(path);
        return typeof v === "number" && Number.isFinite(v) ? String(v) : "";
      },

      /** A control wrote a value to a path. */
      write(this: State, path: string, value: unknown) {
        if (this.disabled) return;
        const next = coerce(nodeAt(path), value);
        if (same(read(path), next)) return;
        setIn(path, next);
        this.commit(path, false);
      },

      commit(this: State, path: string, structural: boolean) {
        this.touched = { ...this.touched, [path]: true };
        const stale = Object.keys(this.serverErrors).filter((k) => (structural ? schemaPathInside(k, path) : k === path));
        if (stale.length) {
          const copy = { ...this.serverErrors };
          for (const k of stale) delete copy[k];
          this.serverErrors = copy;
        }
        if (this.status !== "saving") this.status = "idle";
        this.refresh();
        this.root?.dispatchEvent(new CustomEvent("nq-schema-form-change", { bubbles: true, detail: { value: this.output() } }));
      },

      /* ------------------------------------------------------------------- tags */
      tagOk(this: State, path: string, tag: string) {
        const list = listAt(path);
        if (!list) return true;
        const field = { ...(list.item as SchemaTreeLeaf).field, label: list.itemLabel, required: true };
        return validateField(field, tag, {}, messages) ?? true;
      },

      /* ------------------------------------------------------------- checkboxes */
      toggleOption(this: State, path: string, option: string, on: boolean) {
        const list = listAt(path);
        if (!list || this.disabled) return;
        const chosen = new Set(arrayAt(path).map(String));
        if (on && list.max !== undefined && !chosen.has(option) && chosen.size >= list.max) return;
        if (on) chosen.add(option);
        else chosen.delete(option);
        const options = (list.item as SchemaTreeLeaf).field.type === "select" ? ((list.item as SchemaTreeLeaf).field as unknown as { options: { value: string }[] }).options : [];
        setIn(path, options.filter((o) => chosen.has(o.value)).map((o) => o.value));
        this.commit(path, false);
      },

      /* ------------------------------------------------------------------ lists */
      count(this: State, path: string) {
        return arrayAt(path).length;
      },
      minOf(this: State, path: string) {
        const list = listAt(path);
        return Math.max(list?.min ?? 0, this.required(path) ? 1 : 0);
      },
      cannotRemove(this: State, path: string) {
        return this.disabled || this.count(path) <= this.minOf(path);
      },
      cannotMove(this: State, path: string, index: number, dir: number) {
        const to = index + dir;
        return this.disabled || to < 0 || to >= this.count(path);
      },
      atMax(this: State, path: string) {
        const list = listAt(path);
        return this.disabled || (list?.max !== undefined && this.count(path) >= list.max);
      },
      limit(this: State, path: string) {
        const list = listAt(path);
        if (!list) return "";
        const count = this.count(path);
        if (list.max !== undefined && count >= list.max) return t.maxReached(fmt(list.max));
        const min = this.minOf(path);
        return min > 0 && count <= min ? t.minReached(fmt(min)) : "";
      },
      countText(this: State, path: string) {
        const list = listAt(path);
        const count = this.count(path);
        return list?.max !== undefined ? t.countMax(fmt(count), fmt(list.max)) : t.count(fmt(count));
      },

      keyOf(entry: unknown, i: number) {
        if (isRecord(entry)) {
          let key = keys.get(entry);
          if (!key) keys.set(entry, (key = `nq-sf-${++serial}`));
          return key;
        }
        return `i${i}`;
      },

      rows(this: State, path: string): Row[] {
        const list = listAt(path);
        return arrayAt(path).map((entry, i) => {
          const rowPath = `${path}[${i}]`;
          if (!list || list.mode !== "groups") return { key: this.keyOf(entry, i), index: i, path: rowPath, title: "", summary: "" };
          const { title, keys: used } = schemaFormItemTitle(list, entry, i, fmt);
          return { key: this.keyOf(entry, i), index: i, path: rowPath, title, summary: schemaFormItemSummary(list, entry, used) };
        });
      },

      itemName(this: State, path: string, row: Row, fn: (name: string) => string) {
        const list = listAt(path);
        return fn(list?.mode === "groups" ? row.title : `${list?.itemLabel ?? ""} ${fmt(row.index + 1)}`);
      },

      add(this: State, path: string) {
        const list = listAt(path);
        if (!list || this.disabled || this.atMax(path)) return;
        setIn(path, [...arrayAt(path).slice(), schemaFormTreeDefaults(list.item)]);
        const fresh = arrayAt(path);
        const key = this.keyOf(fresh[fresh.length - 1], fresh.length - 1);
        focusAfter = { kind: "row", path, key };
        this.commit(path, true);
        void this.$nextTick(() => this.applyFocus());
      },

      remove(this: State, path: string, index: number) {
        if (this.disabled || this.cannotRemove(path)) return;
        const list = arrayAt(path);
        const key = this.keyOf(list[index], index);
        const next = list.slice();
        next.splice(index, 1);
        setIn(path, next);
        const { [key]: _gone, ...rest } = this.collapsed;
        this.collapsed = rest;
        focusAfter = { kind: "add", path };
        this.commit(path, true);
        void this.$nextTick(() => this.applyFocus());
      },

      move(this: State, path: string, from: number, to: number) {
        const list = arrayAt(path);
        const target = Math.max(0, Math.min(list.length - 1, to));
        if (this.disabled || target === from) return;
        const key = this.keyOf(list[from], from);
        setIn(path, moveItem(list, from, target));
        focusAfter = { kind: "move", path, key, dir: to < from ? "up" : "down" };
        this.commit(path, true);
        void this.$nextTick(() => this.applyFocus());
      },

      ask(this: State, path: string, index: number) {
        const list = listAt(path);
        if (list && schemaFormTreeHasData(list.item, arrayAt(path)[index])) {
          this.pend = { path, index };
          this.pendOpen = true;
        } else this.remove(path, index);
      },
      confirmRemove(this: State, path: string) {
        const p = this.pend as { path: string; index: number } | null;
        this.pendOpen = false;
        this.pend = null;
        if (p && p.path === path) this.remove(path, p.index);
      },
      removeTitle(this: State, path: string) {
        const p = this.pend as { path: string; index: number } | null;
        const list = listAt(path);
        if (!p || p.path !== path || !list) return "";
        return t.removeTitle(schemaFormItemTitle(list, arrayAt(path)[p.index], p.index, fmt).title);
      },

      isCollapsed(this: State, key: string) {
        return !!this.collapsed[key];
      },
      toggleRow(this: State, key: string) {
        const next = { ...this.collapsed };
        if (next[key]) delete next[key];
        else next[key] = true;
        this.collapsed = next;
      },
      allCollapsed(this: State, path: string) {
        const rows = this.rows(path) as Row[];
        return rows.length > 0 && rows.every((r) => this.collapsed[r.key]);
      },
      toggleAll(this: State, path: string) {
        const rows = this.rows(path) as Row[];
        const all = this.allCollapsed(path);
        const next = { ...this.collapsed };
        for (const r of rows) {
          if (all) delete next[r.key];
          else next[r.key] = true;
        }
        this.collapsed = next;
      },

      applyFocus(this: State) {
        const target = focusAfter;
        focusAfter = null;
        const scope = this.root as HTMLElement | null;
        if (!target || !scope) return;
        const holder = [...scope.querySelectorAll<HTMLElement>("[data-schema-path]")].find((el) => el.dataset.schemaPath === target.path);
        if (target.kind === "add") holder?.querySelector<HTMLElement>("[data-slot=schema-form-add]")?.focus();
        else if (target.kind === "row") holder?.querySelector<HTMLElement>(`[data-item-key="${target.key}"] ${FOCUSABLE.replace(":not([disabled])", "")}:not([disabled]):not([data-action])`)?.focus();
        else {
          const row = holder?.querySelector<HTMLElement>(`[data-item-key="${target.key}"]`);
          const first = row?.querySelector<HTMLButtonElement>(`[data-action="${target.dir}"]`);
          const other = row?.querySelector<HTMLButtonElement>(`[data-action="${target.dir === "up" ? "down" : "up"}"]`);
          if (first && !first.disabled) first.focus();
          else other?.focus();
        }
      },

      /* ------------------------------------------------------------ pointer drag */
      dragStart(this: State, path: string, index: number, event: PointerEvent) {
        if (this.disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
        const ol = (event.currentTarget as HTMLElement).closest("ol");
        const els = [...(ol?.querySelectorAll<HTMLElement>(":scope > li[data-slot=schema-form-group]") ?? [])];
        if (els.length < 2) return;
        const rects = els.map((r) => r.getBoundingClientRect());
        const gap = Math.max(0, (rects[1]?.top ?? 0) - (rects[0]?.bottom ?? 0));
        session = { path, from: index, startY: event.clientY, centers: rects.map((r) => r.top + r.height / 2), size: (rects[index]?.height ?? 0) + gap, id: event.pointerId, active: false };
        const state = this;
        const onMove = (e: PointerEvent) => {
          if (!session || e.pointerId !== session.id) return;
          const dy = e.clientY - session.startY;
          if (!session.active) {
            if (Math.abs(dy) < DRAG_DISTANCE) return;
            session.active = true;
          }
          e.preventDefault();
          state.drag = { path: session.path, from: session.from, over: dropIndex(session.centers, session.from, dy), dy, size: session.size };
        };
        const stop = () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          window.removeEventListener("pointercancel", stop);
          session = null;
          stopDrag = null;
          state.drag = null;
        };
        const onUp = (e: PointerEvent) => {
          if (!session || e.pointerId !== session.id) return;
          const result = state.drag as { path: string; from: number; over: number } | null;
          stop();
          if (result && result.over !== result.from) state.move(result.path, result.from, result.over);
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", stop);
        stopDrag = stop;
      },
      dragging(this: State, path: string, index: number) {
        return !!this.drag && this.drag.path === path && this.drag.from === index;
      },
      rowStyle(this: State, path: string, index: number) {
        const d = this.drag as { path: string; from: number; over: number; dy: number; size: number } | null;
        if (!d || d.path !== path) return "";
        if (index === d.from) return `transform:translateY(${d.dy}px);transition:none`;
        const shift = shiftFor(index, d.from, d.over, d.size);
        return `${shift ? `transform:translateY(${shift}px);` : ""}transition:transform 200ms var(--ease-nq, ease)`;
      },

      /* ------------------------------------------------------------------ submit */
      /** Opens the groups that hold a path, then puts focus on its field. */
      focusPath(this: State, path: string) {
        const open = { ...this.collapsed };
        for (const hit of path.matchAll(/\[(\d+)\]/g)) {
          const listPath = path.slice(0, hit.index);
          const entry = arrayAt(listPath)[Number(hit[1])];
          if (entry !== undefined) delete open[this.keyOf(entry, Number(hit[1]))];
        }
        this.collapsed = open;
        let tries = 0;
        const attempt = () => {
          const scope = this.root as HTMLElement | null;
          if (!scope) return;
          const holder = [...scope.querySelectorAll<HTMLElement>("[data-schema-path]")].find((el) => el.dataset.schemaPath === path);
          const target = holder ? (holder.matches(FOCUSABLE) ? holder : holder.querySelector<HTMLElement>(FOCUSABLE)) : null;
          if (target && target.closest("[hidden]") === null) {
            target.focus();
            target.scrollIntoView?.({ block: "center", behavior: "smooth" });
            return;
          }
          tries += 1;
          if (tries < 6) setTimeout(attempt, 30);
        };
        void this.$nextTick(() => setTimeout(attempt, 30));
      },

      async submit(this: State) {
        if (this.disabled || this.status === "saving") return;
        this.showAll = true;
        this.refresh();
        const first = Object.keys(this.issues as Record<string, string>)[0];
        if (first !== undefined) {
          this.status = "idle";
          this.focusPath(first);
          return;
        }
        this.status = "saving";
        this.formError = null;
        const pending: unknown[] = [];
        // Hidden fields are not part of what is submitted.
        this.root?.dispatchEvent(new CustomEvent("nq-schema-form-submit", { bubbles: true, detail: { value: this.output(), waitUntil: (p: unknown) => void pending.push(p) } }));
        try {
          const results = (await Promise.all(pending)) as (SubmitResult | void)[];
          const result = results.find((r) => r && (r.error || r.fieldErrors)) as SubmitResult | undefined;
          if (result) {
            const errors = result.fieldErrors ?? {};
            this.serverErrors = errors;
            this.formError = result.error ?? null;
            this.status = "failed";
            this.refresh();
            const firstField = Object.keys((this.mapped as { fields: Record<string, string> }).fields)[0];
            if (firstField) this.focusPath(firstField);
          } else {
            this.status = "saved";
          }
        } catch {
          this.formError = t.failed;
          this.status = "failed";
        }
        this.refresh();
      },

      reset(this: State) {
        this.values = schemaFormTreeInitial(root, config.value && Object.keys(config.value).length ? config.value : undefined) as Record<string, unknown>;
        this.collapsed = {};
        this.touched = {};
        this.showAll = false;
        this.serverErrors = {};
        this.formError = null;
        this.status = "idle";
        this.refresh();
        this.root?.dispatchEvent(new CustomEvent("nq-schema-form-change", { bubbles: true, detail: { value: this.output() } }));
      },

      issueTotal(this: State) {
        return Object.keys(this.issues).length;
      },
      showSummary(this: State) {
        return this.showAll && this.issueTotal() > 0;
      },
      summary(this: State): string[] {
        return this.showAll ? Object.keys(this.shown).filter((p) => this.shown[p]).slice(0, 8) : [];
      },
      summaryText(this: State, path: string) {
        return `${schemaFormPathLabel(root, path, fmt) || path}: ${this.shown[path]}`;
      },
      hasUnmatched(this: State) {
        return this.mapped.unmatched.length > 0;
      },
      unmatched(this: State) {
        return this.mapped.unmatched as { path: string; message: string }[];
      },
      isSaved(this: State) {
        return this.status === "saved";
      },
      isBusy(this: State) {
        return this.status === "saving";
      },
      busyAttr(this: State) {
        return this.status === "saving" ? "true" : null;
      },
      cannotSubmit(this: State) {
        return this.disabled || this.status === "saving";
      },
      cannotReset(this: State) {
        return this.disabled || this.status === "saving";
      },
    };
  });
};
