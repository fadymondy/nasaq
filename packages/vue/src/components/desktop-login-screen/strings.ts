import type { Component } from "vue";

export const STRINGS = {
  en: { morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening", signIn: "Sign in", power: "Power options" },
  ar: { morning: "صباح الخير", afternoon: "مساء الخير", evening: "مساء الخير", signIn: "تسجيل الدخول", power: "خيارات الطاقة" },
};

export type DesktopLoginScreenLabels = Partial<(typeof STRINGS)["en"]>;

export interface DesktopPowerAction {
  id: string;
  label: string;
  /** A Vue icon component (lucide-vue-next). */
  icon: Component;
  onSelect: () => void;
}
