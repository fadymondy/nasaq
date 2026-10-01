import type { Component, VNodeChild } from "vue";
import type { TreeNodeShape } from "./tree-helpers";

export interface TreeNode extends TreeNodeShape {
  /** Row content: text, or a render function returning vnodes. */
  label: string | (() => VNodeChild);
  /** Icon component shown before the label (for example lucide's `Folder`). Decorative. */
  icon?: Component;
  children?: TreeNode[];
}
