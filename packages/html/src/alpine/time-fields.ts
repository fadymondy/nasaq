// nqTimeField, nqTimeSpanField, nqTimeZoneClock and nqTimeZoneField: Alpine state for the Nasaq time fields. The markup and classes are the
// React TimeField / TimeSpanField / TimeZoneClock / TimeZoneField's (see the Blade components in components/time-fields); the typing,
// stepping and time zone maths live in time-fields-logic.ts (a copy of the React time-fields-model.ts).
//
//   <div data-slot="time-field" x-data="nqTimeField({ value: '09:00', step: 5 })" x-modelable="value" x-id="['nq-time']">
//     <input x-bind="input"> <p x-bind="messageEl"> … </p>
//   </div>
//
// nqTimeField   value ("HH:mm" or null, x-modelable), min, max, step (5), allowEndOfDay, hidePreview, readOnly, disabled, locale, labels.
//               Type 930 and it becomes 09:30 on blur or Enter. ArrowUp / ArrowDown step, PageUp / PageDown move an hour, Escape puts
//               the last accepted time back. Fires a bubbling "change" ({ value }). `extError` is an error from outside.
// nqTimeSpanField   span ({ start, end }, x-modelable), allowOvernight, showDuration, locale, labels. Two nqTimeField children bind to
//               span.start / span.end. Fires "change" ({ value }).
// nqTimeZoneClock   timeZone, label, seconds, hourCycle, reference, showDate, showOffset, now (ms, freezes it), locale, labels. Ticks every second.
// nqTimeZoneField   value (an IANA zone, x-modelable), zones, reference, limit (60), hourCycle, now, locale, labels. A combobox over the zones; every
//               row shows the time there now. Fires "change" ({ value }).
// All of them: `labels` overrides any string below ({min} {max} {n} placeholders in the templated ones).

import { normalizeForSearch } from "./command-palette-logic";
import {
  detectTimeZone,
  formatTimeSpan,
  formatUtcOffset,
  formatZoneClock,
  formatZoneDate,
  formatZoneDifference,
  isIanaTimeZone,
  isTimeInRange,
  listTimeZones,
  matchTimeZone,
  parseTimeInput,
  stepTimeValue,
  timeSpanMinutes,
  timeZoneCity,
  timeZoneLongName,
  timeZoneOffsetMinutes,
  timeZoneRegion,
  zoneDayDifference,
} from "./time-fields-logic";
import type { Magics, Register } from "./types";

const STRINGS = {
  en: {
    invalid: "Enter a time such as 930 or 09:30.",
    outOfRange: "Choose a time between {min} and {max}.",
    becomes: "Will be",
    endBeforeStart: "The end must be after the start.",
    overnight: "Next day",
    duration: "Duration",
    yourZone: "Your time zone",
    tomorrow: "Tomorrow",
    yesterday: "Yesterday",
    ahead: "from",
    truncated: "Showing the first {n}. Keep typing to narrow the list.",
    unknownZone: "Unknown time zone",
    universal: "Universal time",
  },
  ar: {
    invalid: "أدخل وقتًا مثل 930 أو 09:30.",
    outOfRange: "اختر وقتًا بين {min} و{max}.",
    becomes: "سيصبح",
    endBeforeStart: "يجب أن تكون النهاية بعد البداية.",
    overnight: "اليوم التالي",
    duration: "المدة",
    yourZone: "منطقتك الزمنية",
    tomorrow: "غدًا",
    yesterday: "أمس",
    ahead: "عن",
    truncated: "يظهر أول {n}. تابع الكتابة لتضييق القائمة.",
    unknownZone: "منطقة زمنية غير معروفة",
    universal: "التوقيت العالمي",
  },
};
type Labels = typeof STRINGS.en;

function localeOf(explicit?: string): string {
  return explicit ?? (typeof document !== "undefined" ? document.documentElement.lang || "en" : "en");
}
function labelsFor(locale: string, overrides?: Partial<Labels>): Labels {
  return { ...(locale.split("-")[0] === "ar" ? STRINGS.ar : STRINGS.en), ...overrides };
}
const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

function announce(root: HTMLElement | undefined, value: unknown) {
  root?.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: { value } }));
}

/* ------------------------------------------------------------------ nqTimeField */

interface TimeFieldOptions {
  value?: string | null;
  min?: string;
  max?: string;
  step?: number;
  allowEndOfDay?: boolean;
  hidePreview?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  /** An error from outside, shown in place of the built-in ones. */
  error?: string | null;
  locale?: string;
  labels?: Partial<Labels>;
}

interface TimeFieldState {
  value: string | null;
  text: string;
  problem: "invalid" | "range" | null;
  typing: boolean;
  extError: string | null;
  root: HTMLElement | undefined;
  opts: TimeFieldOptions;
  readonly t: Labels;
  readonly message: string | null;
  readonly preview: string | null;
  readonly invalid: boolean;
  init(): void;
  commit(next: string | null): void;
  accept(raw: string): void;
  stepBy(delta: number): void;
  input: Record<string, unknown>;
  messageEl: Record<string, unknown>;
  previewEl: Record<string, unknown>;
  textEl: Record<string, unknown>;
}

export const timeFields: Register = (Alpine) => {
  Alpine.data("nqTimeField", (options: TimeFieldOptions = {}) => {
    const state: TimeFieldState & ThisType<TimeFieldState & Magics> = {
      value: options.value || null,
      text: options.value ?? "",
      problem: null,
      typing: false,
      extError: options.error ?? null,
      root: undefined,
      opts: options,
      get t() {
        return labelsFor(localeOf(this.opts.locale), this.opts.labels);
      },
      get message() {
        if (this.extError) return this.extError;
        if (this.problem === "invalid") return this.t.invalid;
        if (this.problem === "range") return fill(this.t.outOfRange, { min: this.opts.min ?? "00:00", max: this.opts.max ?? "23:59" });
        return null;
      },
      get preview() {
        if (this.opts.hidePreview || this.problem) return null;
        const parsed = this.text.trim() ? parseTimeInput(this.text, { allowEndOfDay: this.opts.allowEndOfDay }) : null;
        return parsed && parsed !== this.text.trim() ? parsed : null;
      },
      get invalid() {
        return Boolean(this.message);
      },
      init() {
        this.root = this.$el;
        // Follow the value when it changes from outside, but never overwrite what a person is typing.
        this.$watch("value", (v: unknown) => {
          if (!this.typing) {
            this.text = (v as string | null) ?? "";
            this.problem = null;
          }
        });
      },
      commit(next) {
        const changed = next !== (this.value || null);
        this.value = next;
        this.text = next ?? "";
        this.problem = null;
        if (changed) announce(this.root, next);
      },
      accept(raw) {
        this.typing = false;
        if (!raw.trim()) return this.commit(null);
        const parsed = parseTimeInput(raw, { allowEndOfDay: this.opts.allowEndOfDay });
        if (!parsed) {
          this.problem = "invalid";
          return;
        }
        if (!isTimeInRange(parsed, this.opts.min, this.opts.max)) {
          this.problem = "range";
          return;
        }
        this.commit(parsed);
      },
      stepBy(delta) {
        this.typing = false;
        const current = parseTimeInput(this.text, { allowEndOfDay: this.opts.allowEndOfDay }) ?? this.value;
        this.commit(stepTimeValue(current, delta, { min: this.opts.min, max: this.opts.max }));
      },
      /** Bind on the text input. */
      input: {
        ":value"() {
          return this.text;
        },
        ":aria-invalid"() {
          return this.invalid ? "true" : null;
        },
        ":aria-describedby"() {
          return this.message || this.preview ? this.$id("nq-time", "message") : null;
        },
        "x-on:input"(event: Event) {
          this.typing = true;
          this.text = (event.target as HTMLInputElement).value;
          if (this.problem) this.problem = null;
        },
        "x-on:blur"(event: Event) {
          this.accept((event.target as HTMLInputElement).value);
        },
        "x-on:keydown"(event: KeyboardEvent) {
          if (this.opts.readOnly || this.opts.disabled) return;
          const step = this.opts.step ?? 5;
          if (event.key === "Enter") this.accept((event.target as HTMLInputElement).value);
          else if (event.key === "Escape") {
            this.typing = false;
            this.text = this.value ?? "";
            this.problem = null;
          } else if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "PageUp" || event.key === "PageDown") {
            event.preventDefault();
            const delta = event.key.startsWith("Page") ? 60 : step;
            this.stepBy(event.key === "ArrowUp" || event.key === "PageUp" ? delta : -delta);
          }
        },
      },
      /** Bind on the <p> under the field: hidden while there is nothing to say; its colour follows the state. */
      messageEl: {
        "aria-live": "polite",
        ":id"() {
          return this.$id("nq-time", "message");
        },
        ":hidden"() {
          return !this.message && !this.preview ? "" : null;
        },
        ":class"() {
          return this.invalid ? "text-nq-danger-text" : "text-muted-foreground";
        },
      },
      /** Bind on the span that shows the error text. */
      textEl: {
        "x-show"() {
          return Boolean(this.message);
        },
        "x-text"() {
          return this.message ?? "";
        },
      },
      /** Bind on the span that shows "Will be 09:30". */
      previewEl: {
        "x-show"() {
          return !this.message && Boolean(this.preview);
        },
      },
    };
    return state;
  });

  /* ---------------------------------------------------------------- nqTimeSpanField */

  interface SpanValue {
    start: string | null;
    end: string | null;
  }
  interface SpanOptions {
    value?: SpanValue;
    allowOvernight?: boolean;
    showDuration?: boolean;
    locale?: string;
    labels?: Partial<Labels>;
  }
  // Names here are prefixed (cfg, spanLabels): the two child time fields share this scope chain and have their own opts, t and root.
  interface SpanState {
    span: SpanValue;
    spanRoot: HTMLElement | undefined;
    cfg: SpanOptions;
    readonly spanLabels: Labels;
    readonly minutes: number | null;
    readonly overnight: boolean;
    readonly backwards: boolean;
    readonly endError: string | null;
    readonly durationText: string;
    init(): void;
  }

  Alpine.data("nqTimeSpanField", (options: SpanOptions = {}) => {
    const state: SpanState & ThisType<SpanState & Magics> = {
      span: { start: options.value?.start ?? "09:00", end: options.value?.end ?? "17:00" },
      spanRoot: undefined,
      cfg: options,
      get spanLabels() {
        return labelsFor(localeOf(this.cfg.locale), this.cfg.labels);
      },
      get minutes() {
        return timeSpanMinutes({ start: this.span.start || "", end: this.span.end || "" }, Boolean(this.cfg.allowOvernight));
      },
      get overnight() {
        return Boolean(this.cfg.allowOvernight) && (this.span.end || "") < (this.span.start || "");
      },
      get backwards() {
        return !this.cfg.allowOvernight && Boolean(this.span.start) && Boolean(this.span.end) && (this.span.end as string) < (this.span.start as string);
      },
      get endError() {
        return this.backwards ? this.spanLabels.endBeforeStart : null;
      },
      get durationText() {
        return this.minutes === null ? "" : formatTimeSpan(this.minutes, localeOf(this.cfg.locale));
      },
      init() {
        this.spanRoot = this.$el;
        this.$watch("span", (v: unknown) => announce(this.spanRoot, v));
      },
    };
    return state;
  });

  /* ---------------------------------------------------------------- nqTimeZoneClock */

  interface ClockOptions {
    timeZone?: string;
    label?: string;
    seconds?: boolean;
    hourCycle?: 12 | 24;
    reference?: string;
    showDate?: boolean;
    showOffset?: boolean;
    now?: number;
    locale?: string;
    labels?: Partial<Labels>;
  }
  interface ClockState {
    timeZone: string;
    nowMs: number;
    timer: number | undefined;
    opts: ClockOptions;
    readonly t: Labels;
    readonly locale: string;
    readonly at: Date;
    readonly known: boolean;
    readonly hasReference: boolean;
    readonly city: string;
    readonly offsetLabel: string;
    readonly clock: string;
    readonly iso: string;
    readonly dateText: string;
    readonly dayShiftText: string;
    readonly diffMinutes: number | null;
    readonly showRow: boolean;
    readonly diffText: string;
    init(): void;
    readonly diffVisible: boolean;
    destroy(): void;
  }

  Alpine.data("nqTimeZoneClock", (options: ClockOptions = {}) => {
    const state: ClockState & ThisType<ClockState & Magics> = {
      timeZone: options.timeZone ?? "UTC",
      nowMs: options.now ?? Date.now(),
      timer: undefined,
      opts: options,
      get t() {
        return labelsFor(this.locale, this.opts.labels);
      },
      get locale() {
        return localeOf(this.opts.locale);
      },
      get at() {
        return new Date(this.nowMs);
      },
      get known() {
        return isIanaTimeZone(this.timeZone);
      },
      get hasReference() {
        return Boolean(this.opts.reference && isIanaTimeZone(this.opts.reference));
      },
      get city() {
        return this.opts.label ?? timeZoneCity(this.timeZone);
      },
      get offsetLabel() {
        return this.known ? formatUtcOffset(timeZoneOffsetMinutes(this.at, this.timeZone)) : "";
      },
      get clock() {
        return this.known ? formatZoneClock(this.at, this.timeZone, { locale: this.locale, seconds: this.opts.seconds, hourCycle: this.opts.hourCycle }) : "";
      },
      get iso() {
        return this.at.toISOString();
      },
      get dateText() {
        return this.known ? formatZoneDate(this.at, this.timeZone, this.locale) : "";
      },
      get dayShiftText() {
        if (!this.known || !this.hasReference) return "";
        const shift = zoneDayDifference(this.at, this.timeZone, this.opts.reference as string);
        return shift === 0 ? "" : shift > 0 ? this.t.tomorrow : this.t.yesterday;
      },
      get diffMinutes() {
        return this.known && this.hasReference ? timeZoneOffsetMinutes(this.at, this.timeZone) - timeZoneOffsetMinutes(this.at, this.opts.reference as string) : null;
      },
      get showRow() {
        return this.opts.showDate !== false || this.diffMinutes !== null;
      },
      get diffVisible() {
        return this.diffMinutes !== null && this.diffMinutes !== 0;
      },
      get diffText() {
        return this.diffMinutes === null ? "" : formatZoneDifference(this.diffMinutes, this.locale);
      },
      init() {
        if (options.now === undefined) this.timer = window.setInterval(() => (this.nowMs = Date.now()), 1000);
      },
      destroy() {
        if (this.timer !== undefined) window.clearInterval(this.timer);
      },
    };
    return state;
  });

  /* ---------------------------------------------------------------- nqTimeZoneField */

  interface ZoneFieldOptions {
    value?: string | null;
    zones?: string[];
    reference?: string;
    limit?: number;
    hourCycle?: 12 | 24;
    now?: number;
    locale?: string;
    labels?: Partial<Labels>;
  }
  interface ZoneFieldState {
    value: string | null;
    open: boolean;
    query: string;
    text: string;
    highlighted: number;
    shown: string[];
    matchCount: number;
    nowMs: number;
    timer: number | undefined;
    list: string[];
    mine: string;
    root: HTMLElement | undefined;
    opts: ZoneFieldOptions;
    readonly t: Labels;
    readonly locale: string;
    readonly at: Date;
    readonly truncated: boolean;
    readonly truncatedText: string;
    readonly yourZoneVisible: boolean;
    readonly noMatches: boolean;
    init(): void;
    label(zone: string | null): string;
    city(zone: string): string;
    sub(zone: string): string;
    clockOf(zone: string): string;
    gap(zone: string): string;
    optionId(index: number): string;
    refresh(): void;
    show(): void;
    close(): void;
    pick(zone: string | null): void;
    pickMine(): void;
    mineDisabled(): boolean;
    destroy(): void;
    input: Record<string, unknown>;
    trigger: Record<string, unknown>;
    popup: Record<string, unknown>;
  }

  Alpine.data("nqTimeZoneField", (options: ZoneFieldOptions = {}) => {
    const state: ZoneFieldState & ThisType<ZoneFieldState & Magics> = {
      value: options.value ?? null,
      open: false,
      query: "",
      text: "",
      highlighted: -1,
      shown: [],
      matchCount: 0,
      nowMs: options.now ?? Date.now(),
      timer: undefined,
      list: [],
      mine: "UTC",
      root: undefined,
      opts: options,
      get t() {
        return labelsFor(this.locale, this.opts.labels);
      },
      get locale() {
        return localeOf(this.opts.locale);
      },
      get at() {
        return new Date(this.nowMs);
      },
      get truncated() {
        return this.matchCount > Math.max(1, this.opts.limit ?? 60);
      },
      get truncatedText() {
        return fill(this.t.truncated, { n: Math.max(1, this.opts.limit ?? 60) });
      },
      get yourZoneVisible() {
        return Boolean(this.value) && this.value === this.mine;
      },
      get noMatches() {
        return this.matchCount === 0;
      },
      init() {
        this.root = this.$el;
        this.list = this.opts.zones ? [...this.opts.zones] : listTimeZones();
        this.mine = typeof Intl === "undefined" ? "UTC" : detectTimeZone();
        this.text = this.label(this.value);
        this.refresh();
        if (options.now === undefined) this.timer = window.setInterval(() => (this.nowMs = Date.now()), 1000);
        this.$watch("value", () => {
          if (!this.open) this.text = this.label(this.value);
        });
      },
      destroy() {
        if (this.timer !== undefined) window.clearInterval(this.timer);
      },
      label(zone) {
        if (!zone) return "";
        const region = timeZoneRegion(zone);
        return `${timeZoneCity(zone)}${region ? `, ${region}` : ""}`;
      },
      city(zone) {
        return timeZoneCity(zone);
      },
      sub(zone) {
        return [timeZoneRegion(zone), timeZoneLongName(this.at, zone, this.locale)].filter(Boolean).join(" · ") || this.t.universal;
      },
      clockOf(zone) {
        return formatZoneClock(this.at, zone, { locale: this.locale, hourCycle: this.opts.hourCycle });
      },
      gap(zone) {
        const offset = timeZoneOffsetMinutes(this.at, zone);
        return this.opts.reference ? formatZoneDifference(offset - timeZoneOffsetMinutes(this.at, this.opts.reference), this.locale) : formatUtcOffset(offset);
      },
      optionId(index) {
        return this.$id("nq-tz", `option-${index}`);
      },
      refresh() {
        const q = this.query.trim();
        const found = q ? this.list.filter((zone) => matchTimeZone(zone, q, this.at, this.locale, normalizeForSearch)) : this.list;
        this.matchCount = found.length;
        this.shown = found.slice(0, Math.max(1, this.opts.limit ?? 60));
        this.highlighted = this.shown.length ? 0 : -1;
      },
      show() {
        if (this.open) return;
        this.open = true;
        this.$nextTick(() => {
          const anchor = this.$refs.anchor;
          const popup = this.$refs.popup;
          if (anchor && popup) {
            popup.style.setProperty("--anchor-width", `${anchor.offsetWidth}px`);
            popup.style.setProperty("--available-height", `${Math.max(120, window.innerHeight - anchor.getBoundingClientRect().bottom - 16)}px`);
          }
        });
      },
      close() {
        if (!this.open) return;
        this.open = false;
        this.query = "";
        this.text = this.label(this.value);
        this.refresh();
      },
      pick(zone) {
        if (!zone) return;
        this.value = zone;
        this.close();
        announce(this.root, zone);
      },
      pickMine() {
        this.pick(this.mine);
      },
      mineDisabled() {
        return this.value === this.mine;
      },
      /** Bind on the text input. */
      input: {
        type: "text",
        role: "combobox",
        autocomplete: "off",
        "aria-autocomplete": "list",
        ":value"() {
          return this.text;
        },
        ":aria-expanded"() {
          return String(this.open);
        },
        ":aria-controls"() {
          return this.open ? this.$id("nq-tz", "listbox") : null;
        },
        ":aria-activedescendant"() {
          return this.open && this.highlighted >= 0 ? this.optionId(this.highlighted) : null;
        },
        "x-on:focus"(event: Event) {
          (event.target as HTMLInputElement).select();
        },
        "x-on:click"() {
          this.show();
        },
        "x-on:input"(event: Event) {
          this.text = (event.target as HTMLInputElement).value;
          this.query = this.text;
          this.show();
          this.refresh();
        },
        "x-on:keydown"(event: KeyboardEvent) {
          if (event.defaultPrevented || event.isComposing) return;
          const count = this.shown.length;
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!this.open) {
              this.show();
              return;
            }
            if (!count) return;
            const next = event.key === "ArrowDown" ? (this.highlighted + 1) % count : (this.highlighted - 1 + count) % count;
            this.highlighted = next;
            this.$nextTick(() => document.getElementById(this.optionId(next))?.scrollIntoView?.({ block: "nearest" }));
          } else if (event.key === "Home" || event.key === "End") {
            if (!this.open || !count) return;
            event.preventDefault();
            this.highlighted = event.key === "Home" ? 0 : count - 1;
          } else if (event.key === "Enter") {
            if (!this.open || this.highlighted < 0) return;
            event.preventDefault();
            this.pick(this.shown[this.highlighted] ?? null);
          } else if (event.key === "Escape") {
            if (!this.open) return;
            event.preventDefault();
            event.stopPropagation();
            this.close();
          } else if (event.key === "Tab") {
            this.close();
          }
        },
      },
      /** Bind on the chevron button. */
      trigger: {
        type: "button",
        tabindex: "-1",
        "aria-haspopup": "listbox",
        ":aria-expanded"() {
          return String(this.open);
        },
        ":data-popup-open"() {
          return this.open ? "" : null;
        },
        "x-on:click"() {
          if (this.open) this.close();
          else {
            this.show();
            (this.$refs.input as HTMLInputElement | undefined)?.focus();
          }
        },
      },
      /** Bind on the list popup. */
      popup: {
        role: "listbox",
        ":id"() {
          return this.$id("nq-tz", "listbox");
        },
        "x-on:mousedown.prevent"() {},
        "x-on:pointerdown.document"(event: PointerEvent) {
          if (!this.open) return;
          const target = event.target as Node;
          if (this.$refs.popup?.contains(target) || this.$refs.anchor?.contains(target)) return;
          this.close();
        },
      },
    };
    return state;
  });
};
