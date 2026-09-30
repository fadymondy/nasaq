"use client";

import { Check } from "lucide-react";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button, type ButtonProps } from "../button";

export type InstallState = "available" | "installing" | "installed" | "update";

type Labels = { install: string; get: string; open: string; update: string };

const LABELS: Record<"en" | "ar", Labels> = {
  en: { install: "Install", get: "Get", open: "Open", update: "Update" },
  ar: { install: "تثبيت", get: "احصل عليه", open: "فتح", update: "تحديث" },
};

export interface InstallButtonProps extends Omit<ButtonProps, "children" | "onClick" | "loading"> {
  /** Where the app is in its lifecycle for this workspace. Default "available". */
  state?: InstallState;
  /** The app's name, appended to the accessible name: "Install Mahaam". */
  appName: string;
  /** Free apps say "Get" instead of "Install". */
  free?: boolean;
  onInstall?: () => void;
  onOpen?: () => void;
  onUpdate?: () => void;
  /** Override the built-in English/Arabic labels. */
  labels?: Partial<Labels>;
}

/**
 * The install CTA for an app or product. It is controlled: the caller owns `state` and moves it from
 * "available" to "installing" to "installed". Once installed it turns into a quiet "Open", so an
 * already-owned app never competes with the apps still to buy.
 */
export function InstallButton({ state = "available", appName, free = false, onInstall, onOpen, onUpdate, labels, variant, size = "sm", ...props }: InstallButtonProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const l = { ...LABELS[ar ? "ar" : "en"], ...labels };

  if (state === "installed") {
    return (
      <Button data-slot="install-button" data-state={state} variant="ghost" size={size} aria-label={`${l.open} ${appName}`} onClick={onOpen} {...props}>
        <Check aria-hidden className="text-nq-success-text" />
        {l.open}
      </Button>
    );
  }
  const label = state === "update" ? l.update : free ? l.get : l.install;
  return (
    <Button
      data-slot="install-button"
      data-state={state}
      variant={variant ?? "secondary"}
      size={size}
      loading={state === "installing"}
      aria-label={`${label} ${appName}`}
      onClick={state === "update" ? onUpdate : onInstall}
      {...props}
    >
      {label}
    </Button>
  );
}
