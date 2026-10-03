---
name: tree-view
title: TreeView
category: navigation
status: beta
summary: An accessible tree of nested items with expand and collapse, single or multiple selection, roving-tabindex keyboard navigation with typeahead, lazy children and RTL-aware arrow keys.
exports: [findTypeahead, flattenTree, getAncestorIds, getKeyAction, isExpandable, nextSelection, TreeNode, TreeViewProps, TreeView]
related: [accordion, collapsible, tabs, data-table]
story: components-navigation-tree-view
keywords: [tree, hierarchy, file explorer, nested, outline, folders, expand, collapse, treeitem]
---

# TreeView

A hierarchy the user can expand, collapse and select from, such as a file explorer, an outline or a category
picker. It follows the ARIA tree pattern: one tab stop, arrow-key navigation, typeahead, and state on every row.

## When to use

- Data that is naturally nested and can be deep: folders, categories, an outline.
- Choosing one or several nodes from a hierarchy.
- Children that should load only when a node is opened.

## When not to use

- A few sections of content that open and close: use [`Accordion`](../accordion/README.md).
- One block of hidden content: use [`Collapsible`](../collapsible/README.md).
- Tabular data with columns: use [`DataTable`](../data-table/README.md).

## Import

```tsx
import { TreeView } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { TreeView, type TreeNode } from "@fadymondy/nasaq/web";
import { FileText, Folder } from "lucide-react";

const items: TreeNode[] = [
  {
    id: "docs",
    label: "Documents",
    textValue: "Documents",
    icon: <Folder />,
    children: [{ id: "cv", label: "CV.pdf", textValue: "CV.pdf", icon: <FileText /> }],
  },
  { id: "notes", label: "Notes.txt", textValue: "Notes.txt", icon: <FileText /> },
];

export function Files() {
  return <TreeView aria-label="Files" items={items} defaultExpanded={["docs"]} />;
}
```

## Anatomy

```
TreeView                    data-slot="tree-view"        role="tree"
└─ row (one per visible node)  data-slot="tree-view-item"   role="treeitem"
   ├─ toggle                   data-slot="tree-view-toggle"  (chevron or spinner)
   ├─ icon                     data-slot="tree-view-icon"
   └─ label
```

Rows are a flat list with `aria-level`, `aria-setsize` and `aria-posinset`, so assistive technology reads the
structure without nested groups. Only the rows that are currently visible are in the DOM.

## API

**TreeView** (`TreeViewProps`): a `div`; extra props such as `aria-label` and `className` go to the tree.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `items` | `TreeNode[]` | | The tree. Every node needs a unique `id`. |
| `expanded` / `defaultExpanded` / `onExpandedChange` | `string[]` / `string[]` / `(ids) => void` | uncontrolled, `[]` | Expanded node ids. |
| `selected` / `defaultSelected` / `onSelectedChange` | `string[]` / `string[]` / `(ids) => void` | uncontrolled, `[]` | Selected node ids. |
| `selectionMode` | `"single" \| "multiple" \| "none"` | `"single"` | `multiple` toggles and sets `aria-multiselectable`. `none` removes `aria-selected`. |
| `onExpand` | `(node) => void \| Promise` | | Called when a node with no loaded `children` opens. Return a promise to show a spinner. |
| `dir` | `"ltr" \| "rtl"` | Nasaq direction | Decides which arrow key expands. |
| `indent` | `number` | `1.25` | Indent per level, in rem. Applied as `padding-inline-start`. |
| `loadingLabel` | `string` | "Loading" / "جارٍ التحميل" | Spinner label. |

**TreeNode**

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Unique. |
| `label` | `ReactNode` | Row content. |
| `textValue` | `string` | Text for typeahead. Give it whenever `label` is not a plain string. Falls back to `id`. |
| `icon` | `ReactNode` | Decorative icon before the label. |
| `children` | `TreeNode[]` | Loaded children. |
| `hasChildren` | `boolean` | Shows a chevron before children are loaded. Ignored once `children` is set. |
| `disabled` | `boolean` | Skipped by the keyboard and not selectable. |

**Helpers**: pure and framework-free, exported for tests and custom trees: `flattenTree`, `getKeyAction`,
`findTypeahead`, `nextSelection`, `getAncestorIds` (path to reveal a node), `isExpandable`.

## Examples

**Controlled expansion and selection**

```tsx
import { TreeView, getAncestorIds, type TreeNode } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Controlled({ items }: { items: TreeNode[] }) {
  const [expanded, setExpanded] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  // Reveal a node by expanding its ancestors.
  const reveal = (id: string) => setExpanded((prev) => [...new Set([...prev, ...getAncestorIds(items, id)])]);
  return (
    <>
      <button type="button" onClick={() => reveal("letter")}>Show letter</button>
      <TreeView aria-label="Files" items={items} expanded={expanded} onExpandedChange={setExpanded} selected={selected} onSelectedChange={setSelected} />
    </>
  );
}
```

**Lazy children**

```tsx
import { TreeView, type TreeNode } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Remote() {
  const [items, setItems] = useState<TreeNode[]>([{ id: "remote", label: "Remote", textValue: "Remote", hasChildren: true }]);
  const load = async (node: TreeNode) => {
    const children = await fetchChildren(node.id);
    setItems((prev) => prev.map((n) => (n.id === node.id ? { ...n, children } : n)));
  };
  return <TreeView aria-label="Files" items={items} onExpand={load} />;
}

declare function fetchChildren(id: string): Promise<TreeNode[]>;
```

**Multiple selection**

```tsx
import { TreeView, type TreeNode } from "@fadymondy/nasaq/web";

export function Pick({ items }: { items: TreeNode[] }) {
  return <TreeView aria-label="Categories" items={items} selectionMode="multiple" onSelectedChange={(ids) => console.log(ids)} />;
}
```

## Accessibility

| Key | Action |
| --- | --- |
| Down / Up | Next or previous visible row. |
| Right | Expands a closed node; on an open node, moves to its first child. Swapped in RTL. |
| Left | Collapses an open node; otherwise moves to the parent. Swapped in RTL. |
| Home / End | First or last row. |
| Enter / Space | Selects the row (toggles in multiple mode). |
| A character | Typeahead: the next row whose text starts with what you typed. Repeat a letter to cycle. |

- `role="tree"` with `role="treeitem"` rows carrying `aria-level`, `aria-setsize`, `aria-posinset`, `aria-expanded` (branches only) and `aria-selected`.
- One row is `tabindex="0"`, the rest `-1`: the focused row, else the first selected, else the first enabled row.
- Give the tree an `aria-label` (defaults to "Tree" / "شجرة"). A loading row has `aria-busy`.
- Clicking the chevron toggles expansion without changing the selection.

## RTL & i18n

- Indent is `padding-inline-start`, so children sit under the parent's start edge in both directions.
- The collapsed chevron mirrors in RTL (`Icon directional`); the open chevron points down in both.
- Left and Right arrow keys swap in RTL. The direction comes from the Nasaq provider, or the `dir` prop.
- Default strings ship in English and Arabic. Node labels are the caller's to translate.

## Styling & tokens

- Rows: `rounded-control`, `hover:bg-nq-hover`, `data-selected:bg-nq-selected`, `outline-nq-focus`. Icons and chevrons use `text-muted-foreground`.
- State attributes on a row: `data-selected`, `data-expanded`, `data-disabled`.
- Extend with `className`. Use tokens, never raw hex.

## Do / Don't

- Do set `textValue` on every node whose label is not a string.
- Do return a promise from `onExpand` so users see the spinner.
- Don't put interactive controls inside a row: the row is the control.
- Don't use it for a short flat list: use a list or `Select`.

## Related

- [`Accordion`](../accordion/README.md)
- [`Collapsible`](../collapsible/README.md)
- [`DataTable`](../data-table/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-navigation-tree-view--docs
