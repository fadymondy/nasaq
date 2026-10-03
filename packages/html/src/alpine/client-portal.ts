// nqClientPortal: the state of the customer portal. The markup is the React ClientPortal's (see the Blade component); the tabs, the board,
// the weekly table and the invoice list are their own components. What lives here: the current tab, the request form and the menu actions.
//
//   <div data-slot="client-portal" x-data="nqClientPortal({ tab: 'overview', strings: { titleRequired: '…' } })">…</div>
//
// Events (bubbling, on the root): "portal-request" { title, description, waitUntil(promise), fail(message) },
// "portal-action" { kind, action, id }, "portal-tab-change" { tab }.
// A request is sent at once; call `waitUntil(promise)` to keep the form busy until it settles (a rejection keeps the text and shows its message),
// or `fail(message)` to reject it by hand.

import type { Magics, Register } from "./types";

export interface ClientPortalOptions {
  tab?: string;
  strings?: { titleRequired?: string };
}

interface PortalState extends Magics {
  portalTab: string;
  reqTitle: string;
  reqDescription: string;
  error: string | null;
  formInvalid: boolean;
  busy: boolean;
  sent: boolean;
  strings: { titleRequired?: string };
}

export const clientPortal: Register = (Alpine) => {
  Alpine.data("nqClientPortal", (options: ClientPortalOptions = {}) => ({
    portalTab: options.tab ?? "overview",
    reqTitle: "",
    reqDescription: "",
    error: null as string | null,
    formInvalid: false,
    busy: false,
    sent: false,
    strings: options.strings ?? {},
    init(this: PortalState) {
      this.$watch("portalTab", (tab: string) => this.$dispatch("portal-tab-change", { tab }));
    },
    act(this: PortalState, kind: string, action: string, id: string) {
      this.$dispatch("portal-action", { kind, action, id });
    },
    async submit(this: PortalState) {
      this.sent = false;
      const title = this.reqTitle.trim();
      if (title === "") {
        this.error = this.strings.titleRequired ?? "";
        this.formInvalid = true;
        return;
      }
      this.error = null;
      this.formInvalid = false;
      this.busy = true;
      let failure: string | null = null;
      const pending: Promise<unknown>[] = [];
      const detail = {
        title,
        description: this.reqDescription.trim(),
        waitUntil: (p: Promise<unknown>) => void pending.push(p),
        fail: (message?: string) => {
          failure = message || this.strings.titleRequired || "";
        },
      };
      try {
        this.$dispatch("portal-request", detail);
        await Promise.all(pending);
      } catch (err) {
        failure = err instanceof Error && err.message ? err.message : this.strings.titleRequired || "";
      }
      this.busy = false;
      if (failure !== null) {
        this.error = failure;
        this.formInvalid = true;
        return;
      }
      this.reqTitle = "";
      this.reqDescription = "";
      this.sent = true;
    },
  }));
};
