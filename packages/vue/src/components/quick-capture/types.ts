import type { Component } from "vue";

export interface QuickCaptureDestination {
  id: string;
  label: string;
  /** A component (a lucide-vue-next icon) drawn before the label. */
  icon?: Component;
}

export interface QuickCapturePage {
  title?: string;
  url: string;
  /** Text the reader had selected on the page. */
  selection?: string;
}
