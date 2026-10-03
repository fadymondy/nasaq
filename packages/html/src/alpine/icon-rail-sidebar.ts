// nqIconRail: state for the two-level icon rail navigation. The markup is in the Blade component icon-rail-sidebar.
//
//   <div x-data="nqIconRail({ section: 'home', item: 'dash', subOpen: true, owners: { dash: 'home' }, subs: { home: true } })" x-modelable="section"> ... </div>
//
// section is the active rail button, item the active page, subOpen whether the sub-sidebar shows on wide screens.
// Fires bubbling "nq-section-change" { id }, "nq-sub-open-change" { open } and "nq-select" { id, sectionId } from the root.

import type { Magics, Register } from "./types";

interface RailOptions {
  section?: string;
  item?: string;
  subOpen?: boolean;
  /** page id -> the section that owns it (a page chosen from outside moves the rail). */
  owners?: Record<string, string>;
  /** section id -> true when it has a sub-sidebar. */
  subs?: Record<string, boolean>;
}

interface RailState extends Magics {
  root: HTMLElement;
  section: string;
  item: string;
  subOpen: boolean;
  owners: Record<string, string>;
  subs: Record<string, boolean>;
  hasSub: boolean;
  setSub(next: boolean): void;
  emit(name: string, detail: unknown): void;
}

export const iconRailSidebar: Register = (Alpine) => {
  Alpine.data("nqIconRail", (opts: RailOptions = {}) => ({
    root: null as unknown as HTMLElement,
    section: opts.section ?? "",
    item: opts.item ?? "",
    subOpen: opts.subOpen !== false,
    owners: opts.owners ?? {},
    subs: opts.subs ?? {},
    init(this: RailState) {
      this.root = this.$el;
      const owner = this.item ? this.owners[this.item] : undefined;
      if (owner) this.section = owner;
      this.$watch("section", (id: string) => this.emit("nq-section-change", { id }));
    },
    get hasSub() {
      return Boolean((this as unknown as RailState).subs[(this as unknown as RailState).section]);
    },
    emit(this: RailState, name: string, detail: unknown) {
      this.root.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
    },
    setSub(this: RailState, next: boolean) {
      this.subOpen = next;
      this.emit("nq-sub-open-change", { open: next });
    },
    /** A rail button was pressed. Returns true when the mobile sheet should close. */
    pickSection(this: RailState, id: string, hasHref: boolean, event: Event, fromSheet: boolean) {
      if (!hasHref) event.preventDefault();
      const hasSub = Boolean(this.subs[id]);
      if (id === this.section && hasSub && !fromSheet) {
        this.setSub(!this.subOpen);
        return false;
      }
      this.section = id;
      if (hasSub) {
        if (!fromSheet) this.setSub(true);
        return false;
      }
      this.emit("nq-select", { id, sectionId: id });
      return fromSheet;
    },
    /** A page was chosen. Always closes the sheet when it came from there. */
    pickItem(this: RailState, id: string, hasHref: boolean, event: Event) {
      if (!hasHref) event.preventDefault();
      this.item = id;
      this.emit("nq-select", { id, sectionId: this.section });
      return true;
    },
    railKey(this: RailState, event: KeyboardEvent) {
      if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      const list = event.currentTarget as HTMLElement;
      const buttons = [...list.querySelectorAll<HTMLElement>("[data-rail-button]")];
      const at = buttons.indexOf(document.activeElement as HTMLElement);
      if (at < 0) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : Math.min(buttons.length - 1, Math.max(0, at + (event.key === "ArrowDown" ? 1 : -1)));
      buttons[next]?.focus();
    },
  }));
};
