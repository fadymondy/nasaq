export { default as NqHotkeyBindings } from "./NqHotkeyBindings.vue";
export { default as NqHotkeyRecorder } from "./NqHotkeyRecorder.vue";
export type { HotkeyBindingItem, HotkeyRecorderBinding, HotkeyRecorderLabels } from "./strings";
export {
  HOTKEY_RESERVED,
  hotkeyCaps,
  hotkeyConflicts,
  hotkeyEventKey,
  hotkeyFormat,
  hotkeyFromEvent,
  hotkeyIdentity,
  hotkeyKeyCap,
  hotkeyKeys,
  hotkeyLabel,
  hotkeyMatches,
  hotkeyNormalizeKey,
  hotkeyParse,
  hotkeyRecordKey,
  hotkeyReservedBy,
  hotkeyTextMatches,
  hotkeyValidate,
} from "./hotkey-logic";
export type {
  HotkeyBinding,
  HotkeyConflict,
  HotkeyConflictKind,
  HotkeyIssueCode,
  HotkeyKeyEvent,
  HotkeyRecordOptions,
  HotkeyRecordResult,
  HotkeyRecordStatus,
  HotkeyReserved,
  HotkeyStep,
  HotkeyValidateOptions,
} from "./hotkey-logic";
