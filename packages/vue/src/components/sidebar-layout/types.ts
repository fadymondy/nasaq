import type { Component, VNode } from "vue";
import type { SidebarLayout } from "./layout";

export interface SidebarCustomizeItem {
  id: string;
  label: string;
  /** Shown before the label: a component (e.g. a lucide icon) or a VNode. */
  icon?: Component | VNode;
  /** Can be reordered but not hidden (e.g. the home page). */
  required?: boolean;
}

export interface SidebarCustomizeSection {
  id: string;
  label?: string;
  items: SidebarCustomizeItem[];
  layout: SidebarLayout;
}

export interface SidebarCustomizeLabels {
  title?: string;
  description?: string;
  reset?: string;
  done?: string;
  /** Accessible name for a row's drag handle, given the item label. */
  reorder?: (label: string) => string;
  /** Announced after a keyboard move, e.g. "Inbox, position 2 of 3". */
  moved?: (label: string, position: number, total: number) => string;
  close?: string;
}
