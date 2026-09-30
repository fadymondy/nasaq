"use client";

import { CircleAlert, FileIcon, ImageIcon, RotateCw, Upload, X } from "lucide-react";
import {
  type ComponentProps,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { formatNumber } from "../numeric";
import { Progress } from "../progress";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    prompt: "Drag files here or click to browse",
    promptImage: "Add an image",
    dropping: "Drop to add",
    accepted: (types: string) => `Accepted: ${types}`,
    upTo: (size: string) => `Up to ${size} each`,
    remove: (name: string) => `Remove ${name}`,
    retry: (name: string) => `Retry ${name}`,
    replace: "Replace image",
    removeImage: "Remove image",
    list: "Files",
    pending: "Waiting",
    uploading: "Uploading",
    done: "Uploaded",
    error: "Failed",
    tooLarge: (name: string, max: string) => `${name} is larger than ${max}.`,
    wrongType: (name: string) => `${name} is not an accepted file type.`,
    tooMany: (name: string, max: number) => `${name} was not added: the limit is ${max} ${max === 1 ? "file" : "files"}.`,
    units: ["B", "KB", "MB", "GB", "TB"],
  },
  ar: {
    prompt: "اسحب الملفات إلى هنا أو انقر للاستعراض",
    promptImage: "أضف صورة",
    dropping: "أفلت لإضافة الملفات",
    accepted: (types: string) => `المسموح: ${types}`,
    upTo: (size: string) => `حتى ${size} للملف`,
    remove: (name: string) => `إزالة ${name}`,
    retry: (name: string) => `إعادة محاولة ${name}`,
    replace: "استبدال الصورة",
    removeImage: "إزالة الصورة",
    list: "الملفات",
    pending: "في الانتظار",
    uploading: "جارٍ الرفع",
    done: "تم الرفع",
    error: "فشل",
    tooLarge: (name: string, max: string) => `حجم ${name} أكبر من ${max}.`,
    wrongType: (name: string) => `نوع الملف ${name} غير مقبول.`,
    tooMany: (name: string, max: number) => `لم تتم إضافة ${name}: الحد الأقصى ${formatNumber(max, "ar")} ملف.`,
    units: ["ب", "ك.ب", "م.ب", "ج.ب", "ت.ب"],
  },
};

function useStrings() {
  const locale = useOptionalNasaq()?.locale ?? "en";
  return { locale, t: STRINGS[locale.startsWith("ar") ? "ar" : "en"] };
}

/* ------------------------------------------------------------------ helpers */

/** "1.5 MB" with Nasaq number formatting (Western digits by default) and Arabic units in Arabic. */
export function formatFileSize(bytes: number, locale = "en") {
  const units = STRINGS[locale.startsWith("ar") ? "ar" : "en"].units;
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${formatNumber(value, locale, { maximumFractionDigits: i === 0 ? 0 : 1 })} ${units[i]}`;
}

/** Does `file` satisfy an `accept` string like "image/*,.pdf,application/zip"? Empty accept matches all. */
export function matchesAccept(file: Pick<File, "name" | "type">, accept?: string) {
  if (!accept) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return accept
    .split(",")
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean)
    .some((rule) => {
      if (rule.startsWith(".")) return name.endsWith(rule);
      if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1));
      return type === rule;
    });
}

export type RejectionCode = "too-large" | "wrong-type" | "too-many";

export interface FileRejection {
  file: File;
  code: RejectionCode;
  /** Localised, ready to show. */
  message: string;
}

export interface FileRules {
  /** Native `accept` syntax: "image/*,.pdf". */
  accept?: string;
  /** Largest allowed file, in bytes. */
  maxSize?: number;
  /** Largest number of files in total (already-added files count). */
  maxFiles?: number;
}

function validate(files: File[], rules: FileRules, existing: number, locale: string) {
  const t = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  const accepted: File[] = [];
  const rejected: FileRejection[] = [];
  for (const file of files) {
    if (!matchesAccept(file, rules.accept)) {
      rejected.push({ file, code: "wrong-type", message: t.wrongType(file.name) });
    } else if (rules.maxSize !== undefined && file.size > rules.maxSize) {
      rejected.push({ file, code: "too-large", message: t.tooLarge(file.name, formatFileSize(rules.maxSize, locale)) });
    } else if (rules.maxFiles !== undefined && existing + accepted.length >= rules.maxFiles) {
      rejected.push({ file, code: "too-many", message: t.tooMany(file.name, rules.maxFiles) });
    } else {
      accepted.push(file);
    }
  }
  return { accepted, rejected };
}

let seq = 0;
const nextId = () => `upl-${Date.now().toString(36)}-${++seq}`;

/** An object URL for `file`, revoked when the file changes or the component unmounts. */
export function useObjectUrl(file: File | Blob | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

/* ------------------------------------------------------------------ dropzone */

export interface DropzoneProps extends Omit<ComponentProps<"div">, "onDrop" | "children"> {
  /** Called with the files that passed validation. */
  onFiles: (files: File[]) => void;
  /** Called after every drop or pick with the files that did not pass (an empty array when all did). */
  onReject?: (rejections: FileRejection[]) => void;
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  /** How many files are already added, so `maxFiles` counts them. Default 0. */
  count?: number;
  /** Allow choosing several files. Default true. */
  multiple?: boolean;
  disabled?: boolean;
  /** Replaces the prompt text. Localise it yourself when you do. */
  children?: ReactNode;
  /** Marks the zone invalid (shows the danger border). */
  invalid?: boolean;
  /** Extra props for the hidden file input, e.g. `name` or `aria-label`. */
  inputProps?: Omit<ComponentProps<"input">, "type" | "accept" | "multiple" | "onChange">;
}

/**
 * A target for files: click it, press Enter or Space, or drop files on it. It validates `accept`,
 * `maxSize` and `maxFiles` and hands you the good files and the rejected ones.
 */
export function Dropzone({
  onFiles,
  onReject,
  accept,
  maxSize,
  maxFiles,
  count = 0,
  multiple = true,
  disabled,
  invalid,
  children,
  inputProps,
  className,
  onClick,
  onKeyDown,
  ...props
}: DropzoneProps) {
  const { locale, t } = useStrings();
  const inputRef = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const hintId = useId();
  const limit = multiple ? maxFiles : 1;

  const handle = useCallback(
    (list: FileList | File[] | null) => {
      const files = list ? Array.from(list) : [];
      if (!files.length) return;
      // Single mode replaces rather than appends, so the existing count does not block it.
      const { accepted, rejected } = validate(files, { accept, maxSize, maxFiles: limit }, multiple ? count : 0, locale);
      if (accepted.length) onFiles(accepted);
      onReject?.(rejected);
    },
    [accept, maxSize, limit, multiple, count, locale, onFiles, onReject],
  );

  const open = () => {
    if (!disabled) inputRef.current?.click();
  };

  function onDragEnter(e: DragEvent<HTMLDivElement>) {
    if (disabled || !e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    depth.current++;
    setDragging(true);
  }
  function onDragLeave() {
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setDragging(false);
  }
  function onDropEvent(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    depth.current = 0;
    setDragging(false);
    if (!disabled) handle(e.dataTransfer.files);
  }

  const limits = [accept ? t.accepted(accept) : null, maxSize !== undefined ? t.upTo(formatFileSize(maxSize, locale)) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      data-slot="dropzone"
      data-dragging={dragging || undefined}
      data-disabled={disabled || undefined}
      data-invalid={invalid || undefined}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      aria-describedby={limits ? hintId : undefined}
      className={cn(
        "flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-floating border border-dashed border-input bg-card p-6 text-center",
        "transition-colors duration-150 ease-nq outline-none",
        "hover:bg-nq-hover focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus",
        "data-dragging:border-nq-focus data-dragging:bg-nq-selected",
        "data-invalid:border-nq-danger",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:hover:bg-card",
        className,
      )}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) open();
      }}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(e);
        if (e.defaultPrevented || e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      onDragEnter={onDragEnter}
      onDragOver={(e) => {
        if (!disabled) e.preventDefault();
      }}
      onDragLeave={onDragLeave}
      onDrop={onDropEvent}
      {...props}
    >
      <Upload aria-hidden className="size-6 text-muted-foreground" />
      <span className="text-label text-foreground">{children ?? (dragging ? t.dropping : t.prompt)}</span>
      {limits ? (
        <span id={hintId} dir="auto" className="text-caption text-muted-foreground">
          {limits}
        </span>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          handle(e.currentTarget.files);
          e.currentTarget.value = "";
        }}
        {...inputProps}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ file list */

export type UploadStatus = "pending" | "uploading" | "done" | "error";

export interface UploadFile {
  id: string;
  file: File;
  status: UploadStatus;
  /** 0 to 100. `null` shows an indeterminate bar while the length is unknown. */
  progress: number | null;
  /** Shown under the file when `status` is "error". Localise it. */
  error?: string;
}

export interface UploadListItemProps extends Omit<ComponentProps<"li">, "children"> {
  item: UploadFile;
  onRemove?: (item: UploadFile) => void;
  onRetry?: (item: UploadFile) => void;
}

/** One row: icon, name, size, status, a Progress while it is not done, and remove / retry buttons. */
export function UploadListItem({ item, onRemove, onRetry, className, ...props }: UploadListItemProps) {
  const { locale, t } = useStrings();
  const { file, status, progress, error } = item;
  const isImage = file.type.startsWith("image/");
  const statusText = t[status];
  return (
    <li
      data-slot="file-list-item"
      data-status={status}
      className={cn("flex flex-col gap-2 rounded-control border border-border bg-card p-3", "data-[status=error]:border-nq-danger", className)}
      {...props}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-nq-surface-soft text-muted-foreground">
          {status === "error" ? (
            <CircleAlert aria-hidden className="size-4 text-nq-danger-text" />
          ) : isImage ? (
            <ImageIcon aria-hidden className="size-4" />
          ) : (
            <FileIcon aria-hidden className="size-4" />
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <bdi data-slot="file-list-name" className="truncate text-label text-foreground" title={file.name}>
            {file.name}
          </bdi>
          <span className="text-caption text-muted-foreground tabular-nums">
            {formatFileSize(file.size, locale)} · {statusText}
          </span>
        </div>
        {status === "error" && onRetry ? (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t.retry(file.name)} onClick={() => onRetry(item)}>
            <RotateCw aria-hidden />
          </Button>
        ) : null}
        {onRemove ? (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t.remove(file.name)} onClick={() => onRemove(item)}>
            <X aria-hidden />
          </Button>
        ) : null}
      </div>
      {status === "uploading" || status === "pending" ? (
        <Progress value={status === "pending" ? 0 : progress} size="sm" aria-label={`${file.name} · ${statusText}`} />
      ) : null}
      {status === "error" && error ? <p className="text-caption text-nq-danger-text">{error}</p> : null}
    </li>
  );
}

export interface UploadListProps extends Omit<ComponentProps<"ul">, "children"> {
  items: readonly UploadFile[];
  onRemove?: (item: UploadFile) => void;
  onRetry?: (item: UploadFile) => void;
}

/** The uploaded and uploading files. Renders nothing when empty. */
export function UploadList({ items, onRemove, onRetry, className, ...props }: UploadListProps) {
  const { t } = useStrings();
  if (!items.length) return null;
  return (
    <ul data-slot="file-list" aria-label={t.list} className={cn("flex flex-col gap-2", className)} {...props}>
      {items.map((item) => (
        <UploadListItem key={item.id} item={item} onRemove={onRemove} onRetry={onRetry} />
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ FileUpload */

export interface FileUploadControls {
  /** Patch one file's state: `update(id, { status: "uploading", progress: 40 })`. */
  update: (id: string, patch: Partial<Omit<UploadFile, "id" | "file">>) => void;
  remove: (id: string) => void;
}

export interface FileUploadProps extends FileRules, Omit<ComponentProps<"div">, "defaultValue" | "onChange"> {
  /** Controlled files. Omit to let the component own the list. */
  value?: readonly UploadFile[];
  defaultValue?: readonly UploadFile[];
  onValueChange?: (files: UploadFile[]) => void;
  /**
   * Called with the newly added files (status "pending"). Start the upload here and report progress
   * through `controls.update`. The component never sends anything itself.
   */
  onFiles?: (added: UploadFile[], controls: FileUploadControls) => void;
  /** Called when the retry button of a failed file is pressed. Restart the upload and call `controls.update`. */
  onRetry?: (item: UploadFile, controls: FileUploadControls) => void;
  /** Called after a file is removed from the list. Cancel its request here. */
  onRemove?: (item: UploadFile) => void;
  multiple?: boolean;
  disabled?: boolean;
  /** Replaces the dropzone prompt. */
  children?: ReactNode;
}

/**
 * Dropzone plus file list. The consumer owns the transport: `onFiles` receives the new files and reports
 * progress by calling `controls.update`. Works controlled (`value` + `onValueChange`) or uncontrolled.
 */
export function FileUpload({
  value,
  defaultValue,
  onValueChange,
  onFiles,
  onRetry,
  onRemove,
  accept,
  maxSize,
  maxFiles,
  multiple = true,
  disabled,
  children,
  className,
  ...props
}: FileUploadProps) {
  const [inner, setInner] = useState<readonly UploadFile[]>(defaultValue ?? []);
  const controlled = value !== undefined;
  const items = controlled ? value : inner;
  const latest = useRef<readonly UploadFile[]>(items);
  latest.current = items;
  const [rejections, setRejections] = useState<FileRejection[]>([]);

  const commit = useCallback(
    (next: UploadFile[]) => {
      latest.current = next;
      if (!controlled) setInner(next);
      onValueChange?.(next);
    },
    [controlled, onValueChange],
  );

  const controls: FileUploadControls = {
    update: (id, patch) => commit(latest.current.map((f) => (f.id === id ? { ...f, ...patch } : f))),
    remove: (id) => commit(latest.current.filter((f) => f.id !== id)),
  };

  return (
    <div data-slot="file-upload" className={cn("flex flex-col gap-3", className)} {...props}>
      <Dropzone
        accept={accept}
        maxSize={maxSize}
        maxFiles={maxFiles}
        multiple={multiple}
        disabled={disabled}
        invalid={rejections.length > 0}
        count={items.length}
        onReject={setRejections}
        onFiles={(files) => {
          const added: UploadFile[] = files.map((file) => ({ id: nextId(), file, status: "pending", progress: 0 }));
          commit([...latest.current, ...added]);
          onFiles?.(added, controls);
        }}
      >
        {children}
      </Dropzone>
      {rejections.length ? (
        <ul data-slot="file-upload-errors" role="alert" className="flex flex-col gap-1 text-caption text-nq-danger-text">
          {rejections.map((r, i) => (
            <li key={`${r.file.name}-${i}`}>{r.message}</li>
          ))}
        </ul>
      ) : null}
      <UploadList
        items={items}
        onRemove={(item) => {
          controls.remove(item.id);
          onRemove?.(item);
        }}
        onRetry={(item) => onRetry?.(item, controls)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ ImageUpload */

export interface ImageUploadProps extends Omit<ComponentProps<"div">, "defaultValue" | "onChange"> {
  /** The chosen image. Controlled when set (use `null` for none). */
  value?: File | null;
  defaultValue?: File | null;
  onValueChange?: (file: File | null) => void;
  /** An already-saved image URL shown until a file is chosen (an existing avatar). */
  src?: string;
  /** Called when the user removes the image, including a saved `src`. */
  onRemove?: () => void;
  /** Native accept syntax. Default "image/*". */
  accept?: string;
  maxSize?: number;
  /** 0 to 100 while the consumer uploads the chosen image; `undefined` hides the bar. */
  progress?: number | null;
  /** Accessible description of the image, used as the preview's alt text. */
  alt?: string;
  disabled?: boolean;
  /** Replaces the dropzone prompt. */
  children?: ReactNode;
}

/** A single image with a thumbnail preview (an object URL, revoked on cleanup), replace and remove. */
export function ImageUpload({
  value,
  defaultValue,
  onValueChange,
  src,
  onRemove,
  accept = "image/*",
  maxSize,
  progress,
  alt = "",
  disabled,
  children,
  className,
  ...props
}: ImageUploadProps) {
  const { t } = useStrings();
  const [inner, setInner] = useState<File | null>(defaultValue ?? null);
  const controlled = value !== undefined;
  const file = controlled ? value : inner;
  const [removedSrc, setRemovedSrc] = useState(false);
  const [rejections, setRejections] = useState<FileRejection[]>([]);
  const url = useObjectUrl(file);
  const preview = url ?? (removedSrc ? null : (src ?? null));

  const set = (next: File | null) => {
    if (!controlled) setInner(next);
    onValueChange?.(next);
  };

  return (
    <div data-slot="image-upload" className={cn("flex flex-col items-start gap-2", className)} {...props}>
      {preview ? (
        <div
          data-slot="image-upload-preview"
          className="relative size-32 overflow-hidden rounded-floating border border-border bg-nq-surface-soft"
        >
          <img src={preview} alt={alt} className="size-full object-cover" />
          {progress !== undefined && progress !== null && progress < 100 ? (
            <div className="absolute inset-x-0 bottom-0 bg-card/80 p-2">
              <Progress value={progress} size="sm" aria-label={file?.name ?? (alt || t.uploading)} />
            </div>
          ) : null}
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            disabled={disabled}
            aria-label={t.removeImage}
            className="absolute end-1 top-1"
            onClick={() => {
              setRemovedSrc(true);
              set(null);
              onRemove?.();
            }}
          >
            <X aria-hidden />
          </Button>
        </div>
      ) : null}
      <Dropzone
        accept={accept}
        maxSize={maxSize}
        multiple={false}
        disabled={disabled}
        invalid={rejections.length > 0}
        className={preview ? "min-h-0 w-32 p-3" : "size-32 min-h-0 p-3"}
        onReject={setRejections}
        onFiles={(files) => set(files[0] ?? null)}
      >
        {children ?? (preview ? t.replace : t.promptImage)}
      </Dropzone>
      {rejections.length ? (
        <p role="alert" className="text-caption text-nq-danger-text">
          {rejections[0]?.message}
        </p>
      ) : null}
    </div>
  );
}
