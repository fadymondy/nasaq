export { default as NqEditorTabs } from "./NqEditorTabs.vue";
export { default as NqEditorStatusBar } from "./NqEditorStatusBar.vue";
export { default as NqEditorBacklinks } from "./NqEditorBacklinks.vue";
export { closeEditorTab, closeOtherEditorTabs, editorTabKeyTarget, orderEditorTabs, editorCursorAt, editorTextStats, editorSaveNeedsAttention } from "./editor-chrome-model";
export type { EditorTab, EditorCursor, EditorTextStats, EditorSaveState } from "./editor-chrome-model";
export type { EditorChromeLabels, EditorLink } from "./strings";
