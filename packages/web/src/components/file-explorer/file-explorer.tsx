"use client";

import {
  Download,
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Folder,
  FolderOpen,
  FolderPlus,
  LayoutGrid,
  List,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { type ComponentProps, type DragEvent, type FormEvent, type ReactNode, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../alert-dialog";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../breadcrumb";
import { Button } from "../button";
import { CodeBlock } from "../code-block";
import { ContextMenuActions } from "../context-menu";
import { DataTable, type DataTableColumn, type DataTableRowAction, useDataTable } from "../data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldLabel, Input } from "../field";
import { formatFileSize, UploadList, type UploadFile } from "../file-upload";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../input-group";
import { DateTime } from "../numeric";
import { EmptyState, LoadingState } from "../states";
import { TreeView, type TreeNode } from "../tree-view";
import { checkName, extension, type FileKind, fileKind, findNode, findPath, type NameProblem, sortNodes } from "./file-format";

export { checkName, extension, type FileKind, fileKind, findNode, findPath, folderSize, type NameProblem, type SortKey, sortNodes } from "./file-format";

const STRINGS = {
  en: {
    title: "Files",
    root: "All files",
    folders: "Folders",
    breadcrumb: "Path",
    search: "Search in this folder",
    view: "View",
    listView: "List",
    gridView: "Grid",
    upload: "Upload",
    newFolder: "New folder",
    name: "Name",
    modified: "Modified",
    size: "Size",
    items: (n: number) => (n === 1 ? "1 item" : `${n} items`),
    listLabel: "Files in this folder",
    gridLabel: "Files in this folder",
    emptyTitle: "This folder is empty",
    emptyBody: "Drop files here or use Upload.",
    noMatch: "Nothing here matches your search.",
    loading: "Loading files",
    dropHere: "Drop to upload",
    folderWord: "Folder",
    // preview
    preview: "Preview",
    previewNone: "Select a file to preview it",
    closePreview: "Close preview",
    type: "Type",
    location: "Location",
    download: "Download",
    remove: "Delete",
    noPreview: "No preview for this file type",
    // new folder
    folderTitle: "New folder",
    folderBody: "Created inside the current folder.",
    folderName: "Folder name",
    folderEmpty: "Enter a name.",
    folderInvalid: "A name cannot contain / \\ : * ? \" < > |",
    folderDuplicate: "Something with this name is already here.",
    folderReserved: "That name is not allowed.",
    create: "Create",
    cancel: "Cancel",
    genericError: "Something went wrong. Try again.",
    // delete
    deleteTitle: (name: string) => `Delete ${name}?`,
    deleteBodyFile: "The file is removed for everyone who can see this folder.",
    deleteBodyFolder: (n: number) => (n === 0 ? "The empty folder is removed." : n === 1 ? "The folder and the 1 item inside it are removed." : `The folder and the ${n} items inside it are removed.`),
    deleteConfirm: "Delete",
    kinds: {
      folder: "Folder",
      image: "Image",
      video: "Video",
      audio: "Audio",
      pdf: "PDF document",
      archive: "Archive",
      code: "Source file",
      sheet: "Spreadsheet",
      doc: "Document",
      text: "Text file",
      other: "File",
    },
  },
  ar: {
    title: "الملفات",
    root: "كل الملفات",
    folders: "المجلدات",
    breadcrumb: "المسار",
    search: "ابحث في هذا المجلد",
    view: "العرض",
    listView: "قائمة",
    gridView: "شبكة",
    upload: "رفع",
    newFolder: "مجلد جديد",
    name: "الاسم",
    modified: "آخر تعديل",
    size: "الحجم",
    items: (n: number) => (n === 1 ? "عنصر واحد" : n === 2 ? "عنصران" : n >= 3 && n <= 10 ? `${n} عناصر` : `${n} عنصرًا`),
    listLabel: "ملفات هذا المجلد",
    gridLabel: "ملفات هذا المجلد",
    emptyTitle: "هذا المجلد فارغ",
    emptyBody: "أفلت الملفات هنا أو استخدم زر الرفع.",
    noMatch: "لا يوجد ما يطابق بحثك هنا.",
    loading: "جارٍ تحميل الملفات",
    dropHere: "أفلت للرفع",
    folderWord: "مجلد",
    preview: "المعاينة",
    previewNone: "اختر ملفًا لمعاينته",
    closePreview: "إغلاق المعاينة",
    type: "النوع",
    location: "الموقع",
    download: "تنزيل",
    remove: "حذف",
    noPreview: "لا توجد معاينة لهذا النوع من الملفات",
    folderTitle: "مجلد جديد",
    folderBody: "يُنشأ داخل المجلد الحالي.",
    folderName: "اسم المجلد",
    folderEmpty: "أدخل اسمًا.",
    folderInvalid: "لا يجوز أن يحتوي الاسم على / \\ : * ? \" < > |",
    folderDuplicate: "يوجد هنا عنصر بهذا الاسم.",
    folderReserved: "هذا الاسم غير مسموح.",
    create: "إنشاء",
    cancel: "إلغاء",
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
    deleteTitle: (name: string) => `حذف ${name}؟`,
    deleteBodyFile: "يُزال الملف لكل من يرى هذا المجلد.",
    deleteBodyFolder: (n: number) => (n === 0 ? "يُزال المجلد الفارغ." : n === 1 ? "يُزال المجلد والعنصر الواحد بداخله." : `يُزال المجلد و${n} عناصر بداخله.`),
    deleteConfirm: "حذف",
    kinds: {
      folder: "مجلد",
      image: "صورة",
      video: "فيديو",
      audio: "صوت",
      pdf: "مستند PDF",
      archive: "أرشيف",
      code: "ملف برمجي",
      sheet: "جدول بيانات",
      doc: "مستند",
      text: "ملف نصي",
      other: "ملف",
    },
  },
};

export type FileExplorerLabels = { [K in keyof typeof STRINGS.en]: (typeof STRINGS.en)[K] };

function useLabels(labels?: Partial<FileExplorerLabels>): { t: FileExplorerLabels; locale: string } {
  const locale = useOptionalNasaq()?.locale ?? "en";
  return { t: { ...(STRINGS[locale.startsWith("ar") ? "ar" : "en"] as FileExplorerLabels), ...labels }, locale };
}

export interface FileNode {
  id: string;
  name: string;
  kind: "file" | "folder";
  /** Bytes. */
  size?: number;
  modifiedAt?: Date | number | string;
  mime?: string;
  /** Folder contents. A folder without `children` shows as empty. */
  children?: FileNode[];
  /** An image URL used for the grid thumbnail and the preview. */
  previewUrl?: string;
  /** Text shown in the preview with syntax highlighting by extension (keep it short). */
  previewText?: string;
}

export type FileExplorerView = "list" | "grid";
export type FileResult = void | { error?: string };

export interface FileExplorerProps extends Omit<ComponentProps<"section">, "children" | "title" | "onSelect" | "contextMenu"> {
  /** The top-level items. Folders carry their `children`. */
  nodes: readonly FileNode[];
  /** Name of the root shown in the tree and breadcrumbs. Default "All files". */
  rootLabel?: string;
  /** The open folder id (controlled). `null` is the root. */
  folderId?: string | null;
  defaultFolderId?: string | null;
  onFolderChange?: (id: string | null) => void;
  /** The selected file id (controlled). */
  selectedId?: string | null;
  onSelectedChange?: (id: string | null) => void;
  view?: FileExplorerView;
  defaultView?: FileExplorerView;
  onViewChange?: (view: FileExplorerView) => void;
  /** Files chosen or dropped. `folderId` is the open folder (`null` at the root). Shows the Upload button and the dropzone. */
  onUpload?: (files: File[], folderId: string | null) => Promise<FileResult>;
  /** Upload progress to show above the list. Your `onUpload` keeps it up to date, like `FileUpload`. */
  uploads?: readonly UploadFile[];
  onRemoveUpload?: (item: UploadFile) => void;
  onRetryUpload?: (item: UploadFile) => void;
  /** Create a folder inside `parentId`. Shows New folder. Resolve `{ error }` to keep the dialog open. */
  onCreateFolder?: (name: string, parentId: string | null) => Promise<FileResult>;
  /** Delete a file or folder after a confirm. Shows Delete. */
  onDelete?: (node: FileNode) => Promise<FileResult>;
  /** Shows Download in the preview and the row menu. */
  onDownload?: (node: FileNode) => void;
  /** Open the row menu (Download, Delete) as a context menu on context-click, long-press or Shift+F10, in list and grid. Default true. */
  contextMenu?: boolean;
  loading?: boolean;
  title?: ReactNode;
  labels?: Partial<FileExplorerLabels>;
}

const KIND_ICON = {
  folder: Folder,
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  pdf: FileText,
  archive: FileArchive,
  code: FileCode,
  sheet: FileSpreadsheet,
  doc: FileText,
  text: FileText,
  other: FileIcon,
} as const;

function KindIcon({ kind, className }: { kind: FileKind; className?: string }) {
  const Glyph = KIND_ICON[kind];
  return <Glyph aria-hidden className={cn("shrink-0", kind === "folder" ? "text-nq-accent-text" : "text-muted-foreground", className)} />;
}

function useControllable<T>(value: T | undefined, initial: T, onChange?: (v: T) => void) {
  const [inner, setInner] = useState(initial);
  const current = value !== undefined ? value : inner;
  return [
    current,
    (next: T) => {
      if (value === undefined) setInner(next);
      onChange?.(next);
    },
  ] as const;
}

const ROOT = "\u0000root";

function folderTree(nodes: readonly FileNode[]): TreeNode[] {
  return nodes
    .filter((n) => n.kind === "folder")
    .map((n) => {
      const sub = folderTree(n.children ?? []);
      return {
        id: n.id,
        textValue: n.name,
        icon: <Folder />,
        label: <bdi dir="auto">{n.name}</bdi>,
        ...(sub.length ? { children: sub } : {}),
      };
    });
}

function countItems(node: FileNode): number {
  return (node.children ?? []).reduce((sum, c) => sum + 1 + (c.kind === "folder" ? countItems(c) : 0), 0);
}

/**
 * A file browser: a folder tree, breadcrumbs, a sortable list or a grid, a preview pane, upload by button or
 * drop, new folder and delete. It has no storage: your callbacks do the work and you pass back the updated
 * `nodes`.
 */
export function FileExplorer({
  nodes,
  rootLabel,
  folderId: folderProp,
  defaultFolderId = null,
  onFolderChange,
  selectedId: selectedProp,
  onSelectedChange,
  view: viewProp,
  defaultView = "list",
  onViewChange,
  onUpload,
  uploads = [],
  onRemoveUpload,
  onRetryUpload,
  onCreateFolder,
  onDelete,
  onDownload,
  contextMenu = true,
  loading = false,
  title,
  labels,
  className,
  ...props
}: FileExplorerProps) {
  const { t, locale } = useLabels(labels);
  const root = rootLabel ?? t.root;
  const [folderId, setFolderId] = useControllable<string | null>(folderProp, defaultFolderId, onFolderChange);
  const [selectedId, setSelectedId] = useControllable<string | null>(selectedProp, null, onSelectedChange);
  const [view, setView] = useControllable<FileExplorerView>(viewProp, defaultView, onViewChange);
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<FileNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const trail = useMemo(() => (folderId ? (findPath(nodes, folderId) ?? []) : []), [nodes, folderId]);
  const current = trail[trail.length - 1] ?? null;
  const currentFolderId = current ? current.id : null;
  const contents = useMemo(() => (current ? (current.children ?? []) : nodes), [current, nodes]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortNodes(q ? contents.filter((n) => n.name.toLowerCase().includes(q)) : contents, "name", "asc", locale);
  }, [contents, query, locale]);
  const selected = selectedId ? findNode(nodes, selectedId) : null;
  const selectedFile = selected && selected.kind === "file" ? selected : null;

  const tree = useMemo<TreeNode[]>(
    () => [{ id: ROOT, textValue: root, icon: <FolderOpen />, label: <bdi dir="auto">{root}</bdi>, children: folderTree(nodes) }],
    [nodes, root],
  );
  const expanded = useMemo(() => [ROOT, ...trail.map((n) => n.id)], [trail]);

  const open = (id: string | null) => {
    setFolderId(id);
    setSelectedId(null);
    setQuery("");
  };
  const activate = (node: FileNode) => {
    if (node.kind === "folder") open(node.id);
    else setSelectedId(node.id);
  };

  async function send(files: File[]) {
    if (!onUpload || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const result = await onUpload(files, currentFolderId);
      if (result?.error) setError(result.error);
    } catch {
      setError(t.genericError);
    } finally {
      setUploading(false);
    }
  }

  const dragProps = onUpload
    ? {
        onDragEnter: (e: DragEvent) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          dragDepth.current += 1;
          setDragging(true);
        },
        onDragOver: (e: DragEvent) => {
          if (e.dataTransfer.types.includes("Files")) e.preventDefault();
        },
        onDragLeave: () => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        },
        onDrop: (e: DragEvent) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          void send([...e.dataTransfer.files]);
        },
      }
    : {};

  const columns = useMemo<DataTableColumn<FileNode>[]>(
    () => [
      {
        id: "name",
        header: t.name,
        label: t.name,
        hideable: false,
        cell: (n) => (
          <span className="flex min-w-0 items-center gap-2">
            <KindIcon kind={fileKind(n)} className="size-4.5" />
            <bdi dir="auto" className="truncate text-foreground">
              {n.name}
            </bdi>
          </span>
        ),
        sortValue: (n) => `${n.kind === "folder" ? "0" : "1"}${n.name.toLowerCase()}`,
        searchValue: (n) => n.name,
      },
      {
        id: "modified",
        header: t.modified,
        label: t.modified,
        cell: (n) => (n.modifiedAt ? <DateTime value={n.modifiedAt} format={{ dateStyle: "medium" }} className="text-muted-foreground" /> : <span className="text-muted-foreground">-</span>),
        sortValue: (n) => (n.modifiedAt ? new Date(n.modifiedAt) : null),
        className: "hidden sm:table-cell",
        headerClassName: "hidden sm:table-cell",
      },
      {
        id: "size",
        header: t.size,
        label: t.size,
        align: "end",
        cell: (n) => (n.kind === "folder" ? <span className="text-muted-foreground">{t.items((n.children ?? []).length)}</span> : n.size !== undefined ? <span className="text-muted-foreground"><bdi dir="ltr">{formatFileSize(n.size, locale)}</bdi></span> : "-"),
        sortValue: (n) => (n.kind === "folder" ? (n.children ?? []).length : (n.size ?? null)),
      },
    ],
    [t, locale],
  );
  const table = useDataTable({ data: shown as FileNode[], columns, getRowId: (n) => n.id, defaultSort: { id: "name", direction: "asc" } });

  const rowActions = (n: FileNode): DataTableRowAction[] => {
    const out: DataTableRowAction[] = [];
    if (onDownload && n.kind === "file") out.push({ id: "download", label: t.download, icon: Download, onSelect: () => onDownload(n) });
    if (onDelete) out.push({ id: "delete", label: t.remove, icon: Trash2, danger: true, onSelect: () => setDeleting(n), group: "danger" });
    return out;
  };

  const hasActions = Boolean(onDownload || onDelete);
  const empty = contents.length === 0;

  return (
    <section
      data-slot="file-explorer"
      aria-label={typeof title === "string" ? title : t.title}
      className={cn("grid min-w-0 gap-4 lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)_18rem]", className)}
      {...props}
    >
      <aside aria-label={t.folders} className="min-w-0 rounded-card border border-border bg-card p-2 max-lg:max-h-48 max-lg:overflow-y-auto lg:max-h-[36rem] lg:overflow-y-auto">
        <TreeView
          aria-label={t.folders}
          items={tree}
          expanded={expanded}
          onExpandedChange={() => {}}
          selected={[folderId ?? ROOT]}
          onSelectedChange={(ids) => {
            const id = ids[ids.length - 1];
            if (id) open(id === ROOT ? null : id);
          }}
        />
      </aside>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Breadcrumb aria-label={t.breadcrumb}>
            <BreadcrumbList>
              {[{ id: null as string | null, name: root }, ...trail.map((n) => ({ id: n.id as string | null, name: n.name }))].map((crumb, i, all) => (
                <BreadcrumbItem key={crumb.id ?? ROOT}>
                  {i === all.length - 1 ? (
                    <BreadcrumbPage>
                      <bdi dir="auto">{crumb.name}</bdi>
                    </BreadcrumbPage>
                  ) : (
                    <>
                      <BreadcrumbLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          open(crumb.id);
                        }}
                      >
                        <bdi dir="auto">{crumb.name}</bdi>
                      </BreadcrumbLink>
                      <BreadcrumbSeparator />
                    </>
                  )}
                </BreadcrumbItem>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex flex-wrap items-center gap-2">
            {onCreateFolder ? (
              <Button type="button" size="sm" onClick={() => setCreating(true)}>
                <FolderPlus aria-hidden />
                {t.newFolder}
              </Button>
            ) : null}
            {onUpload ? (
              <>
                <input
                  ref={input}
                  type="file"
                  multiple
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                  onChange={(e) => {
                    const files = [...(e.target.files ?? [])];
                    e.target.value = "";
                    void send(files);
                  }}
                />
                <Button type="button" size="sm" variant="primary" loading={uploading} onClick={() => input.current?.click()}>
                  <Upload aria-hidden />
                  {t.upload}
                </Button>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <InputGroup className="min-w-0 max-w-sm flex-1">
            <InputGroupAddon align="start">
              <Search aria-hidden className="size-4 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} aria-label={t.search} />
          </InputGroup>
          <div role="group" aria-label={t.view} className="ms-auto inline-flex rounded-control border border-border p-0.5">
            <Button type="button" size="icon-sm" variant={view === "list" ? "secondary" : "ghost"} aria-pressed={view === "list"} aria-label={t.listView} title={t.listView} onClick={() => setView("list")}>
              <List aria-hidden />
            </Button>
            <Button type="button" size="icon-sm" variant={view === "grid" ? "secondary" : "ghost"} aria-pressed={view === "grid"} aria-label={t.gridView} title={t.gridView} onClick={() => setView("grid")}>
              <LayoutGrid aria-hidden />
            </Button>
          </div>
        </div>

        {error ? (
          <Alert tone="danger" role="alert" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        ) : null}
        {uploads.length ? <UploadList items={uploads} onRemove={onRemoveUpload} onRetry={onRetryUpload} /> : null}

        <div data-slot="file-explorer-listing" data-dragging={dragging || undefined} className={cn("relative min-w-0 rounded-card", dragging && "outline-2 -outline-offset-2 outline-nq-focus outline-dashed")} {...dragProps}>
          {dragging ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-card bg-card/85 text-label text-foreground">
              <Upload aria-hidden className="me-2 size-5" />
              {t.dropHere}
            </div>
          ) : null}
          {loading ? (
            <LoadingState label={t.loading} rows={5} />
          ) : empty ? (
            <EmptyState
              icon={FolderOpen}
              title={t.emptyTitle}
              description={onUpload ? t.emptyBody : undefined}
              actions={
                onUpload ? (
                  <Button type="button" variant="primary" onClick={() => input.current?.click()}>
                    <Upload aria-hidden />
                    {t.upload}
                  </Button>
                ) : undefined
              }
            />
          ) : shown.length === 0 ? (
            <p className="rounded-card border border-dashed border-border px-4 py-10 text-center text-body-sm text-muted-foreground">{t.noMatch}</p>
          ) : view === "list" ? (
            <DataTable
              table={table}
              label={t.listLabel}
              rowLabel={(n) => n.name}
              onRowClick={activate}
              contextMenu={contextMenu}
              {...(hasActions ? { rowActions } : {})}
            />
          ) : (
            <ul aria-label={t.gridLabel} className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid-cols-4">
              {shown.map((n) => {
                const kind = fileKind(n);
                const isSelected = n.id === selectedId;
                const cell = (
                  <li>
                    <button
                      type="button"
                      data-selected={isSelected || undefined}
                      aria-pressed={n.kind === "file" ? isSelected : undefined}
                      onClick={() => activate(n)}
                      className="flex w-full flex-col items-stretch gap-2 rounded-card border border-border bg-card p-2 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus data-[selected]:border-nq-accent data-[selected]:bg-nq-selected"
                    >
                      <span className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-control bg-secondary">
                        {kind === "image" && n.previewUrl ? (
                          // biome-ignore lint/performance/noImgElement: a plain thumbnail, the host owns the URL
                          <img src={n.previewUrl} alt="" loading="lazy" className="size-full object-cover" />
                        ) : (
                          <KindIcon kind={kind} className="size-10" />
                        )}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <bdi dir="auto" className="truncate text-body-sm text-foreground">
                          {n.name}
                        </bdi>
                        <span className="truncate text-caption text-muted-foreground">
                          {n.kind === "folder" ? t.items((n.children ?? []).length) : n.size !== undefined ? <bdi dir="ltr">{formatFileSize(n.size, locale)}</bdi> : t.kinds[kind]}
                        </span>
                      </span>
                    </button>
                  </li>
                );
                return (
                  <ContextMenuActions
                    key={n.id}
                    actions={hasActions ? rowActions(n) : []}
                    disabled={!contextMenu}
                    render={cell}
                    focusTarget={(li) => li.querySelector<HTMLElement>("button")}
                  />
                );
              })}
            </ul>
          )}
        </div>
        <p className="text-caption text-muted-foreground">{t.items(contents.length)}</p>
      </div>

      <aside aria-label={t.preview} className="min-w-0 rounded-card border border-border bg-card p-3 max-xl:col-span-full lg:max-xl:col-start-2">
        {selectedFile ? (
          <PreviewPanel
            file={selectedFile}
            trail={trail}
            root={root}
            t={t}
            locale={locale}
            onClose={() => setSelectedId(null)}
            onDownload={onDownload ? () => onDownload(selectedFile) : undefined}
            onDelete={onDelete ? () => setDeleting(selectedFile) : undefined}
          />
        ) : (
          <p className="px-2 py-6 text-center text-body-sm text-muted-foreground">{t.previewNone}</p>
        )}
      </aside>

      {creating && onCreateFolder ? (
        <NewFolderDialog siblings={contents.map((n) => n.name)} onCreate={(name) => onCreateFolder(name, currentFolderId)} onClose={() => setCreating(false)} t={t} />
      ) : null}
      {deleting && onDelete ? (
        <DeleteDialog
          node={deleting}
          onConfirm={async () => {
            const result = await onDelete(deleting);
            if (!result?.error && selectedId === deleting.id) setSelectedId(null);
            return result;
          }}
          onClose={() => setDeleting(null)}
          t={t}
        />
      ) : null}
    </section>
  );
}

function PreviewPanel({
  file,
  trail,
  root,
  t,
  locale,
  onClose,
  onDownload,
  onDelete,
}: {
  file: FileNode;
  trail: readonly FileNode[];
  root: string;
  t: FileExplorerLabels;
  locale: string;
  onClose: () => void;
  onDownload: (() => void) | undefined;
  onDelete: (() => void) | undefined;
}) {
  const kind = fileKind(file);
  const ext = extension(file.name);
  return (
    <div data-slot="file-preview" className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <bdi dir="auto" className="min-w-0 break-words text-label text-foreground">
          {file.name}
        </bdi>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={t.closePreview} onClick={onClose}>
          <X aria-hidden />
        </Button>
      </div>
      <div className="flex min-h-32 items-center justify-center overflow-hidden rounded-control bg-secondary">
        {kind === "image" && file.previewUrl ? (
          // biome-ignore lint/performance/noImgElement: a plain preview, the host owns the URL
          <img src={file.previewUrl} alt={file.name} className="max-h-64 w-full object-contain" />
        ) : file.previewText !== undefined ? (
          <CodeBlock code={file.previewText} language={ext || "text"} filename={file.name} className="w-full" preClassName="max-h-64" />
        ) : (
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <KindIcon kind={kind} className="size-10" />
            <span className="text-caption text-muted-foreground">{t.noPreview}</span>
          </div>
        )}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-body-sm">
        <dt className="text-muted-foreground">{t.type}</dt>
        <dd>{t.kinds[kind]}</dd>
        {file.size !== undefined ? (
          <>
            <dt className="text-muted-foreground">{t.size}</dt>
            <dd>
              <bdi dir="ltr">{formatFileSize(file.size, locale)}</bdi>
            </dd>
          </>
        ) : null}
        {file.modifiedAt ? (
          <>
            <dt className="text-muted-foreground">{t.modified}</dt>
            <dd>
              <DateTime value={file.modifiedAt} format={{ dateStyle: "medium", timeStyle: "short" }} />
            </dd>
          </>
        ) : null}
        <dt className="text-muted-foreground">{t.location}</dt>
        <dd className="min-w-0 break-words">
          <bdi dir="auto">{[root, ...trail.map((n) => n.name)].join(" / ")}</bdi>
        </dd>
      </dl>
      {onDownload || onDelete ? (
        <div className="flex flex-wrap gap-2">
          {onDownload ? (
            <Button type="button" size="sm" onClick={onDownload}>
              <Download aria-hidden />
              {t.download}
            </Button>
          ) : null}
          {onDelete ? (
            <Button type="button" size="sm" variant="ghost" className="text-nq-danger-text" onClick={onDelete}>
              <Trash2 aria-hidden />
              {t.remove}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const PROBLEM: Record<NameProblem, "folderEmpty" | "folderInvalid" | "folderDuplicate" | "folderReserved"> = {
  empty: "folderEmpty",
  invalid: "folderInvalid",
  duplicate: "folderDuplicate",
  reserved: "folderReserved",
};

function NewFolderDialog({
  siblings,
  onCreate,
  onClose,
  t,
}: {
  siblings: readonly string[];
  onCreate: (name: string) => Promise<FileResult>;
  onClose: () => void;
  t: FileExplorerLabels;
}) {
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const id = useId();
  const problem = checkName(name, siblings);
  const show = problem !== null && (touched || problem === "duplicate" || problem === "invalid");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (problem || pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await onCreate(name.trim());
      if (result?.error) setError(result.error);
      else onClose();
    } catch {
      setError(t.genericError);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t.folderTitle}</DialogTitle>
            <DialogDescription>{t.folderBody}</DialogDescription>
          </DialogHeader>
          <Field invalid={show}>
            <FieldLabel>{t.folderName}</FieldLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(true)} autoComplete="off" aria-describedby={show ? `${id}-name` : undefined} />
            {show && problem ? (
              <p id={`${id}-name`} role="alert" className="text-caption text-nq-danger-text">
                {t[PROBLEM[problem]]}
              </p>
            ) : null}
          </Field>
          {error ? (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={pending} onClick={onClose}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={pending}>
              {t.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ node, onConfirm, onClose, t }: { node: FileNode; onConfirm: () => Promise<FileResult>; onClose: () => void; t: FileExplorerLabels }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <AlertDialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <bdi dir="auto">{t.deleteTitle(node.name)}</bdi>
          </AlertDialogTitle>
          <AlertDialogDescription>{node.kind === "folder" ? t.deleteBodyFolder(countItems(node)) : t.deleteBodyFile}</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <Alert tone="danger" role="alert">
            {error}
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t.cancel}</AlertDialogCancel>
          <Button
            type="button"
            variant="danger"
            loading={pending}
            onClick={async () => {
              setPending(true);
              setError(null);
              try {
                const result = await onConfirm();
                if (result?.error) setError(result.error);
                else onClose();
              } catch {
                setError(t.genericError);
              } finally {
                setPending(false);
              }
            }}
          >
            {t.deleteConfirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
