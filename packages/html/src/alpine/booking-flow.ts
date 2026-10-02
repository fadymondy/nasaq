// nqBookingFlow: the online booking flow (branch, service, doctor, time, details, notes, payment, review, confirmation).
// The markup is the React BookingFlow's (see the Blade component); the state lives here.
//
//   <div data-slot="booking-flow" x-data="nqBookingFlow({ locations: [], services: [...], providers: [...], slots: [...] })">…</div>
//
// Times come from, in order: options.getSlots(query) (a function; only when you build the options in JavaScript), options.slotsUrl
// (GET ?location=&service=&provider=, answers [{ start: "YYYY-MM-DDTHH:mm", state }]), or options.slots (a fixed list).
// Submit: options.submitUrl (POST, multipart: "booking" JSON plus "files[]"; answers { code?, error? }), else the bubbling, cancelable
// "booking-submit" event { submission, done(code?), fail(message?) }: call preventDefault() and then done or fail when your request ends;
// without preventDefault the booking is confirmed at once. Other events: "step-change" { step } and "reset".
// State: index, step, locationId, serviceId, providerId ("any" for the first available doctor), day, startKey, details, notes, files,
// payment (online | visit), submitting, submitError, record (set once confirmed).

import { bookingCode, bookingTotals, validateDetails, type DetailsErrors } from "./booking-flow-logic";
import { dayKey, parseDay, type SlotInput } from "./booking-slots-logic";
import type { Magics, Register } from "./types";

type StepId = "location" | "service" | "provider" | "time" | "details" | "notes" | "payment" | "review";
type Slot = { start: string; state: "available" | "full" | "held" | "past" };

export interface BookingFlowOptions {
  locations?: { id: string; name: string; address?: string; city?: string }[];
  services: { id: string; name: string; price: number; durationMinutes: number; category?: string; description?: string }[];
  providers: { id: string; name: string; specialty?: string; serviceIds?: string[]; locationIds?: string[] }[];
  slots?: SlotInput[];
  slotsUrl?: string;
  getSlots?: (query: { locationId: string | null; serviceId: string; providerId: string }) => Promise<SlotInput[]>;
  submitUrl?: string;
  signedIn?: { name: string; phone: string; email?: string };
  taxRate?: number;
  currency?: string;
}

interface Details {
  name: string;
  phone: string;
  email: string;
  forOther: boolean;
  otherName: string;
}

interface FlowRecord {
  code: string;
  status: string;
  service: string;
  provider: string;
  location: string;
  address: string;
  patient: string;
  phone: string;
  price: number;
  payment: string;
  paid: boolean;
  start: string;
  end: string;
}

type Nq = { locale: string; currency: string | null; t(en: string, ar: string): string };

// What `this` is inside the methods: the component's own state, Alpine's magics and a loose index for the sibling methods.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Self = Magics & { $nq: Nq } & Record<string, any>;

const ALL: StepId[] = ["location", "service", "provider", "time", "details", "notes", "payment", "review"];

export const bookingFlow: Register = (Alpine) => {
  Alpine.data("nqBookingFlow", (opts: BookingFlowOptions) => {
    const locations = opts.locations ?? [];
    const emptyDetails = (): Details => ({ name: opts.signedIn?.name ?? "", phone: opts.signedIn?.phone ?? "", email: opts.signedIn?.email ?? "", forOther: false, otherName: "" });
    const initialLocation = () => (locations.length === 1 ? locations[0]!.id : null);
    const pad = (n: number) => String(n).padStart(2, "0");
    const localKey = (d: Date) => `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    let run = 0;

    return {
      index: 0,
      locationId: initialLocation() as string | null,
      serviceId: null as string | null,
      providerId: null as string | null,
      day: null as string | null,
      startKey: null as string | null,
      details: emptyDetails(),
      touched: false,
      notes: "",
      files: [] as { id: string; file: File; status: string }[],
      payment: "visit",
      submitting: false,
      submitError: null as string | null,
      record: null as FlowRecord | null,
      slotStatus: "idle" as "idle" | "loading" | "ready" | "error",
      slots: [] as Slot[],
      host: null as unknown as HTMLElement,

      init(this: Self) {
        this.host = this.$el;
        this.$watch("step", (s: StepId) => {
          this.$nextTick(() => (this.$refs.heading as HTMLElement | undefined)?.focus());
          this.host.dispatchEvent(new CustomEvent("step-change", { bubbles: true, detail: { step: s } }));
          if (s === "time") this.loadSlots();
        });
        this.$watch("locationId", () => {
          this.providerId = null;
          this.startKey = null;
        });
        this.$watch("serviceId", (id: string) => {
          this.startKey = null;
          const p = opts.providers.find((x) => x.id === this.providerId);
          if (p?.serviceIds && !p.serviceIds.includes(id)) this.providerId = null;
        });
        this.$watch("providerId", () => {
          this.startKey = null;
        });
      },

      get stepIds(): StepId[] {
        return ALL.filter((s) => (s === "location" ? locations.length > 1 : true));
      },
      get step(): StepId {
        const self = this as unknown as Self;
        const ids = self.stepIds as StepId[];
        return ids[Math.min(self.index as number, ids.length - 1)]!;
      },
      get pct(): number {
        const self = this as unknown as Self;
        return ((self.index + 1) / self.stepIds.length) * 100;
      },
      isStep(this: Self, id: string) {
        return this.step === id;
      },
      idx(this: Self, id: StepId) {
        return this.stepIds.indexOf(id);
      },
      stepName(this: Self, id: StepId) {
        const t = this.$nq.t.bind(this.$nq);
        return { location: t("Branch", "الفرع"), service: t("Service", "الخدمة"), provider: t("Doctor", "الطبيب"), time: t("Time", "الموعد"), details: t("Details", "البيانات"), notes: t("Notes", "ملاحظات"), payment: t("Payment", "الدفع"), review: t("Review", "المراجعة") }[id];
      },
      stepOf(this: Self) {
        const n = this.index + 1;
        const total = this.stepIds.length;
        const name = this.stepName(this.step);
        return this.$nq.t(`Step ${n} of ${total}: ${name}`, `الخطوة ${n} من ${total}: ${name}`);
      },
      stepStatus(this: Self, i: number) {
        return i < this.index ? "complete" : i === this.index ? "current" : "upcoming";
      },
      heading(this: Self) {
        const t = this.$nq.t.bind(this.$nq);
        return {
          location: t("Where would you like to be seen?", "أين تودّ أن تُعالَج؟"),
          service: t("What do you need?", "ما الذي تحتاجه؟"),
          provider: t("Who would you like to see?", "مع من تريد الحجز؟"),
          time: t("Pick a day and time", "اختر اليوم والوقت"),
          details: t("Who is this booking for?", "لمن هذا الحجز؟"),
          notes: t("Anything the clinic should know?", "هل من شيء تودّ أن تعرفه العيادة؟"),
          payment: t("How would you like to pay?", "كيف تودّ الدفع؟"),
          review: t("Check and confirm", "راجع وأكّد"),
        }[this.step as StepId];
      },

      /* ---- choices */
      get service() {
        const self = this as unknown as Self;
        return opts.services.find((s) => s.id === self.serviceId) ?? null;
      },
      get location() {
        const self = this as unknown as Self;
        return locations.find((l) => l.id === self.locationId) ?? null;
      },
      get provider() {
        const self = this as unknown as Self;
        return self.providerId && self.providerId !== "any" ? (opts.providers.find((p) => p.id === self.providerId) ?? null) : null;
      },
      eligible(this: Self, id: string) {
        const p = opts.providers.find((x) => x.id === id);
        if (!p) return false;
        return (!this.serviceId || !p.serviceIds || p.serviceIds.includes(this.serviceId)) && (!this.locationId || !p.locationIds || p.locationIds.includes(this.locationId));
      },
      eligibleAt(this: Self, i: number) {
        const p = opts.providers[i];
        return !!p && this.eligible(p.id);
      },
      eligibleCount(this: Self) {
        return opts.providers.filter((p) => this.eligible(p.id)).length;
      },
      hasChoice(this: Self) {
        return this.eligibleCount() > 1;
      },
      noProviders(this: Self) {
        return this.eligibleCount() === 0;
      },
      hasProviders(this: Self) {
        return this.eligibleCount() > 0;
      },

      /* ---- money */
      cur(this: Self) {
        return opts.currency ?? this.$nq.currency ?? (this.$nq.locale.startsWith("ar") ? "SAR" : "USD");
      },
      money(this: Self, n: number) {
        return new Intl.NumberFormat(`${this.$nq.locale}-u-nu-latn`, { style: "currency", currency: this.cur(), minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n);
      },
      get totals() {
        const self = this as unknown as Self;
        return bookingTotals(self.service ? self.service.price : null, opts.taxRate ?? 0);
      },
      hasTotal(this: Self) {
        return !(this.totals.total === 0 && this.totals.subtotal === 0);
      },
      subtotalText(this: Self) {
        return this.money(this.totals.subtotal);
      },
      taxText(this: Self) {
        return this.money(this.totals.tax);
      },
      totalLine(this: Self) {
        return this.money(this.totals.total);
      },
      totalText(this: Self) {
        return this.totals.total > 0 ? this.money(this.totals.total) : "-";
      },
      serviceText(this: Self) {
        return this.service ? this.service.name : "";
      },
      locationText(this: Self) {
        return this.location ? this.location.name : "";
      },
      hasService(this: Self) {
        return this.service !== null;
      },
      hasNoService(this: Self) {
        return this.service === null;
      },

      /* ---- slots */
      loadSlots(this: Self) {
        if (!this.serviceId || !this.providerId) return;
        const mine = ++run;
        this.slotStatus = "loading";
        const q = { locationId: this.locationId as string | null, serviceId: this.serviceId as string, providerId: this.providerId as string };
        const source: Promise<SlotInput[]> = opts.getSlots
          ? opts.getSlots(q)
          : opts.slotsUrl
            ? fetch(`${opts.slotsUrl}${opts.slotsUrl.includes("?") ? "&" : "?"}${new URLSearchParams({ location: q.locationId ?? "", service: q.serviceId, provider: q.providerId })}`, { headers: { Accept: "application/json" } }).then((r) => {
                if (!r.ok) throw new Error(String(r.status));
                return r.json();
              })
            : Promise.resolve(opts.slots ?? []);
        source.then(
          (list) => {
            if (mine !== run) return;
            this.slots = list.map((s) => ({ start: typeof s.start === "string" ? s.start : localKey(new Date(s.start)), state: s.state }));
            this.startKey = null;
            this.day = this.days()[0] ?? null;
            this.slotStatus = "ready";
          },
          () => {
            if (mine !== run) return;
            this.slots = [];
            this.slotStatus = "error";
          },
        );
      },
      isLoading(this: Self) {
        return this.slotStatus === "loading";
      },
      isSlotError(this: Self) {
        return this.slotStatus === "error";
      },
      isSlotReady(this: Self) {
        return this.slotStatus === "ready";
      },
      days(this: Self) {
        const open = new Set((this.slots as Slot[]).filter((s) => s.state === "available").map((s) => s.start.slice(0, 10)));
        return [...open].sort();
      },
      hasDays(this: Self) {
        return this.days().length > 0;
      },
      noDays(this: Self) {
        return this.slotStatus === "ready" && this.days().length === 0;
      },
      dayLabel(this: Self, key: string) {
        return new Intl.DateTimeFormat(`${this.$nq.locale}-u-nu-latn`, { weekday: "short", day: "numeric", month: "short" }).format(parseDay(key));
      },
      daySlots(this: Self) {
        return (this.slots as Slot[]).filter((s) => s.state !== "past" && s.start.slice(0, 10) === this.day).sort((a, b) => (a.start < b.start ? -1 : 1));
      },
      timeLabel(this: Self, key: string) {
        return new Intl.DateTimeFormat(`${this.$nq.locale}-u-nu-latn`, { hour: "numeric", minute: "2-digit" }).format(new Date(key));
      },
      slotLabel(this: Self, s: Slot) {
        const state = s.state === "full" ? this.$nq.t("Full", "محجوز") : s.state === "held" ? this.$nq.t("Held", "محجوز مؤقتًا") : this.$nq.t("Available", "متاح");
        return this.timeLabel(s.start) + (this.$nq.locale.startsWith("ar") ? "، " : ", ") + state;
      },
      pickDay(this: Self, key: string) {
        this.day = key;
        this.startKey = null;
      },
      pickSlot(this: Self, s: Slot) {
        if (s.state === "available") this.startKey = s.start;
      },
      dateLine(this: Self) {
        if (!this.startKey) return "";
        const d = new Date(this.startKey);
        const loc = `${this.$nq.locale}-u-nu-latn`;
        const sep = this.$nq.locale.startsWith("ar") ? "، " : ", ";
        return new Intl.DateTimeFormat(loc, { weekday: "short", day: "numeric", month: "short" }).format(d) + sep + new Intl.DateTimeFormat(loc, { hour: "numeric", minute: "2-digit" }).format(d);
      },
      dashText(this: Self, text: string) {
        return text || "-";
      },

      /* ---- details */
      get errors(): DetailsErrors {
        return validateDetails((this as unknown as Self).details);
      },
      get showErr() {
        const self = this as unknown as Self;
        return { name: self.touched && !!self.errors.name, phone: self.touched && !!self.errors.phone, email: self.touched && !!self.errors.email, otherName: self.touched && !!self.errors.otherName };
      },
      errText(this: Self, key: keyof DetailsErrors) {
        const code = this.errors[key];
        return code === "required" ? this.$nq.t("This field is required.", "هذا الحقل مطلوب.") : code === "invalid" ? this.$nq.t("This does not look right.", "القيمة غير صحيحة.") : "";
      },
      bookingAs(this: Self) {
        const name = opts.signedIn?.name ?? "";
        return this.$nq.t(`Booking as ${name}`, `الحجز باسم ${name}`);
      },
      patientName(this: Self) {
        return this.details.forOther ? this.details.otherName : this.details.name;
      },
      onFiles(event: CustomEvent<{ added: { id: string }[]; controls: { update(id: string, patch: object): void } }>) {
        event.detail.added.forEach((f) => event.detail.controls.update(f.id, { status: "done", progress: 100 }));
      },
      attachedText(this: Self) {
        const n = (this.files as unknown[]).length;
        if (this.$nq.locale.startsWith("ar")) return n === 1 ? "ملف واحد مرفق" : n === 2 ? "ملفان مرفقان" : `${n} ملفات مرفقة`;
        return `${n} ${n === 1 ? "file" : "files"} attached`;
      },
      hasNotesOrFiles(this: Self) {
        return !!this.notes || this.files.length > 0;
      },
      hasNotes(this: Self) {
        return !!this.notes;
      },
      hasFiles(this: Self) {
        return this.files.length > 0;
      },
      minutesText(this: Self, n: number) {
        return this.$nq.t(`${n} min`, `${n} دقيقة`);
      },
      paymentText(this: Self) {
        return this.payment === "online" ? this.$nq.t("Pay online", "الدفع إلكترونيًا") : this.$nq.t("Pay at the visit", "الدفع عند الزيارة");
      },
      providerText(this: Self) {
        return this.providerId === "any" ? this.$nq.t("First available doctor", "أول طبيب متاح") : (this.provider?.name ?? "");
      },

      /* ---- navigation */
      get valid(): Record<StepId, boolean> {
        const self = this as unknown as Self;
        return {
          location: self.locationId !== null,
          service: self.serviceId !== null,
          provider: self.providerId !== null && (self.providerId === "any" || self.eligible(self.providerId)),
          time: self.startKey !== null,
          details: Object.keys(self.errors).length === 0,
          notes: !(self.files as { status: string }[]).some((f) => f.status === "error" || f.status === "uploading"),
          payment: true,
          review: true,
        };
      },
      cannotNext(this: Self) {
        return !(this.valid[this.step as StepId] || this.step === "details");
      },
      isFirst(this: Self) {
        return this.index === 0;
      },
      go(this: Self, to: number) {
        this.index = Math.max(0, Math.min(this.stepIds.length - 1, to));
        this.submitError = null;
      },
      back(this: Self) {
        this.go(this.index - 1);
      },
      next(this: Self) {
        if (this.step === "details" && !this.valid.details) {
          this.touched = true;
          return;
        }
        if (this.valid[this.step as StepId]) this.go(this.index + 1);
      },

      /* ---- submit */
      async submit(this: Self) {
        const svc = this.service as { id: string; name: string; durationMinutes: number } | null;
        if (!svc || !this.providerId || !this.startKey) return;
        const startKey = this.startKey as string;
        const when = new Date(startKey);
        const files = (this.files as { file: File }[]).map((f) => f.file);
        const submission = { locationId: this.locationId, serviceId: svc.id, providerId: this.providerId, start: startKey, details: { ...this.details }, notes: this.notes, files, payment: this.payment, total: this.totals.total };
        this.submitting = true;
        this.submitError = null;
        const failed = this.$nq.t("We could not confirm the booking. Try again.", "تعذّر تأكيد الحجز. حاول مجددًا.");
        try {
          let result: { code?: string; error?: string } | void;
          if (opts.submitUrl) {
            const body = new FormData();
            body.append("booking", JSON.stringify({ ...submission, files: undefined }));
            files.forEach((f) => body.append("files[]", f));
            const res = await fetch(opts.submitUrl, { method: "POST", body, headers: { Accept: "application/json" } });
            if (!res.ok) throw new Error(String(res.status));
            result = await res.json().catch(() => ({}));
          } else {
            result = await new Promise<{ code?: string; error?: string }>((resolve) => {
              const event = new CustomEvent("booking-submit", {
                bubbles: true,
                cancelable: true,
                detail: { submission, done: (code?: string) => resolve({ code }), fail: (message?: string) => resolve({ error: message || failed }) },
              });
              this.host.dispatchEvent(event);
              if (!event.defaultPrevented) resolve({});
            });
          }
          if (result && result.error) {
            this.submitError = result.error;
            return;
          }
          const code = (result && result.code) || bookingCode(`${svc.id}-${when.getTime()}-${this.details.phone}`);
          const online = this.payment === "online";
          this.record = {
            code,
            status: online ? "confirmed" : "requested",
            service: svc.name,
            provider: this.providerText(),
            location: this.location?.name ?? "",
            address: this.location?.address ?? "",
            patient: this.patientName(),
            phone: this.details.phone,
            price: this.totals.total,
            payment: this.payment,
            paid: online,
            start: startKey,
            end: localKey(new Date(when.getTime() + svc.durationMinutes * 60000)),
          };
          this.$nextTick(() => (this.$refs.confirm as HTMLElement | undefined)?.focus());
        } catch {
          this.submitError = failed;
        } finally {
          this.submitting = false;
        }
      },
      isConfirmed(this: Self) {
        return this.record !== null;
      },
      isOpen(this: Self) {
        return this.record === null;
      },
      hasError(this: Self) {
        return !!this.submitError;
      },
      get ticketValue(): string {
        const r = (this as unknown as Self).record as FlowRecord | null;
        return r ? `booking:${r.code}` : "";
      },
      statusText(this: Self) {
        return this.record?.status === "confirmed" ? this.$nq.t("Confirmed", "مؤكد") : this.$nq.t("Requested", "قيد الطلب");
      },
      payLine(this: Self) {
        const r = this.record as FlowRecord | null;
        if (!r) return "";
        const label = r.payment === "visit" ? this.$nq.t("Pay at the visit", "الدفع عند الزيارة") : r.paid ? this.$nq.t("Paid online", "تم الدفع إلكترونيًا") : this.$nq.t("To pay online", "الدفع إلكترونيًا");
        return r.price > 0 ? `${label} · ${this.money(r.price)}` : label;
      },
      recordWhen(this: Self) {
        const r = this.record as FlowRecord | null;
        if (!r) return "";
        const loc = `${this.$nq.locale}-u-nu-latn`;
        const day = new Intl.DateTimeFormat(loc, { weekday: "short", day: "numeric", month: "short" }).format(new Date(r.start));
        const time = new Intl.DateTimeFormat(loc, { hour: "numeric", minute: "2-digit" });
        return `${day}, ${time.format(new Date(r.start))} – ${time.format(new Date(r.end))}`;
      },
      reset(this: Self) {
        this.index = 0;
        this.locationId = initialLocation();
        this.serviceId = null;
        this.providerId = null;
        this.startKey = null;
        this.day = null;
        this.details = emptyDetails();
        this.touched = false;
        this.notes = "";
        this.files = [];
        this.payment = "visit";
        this.record = null;
        this.submitError = null;
        this.host.dispatchEvent(new CustomEvent("reset", { bubbles: true }));
      },
    };
  });
};
