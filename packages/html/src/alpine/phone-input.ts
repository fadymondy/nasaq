// nqPhoneInput: a country picker (flag, dial code, name; Gulf and Arab countries first) and a digits field joined in one
// bordered group. The markup is the React PhoneInput's (see the Blade component), the state lives here.
//
//   <div data-slot="phone-input-root" x-data="nqPhoneInput('+966501234567', { defaultCountry: 'SA', locale: 'en' })" x-modelable="value" x-id="['nq-phone']">
//     <div role="group" data-slot="phone-input" x-ref="anchor" …>
//       <button data-slot="phone-input-country" x-bind="trigger">…</button>
//       <input data-slot="input-group-input" x-bind="field">
//     </div>
//     <template x-teleport="body"><div data-slot="phone-input-content" x-bind="popup" x-nq-presence="open" x-anchor.bottom-start.offset.4="$refs.anchor">
//       <input data-slot="phone-input-search" x-bind="search">
//       <template x-for="c in matches" :key="c.iso"><div data-slot="combobox-item" x-bind="item(c)">…</div></template>
//     </div></template>
//     <input type="hidden" name="phone" :value="value">
//   </div>
//
// `value` is E.164 ("+966501234567", "" when empty) and x-modelable (x-model="$wire.phone"). A local number such as
// 0591234567 is kept as national digits of the default country. Typing groups the digits by the country's rules; a
// pasted "+9665…" picks the country from its calling code. The search matches name (English and Arabic), ISO code and
// dial code with an Arabic-aware fold. Each change dispatches "phone-change" ({ value, country }) from the root.
// Options: defaultCountry ("SA"), preferred (ISO list shown first), locale, invalid.
//
// The phone data is a compact table generated from libphonenumber-js (see phone-input-metadata.ts); numbers are
// parsed, formatted and checked against it, so no library is loaded.

import { loadFlag } from "./country-flag";
import {
  formatE164,
  formatNational,
  parsePhone,
  parsePhoneLenient,
  PHONE_COUNTRIES,
  PHONE_PREFERRED,
  phoneExample,
  toDigits,
  type PhoneCountry,
} from "./phone-input-logic";
import type { Magics, Register } from "./types";

const MAX_DIGITS = 15;
const STRINGS = {
  en: { country: "Country", search: "Search countries", empty: "No country found.", placeholder: "Phone number" },
  ar: { country: "الدولة", search: "ابحث عن دولة", empty: "لا توجد دولة مطابقة.", placeholder: "رقم الهاتف" },
} as const;

/** Same fold as the React `normalizeForSearch`. */
const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();

interface Item extends PhoneCountry {
  label: string;
  search: string;
}

interface PhoneState extends Magics {
  value: string;
  iso: string;
  national: string;
  query: string;
  open: boolean;
  active: number;
  lang: "en" | "ar";
  locale: string;
  preferred: string[];
  root: HTMLElement | null;
  country(): PhoneCountry;
  shown(): string;
  hint(): string;
  items(): Item[];
  matches(): Item[];
  emit(country: PhoneCountry, national: string): void;
  pick(item: PhoneCountry): void;
  show(): void;
  close(refocus?: boolean): void;
  flag: string;
}

export const phoneInput: Register = (Alpine) => {
  Alpine.data("nqPhoneInput", (initial = "", options: { defaultCountry?: string; preferred?: string[]; locale?: string; invalid?: boolean } = {}) => {
    const defaultCountry = (options.defaultCountry ?? "SA").toUpperCase();
    const start = parsePhoneLenient(String(initial ?? ""), PHONE_COUNTRIES, defaultCountry);
    const fallback = PHONE_COUNTRIES.find((c) => c.iso === defaultCountry) ?? PHONE_COUNTRIES[0]!;
    const first = start?.country ?? fallback;
    return {
      value: formatE164(first, start?.national ?? ""),
      iso: first.iso,
      national: start?.national ?? "",
      query: "",
      open: false,
      active: 0,
      flag: "",
      locale: options.locale ?? "en",
      lang: String(options.locale ?? "en").split("-")[0] === "ar" ? "ar" : "en",
      preferred: options.preferred ?? [...PHONE_PREFERRED],
      root: null as HTMLElement | null,
      init(this: PhoneState) {
        this.root = this.$el;
        void loadFlag(this.iso).then((svg) => (this.flag = svg));
        this.$watch("iso", (iso: string) => void loadFlag(iso).then((svg) => (this.flag = svg)));
        // A value that differs from what is shown (reset, loaded from the server) replaces the state.
        this.$watch("value", (value: string) => {
          if (value === formatE164(this.country(), this.national)) return;
          const parsed = parsePhoneLenient(String(value ?? ""), PHONE_COUNTRIES, defaultCountry);
          if (parsed) {
            this.iso = parsed.country.iso;
            this.national = parsed.national;
          } else if (!value) this.national = "";
        });
      },
      country(this: PhoneState): PhoneCountry {
        return PHONE_COUNTRIES.find((c) => c.iso === this.iso) ?? fallback;
      },
      shown(this: PhoneState) {
        return formatNational(this.country(), this.national);
      },
      hint(this: PhoneState) {
        return phoneExample(this.country()) || STRINGS[this.lang].placeholder;
      },
      items(this: PhoneState): Item[] {
        const lang = this.lang;
        const toItem = (c: PhoneCountry): Item => ({ ...c, label: c[lang], search: fold(`${c.en} ${c.ar} ${c.iso} +${c.dial} ${c.dial}`) });
        const head = this.preferred.map((iso) => PHONE_COUNTRIES.find((c) => c.iso === iso)).filter((c): c is PhoneCountry => !!c);
        const rest = PHONE_COUNTRIES.filter((c) => !this.preferred.includes(c.iso)).sort((a, b) => a[lang].localeCompare(b[lang], this.locale));
        return [...head, ...rest].map(toItem);
      },
      matches(this: PhoneState): Item[] {
        const q = fold(this.query.replace(/^\+/, ""));
        const all = this.items();
        return q ? all.filter((i) => i.search.includes(q)) : all;
      },
      emit(this: PhoneState, country: PhoneCountry, national: string) {
        this.iso = country.iso;
        this.national = national;
        this.value = formatE164(country, national);
        this.root?.dispatchEvent(new CustomEvent("phone-change", { bubbles: true, detail: { value: this.value, country } }));
      },
      pick(this: PhoneState, item: PhoneCountry) {
        const country = PHONE_COUNTRIES.find((c) => c.iso === item.iso) ?? item;
        this.emit(country, this.national);
        this.close();
        this.$nextTick(() => (this.root?.querySelector<HTMLInputElement>('[data-slot="input-group-input"]'))?.focus());
      },
      show(this: PhoneState) {
        if (this.open) return;
        this.query = "";
        const at = this.matches().findIndex((c) => c.iso === this.iso);
        this.active = Math.max(0, at);
        this.open = true;
        this.$nextTick(() => {
          const anchor = this.$refs.anchor;
          const popup = this.$refs.popup;
          if (anchor && popup) {
            popup.style.setProperty("--anchor-width", `${anchor.offsetWidth}px`);
            popup.style.setProperty("--available-height", `${Math.max(120, window.innerHeight - anchor.getBoundingClientRect().bottom - 16)}px`);
          }
          (this.$refs.search as HTMLInputElement | undefined)?.focus();
        });
      },
      close(this: PhoneState, refocus = false) {
        if (!this.open) return;
        this.open = false;
        this.query = "";
        if (refocus) (this.$refs.trigger as HTMLElement | undefined)?.focus();
      },
      /** Bind on the country button. */
      trigger: {
        type: "button",
        "aria-haspopup": "listbox",
        ":aria-label"(this: PhoneState) {
          const c = this.country();
          return `${STRINGS[this.lang].country}: ${c[this.lang]} +${c.dial}`;
        },
        ":aria-expanded"(this: PhoneState) {
          return String(this.open);
        },
        ":data-state"(this: PhoneState) {
          return this.open ? "open" : "closed";
        },
        "x-on:click"(this: PhoneState) {
          if (this.open) this.close();
          else this.show();
        },
      },
      /** Bind on the digits field. */
      field: {
        type: "tel",
        inputmode: "tel",
        autocomplete: "tel",
        ":placeholder"(this: PhoneState) {
          return this.hint();
        },
        ":value"(this: PhoneState) {
          return this.shown();
        },
        ":aria-invalid"() {
          return options.invalid ? "true" : null;
        },
        "x-on:input"(this: PhoneState, e: Event) {
          const el = e.target as HTMLInputElement;
          const end = el.selectionStart ?? el.value.length;
          const want = end >= el.value.length ? null : toDigits(el.value.slice(0, end)).length;
          const text = el.value;
          const cur = this.country();
          let handled = false;
          // A pasted or autofilled "+9665…" picks the country from its calling code.
          if (text.trim().startsWith("+")) {
            const parsed = parsePhone(text, PHONE_COUNTRIES);
            if (parsed) {
              this.emit(parsed.country, parsed.national.slice(0, MAX_DIGITS - parsed.country.dial.length));
              handled = true;
            }
          }
          if (!handled) this.emit(cur, toDigits(text).slice(0, MAX_DIGITS - cur.dial.length));
          this.$nextTick(() => {
            const shown = this.shown();
            if (el.value !== shown) el.value = shown;
            if (want === null || document.activeElement !== el) return;
            let pos = 0;
            for (let seen = 0; pos < shown.length && seen < want; pos++) if (/\d/.test(shown[pos]!)) seen++;
            el.setSelectionRange(pos, pos);
          });
        },
      },
      /** Bind on the popup. */
      popup: {
        role: "listbox",
        "x-on:pointerdown.document"(this: PhoneState, event: PointerEvent) {
          if (!this.open) return;
          const target = event.target as Node;
          if (this.$refs.popup?.contains(target) || this.$refs.anchor?.contains(target)) return;
          this.close();
        },
        "x-on:keydown.escape"(this: PhoneState) {
          this.close(true);
        },
      },
      /** Bind on the search field inside the popup. */
      search: {
        role: "combobox",
        "aria-autocomplete": "list",
        autocomplete: "off",
        ":placeholder"(this: PhoneState) {
          return STRINGS[this.lang].search;
        },
        ":aria-label"(this: PhoneState) {
          return STRINGS[this.lang].search;
        },
        "x-model": "query",
        "x-on:input"(this: PhoneState) {
          this.active = 0;
        },
        "x-on:keydown.arrow-down.prevent"(this: PhoneState) {
          const n = this.matches().length;
          if (n) this.active = (this.active + 1) % n;
          this.$nextTick(() => this.$refs.popup?.querySelector('[data-highlighted]')?.scrollIntoView?.({ block: "nearest" }));
        },
        "x-on:keydown.arrow-up.prevent"(this: PhoneState) {
          const n = this.matches().length;
          if (n) this.active = (this.active - 1 + n) % n;
          this.$nextTick(() => this.$refs.popup?.querySelector('[data-highlighted]')?.scrollIntoView?.({ block: "nearest" }));
        },
        "x-on:keydown.enter.prevent"(this: PhoneState) {
          const hit = this.matches()[this.active];
          if (hit) this.pick(hit);
        },
      },
      /** Bind on a country row (inside x-for; `c` is the loop item). */
      item(this: PhoneState, c: Item) {
        const state = this;
        return {
          role: "option",
          ":aria-selected"() {
            return String(c.iso === state.iso);
          },
          ":data-highlighted"() {
            return state.matches()[state.active]?.iso === c.iso ? "" : undefined;
          },
          "x-on:click"() {
            state.pick(c);
          },
          "x-on:pointermove"() {
            const at = state.matches().findIndex((m) => m.iso === c.iso);
            if (at >= 0) state.active = at;
          },
        };
      },
      /** Bind on the empty message: shown when the search leaves nothing. */
      emptyState: {
        "x-show"(this: PhoneState) {
          return this.matches().length === 0;
        },
        "x-cloak": "",
        style: "display: none",
      },
    };
  });
};
