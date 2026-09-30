"use client";

import { Camera, Trash2, Upload, ZoomIn, ZoomOut } from "lucide-react";
import {
  type ClipboardEvent,
  type ComponentProps,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Avatar } from "../avatar";
import { Button } from "../button";
import { formatFileSize, matchesAccept, useObjectUrl } from "../file-upload";
import { Progress } from "../progress";
import { Slider } from "../slider";
import {
  type CropState,
  clampCrop,
  cropRect,
  imagePlacement,
  initialCrop,
  MAX_ZOOM,
  MIN_ZOOM,
  outputName,
  outputSide,
  panCrop,
  zoomCrop,
} from "./crop-math";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    upload: "Upload photo",
    change: "Change photo",
    remove: "Remove photo",
    hint: (types: string, max: string) => `${types}, up to ${max}. You can also drop or paste an image.`,
    dropping: "Drop to use this photo",
    adjust: "Adjust your photo",
    viewport: "Photo position",
    instructions: "Drag the photo to move it. Arrow keys move it, plus and minus zoom.",
    zoom: "Zoom",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    save: "Save photo",
    cancel: "Cancel",
    uploading: "Uploading",
    images: "images",
    wrongType: (types: string) => `That file type is not supported. Use ${types}.`,
    tooLarge: (max: string) => `That photo is larger than ${max}.`,
    unreadable: "That image could not be read. Try another one.",
    saveFailed: "The photo could not be saved. Try again.",
    removeFailed: "The photo could not be removed. Try again.",
    saved: "Photo updated.",
    removed: "Photo removed.",
  },
  ar: {
    upload: "رفع صورة",
    change: "تغيير الصورة",
    remove: "إزالة الصورة",
    hint: (types: string, max: string) => `${types}، بحجم أقصاه ${max}. يمكنك أيضًا إفلات صورة أو لصقها.`,
    dropping: "أفلت لاستخدام هذه الصورة",
    adjust: "اضبط صورتك",
    viewport: "موضع الصورة",
    instructions: "اسحب الصورة لتحريكها. مفاتيح الأسهم تحركها، وزرّا الزائد والناقص للتكبير والتصغير.",
    zoom: "التكبير",
    zoomIn: "تكبير",
    zoomOut: "تصغير",
    save: "حفظ الصورة",
    cancel: "إلغاء",
    uploading: "جارٍ الرفع",
    images: "صور",
    wrongType: (types: string) => `نوع الملف غير مدعوم. استخدم ${types}.`,
    tooLarge: (max: string) => `حجم الصورة أكبر من ${max}.`,
    unreadable: "تعذّرت قراءة هذه الصورة. جرّب صورة أخرى.",
    saveFailed: "تعذّر حفظ الصورة. حاول مرة أخرى.",
    removeFailed: "تعذّرت إزالة الصورة. حاول مرة أخرى.",
    saved: "تم تحديث الصورة.",
    removed: "تمت إزالة الصورة.",
  },
};

type Labels = (typeof STRINGS)["en"];

const TYPE_NAMES: Record<string, string> = {
  "image/jpeg": "JPG",
  "image/jpg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/gif": "GIF",
  "image/avif": "AVIF",
};

/** "image/png,image/jpeg" becomes "PNG or JPG" (localised list). A wildcard reads as "images". */
function typeList(accept: string, locale: string, images: string) {
  const names = accept
    .split(",")
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean)
    .map((rule) => {
      if (rule === "image/*") return images;
      if (TYPE_NAMES[rule]) return TYPE_NAMES[rule];
      return rule.startsWith(".") ? rule.slice(1).toUpperCase() : (rule.split("/")[1] ?? rule).toUpperCase();
    });
  const unique = [...new Set(names)];
  try {
    return new Intl.ListFormat(locale, { style: "long", type: "disjunction" }).format(unique);
  } catch {
    return unique.join(", ");
  }
}

/* ------------------------------------------------------------------ export */

export type AvatarOutputType = "image/webp" | "image/png" | "image/jpeg";

/** Draws the square `rect` of `image` at `side` pixels and encodes it. */
function exportSquare(
  image: HTMLImageElement,
  rect: { sx: number; sy: number; side: number },
  side: number,
  type: AvatarOutputType,
  quality: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("canvas"));
  // JPEG has no alpha: paint white under transparent PNGs instead of letting them turn black.
  if (type === "image/jpeg") {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, side, side);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, rect.sx, rect.sy, rect.side, rect.side, 0, 0, side, side);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode"))), type, quality);
  });
}

/* ------------------------------------------------------------------ component */

export interface AvatarUploadControls {
  /** Report upload progress, 0 to 100. Without it the bar stays at 0 and the Save button spins. */
  onProgress: (percent: number) => void;
}

export interface AvatarUploadProps extends Omit<ComponentProps<"div">, "onChange" | "children"> {
  /** Display name: alt text and the initials shown when there is no photo. */
  name: string;
  /** The saved photo. Update it after `onChange` resolves. */
  src?: string;
  /**
   * Called with the cropped image (never the original). Upload it and resolve; reject (throw) to keep the
   * editor open and show the error. The error message is shown as is, so make it readable.
   */
  onChange: (file: File, controls: AvatarUploadControls) => Promise<void>;
  /** Called when the user removes the saved photo. Omit to hide the remove button. Reject to show an error. */
  onRemove?: () => Promise<void>;
  /** Native accept syntax. Default "image/png,image/jpeg,image/webp". */
  accept?: string;
  /** Largest file the user may pick, in bytes. Default 5 MB. */
  maxSize?: number;
  /** Edge of the exported square in pixels; never upscaled past the source. Default 256. */
  outputSize?: number;
  /** Exported image type. Default "image/webp". */
  outputType?: AvatarOutputType;
  /** 0 to 1, for webp and jpeg. Default 0.9. */
  quality?: number;
  /** Shape of the preview and the crop mask. The exported file is always a square. Default "circle". */
  shape?: "circle" | "square";
  /** Largest zoom of the crop. Default 4. */
  maxZoom?: number;
  disabled?: boolean;
  /** Override any built-in English or Arabic string. */
  labels?: Partial<Labels>;
}

/**
 * A profile photo with change, crop and remove. Pick by clicking, dropping or pasting; position it in a
 * square window with drag, arrow keys and a zoom slider; the crop is drawn on a canvas and handed to your
 * async `onChange` as a `File`. Nothing is sent by the component.
 */
export function AvatarUpload({
  name,
  src,
  onChange,
  onRemove,
  accept = "image/png,image/jpeg,image/webp",
  maxSize = 5 * 1024 * 1024,
  outputSize = 256,
  outputType = "image/webp",
  quality = 0.9,
  shape = "circle",
  maxZoom = MAX_ZOOM,
  disabled,
  labels,
  className,
  ...props
}: AvatarUploadProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t: Labels = { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels };
  const hintId = useId();
  const helpId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const depth = useRef(0);
  const drag = useRef<{ x: number; y: number; width: number } | null>(null);
  const mounted = useRef(true);

  const [file, setFile] = useState<File | null>(null);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [crop, setCrop] = useState<CropState>({ zoom: 1, cx: 0, cy: 0 });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"saving" | "removing" | null>(null);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [saved, setSaved] = useState<Blob | null>(null);
  const [removed, setRemoved] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // A new saved photo from the host replaces whatever was shown optimistically.
  useEffect(() => {
    setSaved(null);
    setRemoved(false);
  }, [src]);

  const sourceUrl = useObjectUrl(file);
  const savedUrl = useObjectUrl(saved);
  const current = removed ? undefined : (savedUrl ?? src);
  const editing = file !== null;
  const disabledAll = disabled || busy !== null;
  const types = typeList(accept, locale, t.images);

  const reset = () => {
    setFile(null);
    setNatural(null);
    setProgress(0);
  };

  const pick = (list: FileList | File[] | null | undefined) => {
    const next = list ? Array.from(list)[0] : undefined;
    if (!next || disabledAll) return;
    if (!matchesAccept(next, accept)) return setError(t.wrongType(types));
    if (next.size > maxSize) return setError(t.tooLarge(formatFileSize(maxSize, locale)));
    setError(null);
    setStatus("");
    setNatural(null);
    setFile(next);
  };

  const onImageLoad = () => {
    const img = imageRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) return;
    setNatural({ width: img.naturalWidth, height: img.naturalHeight });
    setCrop(initialCrop(img.naturalWidth, img.naturalHeight));
  };

  const update = (fn: (state: CropState, w: number, h: number) => CropState) => {
    if (!natural) return;
    setCrop((state) => fn(state, natural.width, natural.height));
  };

  const save = async () => {
    const image = imageRef.current;
    if (!image || !natural || busy) return;
    setBusy("saving");
    setError(null);
    setProgress(0);
    try {
      const rect = cropRect(crop, natural.width, natural.height);
      const blob = await exportSquare(image, rect, outputSide(rect, outputSize), outputType, quality);
      const output = new File([blob], outputName("avatar", blob.type || outputType), { type: blob.type || outputType });
      await onChange(output, { onProgress: (p) => mounted.current && setProgress(Math.max(0, Math.min(100, p))) });
      if (!mounted.current) return;
      setSaved(output);
      setRemoved(false);
      setStatus(t.saved);
      reset();
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (mounted.current) setError(message && message !== "encode" && message !== "canvas" ? message : t.saveFailed);
    } finally {
      if (mounted.current) setBusy(null);
    }
  };

  const removePhoto = async () => {
    if (!onRemove || busy) return;
    setBusy("removing");
    setError(null);
    try {
      await onRemove();
      if (!mounted.current) return;
      setSaved(null);
      setRemoved(true);
      setStatus(t.removed);
    } catch (e) {
      if (mounted.current) setError(e instanceof Error && e.message ? e.message : t.removeFailed);
    } finally {
      if (mounted.current) setBusy(null);
    }
  };

  /* pointer and keyboard on the crop window */
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (busy) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, width: e.currentTarget.getBoundingClientRect().width || 1 };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.x) / d.width;
    const dy = (e.clientY - d.y) / d.width;
    drag.current = { ...d, x: e.clientX, y: e.clientY };
    update((s, w, h) => panCrop(s, dx, dy, w, h, maxZoom));
  };
  const endDrag = () => {
    drag.current = null;
  };
  const onCropKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (busy || e.altKey || e.ctrlKey || e.metaKey) return;
    const step = e.shiftKey ? 0.15 : 0.04;
    // Arrow keys are physical: the picture moves the way the key points, in both reading directions.
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      update((s, w, h) => panCrop(s, move[0], move[1], w, h, maxZoom));
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      update((s, w, h) => zoomCrop(s, s.zoom + 0.15, w, h, maxZoom));
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      update((s, w, h) => zoomCrop(s, s.zoom - 0.15, w, h, maxZoom));
    }
  };

  /* drop and paste anywhere on the component */
  const onDragEnter = (e: DragEvent<HTMLDivElement>) => {
    if (disabledAll || !e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    depth.current++;
    setDragging(true);
  };
  const onDragLeave = () => {
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setDragging(false);
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    depth.current = 0;
    setDragging(false);
    pick(e.dataTransfer.files);
  };
  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const image = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
    if (!image) return;
    e.preventDefault();
    pick([image]);
  };

  const rounded = shape === "circle" ? "rounded-full" : "rounded-floating";
  const placement = natural
    ? imagePlacement(clampCrop(crop, natural.width, natural.height, maxZoom), natural.width, natural.height)
    : null;
  const uploading = busy === "saving";

  return (
    <div
      data-slot="avatar-upload"
      data-dragging={dragging || undefined}
      data-editing={editing || undefined}
      className={cn("flex flex-col gap-3", className)}
      onDragEnter={onDragEnter}
      onDragOver={(e) => {
        if (!disabledAll) e.preventDefault();
      }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onPaste={onPaste}
      {...props}
    >
      {editing ? (
        <div
          role="group"
          aria-label={t.adjust}
          data-slot="avatar-upload-editor"
          className="flex flex-col gap-4 rounded-floating border border-border bg-card p-4 sm:flex-row"
        >
          <div className="flex flex-col items-center gap-2">
            {/* The window is always left to right: pan and zoom maths are physical. */}
            <div
              dir="ltr"
              role="group"
              tabIndex={0}
              aria-label={t.viewport}
              aria-describedby={helpId}
              data-slot="avatar-upload-viewport"
              className={cn(
                "relative size-56 max-w-full shrink-0 cursor-grab touch-none select-none overflow-hidden bg-nq-surface-soft outline-none active:cursor-grabbing",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
                "rounded-control",
              )}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={onCropKeyDown}
            >
              {sourceUrl ? (
                <img
                  ref={imageRef}
                  src={sourceUrl}
                  alt=""
                  draggable={false}
                  onLoad={onImageLoad}
                  onError={() => {
                    reset();
                    setError(t.unreadable);
                  }}
                  className="pointer-events-none absolute max-w-none"
                  style={
                    placement
                      ? {
                          width: `${placement.width}%`,
                          height: `${placement.height}%`,
                          left: `${placement.left}%`,
                          top: `${placement.top}%`,
                        }
                      : { visibility: "hidden" }
                  }
                />
              ) : null}
              <span
                aria-hidden="true"
                className={cn("pointer-events-none absolute inset-0 border border-nq-fg/30", rounded)}
                style={{ boxShadow: "0 0 0 100vmax color-mix(in oklab, var(--nq-fg) 45%, transparent)" }}
              />
            </div>
            <p id={helpId} className="max-w-56 text-center text-caption text-muted-foreground">
              {t.instructions}
            </p>
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t.zoomOut}
                disabled={busy !== null || !natural || crop.zoom <= MIN_ZOOM}
                onClick={() => update((s, w, h) => zoomCrop(s, s.zoom - 0.25, w, h, maxZoom))}
              >
                <ZoomOut aria-hidden="true" />
              </Button>
              <Slider
                aria-label={t.zoom}
                min={MIN_ZOOM}
                max={maxZoom}
                step={0.01}
                value={crop.zoom}
                disabled={busy !== null || !natural}
                format={{ style: "percent", maximumFractionDigits: 0 }}
                onValueChange={(v) =>
                  update((s, w, h) => zoomCrop(s, Array.isArray(v) ? (v[0] ?? s.zoom) : v, w, h, maxZoom))
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t.zoomIn}
                disabled={busy !== null || !natural || crop.zoom >= maxZoom}
                onClick={() => update((s, w, h) => zoomCrop(s, s.zoom + 0.25, w, h, maxZoom))}
              >
                <ZoomIn aria-hidden="true" />
              </Button>
            </div>
            <div className="flex flex-col gap-3">
              {uploading ? <Progress value={progress} size="sm" aria-label={t.uploading} /> : null}
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="ghost" disabled={busy !== null} onClick={reset}>
                  {t.cancel}
                </Button>
                <Button type="button" variant="primary" loading={uploading} disabled={!natural} onClick={save}>
                  {t.save}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div data-slot="avatar-upload-idle" className="flex items-center gap-4">
          <button
            type="button"
            data-slot="avatar-upload-trigger"
            aria-label={current ? t.change : t.upload}
            aria-describedby={hintId}
            disabled={disabledAll}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "group relative shrink-0 outline-none",
              rounded,
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <Avatar name={name} src={current} shape={shape} className="size-20 text-h3" />
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-0 flex items-center justify-center bg-nq-fg/50 text-nq-bg opacity-0 transition-opacity duration-150 ease-nq",
                "group-hover:opacity-100 group-focus-visible:opacity-100 group-disabled:hidden",
                dragging && "border-2 border-dashed border-nq-focus opacity-100",
                rounded,
              )}
            >
              <Camera className="size-5" />
            </span>
          </button>
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={disabledAll} onClick={() => inputRef.current?.click()}>
                <Upload aria-hidden="true" />
                {current ? t.change : t.upload}
              </Button>
              {current && onRemove ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  loading={busy === "removing"}
                  disabled={disabled || busy === "saving"}
                  onClick={removePhoto}
                >
                  <Trash2 aria-hidden="true" />
                  {t.remove}
                </Button>
              ) : null}
            </div>
            <p id={hintId} className="text-caption text-muted-foreground">
              {dragging ? t.dropping : t.hint(types, formatFileSize(maxSize, locale))}
            </p>
          </div>
        </div>
      )}
      {error ? (
        <p role="alert" data-slot="avatar-upload-error" className="text-caption text-nq-danger-text">
          {error}
        </p>
      ) : null}
      <span role="status" className="sr-only">
        {status}
      </span>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        accept={accept}
        disabled={disabledAll}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          pick(e.currentTarget.files);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}
