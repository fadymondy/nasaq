import type { Component } from "vue";

export type OAuthProviderId = "google" | "github" | "apple" | "microsoft";

/** Your own provider. `label` is the complete button text ("Continue with Okta"); `icon` is a component rendered as is. */
export interface OAuthCustomProvider {
  id: string;
  label: string;
  icon: Component;
}

export type OAuthProvider = OAuthProviderId | OAuthCustomProvider;
export type OAuthIntent = "signin" | "signup" | "continue";

export interface OAuthButtonsLabels {
  /** Use `{provider}` where the provider name goes. Default "Sign in with {provider}". */
  signin: string;
  signup: string;
  continue: string;
  /** Accessible name of the group. Default "Sign in with a provider". */
  group: string;
  divider: string;
  /** Badge on the provider passed as `lastUsed`. Default "Last used". */
  lastUsed: string;
}
