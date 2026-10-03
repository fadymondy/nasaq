export { default as NqContactMerge } from "./NqContactMerge.vue";
export {
  CONTACT_MERGE_ALL,
  combineMergeLists,
  contactMergeConflict,
  defaultContactMergeChoices,
  isEmptyMergeValue,
  rebaseContactMergeChoices,
  resolveContactMerge,
  resolveContactMergeValue,
  type ContactMergeChoices,
  type ContactMergeField,
  type ContactMergeOutcome,
  type ContactMergeValue,
  type ContactMergeValues,
} from "./contact-merge-logic";
export type { ContactMergeLabelOverrides, ContactMergeLabels } from "./strings";
export type { ContactMergeRecord, ContactMergeResult } from "./types";
