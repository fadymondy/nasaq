// nqInviteAccept: the actions behind an invitation link (accept, decline, ask for a new invitation, switch account). The state
// (valid, expired, wrong-account, already-accepted, revoked) is rendered by the server; this adds the busy and error handling. The
// markup is the React InviteAccept's (see the Blade invite-accept component); the shared plumbing is login-form-logic.ts.
//
//   <div data-slot="invite-accept" x-data="nqInviteAccept()" x-on:nq-invite-accept="$event.detail.waitUntil(join())">
//
// Events (bubble from the root, each with detail.waitUntil(promise)): nq-invite-accept, nq-invite-decline, nq-invite-request-new,
// nq-invite-switch-account. Resolve nothing for success, or { error } to show a failure. emit(name) fires the plain navigation
// events (nq-invite-sign-in, nq-invite-sign-up, nq-invite-open-workspace, nq-invite-go-home).

import { authBase, authLang, failure, type AuthConfig, type AuthState } from "./login-form-logic";
import type { Register } from "./types";

const FAILED = { en: "Something went wrong. Try again.", ar: "حدث خطأ ما. حاول مرة أخرى." };

type Kind = "accept" | "decline" | "request" | "switch";
interface InviteState extends AuthState {
  doing: "" | Kind;
  requested: boolean;
}

export const inviteAccept: Register = (Alpine) => {
  Alpine.data("nqInviteAccept", (config: AuthConfig = {}) => {
    const failed = config.failed ?? FAILED[authLang()];
    return {
      ...authBase({ failed, ...config }),
      doing: "" as "" | Kind,
      requested: false,
      init(this: InviteState) {
        this.authInit(this.$el);
      },
      destroy(this: InviteState) {
        this.authDestroy();
      },
      offAccept(this: InviteState) {
        return this.doing !== "" && this.doing !== "accept";
      },
      offDecline(this: InviteState) {
        return this.doing !== "";
      },
      emit(this: InviteState, event: string) {
        this.dispatch(event, {});
      },
      async run(this: InviteState, kind: Kind, event: string, onOk?: () => void) {
        if (this.doing) return;
        this.doing = kind;
        this.error = "";
        try {
          const { waits } = this.dispatch(event, {});
          const results = await Promise.all(waits);
          const bad = results.map(failure).find((r) => r?.error);
          if (bad) this.error = bad.error as string;
          else onOk?.();
        } catch {
          this.error = failed;
        } finally {
          this.doing = "";
        }
      },
    };
  });
};
