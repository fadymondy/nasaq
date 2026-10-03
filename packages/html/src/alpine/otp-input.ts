// nqOtpInput: one-time-code entry. The markup is the React OtpInput's, the state lives here.
//
//   <div role="group" dir="ltr" x-data="nqOtpInput('', 6, 'numeric')" @complete="verify($event.detail)">
//     <input x-bind="box(0)" class="size-control …"> … <input x-bind="box(5)" class="…">
//     <input type="hidden" name="code" :value="value">
//   </div>
//
// Paste fills every box, Backspace on an empty box steps back, arrows/Home/End move focus, and focus never lands
// past the first empty box. value is x-modelable (x-model="$wire.code"); a "complete" event carries the full code.

import type { Magics, Register } from "./types";

type Kind = "numeric" | "alphanumeric";

interface OtpState extends Magics {
  value: string;
  length: number;
  type: Kind;
  clean(text: string): string;
  boxes(): HTMLInputElement[];
  focusBox(i: number): void;
  commit(next: string): void;
  fill(start: number, text: string): void;
}

export const otpInput: Register = (Alpine) => {
  Alpine.data("nqOtpInput", (initial = "", length = 6, type: Kind = "numeric") => ({
    value: String(initial ?? ""),
    length,
    type,
    init(this: OtpState) {
      this.value = this.clean(this.value).slice(0, this.length);
    },
    clean(this: OtpState, text: string) {
      const allowed = this.type === "numeric" ? /[0-9]/ : /[a-zA-Z0-9]/;
      return [...text].filter((c) => allowed.test(c)).join("");
    },
    boxes(this: OtpState) {
      return [...this.$root.querySelectorAll<HTMLInputElement>('[data-slot="otp-input-box"]')];
    },
    focusBox(this: OtpState, i: number) {
      const el = this.boxes()[Math.max(0, Math.min(this.length - 1, i))];
      el?.focus();
      el?.select();
    },
    commit(this: OtpState, next: string) {
      this.value = next;
      if (next.length === this.length) this.$dispatch("complete", next);
    },
    /** Write `text` from box `start`; the code is kept dense (no holes). */
    fill(this: OtpState, start: number, text: string) {
      const chars = this.value.split("");
      const room = text.slice(0, this.length - start);
      for (let k = 0; k < room.length; k++) chars[start + k] = room[k] as string;
      this.commit(chars.join(""));
      this.$nextTick(() => this.focusBox(Math.min(start + room.length, this.length - 1)));
    },
    /** Bind on box i (0-based). */
    box(this: OtpState, i: number) {
      return {
        ":value"(this: OtpState) {
          return this.value[i] ?? "";
        },
        ":data-filled"(this: OtpState) {
          return this.value[i] ? "" : undefined;
        },
        ":maxlength"(this: OtpState) {
          return i === 0 || !this.value[i] ? this.length : 1;
        },
        "x-on:input"(this: OtpState, e: Event) {
          const el = e.target as HTMLInputElement;
          const raw = el.value;
          const text = this.clean(raw);
          if (!text) {
            // The typed character was rejected, or the box was emptied.
            const chars = this.value.split("");
            if (raw === "" && i < chars.length) {
              chars.splice(i, 1);
              this.commit(chars.join(""));
            } else el.value = this.value[i] ?? "";
            return;
          }
          this.fill(Math.min(i, this.value.length), text);
        },
        "x-on:keydown"(this: OtpState, e: KeyboardEvent) {
          if (e.key === "Backspace" && !this.value[i]) {
            e.preventDefault();
            if (i > 0) {
              this.commit(this.value.slice(0, i - 1) + this.value.slice(i));
              this.$nextTick(() => this.focusBox(i - 1));
            }
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            this.focusBox(i - 1);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            this.focusBox(i + 1);
          } else if (e.key === "Home") {
            e.preventDefault();
            this.focusBox(0);
          } else if (e.key === "End") {
            e.preventDefault();
            this.focusBox(this.length - 1);
          }
        },
        "x-on:paste"(this: OtpState, e: ClipboardEvent) {
          e.preventDefault();
          const text = this.clean(e.clipboardData?.getData("text") ?? "");
          if (!text) return;
          if (text.length >= this.length) {
            this.commit(text.slice(0, this.length));
            this.$nextTick(() => this.focusBox(this.length - 1));
          } else this.fill(Math.min(i, this.value.length), text);
        },
        "x-on:focus"(this: OtpState, e: FocusEvent) {
          // Never leave a gap: land on the first empty box.
          if (i > this.value.length) this.focusBox(this.value.length);
          else (e.currentTarget as HTMLInputElement).select();
        },
      };
    },
  }));
};
