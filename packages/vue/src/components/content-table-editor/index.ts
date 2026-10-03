export { default as NqContentTableEditor } from "./NqContentTableEditor.vue";
export {
  blankRow,
  changeColumnType,
  coerceCell,
  CONTENT_COLUMN_TYPES,
  filterRows as filterContentRows,
  parseOptions,
  sortRows as sortContentRows,
  summarize as summarizeContentColumn,
  toCsv as contentTableToCsv,
  validateTable,
  type ContentCell,
  type ContentColumn,
  type ContentColumnType,
  type ContentOption,
  type ContentRow,
  type ContentTableValue,
} from "./math";
export type { ContentTableLabels } from "./strings";
