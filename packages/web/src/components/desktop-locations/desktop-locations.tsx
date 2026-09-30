"use client";

import { FolderOpen, FolderPlus, FolderSearch, FolderX, RefreshCw, Star, Trash2 } from "lucide-react";
import { type ComponentProps, type FormEvent, type ReactNode, useId, useState } from "react";
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
import { Badge } from "../badge";
import { Button } from "../button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldLabel, Input } from "../field";
import { DateTime } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Status, type StatusTone } from "../status";
import { EmptyState, LoadingState } from "../states";
import { Switch } from "../switch";
import { baseName, checkLocationPath, type LocationCheck, normalizePath, shortenPath } from "./location-path";

export { baseName, checkLocationPath, isAbsolutePath, type LocationCheck, type LocationProblem, type LocationWarning, normalizePath, pathContains, samePath, shortenPath } from "./location-path";

const STRINGS = {
  en: {
    title: "Locations on this computer",
    description: "Folders the desktop app can read and change for you. It cannot open anything outside them.",
    list: "Locations",
    add: "Add folder",
    count: (n: number) => (n === 1 ? "1 folder" : `${n} folders`),
    emptyTitle: "No folders yet",
    emptyBody: "Add the folders you work in. Until you do, the desktop app cannot read or write any files.",
    loading: "Loading locations",
    primary: "Default",
    makeDefault: (name: string) => `Make ${name} the default`,
    defaultHint: "Relative paths resolve against the default folder.",
    reindex: (name: string) => `Re-index ${name}`,
    remove: (name: string) => `Remove ${name}`,
    files: (n: number) => (n === 1 ? "1 file" : `${n} files`),
    indexed: "Indexed",
    notIndexed: "Not indexed",
    permissions: "Permissions",
    read: "Read",
    readHint: "List and open files",
    write: "Write",
    writeHint: "Create and change files",
    index: "Search index",
    indexHint: "Include in local search",
    status: {
      ready: "Ready",
      indexing: "Indexing",
      missing: "Folder not found",
      "not-directory": "Not a folder",
      denied: "Access denied by the system",
    },
    genericError: "Something went wrong. Try again.",
    // add
    addTitle: "Add a folder",
    addBody: "Choose a folder on this computer. The desktop app gets access to it and everything inside.",
    pathLabel: "Folder path",
    pathPlaceholder: "C:\\Users\\you\\projects\\app",
    browse: "Browse",
    problemEmpty: "Enter the folder path.",
    problemRelative: "Use a full path that starts at a drive, a share or the root.",
    problemDuplicate: "This folder is already on the list.",
    warnInside: (other: string) => `Already covered by ${other}.`,
    warnContains: (other: string) => `Includes ${other}, which is already on the list.`,
    cancel: "Cancel",
    save: "Add folder",
    // remove
    removeTitle: (name: string) => `Remove ${name}?`,
    removeBody: "The desktop app loses access to this folder and its search index is deleted. Your files are not touched.",
    removeConfirm: "Remove",
    // picker
    pick: "Choose a location",
    pickEmpty: "No usable locations",
    unavailable: "unavailable",
  },
  ar: {
    title: "المواقع على هذا الجهاز",
    description: "المجلدات التي يستطيع تطبيق سطح المكتب قراءتها وتعديلها نيابةً عنك. ولا يستطيع فتح أي شيء خارجها.",
    list: "المواقع",
    add: "إضافة مجلد",
    count: (n: number) => (n === 1 ? "مجلد واحد" : n === 2 ? "مجلدان" : n >= 3 && n <= 10 ? `${n} مجلدات` : `${n} مجلدًا`),
    emptyTitle: "لا توجد مجلدات بعد",
    emptyBody: "أضف المجلدات التي تعمل فيها. وإلى أن تفعل، لا يستطيع تطبيق سطح المكتب قراءة أو كتابة أي ملف.",
    loading: "جارٍ تحميل المواقع",
    primary: "الافتراضي",
    makeDefault: (name: string) => `جعل ${name} الافتراضي`,
    defaultHint: "تُحسم المسارات النسبية بالنسبة إلى المجلد الافتراضي.",
    reindex: (name: string) => `إعادة فهرسة ${name}`,
    remove: (name: string) => `إزالة ${name}`,
    files: (n: number) => (n === 1 ? "ملف واحد" : n === 2 ? "ملفان" : n >= 3 && n <= 10 ? `${n} ملفات` : `${n} ملفًا`),
    indexed: "آخر فهرسة",
    notIndexed: "غير مفهرس",
    permissions: "الصلاحيات",
    read: "قراءة",
    readHint: "عرض الملفات وفتحها",
    write: "كتابة",
    writeHint: "إنشاء الملفات وتعديلها",
    index: "فهرس البحث",
    indexHint: "تضمينه في البحث المحلي",
    status: {
      ready: "جاهز",
      indexing: "جارٍ الفهرسة",
      missing: "المجلد غير موجود",
      "not-directory": "ليس مجلدًا",
      denied: "رفض النظام الوصول",
    },
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
    addTitle: "إضافة مجلد",
    addBody: "اختر مجلدًا على هذا الجهاز. سيحصل تطبيق سطح المكتب على صلاحية الوصول إليه وإلى كل ما بداخله.",
    pathLabel: "مسار المجلد",
    pathPlaceholder: "C:\\Users\\you\\projects\\app",
    browse: "استعراض",
    problemEmpty: "أدخل مسار المجلد.",
    problemRelative: "استخدم مسارًا كاملًا يبدأ من قرص أو مشاركة أو الجذر.",
    problemDuplicate: "هذا المجلد موجود في القائمة بالفعل.",
    warnInside: (other: string) => `مشمول بالفعل ضمن ${other}.`,
    warnContains: (other: string) => `يشمل ${other} وهو موجود في القائمة بالفعل.`,
    cancel: "إلغاء",
    save: "إضافة المجلد",
    removeTitle: (name: string) => `إزالة ${name}؟`,
    removeBody: "يفقد تطبيق سطح المكتب صلاحية الوصول إلى هذا المجلد ويُحذف فهرس البحث الخاص به. ملفاتك لا تتأثر.",
    removeConfirm: "إزالة",
    pick: "اختر موقعًا",
    pickEmpty: "لا توجد مواقع صالحة",
    unavailable: "غير متاح",
  },
};

export type DesktopLocationsLabels = { [K in keyof typeof STRINGS.en]: (typeof STRINGS.en)[K] };

function useLabels(labels?: Partial<DesktopLocationsLabels>): DesktopLocationsLabels {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return { ...(STRINGS[ar ? "ar" : "en"] as DesktopLocationsLabels), ...labels };
}

export type DesktopLocationStatus = "ready" | "indexing" | "missing" | "not-directory" | "denied";

export interface DesktopLocationPermissions {
  /** List and read files. */
  read: boolean;
  /** Create and change files. */
  write: boolean;
  /** Include the folder in the local search index. */
  index: boolean;
}

export interface DesktopLocation {
  id: string;
  /** Absolute path on the user's computer. */
  path: string;
  /** A friendlier name. Defaults to the last segment of the path. */
  label?: string;
  status: DesktopLocationStatus;
  permissions: DesktopLocationPermissions;
  /** The default location: relative paths resolve against it. */
  primary?: boolean;
  fileCount?: number;
  indexedAt?: Date | number | string;
  addedAt?: Date | number | string;
}

export type LocationResult = void | { error?: string };

export interface DesktopLocationsProps extends Omit<ComponentProps<"section">, "children" | "title"> {
  locations: readonly DesktopLocation[];
  /** Add a folder with the chosen permissions. Resolve `{ error }` to keep the dialog open with a message. */
  onAdd?: (path: string, permissions: DesktopLocationPermissions) => Promise<LocationResult>;
  /** Remove a location (after a confirm). Files on disk are not touched. */
  onRemove?: (id: string) => Promise<LocationResult>;
  onPermissionsChange?: (id: string, permissions: DesktopLocationPermissions) => Promise<LocationResult>;
  /** Shows "Make default" on the other locations. */
  onMakeDefault?: (id: string) => Promise<LocationResult>;
  /** Shows a refresh button on ready locations that have the search index on. */
  onReindex?: (id: string) => Promise<LocationResult>;
  /** Opens the system folder picker (the desktop bridge) and resolves the chosen path, or null when cancelled. Shows a Browse button. */
  onBrowse?: () => Promise<string | null>;
  loading?: boolean;
  title?: ReactNode;
  description?: ReactNode;
  labels?: Partial<DesktopLocationsLabels>;
}

const STATUS_TONE: Record<DesktopLocationStatus, StatusTone> = {
  ready: "success",
  indexing: "info",
  missing: "danger",
  "not-directory": "danger",
  denied: "warning",
};

const displayName = (l: Pick<DesktopLocation, "label" | "path">) => l.label?.trim() || baseName(l.path);

function LocationRow({
  location,
  busy,
  t,
  onPermissions,
  onRemove,
  onMakeDefault,
  onReindex,
}: {
  location: DesktopLocation;
  busy: boolean;
  t: DesktopLocationsLabels;
  onPermissions: ((p: DesktopLocationPermissions) => void) | undefined;
  onRemove: (() => void) | undefined;
  onMakeDefault: (() => void) | undefined;
  onReindex: (() => void) | undefined;
}) {
  const id = useId();
  const name = displayName(location);
  const usable = location.status === "ready" || location.status === "indexing";
  const broken = location.status === "missing" || location.status === "not-directory";
  const perms = location.permissions;
  const toggles: { key: keyof DesktopLocationPermissions; label: string; hint: string }[] = [
    { key: "read", label: t.read, hint: t.readHint },
    { key: "write", label: t.write, hint: t.writeHint },
    { key: "index", label: t.index, hint: t.indexHint },
  ];
  const Glyph = broken ? FolderX : FolderOpen;
  return (
    <li data-slot="desktop-location" data-status={location.status} className="flex flex-col gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-start gap-3">
        <span className={cn("mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-secondary [&_svg]:size-4.5", broken ? "text-nq-danger-text" : "text-muted-foreground")}>
          <Glyph aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <bdi dir="auto" className="truncate text-label text-foreground">
              {name}
            </bdi>
            {location.primary ? (
              <Badge variant="accent">
                <Star aria-hidden />
                {t.primary}
              </Badge>
            ) : null}
            <Status tone={STATUS_TONE[location.status]}>{t.status[location.status]}</Status>
          </div>
          <bdi dir="ltr" title={location.path} className="block break-all font-mono text-code text-muted-foreground">
            {location.path}
          </bdi>
          {usable ? (
            <span className="text-caption text-muted-foreground">
              {location.fileCount !== undefined ? (
                <>
                  <bdi>{t.files(location.fileCount)}</bdi>
                  {!perms.index || location.indexedAt ? " · " : ""}
                </>
              ) : null}
              {perms.index && location.indexedAt ? (
                <>
                  {t.indexed} <DateTime value={location.indexedAt} relative />
                </>
              ) : perms.index ? null : (
                t.notIndexed
              )}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {onMakeDefault && !location.primary && usable ? (
            <Button type="button" variant="ghost" size="icon-sm" disabled={busy} aria-label={t.makeDefault(name)} title={t.makeDefault(name)} onClick={onMakeDefault}>
              <Star aria-hidden />
            </Button>
          ) : null}
          {onReindex && usable && perms.index ? (
            <Button type="button" variant="ghost" size="icon-sm" disabled={busy || location.status === "indexing"} aria-label={t.reindex(name)} title={t.reindex(name)} onClick={onReindex}>
              <RefreshCw aria-hidden className={cn(location.status === "indexing" && "motion-safe:animate-spin")} />
            </Button>
          ) : null}
          {onRemove ? (
            <Button type="button" variant="ghost" size="icon-sm" disabled={busy} aria-label={t.remove(name)} title={t.remove(name)} className="text-nq-danger-text" onClick={onRemove}>
              <Trash2 aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>
      <div role="group" aria-label={`${t.permissions}: ${name}`} className="grid gap-2 sm:grid-cols-3">
        {toggles.map((x) => (
          <div key={x.key} className="flex items-center justify-between gap-3 rounded-control border border-border px-3 py-2">
            <label htmlFor={`${id}-${x.key}`} className="flex min-w-0 flex-col">
              <span className="text-body-sm text-foreground">{x.label}</span>
              <span className="truncate text-caption text-muted-foreground">{x.hint}</span>
            </label>
            <Switch
              id={`${id}-${x.key}`}
              checked={perms[x.key]}
              disabled={busy || !usable || !onPermissions}
              onCheckedChange={(checked) => onPermissions?.({ ...perms, [x.key]: checked, ...(x.key === "read" && !checked ? { write: false, index: false } : {}) })}
            />
          </div>
        ))}
      </div>
    </li>
  );
}

/**
 * The folders a desktop app may touch (workspace roots): each with its path, status (ready, indexing, missing,
 * denied) and per-folder permissions (read, write, search index), plus add, remove, make default and
 * re-index. It has no filesystem access: your callbacks talk to the desktop bridge.
 */
export function DesktopLocations({
  locations,
  onAdd,
  onRemove,
  onPermissionsChange,
  onMakeDefault,
  onReindex,
  onBrowse,
  loading = false,
  title,
  description,
  labels,
  className,
  ...props
}: DesktopLocationsProps) {
  const t = useLabels(labels);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<DesktopLocation | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(id: string, action: () => Promise<LocationResult>) {
    setBusy(id);
    setError(null);
    try {
      const result = await action();
      if (result?.error) setError(result.error);
    } catch {
      setError(t.genericError);
    } finally {
      setBusy(null);
    }
  }

  const hasDefault = locations.some((l) => l.primary);
  return (
    <section data-slot="desktop-locations" aria-label={typeof title === "string" ? title : t.title} className={cn("flex min-w-0 flex-col gap-4", className)} {...props}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-h3 text-foreground">{title ?? t.title}</h3>
          <p className="max-w-prose text-body-sm text-muted-foreground">{description ?? t.description}</p>
        </div>
        {onAdd ? (
          <Button type="button" size="sm" variant="primary" onClick={() => setAdding(true)}>
            <FolderPlus aria-hidden />
            {t.add}
          </Button>
        ) : null}
      </header>

      {error ? (
        <Alert tone="danger" role="alert" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <LoadingState label={t.loading} rows={3} />
      ) : locations.length === 0 ? (
        <EmptyState
          icon={FolderSearch}
          title={t.emptyTitle}
          description={t.emptyBody}
          actions={
            onAdd ? (
              <Button type="button" variant="primary" onClick={() => setAdding(true)}>
                <FolderPlus aria-hidden />
                {t.add}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ul aria-label={t.list} className="m-0 flex list-none flex-col overflow-hidden rounded-card border border-border bg-card p-0">
            {locations.map((l) => (
              <LocationRow
                key={l.id}
                location={l}
                busy={busy === l.id}
                t={t}
                onPermissions={onPermissionsChange ? (p) => void run(l.id, () => onPermissionsChange(l.id, p)) : undefined}
                onRemove={onRemove ? () => setRemoving(l) : undefined}
                onMakeDefault={onMakeDefault ? () => void run(l.id, () => onMakeDefault(l.id)) : undefined}
                onReindex={onReindex ? () => void run(l.id, () => onReindex(l.id)) : undefined}
              />
            ))}
          </ul>
          <p className="text-caption text-muted-foreground">
            {t.count(locations.length)}
            {hasDefault || onMakeDefault ? ` · ${t.defaultHint}` : ""}
          </p>
        </>
      )}

      {adding && onAdd ? <AddDialog existing={locations.map((l) => l.path)} onAdd={onAdd} onBrowse={onBrowse} onClose={() => setAdding(false)} t={t} /> : null}
      {removing && onRemove ? (
        <RemoveDialog
          location={removing}
          onConfirm={async () => {
            const result = await onRemove(removing.id);
            return result;
          }}
          onClose={() => setRemoving(null)}
          t={t}
        />
      ) : null}
    </section>
  );
}

function AddDialog({
  existing,
  onAdd,
  onBrowse,
  onClose,
  t,
}: {
  existing: readonly string[];
  onAdd: NonNullable<DesktopLocationsProps["onAdd"]>;
  onBrowse: DesktopLocationsProps["onBrowse"];
  onClose: () => void;
  t: DesktopLocationsLabels;
}) {
  const [path, setPath] = useState("");
  const [permissions, setPermissions] = useState<DesktopLocationPermissions>({ read: true, write: false, index: true });
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const id = useId();
  const check: LocationCheck = checkLocationPath(path, existing);
  const problemText = check.problem === "empty" ? t.problemEmpty : check.problem === "relative" ? t.problemRelative : check.problem === "duplicate" ? t.problemDuplicate : null;
  const showProblem = problemText !== null && (touched || check.problem === "duplicate");

  async function browse() {
    if (!onBrowse) return;
    setBrowsing(true);
    try {
      const picked = await onBrowse();
      if (picked) {
        setPath(picked);
        setTouched(true);
      }
    } catch {
      setError(t.genericError);
    } finally {
      setBrowsing(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (check.problem || pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await onAdd(normalizePath(path), permissions);
      if (result?.error) setError(result.error);
      else onClose();
    } catch {
      setError(t.genericError);
    } finally {
      setPending(false);
    }
  }

  const toggles: { key: keyof DesktopLocationPermissions; label: string; hint: string }[] = [
    { key: "read", label: t.read, hint: t.readHint },
    { key: "write", label: t.write, hint: t.writeHint },
    { key: "index", label: t.index, hint: t.indexHint },
  ];

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t.addTitle}</DialogTitle>
            <DialogDescription>{t.addBody}</DialogDescription>
          </DialogHeader>
          <Field invalid={showProblem}>
            <FieldLabel>{t.pathLabel}</FieldLabel>
            <div className="flex gap-2">
              <Input
                ltr
                value={path}
                onChange={(e) => setPath(e.target.value)}
                onBlur={() => setTouched(true)}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder={t.pathPlaceholder}
                className="min-w-0 flex-1 font-mono text-code"
                aria-describedby={showProblem ? `${id}-path` : undefined}
              />
              {onBrowse ? (
                <Button type="button" loading={browsing} onClick={browse}>
                  <FolderSearch aria-hidden />
                  {t.browse}
                </Button>
              ) : null}
            </div>
            {showProblem ? (
              <p id={`${id}-path`} role="alert" className="text-caption text-nq-danger-text">
                {problemText}
              </p>
            ) : null}
          </Field>
          {check.warning && check.other ? (
            <Alert tone="warning">
              <bdi dir="ltr" className="font-mono">
                {check.warning === "inside" ? t.warnInside(check.other) : t.warnContains(check.other)}
              </bdi>
            </Alert>
          ) : null}
          <div role="group" aria-label={t.permissions} className="grid gap-2">
            {toggles.map((x) => (
              <div key={x.key} className="flex items-center justify-between gap-3 rounded-control border border-border px-3 py-2">
                <label htmlFor={`${id}-${x.key}`} className="flex min-w-0 flex-col">
                  <span className="text-body-sm text-foreground">{x.label}</span>
                  <span className="text-caption text-muted-foreground">{x.hint}</span>
                </label>
                <Switch
                  id={`${id}-${x.key}`}
                  checked={permissions[x.key]}
                  disabled={x.key !== "read" && !permissions.read}
                  onCheckedChange={(checked) => setPermissions((p) => ({ ...p, [x.key]: checked, ...(x.key === "read" && !checked ? { write: false, index: false } : {}) }))}
                />
              </div>
            ))}
          </div>
          {error ? (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={pending} onClick={onClose}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={pending} disabled={touched && check.problem !== null}>
              {t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RemoveDialog({
  location,
  onConfirm,
  onClose,
  t,
}: {
  location: DesktopLocation;
  onConfirm: () => Promise<LocationResult>;
  onClose: () => void;
  t: DesktopLocationsLabels;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <AlertDialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.removeTitle(displayName(location))}</AlertDialogTitle>
          <AlertDialogDescription>{t.removeBody}</AlertDialogDescription>
        </AlertDialogHeader>
        <bdi dir="ltr" className="block break-all rounded-control border border-border bg-secondary p-2 font-mono text-code">
          {location.path}
        </bdi>
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
            {t.removeConfirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export interface DesktopLocationPickerProps {
  locations: readonly DesktopLocation[];
  /** The chosen location id. */
  value?: string | null;
  onValueChange: (id: string, location: DesktopLocation) => void;
  /** Only locations with this permission are selectable (default `read`). */
  requires?: keyof DesktopLocationPermissions;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
  labels?: Partial<DesktopLocationsLabels>;
}

/** A select for choosing one of the locations, e.g. where to save or which folder to open. Broken, denied or permission-less ones are listed but disabled. */
export function DesktopLocationPicker({ locations, value, onValueChange, requires = "read", disabled, placeholder, className, labels, "aria-label": ariaLabel }: DesktopLocationPickerProps) {
  const t = useLabels(labels);
  const items = locations.map((l) => ({ value: l.id, label: displayName(l) }));
  const usable = (l: DesktopLocation) => (l.status === "ready" || l.status === "indexing") && l.permissions[requires];
  const any = locations.some(usable);
  return (
    <Select items={items} value={value ?? null} disabled={disabled || !any} onValueChange={(v) => {
      const found = locations.find((l) => l.id === v);
      if (v && found) onValueChange(v, found);
    }}>
      <SelectTrigger className={className} aria-label={ariaLabel ?? t.pick}>
        <SelectValue placeholder={any ? (placeholder ?? t.pick) : t.pickEmpty} />
      </SelectTrigger>
      <SelectContent>
        {locations.map((l) => (
          <SelectItem key={l.id} value={l.id} disabled={!usable(l)}>
            <span className="flex min-w-0 flex-col">
              <span className="truncate">
                <bdi dir="auto">{displayName(l)}</bdi>
                {usable(l) ? null : <span className="ms-2 text-caption text-muted-foreground">{t.unavailable}</span>}
              </span>
              <bdi dir="ltr" className="truncate font-mono text-caption text-muted-foreground">
                {shortenPath(l.path, 40)}
              </bdi>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
