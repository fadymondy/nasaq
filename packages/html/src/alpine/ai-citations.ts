// nqAiCitations and nqAiCitationMarker: an AI answer with numbered `[n]` markers, source chips and an evidence panel that light up together.
// The markup is the React AiCitedAnswer / AiCitedText (see the Blade components); the server turns `[n]` into markers, the state lives here.
//
//   <section data-slot="ai-cited-answer" x-data="nqAiCitations(false, 'uid')" x-on:nq-cite-active="setActive($event)" x-on:nq-cite-select="select($event)">…</section>
//   <span x-data="nqAiCitationMarker('s1')" class="contents"><button x-ref="trigger" …>1</button><template x-teleport="body">…popup…</template></span>
//
// Events (bubbling):
//   marker  "nq-cite-active" { id | null }   the marker's popover opened (hover after 150 ms, or press) or closed
//   chips / evidence cards  "nq-cite-active" { id | null }   hover or focus
//   chips   "nq-cite-select" { id, index }   a chip was pressed (only when the chips are buttons)
//   root    "nq-source-open" { id }          after nq-cite-select opened the evidence panel
// `active` (the source id being pointed at) is read by the parts through `$data.active`; `evidenceOpen` is x-modelable on the collapsible.

import type { Magics, Register } from "./types";

interface MarkerState extends Magics {
  sid: string;
  open: boolean;
  popupEl: HTMLElement | null;
  root: HTMLElement | null;
  timer: ReturnType<typeof setTimeout> | undefined;
  close(): void;
  hoverOut(): void;
}

interface AnswerState extends Magics {
  active: string | null;
  evidenceOpen: boolean;
  uid: string;
  root: HTMLElement | null;
}

export const aiCitations: Register = (Alpine) => {
  Alpine.data("nqAiCitations", (evidenceOpen = false, uid = "") => ({
    active: null as string | null,
    evidenceOpen: Boolean(evidenceOpen),
    uid,
    root: null as HTMLElement | null,
    init(this: AnswerState) {
      this.root = this.$el;
    },
    setActive(this: AnswerState, event: CustomEvent<{ id: string | null }>) {
      this.active = event.detail?.id ?? null;
    },
    select(this: AnswerState, event: CustomEvent<{ id: string }>) {
      const id = event.detail?.id;
      if (!id) return;
      this.evidenceOpen = true;
      this.active = id;
      this.root?.dispatchEvent(new CustomEvent("nq-source-open", { bubbles: true, detail: { id } }));
      this.$nextTick(() => requestAnimationFrame(() => document.getElementById(`${this.uid}-ev-${id}`)?.scrollIntoView?.({ block: "nearest", behavior: "smooth" })));
    },
  }));

  Alpine.data("nqAiCitationMarker", (sid: string) => ({
    sid,
    open: false,
    popupEl: null as HTMLElement | null,
    root: null as HTMLElement | null,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    init(this: MarkerState) {
      this.root = this.$el;
      this.$watch("open", (open: boolean) => {
        this.root?.dispatchEvent(new CustomEvent("nq-cite-active", { bubbles: true, detail: { id: open ? this.sid : null } }));
        if (!open && this.popupEl?.contains(document.activeElement)) this.$refs.trigger?.focus();
      });
    },
    /** Open after the hover delay (150 ms). */
    hoverIn(this: MarkerState) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => (this.open = true), 150);
    },
    /** Close after a short grace, so the pointer can travel from the marker into the popup. */
    hoverOut(this: MarkerState) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => (this.open = false), 150);
    },
    hold(this: MarkerState) {
      clearTimeout(this.timer);
    },
    toggle(this: MarkerState) {
      clearTimeout(this.timer);
      this.open = !this.open;
    },
    close(this: MarkerState) {
      clearTimeout(this.timer);
      this.open = false;
    },
    /** Bind on the popup, like nqPopover: dialog role, Escape and outside click close it, and the pointer inside keeps it open. */
    popup: {
      role: "dialog",
      tabindex: "-1",
      "x-on:keydown.escape.prevent.stop"(this: MarkerState) {
        this.close();
      },
      "x-on:mouseenter"(this: MarkerState) {
        clearTimeout(this.timer);
      },
      "x-on:mouseleave"(this: MarkerState) {
        this.hoverOut();
      },
      "x-on:click.outside"(this: MarkerState, event: Event) {
        if (this.open && !this.$refs.trigger?.contains(event.target as Node)) this.close();
      },
    },
  }));
};
