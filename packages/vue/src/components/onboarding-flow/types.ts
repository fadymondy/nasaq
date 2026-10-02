import type { Component } from "vue";
import type { AuthSubmitResult } from "../auth-layout/auth-utils";
import type { OnboardingProgress } from "./onboarding-model";

export type { OnboardingFlowLabels } from "./strings";

export interface OnboardingProfileValues {
  name: string;
  role: string;
  /** Hosted URL of the photo, once uploaded. */
  avatar?: string;
}

export interface OnboardingWorkspaceValues {
  mode: "create" | "join";
  name: string;
  code: string;
}

export interface OnboardingInviteValues {
  emails: string[];
  role: string;
}

export interface OnboardingPreferenceValues {
  locale: string;
  theme: "light" | "dark" | "system";
  notifications: { email: boolean; push: boolean; digest: boolean };
}

export interface OnboardingValues {
  profile: OnboardingProfileValues;
  workspace: OnboardingWorkspaceValues;
  invite: OnboardingInviteValues;
  preferences: OnboardingPreferenceValues;
  /** Ids of the integrations already connected. */
  connected: string[];
}

export type OnboardingProgressState = OnboardingProgress<OnboardingValues>;

export interface OnboardingIntegration {
  id: string;
  name: string;
  description?: string;
  /** Your provider mark (a component), rendered as is. Use the brand's own logo. */
  icon?: Component;
}

export interface OnboardingOption {
  value: string;
  label: string;
}

export type OnboardingStepResult = AuthSubmitResult | Promise<AuthSubmitResult>;
