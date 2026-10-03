// nqIntegrationConnector: cards for the outside services a workspace connects to. The markup is the React IntegrationConnector's,
// the card list is server-rendered, the state lives here.
//
//   <div data-slot="integration-connector" x-data="nqIntegrationConnector({ services, status, account, strings })"
//        @nq-connect="$event.detail.wait(startOAuth($event.detail.id, $event.detail.scopeIds))"> … </div>
//
// It is presentational: the host does the work. Each action fires a bubbling event on the root with detail `{ …, wait(promise) }`:
//   nq-connect         { id, scopeIds, wait }      start OAuth for the ticked scopes
//   nq-disconnect      { id, wait }                revoke
//   nq-select-account  { id, accountId, wait }     the account or property picked on a connected card
// Pass a promise to wait() to show the pending state; resolve `{ error }` (or reject) to show a message, otherwise the card flips to
// its new state. Nobody calling wait() means nobody is handling it, and nothing changes.

import type { Magics, Register } from "./types";

interface ScopeConfig {
  id: string;
  label: string;
  required: boolean;
}

interface ServiceConfig {
  name: string;
  scopes: ScopeConfig[];
  granted: string[];
}

interface Strings {
  dialogTitle: string;
  dialogBody: string;
  continue: string;
  noPermissions: string;
  genericError: string;
  permissionsOne: string;
  permissionsMany: string;
}

interface Init {
  services?: Record<string, ServiceConfig>;
  status?: Record<string, string>;
  account?: Record<string, string | null>;
  strings?: Partial<Strings>;
}

type Result = { error?: string } | void | undefined;

interface ConnectorState extends Magics {
  services: Record<string, ServiceConfig>;
  status: Record<string, string>;
  account: Record<string, string | null>;
  lastAccount: Record<string, string | null>;
  synced: Record<string, boolean>;
  strings: Strings;
  root: HTMLElement;
  busy: string | null;
  error: string | null;
  hasError: boolean;
  dialogOpen: boolean;
  dialogId: string | null;
  dialogBusy: boolean;
  dialogError: string | null;
  picked: boolean[];
  scopes: ScopeConfig[];
  dialogTitle: string;
  dialogBody: string;
  continueLabel: string;
  ask(event: string, detail: Record<string, unknown>): Promise<Result> | null;
  setError(message: string | null): void;
}

export const integrationConnector: Register = (Alpine) => {
  Alpine.data("nqIntegrationConnector", (init: Init = {}) => ({
    services: { ...(init.services ?? {}) } as Record<string, ServiceConfig>,
    status: { ...(init.status ?? {}) } as Record<string, string>,
    account: { ...(init.account ?? {}) } as Record<string, string | null>,
    lastAccount: { ...(init.account ?? {}) } as Record<string, string | null>,
    synced: {} as Record<string, boolean>,
    strings: {
      dialogTitle: "Connect {name}",
      dialogBody: "You will go to {name} to sign in and approve access. Nasaq never sees your password.",
      continue: "Continue to {name}",
      noPermissions: "Pick at least one permission.",
      genericError: "Something went wrong. Try again.",
      permissionsOne: "1 permission",
      permissionsMany: "{n} permissions",
      ...(init.strings ?? {}),
    } as Strings,
    root: null as unknown as HTMLElement,
    busy: null as string | null,
    error: null as string | null,
    hasError: false,
    dialogOpen: false,
    dialogId: null as string | null,
    dialogBusy: false,
    dialogError: null as string | null,
    picked: [] as boolean[],
    init(this: ConnectorState) {
      this.root = this.$el;
      // The account select reports through x-model: find which card changed and tell the host.
      this.$watch("account", (now: Record<string, string | null>) => {
        for (const id of Object.keys(now)) {
          if (now[id] !== this.lastAccount[id] && now[id] != null) void (this as unknown as { pickAccount(id: string, v: string): Promise<void> }).pickAccount(id, now[id] as string);
        }
      });
      // The dialog closes through x-model (Escape, backdrop): drop its error when it is gone.
      this.$watch("dialogOpen", (open: boolean) => {
        if (!open && !this.dialogBusy) this.dialogError = null;
      });
      // A dismissed error alert clears the message.
      this.$watch("hasError", (shown: boolean) => {
        if (!shown) this.error = null;
      });
    },
    get scopes(): ScopeConfig[] {
      const s = this as unknown as ConnectorState;
      return (s.dialogId && s.services[s.dialogId]?.scopes) || [];
    },
    get dialogTitle(): string {
      const s = this as unknown as ConnectorState;
      return s.dialogId ? s.strings.dialogTitle.replace("{name}", s.services[s.dialogId]!.name) : "";
    },
    get dialogBody(): string {
      const s = this as unknown as ConnectorState;
      return s.dialogId ? s.strings.dialogBody.replace(/\{name\}/g, s.services[s.dialogId]!.name) : "";
    },
    get continueLabel(): string {
      const s = this as unknown as ConnectorState;
      return s.dialogId ? s.strings.continue.replace("{name}", s.services[s.dialogId]!.name) : "";
    },
    isConnected(this: ConnectorState, id: string): boolean {
      return this.status[id] === "connected" || this.status[id] === "needs-reauth" || this.status[id] === "error";
    },
    permissionsLabel(this: ConnectorState, id: string): string {
      const n = (this.services[id]?.granted ?? []).length;
      return n === 1 ? this.strings.permissionsOne : this.strings.permissionsMany.replace("{n}", String(n));
    },
    ask(this: ConnectorState, event: string, detail: Record<string, unknown>) {
      let waiting: Promise<Result> | null = null;
      this.root.dispatchEvent(
        new CustomEvent(event, {
          bubbles: true,
          detail: {
            ...detail,
            wait: (promise: Promise<Result> | void) => {
              if (promise && typeof (promise as Promise<unknown>).then === "function") waiting = promise as Promise<Result>;
            },
          },
        }),
      );
      return waiting;
    },
    setError(this: ConnectorState, message: string | null) {
      this.error = message;
      this.hasError = message !== null;
    },
    /** Open the consent dialog: required scopes and the ones already granted are ticked. */
    openDialog(this: ConnectorState, id: string) {
      const service = this.services[id];
      if (!service || this.busy) return;
      const granted = this.status[id] === "connected" ? service.granted : null;
      this.dialogId = id;
      this.dialogError = null;
      this.picked = service.scopes.map((s) => s.required || !granted || granted.includes(s.id));
      this.dialogOpen = true;
    },
    closeDialog(this: ConnectorState) {
      if (!this.dialogBusy) this.dialogOpen = false;
    },
    async submit(this: ConnectorState) {
      const id = this.dialogId;
      if (!id || this.dialogBusy) return;
      const scopeIds = this.scopes.filter((_, i) => this.picked[i]).map((s) => s.id);
      if (scopeIds.length === 0) {
        this.dialogError = this.strings.noPermissions;
        return;
      }
      const waiting = this.ask("nq-connect", { id, scopeIds });
      if (!waiting) return;
      this.dialogBusy = true;
      this.dialogError = null;
      try {
        const result = await waiting;
        if (result && result.error) this.dialogError = result.error;
        else {
          this.status[id] = "connected";
          this.services[id]!.granted = scopeIds;
          this.synced[id] = true;
          this.dialogOpen = false;
        }
      } catch {
        this.dialogError = this.strings.genericError;
      } finally {
        this.dialogBusy = false;
      }
    },
    async disconnect(this: ConnectorState, id: string) {
      if (this.busy) return;
      const waiting = this.ask("nq-disconnect", { id });
      if (!waiting) return;
      this.busy = id;
      this.setError(null);
      try {
        const result = await waiting;
        if (result && result.error) this.setError(result.error);
        else {
          this.status[id] = "disconnected";
          this.synced[id] = false;
        }
      } catch {
        this.setError(this.strings.genericError);
      } finally {
        this.busy = null;
      }
    },
    async pickAccount(this: ConnectorState, id: string, accountId: string) {
      const previous = this.lastAccount[id] ?? null;
      this.lastAccount[id] = accountId;
      const waiting = this.ask("nq-select-account", { id, accountId });
      if (!waiting) return;
      try {
        const result = await waiting;
        if (result && result.error) {
          this.setError(result.error);
          this.lastAccount[id] = previous;
          this.account[id] = previous;
        }
      } catch {
        this.setError(this.strings.genericError);
        this.lastAccount[id] = previous;
        this.account[id] = previous;
      }
    },
  }));
};
