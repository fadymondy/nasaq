---
name: file-explorer
title: FileExplorer
category: files
status: beta
summary: A file browser with a folder tree, breadcrumbs, a sortable list or a grid, a preview pane, upload by button or drop, new folder and delete. It has no storage, your callbacks do the work.
exports: [FileExplorerLabels, FileNode, FileExplorerView, FileResult, FileExplorerProps, FileExplorer, checkName, extension, FileKind, fileKind, findNode, findPath, folderSize, NameProblem, SortKey, sortNodes]
related: [file-upload, tree-view, data-table, breadcrumb, code-block]
story: components-files-file-explorer
base-ui: [dialog, alert-dialog]
keywords: [files, folders, browser, drive, storage, upload, preview, media library, documents]
---

# FileExplorer

Browse and manage files. A folder tree on one side, breadcrumbs and a search box above the listing, a list
(name, modified, size) or a thumbnail grid in the middle, and a preview pane on the other side. Clicking a
folder opens it, clicking a file previews it (image, or text with syntax highlighting, or an icon and details).
Upload works from the button and by dropping files on the listing. New folder and Delete ask through dialogs.

The component owns only view state (open folder, selection, list or grid). The files are yours: pass `nodes`,
run the upload, create and delete in your callbacks, then pass the new `nodes` back.

## When to use

- A media library, a documents area, a project files tab.

## When not to use

- Picking one file in a form: use `FileUpload`.
- A plain hierarchy without files: use `TreeView`.

## Import

```tsx
import { FileExplorer } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { FileExplorer, type FileNode } from "@fadymondy/nasaq/web";

declare const nodes: FileNode[];
declare const api: { upload(files: File[], folder: string | null): Promise<void> };

export function Files() {
  return <FileExplorer nodes={nodes} onUpload={async (files, folder) => api.upload(files, folder)} />;
}
```

## Anatomy

```
FileExplorer                   data-slot="file-explorer"
├─ aside                       TreeView of folders
├─ main
│  ├─ Breadcrumb, New folder, Upload
│  ├─ search, list and grid toggle
│  ├─ UploadList               when `uploads` is set
│  └─ listing                  data-slot="file-explorer-listing" (DataTable or grid, drop target)
└─ aside                       data-slot="file-preview": preview, details, Download, Delete
Dialog, AlertDialog            new folder, delete
```

## API

Every `section` prop except `children`, `title` and `onSelect`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `nodes` | `FileNode[]` | required | `{ id, name, kind: "file" \| "folder", size?, modifiedAt?, mime?, children?, previewUrl?, previewText? }`. |
| `rootLabel` | `string` | All files | Name of the top level in the tree and breadcrumbs. |
| `folderId`, `defaultFolderId`, `onFolderChange` | `string \| null` | `null` | The open folder, controlled or not. `null` is the root. |
| `selectedId`, `onSelectedChange` | `string \| null` | | The previewed file. |
| `view`, `defaultView`, `onViewChange` | `"list" \| "grid"` | `list` | The layout. |
| `onUpload` | `(files, folderId) => Promise<void \| { error? }>` | | Shows Upload and the drop target. |
| `uploads`, `onRemoveUpload`, `onRetryUpload` | `UploadFile[]` | | Progress rows, same shape as `FileUpload`. |
| `onCreateFolder` | `(name, parentId) => Promise<void \| { error? }>` | | Shows New folder. `{ error }` keeps the dialog open. |
| `onDelete` | `(node) => Promise<void \| { error? }>` | | Shows Delete, after a confirm. |
| `onDownload` | `(node) => void` | | Shows Download in the preview and the row menu. |
| `loading` | `boolean` | `false` | Skeleton rows. |
| `title` | `ReactNode` | | The region label. |
| `labels` | `Partial<FileExplorerLabels>` | | Override any string. |

**Helpers** (pure, tested): `fileKind`, `extension`, `findPath`, `findNode`, `sortNodes`, `checkName`, `folderSize`.

## Examples

**Grid view with thumbnails**

```tsx
<FileExplorer nodes={nodes} defaultView="grid" onDownload={(n) => window.open(`/files/${n.id}`)} />
```

## Context menu

Rows (list view) and tiles (grid view) open their actions (download, delete) on right-click, Shift+F10 or the Menu key when `onDownload` or `onDelete` is set. `contextMenu={false}` opts out. The tree view has no item actions, so it keeps the browser menu.

## Accessibility

- The tree and the list use their own keyboard patterns. Rows are buttons, the row menu holds Download and Delete.
- The list and grid toggle uses `aria-pressed`. Thumbnails are decorative, the name is the label.
- Dialog errors are announced with `role="alert"`. Dropping files is optional: the Upload button does the same.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. File names use `<bdi dir="auto">`, sizes stay `dir="ltr"`.
- The layout uses logical classes only: the tree moves to the right in Arabic.

## Styling & tokens

- Built on `TreeView`, `DataTable`, `Breadcrumb`, `CodeBlock`, `UploadList`, `Dialog`, `AlertDialog` and `--nq-*` tokens.
- Target `[data-slot="file-explorer"]` and `[data-slot="file-preview"]`.

## Do / Don't

- Do validate uploads (size, type) on the server too.
- Do return `{ error }` from a callback when the server refuses.
- Don't put whole files in `previewText`: keep it to a short excerpt.
- Don't use it for thousands of files in one folder: page on the server.

## Related

- [`FileUpload`](../file-upload/README.md)
- [`TreeView`](../tree-view/README.md)
- [`DataTable`](../data-table/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-files-file-explorer--docs
