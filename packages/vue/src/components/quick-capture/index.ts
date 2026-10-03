export { default as NqQuickCapture } from "./NqQuickCapture.vue";
export {
  buildCapture,
  type CaptureInput,
  type CaptureKeyEvent,
  type CaptureKind,
  type CaptureShortcut,
  type CaptureValue,
  canSaveCapture,
  captureShortcutKeys,
  extractCaptureTags,
  extractCaptureUrl,
  isCaptureSaveKey,
  matchesCaptureShortcut,
  parseCaptureShortcut,
} from "./quick-capture-logic";
export type { QuickCaptureLabels } from "./strings";
export type { QuickCaptureDestination, QuickCapturePage } from "./types";
export { useCaptureShortcut } from "./use-quick-capture";
