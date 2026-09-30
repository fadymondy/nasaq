export * from "./contact-merge";
export {
  CONTACT_MERGE_ALL,
  combineMergeLists,
  contactMergeConflict,
  defaultContactMergeChoices,
  isEmptyMergeValue,
  rebaseContactMergeChoices,
  resolveContactMerge,
  resolveContactMergeValue,
} from "./contact-merge-logic";
export type { ContactMergeChoices, ContactMergeField, ContactMergeOutcome, ContactMergeValue, ContactMergeValues } from "./contact-merge-logic";
