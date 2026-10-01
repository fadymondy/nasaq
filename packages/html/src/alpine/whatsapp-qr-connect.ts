// nqWhatsappConnect: the pairing session of a WhatsApp QR connect card. The markup is the React WhatsappQrConnect's,
// rendered by <x-nq::whatsapp-qr-connect>.
//
//   <div data-slot="whatsapp-qr-connect" x-data="nqWhatsappConnect({ status: 'qr', qr: '…', expiresAt: 1760000000000 })"
//        x-bind:data-status="status" x-on:nq-whatsapp-update="update($event.detail)"> … </div>
//
// Your server owns the pairing session. Feed the card by dispatching "nq-whatsapp-update" on it with any of
// { status, qr, expiresAt, account, connectedSince, error }. The card dispatches bubbling events, each with { wait(promise) }:
//   nq-whatsapp-start       "Show QR code": ask the server to begin pairing, then send a first qr.
//   nq-whatsapp-refresh     "New code", and automatically once when the code expires (unless auto-refresh is off).
//   nq-whatsapp-disconnect  after the confirmation dialog.
// The button stays busy until the promises given to wait() settle. The countdown ticks once a second to expiresAt (ms since epoch).

import type { Magics, Register } from "./types";

type Kind = "start" | "refresh" | "disconnect";

interface Config {
  status?: "disconnected" | "qr" | "connected";
  qr?: string;
  expiresAt?: number | null;
  account?: string;
  connectedSince?: string;
  error?: boolean;
  autoRefresh?: boolean;
  expiresIn?: string;
  expired?: string;
}

interface WhatsappState extends Magics {
  status: "disconnected" | "qr" | "connected";
  qr: string;
  expiresAt: number | null;
  account: string;
  connectedSince: string;
  error: boolean;
  autoRefresh: boolean;
  busy: Kind | null;
  left: number | null;
  timer: ReturnType<typeof setInterval> | null;
  strings: { expiresIn: string; expired: string };
  readonly showQr: boolean;
  readonly expired: boolean;
  readonly countdownText: string;
  update(detail: Partial<Config>): void;
  schedule(): void;
  run(kind: Kind): Promise<void>;
}

export const whatsappQrConnect: Register = (Alpine) => {
  Alpine.data("nqWhatsappConnect", (cfg: Config = {}) => ({
    status: cfg.status ?? "disconnected",
    qr: cfg.qr ?? "",
    expiresAt: cfg.expiresAt ?? null,
    account: cfg.account ?? "",
    connectedSince: cfg.connectedSince ?? "",
    error: !!cfg.error,
    autoRefresh: cfg.autoRefresh !== false,
    busy: null as Kind | null,
    left: null as number | null,
    timer: null as ReturnType<typeof setInterval> | null,
    strings: { expiresIn: cfg.expiresIn ?? "Code expires in {s}s", expired: cfg.expired ?? "This code expired" },
    get showQr() {
      const self = this as unknown as WhatsappState;
      return self.status === "qr" && !!self.qr;
    },
    get expired() {
      const self = this as unknown as WhatsappState;
      return self.left === 0;
    },
    get countdownText() {
      const self = this as unknown as WhatsappState;
      return self.left === 0 ? self.strings.expired : self.strings.expiresIn.replace("{s}", String(self.left ?? ""));
    },
    init(this: WhatsappState) {
      this.$watch("showQr", () => this.schedule());
      this.$watch("expiresAt", () => this.schedule());
      this.$watch("qr", () => this.schedule());
      this.schedule();
    },
    destroy(this: WhatsappState) {
      if (this.timer) clearInterval(this.timer);
    },
    update(this: WhatsappState, detail: Partial<Config>) {
      if (!detail) return;
      if (detail.status !== undefined) this.status = detail.status;
      if (detail.qr !== undefined) this.qr = detail.qr;
      if (detail.expiresAt !== undefined) this.expiresAt = detail.expiresAt;
      if (detail.account !== undefined) this.account = detail.account;
      if (detail.connectedSince !== undefined) this.connectedSince = detail.connectedSince;
      if (detail.error !== undefined) this.error = !!detail.error;
    },
    /** Countdown, one tick a second. On zero, ask for a new code once per code. */
    schedule(this: WhatsappState) {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      if (!this.showQr || this.expiresAt == null) {
        this.left = null;
        return;
      }
      const expiresAt = this.expiresAt;
      let fired = false;
      const tick = () => {
        const s = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
        this.left = s;
        if (s === 0 && !fired) {
          fired = true;
          if (this.autoRefresh) void this.run("refresh");
        }
      };
      tick();
      this.timer = setInterval(tick, 1000);
    },
    async run(this: WhatsappState, kind: Kind) {
      if (this.busy) return;
      const waits: Promise<unknown>[] = [];
      this.busy = kind;
      this.$dispatch(`nq-whatsapp-${kind}`, { wait: (p: Promise<unknown>) => void waits.push(p) });
      try {
        await Promise.all(waits);
      } finally {
        this.busy = null;
      }
    },
  }));
};
