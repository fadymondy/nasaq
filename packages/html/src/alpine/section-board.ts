// nqSectionBoard: the state of x-nq::section-board: reorder (pointer drag or keyboard), the edit dialog and removal.
// The markup is the React SectionBoard's (see the Blade component); drag uses native pointer events.
//
//   <div data-slot="section-board" x-data="nqSectionBoard([{ id: 'a', title: 'News' }], { models: [...], editing: false })" x-modelable="sections">…</div>
//
// `sections` is x-modelable (x-model="$wire.sections"). Switch edit mode with x-effect="editing = on" on the component.
// Events (bubbling, from the board): "change" { sections } after a move, an edit and a removal; "nq-add" from the Add section button.

import { keyTarget, moveItem } from "./repeater";
import {
  boardSectionChanged,
  duplicateSectionSettingKeys,
  sectionDropIndex,
  sectionSettingRows,
  sectionSettingsFromRows,
  type BoardSection,
  type BoardSectionModel,
  type BoardSettingRow,
} from "./section-board-logic";
import type { Magics, Register } from "./types";

export type { BoardSection, BoardSectionModel } from "./section-board-logic";

export interface SectionBoardOptions {
  models?: BoardSectionModel[];
  editing?: boolean;
  /** Shows the Add section button in edit mode; it fires "nq-add". */
  addable?: boolean;
}

interface Drag {
  from: number;
  over: number;
  dx: number;
  dy: number;
}

interface BoardState extends Magics {
  $nq: { t(en: string, ar: string): string; locale: string };
  sections: BoardSection[];
  models: BoardSectionModel[];
  editing: boolean;
  addable: boolean;
  announcement: string;
  drag: Drag | null;
  editOpen: boolean;
  editId: string | null;
  dTitle: string;
  dBadge: string;
  dPrompt: string;
  dModel: string;
  rows: BoardSettingRow[];
  tried: boolean;
  readonly reorderable: boolean;
  readonly next: BoardSection | null;
  readonly dupes: string[];
  n(value: number): string;
  modelName(value?: string): string;
  commit(next: BoardSection[]): void;
  move(from: number, to: number): void;
}

const DEFAULT_MODEL = "__default__";
const DRAG_DISTANCE = 4;

export const sectionBoard: Register = (Alpine) => {
  Alpine.data("nqSectionBoard", (initial: BoardSection[] = [], options: SectionBoardOptions = {}) => {
    let session: { from: number; startX: number; startY: number; centers: { x: number; y: number }[]; id: number; active: boolean } | null = null;
    let cleanup: (() => void) | null = null;

    return {
      sections: [...initial] as BoardSection[],
      models: [...(options.models ?? [])] as BoardSectionModel[],
      editing: options.editing ?? false,
      addable: options.addable ?? false,
      announcement: "",
      drag: null as Drag | null,
      editOpen: false,
      editId: null as string | null,
      dTitle: "",
      dBadge: "",
      dPrompt: "",
      dModel: DEFAULT_MODEL,
      rows: [] as BoardSettingRow[],
      tried: false,

      destroy() {
        cleanup?.();
      },

      /* ------------------------------------------------------------ derived */

      get reorderable() {
        const self = this as unknown as BoardState;
        return self.editing && self.sections.length > 1;
      },
      get modelItems() {
        const self = this as unknown as BoardState;
        return [{ value: DEFAULT_MODEL, label: self.$nq.t("Default model", "النموذج الافتراضي") }, ...self.models.map((m) => ({ value: m.value, label: m.label ?? m.value }))];
      },
      get next(): BoardSection | null {
        const self = this as unknown as BoardState;
        const current = self.sections.find((s) => s.id === self.editId);
        if (!current) return null;
        return {
          ...current,
          title: self.dTitle.trim(),
          badge: self.dBadge || undefined,
          prompt: self.dPrompt || undefined,
          model: !self.dModel || self.dModel === DEFAULT_MODEL ? undefined : self.dModel,
          settings: sectionSettingsFromRows(self.rows),
        };
      },
      get dupes() {
        const self = this as unknown as BoardState;
        return duplicateSectionSettingKeys(self.rows);
      },
      get titleInvalid() {
        const self = this as unknown as BoardState;
        return self.tried && !self.dTitle.trim();
      },
      get cannotSave() {
        const self = this as unknown as BoardState;
        const next = self.next;
        const current = self.sections.find((s) => s.id === self.editId);
        return !next || !current || !boardSectionChanged(current, next) || self.dupes.length > 0;
      },

      n(this: BoardState, value: number) {
        return new Intl.NumberFormat(this.$nq.locale.startsWith("ar") ? "ar-u-nu-arab" : "en").format(value);
      },
      modelName(this: BoardState, value?: string) {
        if (!value) return "";
        return this.models.find((m) => m.value === value)?.label ?? value;
      },
      hasFooter(this: BoardState, section: BoardSection) {
        return this.editing && !!(this.modelName(section.model) || section.prompt);
      },
      editTitle(this: BoardState) {
        return this.sections.find((s) => s.id === this.editId)?.title || this.$nq.t("Edit section", "تعديل القسم");
      },
      dupText(this: BoardState, key: string) {
        return this.$nq.t(`"${key}" is used more than once. Keys must be unique.`, `"${key}" مستخدم أكثر من مرة. يجب أن تكون المفاتيح فريدة.`);
      },

      /* ------------------------------------------------------------ changes */

      commit(this: BoardState, next: BoardSection[]) {
        this.sections = next;
        this.$dispatch("change", { sections: next });
      },

      move(this: BoardState, from: number, to: number) {
        const item = this.sections[from];
        const target = Math.max(0, Math.min(this.sections.length - 1, to));
        if (!item || target === from) return;
        const total = this.sections.length;
        this.commit(moveItem(this.sections, from, target));
        this.announcement = this.$nq.t(`${item.title} is now at position ${this.n(target + 1)} of ${this.n(total)}`, `${item.title} الآن في الموضع ${this.n(target + 1)} من ${this.n(total)}`);
      },

      removeSection(this: BoardState, section: BoardSection) {
        this.commit(this.sections.filter((s) => s.id !== section.id));
        this.announcement = this.$nq.t(`${section.title} removed`, `تم حذف ${section.title}`);
      },

      addSection(this: BoardState) {
        this.$dispatch("nq-add");
      },

      /* ------------------------------------------------------------ editor */

      startEdit(this: BoardState, section: BoardSection) {
        this.editId = section.id;
        this.dTitle = section.title;
        this.dBadge = section.badge ?? "";
        this.dPrompt = section.prompt ?? "";
        this.dModel = section.model ?? DEFAULT_MODEL;
        this.rows = sectionSettingRows(section.settings);
        this.tried = false;
        this.editOpen = true;
      },

      addSetting(this: BoardState) {
        this.rows = [...this.rows, { key: "", value: "" }];
      },

      dropSetting(this: BoardState, index: number) {
        this.rows = this.rows.filter((_, i) => i !== index);
      },

      submitEdit(this: BoardState) {
        this.tried = true;
        const next = this.next;
        if (!next || !next.title || this.dupes.length) return;
        this.commit(this.sections.map((s) => (s.id === next.id ? next : s)));
        this.editOpen = false;
        this.announcement = this.$nq.t(`${next.title} saved`, `تم حفظ ${next.title}`);
      },

      /* ------------------------------------------------------------ reorder */

      onHandleKey(this: BoardState, event: KeyboardEvent, index: number) {
        if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const handle = event.currentTarget as HTMLElement;
        const target = keyTarget(event.key, index, this.sections.length);
        if (target !== null) this.move(index, target);
        void this.$nextTick(() => handle.isConnected && handle.focus());
      },

      startDrag(this: BoardState, event: PointerEvent, index: number) {
        if (!this.reorderable || (event.pointerType === "mouse" && event.button !== 0)) return;
        const items = [...this.$root.querySelectorAll<HTMLElement>('[data-slot="section-board-section"]')];
        session = {
          from: index,
          startX: event.clientX,
          startY: event.clientY,
          centers: items.map((el) => {
            const r = el.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          }),
          id: event.pointerId,
          active: false,
        };
        const state = this;
        const onMove = (e: PointerEvent) => {
          if (!session || e.pointerId !== session.id) return;
          const dx = e.clientX - session.startX;
          const dy = e.clientY - session.startY;
          if (!session.active) {
            if (Math.hypot(dx, dy) < DRAG_DISTANCE) return;
            session.active = true;
          }
          e.preventDefault();
          state.drag = { from: session.from, over: sectionDropIndex(session.centers, session.from, dx, dy), dx, dy };
        };
        const stop = () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          window.removeEventListener("pointercancel", stop);
          session = null;
          cleanup = null;
          state.drag = null;
        };
        const onUp = (e: PointerEvent) => {
          if (!session || e.pointerId !== session.id) return;
          const result = state.drag;
          stop();
          if (result && result.over !== result.from) state.move(result.from, result.over);
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", stop);
        cleanup = stop;
      },

      isDragging(this: BoardState, index: number) {
        return !!this.drag && this.drag.from === index;
      },
      isOver(this: BoardState, index: number) {
        return !!this.drag && this.drag.over === index && this.drag.from !== index;
      },
      sectionStyle(this: BoardState, index: number) {
        const d = this.drag;
        if (!this.editing || !d || index !== d.from) return "";
        return `transform:translate(${d.dx}px, ${d.dy}px);transition:none`;
      },
    };
  });
};
