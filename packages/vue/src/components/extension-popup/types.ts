import type { Component } from "vue";

export interface ExtensionQuickAction {
  id: string;
  label: string;
  icon: Component;
  onSelect: () => void;
  disabled?: boolean;
  /** Shows an external-link mark: the action opens a tab. */
  external?: boolean;
}

export interface ExtensionOptionsSection {
  id: string;
  title: string;
  description?: string;
}
