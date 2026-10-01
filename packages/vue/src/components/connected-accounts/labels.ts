import type { Component } from "vue";

export const CONNECTED_STRINGS = {
  en: {
    title: "Connected accounts",
    description: "Sign in with these accounts instead of a password.",
    list: "Sign-in providers",
    connect: "Connect",
    disconnect: "Disconnect",
    connected: "Connected",
    notConnected: "Not connected",
    lastMethod: "This is your only way to sign in. Add a password, a passkey or another account first.",
    disconnectTitle: (name: string) => `Disconnect ${name}?`,
    disconnectBody: "You will no longer be able to sign in with this account. You can connect it again later.",
    disconnectConfirm: "Disconnect",
    connectFailed: "Could not connect the account. Try again.",
    disconnectFailed: "Could not disconnect the account. Try again.",
  },
  ar: {
    title: "الحسابات المرتبطة",
    description: "سجّل الدخول بهذه الحسابات بدلًا من كلمة المرور.",
    list: "مزوّدو تسجيل الدخول",
    connect: "ربط",
    disconnect: "فك الارتباط",
    connected: "مرتبط",
    notConnected: "غير مرتبط",
    lastMethod: "هذه هي طريقتك الوحيدة لتسجيل الدخول. أضف كلمة مرور أو مفتاح مرور أو حسابًا آخر أولًا.",
    disconnectTitle: (name: string) => `فك ارتباط ${name}؟`,
    disconnectBody: "لن تتمكن بعد ذلك من تسجيل الدخول بهذا الحساب. يمكنك ربطه مرة أخرى لاحقًا.",
    disconnectConfirm: "فك الارتباط",
    connectFailed: "تعذر ربط الحساب. حاول مرة أخرى.",
    disconnectFailed: "تعذر فك ارتباط الحساب. حاول مرة أخرى.",
  },
};

export type ConnectedAccountsLabels = (typeof CONNECTED_STRINGS)["en"];

export const PROVIDER_NAMES = { google: "Google", github: "GitHub", apple: "Apple", microsoft: "Microsoft" } as const;

export type ConnectedProviderId = keyof typeof PROVIDER_NAMES;

export interface ConnectedProvider {
  /** "google", "github", "apple" or "microsoft" use the official logo and name. Any other id is a custom provider: pass `name` and `icon`. */
  id: ConnectedProviderId | (string & {});
  /** Display name for a custom provider. */
  name?: string;
  /** The provider's official logo for a custom provider, as a component (a Vue component or functional component). Never a generic substitute. */
  icon?: Component;
  /** The email or username at the provider. Shown left-to-right when connected. */
  account?: string;
  connected: boolean;
}
