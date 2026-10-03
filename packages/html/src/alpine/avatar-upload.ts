// nqAvatarUpload: a profile photo with change, crop and remove. Pick by clicking, dropping or pasting; position the photo in a square
// window with drag, arrow keys and a zoom slider; the crop is drawn on a canvas and handed to your listener as a File. Nothing is sent
// by the component. The markup is the React AvatarUpload's (see the Blade component); the crop maths are the same.
//
//   <div data-slot="avatar-upload" x-data="nqAvatarUpload({ name: 'Sara', src: '/me.png', accept: 'image/png,image/jpeg', labels })"
//        @nq-avatar-change="$event.detail.promise = upload($event.detail.file, $event.detail.onProgress)"
//        @nq-avatar-remove="$event.detail.promise = removeAvatar()"> … </div>
//
// "nq-avatar-change" bubbles with { file, onProgress(percent), promise? }: a listener sets `event.detail.promise` to a Promise; reject
// (or resolve to { error }) to keep the editor open and show the message. "nq-avatar-remove" bubbles with { promise? } the same way.
// Without a listener a save succeeds on the spot. Options: name, src, accept, maxSize (bytes), outputSize, outputType, quality, maxZoom,
// disabled, locale, labels (see the Blade component for the keys; "{types}" and "{max}" are filled in hint, wrongType, tooLarge).

import type { Magics, Register } from "./types";

const MIN_ZOOM = 1;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

interface Crop {
  zoom: number;
  cx: number;
  cy: number;
}

const cropSide = (w: number, h: number, zoom: number, maxZoom: number) => Math.min(w, h) / clamp(zoom, MIN_ZOOM, maxZoom);
function clampCrop(c: Crop, w: number, h: number, maxZoom: number): Crop {
  const zoom = clamp(Number.isFinite(c.zoom) ? c.zoom : MIN_ZOOM, MIN_ZOOM, maxZoom);
  const half = cropSide(w, h, zoom, maxZoom) / 2;
  return { zoom, cx: clamp(c.cx, half, w - half), cy: clamp(c.cy, half, h - half) };
}

const EXTENSIONS: Record<string, string> = { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg" };
const TYPE_NAMES: Record<string, string> = { "image/jpeg": "JPG", "image/jpg": "JPG", "image/png": "PNG", "image/webp": "WebP", "image/gif": "GIF", "image/avif": "AVIF" };

function matchesAccept(file: Pick<File, "name" | "type">, accept: string) {
  if (!accept) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return accept
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean)
    .some((rule) => (rule.startsWith(".") ? name.endsWith(rule) : rule.endsWith("/*") ? type.startsWith(rule.slice(0, -1)) : type === rule));
}

interface Options {
  name?: string;
  src?: string;
  accept?: string;
  maxSize?: number;
  outputSize?: number;
  outputType?: string;
  quality?: number;
  maxZoom?: number;
  disabled?: boolean;
  locale?: string;
  labels?: Record<string, string>;
}

interface State extends Magics {
  name: string;
  src: string;
  accept: string;
  maxSize: number;
  outputSize: number;
  outputType: string;
  quality: number;
  maxZoom: number;
  disabled: boolean;
  locale: string;
  labels: Record<string, string>;
  file: File | null;
  sourceUrl: string | null;
  savedFile: File | null;
  savedUrl: string | null;
  removed: boolean;
  natural: { width: number; height: number } | null;
  zoom: number;
  cx: number;
  cy: number;
  error: string | null;
  busy: "" | "saving" | "removing";
  progress: number;
  dragging: boolean;
  status: string;
  depth: number;
  drag: { x: number; y: number; width: number } | null;
  root: HTMLElement | null;
  readonly current: string | null;
  readonly editing: boolean;
  readonly locked: boolean;
  reset(): void;
  update(next: Partial<Crop>): void;
  pan(dx: number, dy: number): void;
  setZoom(z: number): void;
  pick(list: FileList | File[] | null | undefined): void;
}

export const avatarUpload: Register = (Alpine) => {
  Alpine.data("nqAvatarUpload", (options: Options = {}) => ({
    name: options.name ?? "",
    src: options.src ?? "",
    accept: options.accept ?? "image/png,image/jpeg,image/webp",
    maxSize: options.maxSize ?? 5 * 1024 * 1024,
    outputSize: options.outputSize ?? 256,
    outputType: options.outputType ?? "image/webp",
    quality: options.quality ?? 0.9,
    maxZoom: options.maxZoom ?? 4,
    disabled: options.disabled ?? false,
    locale: options.locale ?? (typeof document !== "undefined" ? document.documentElement.lang || "en" : "en"),
    labels: options.labels ?? {},
    file: null as File | null,
    sourceUrl: null as string | null,
    savedFile: null as File | null,
    savedUrl: null as string | null,
    removed: false,
    natural: null as { width: number; height: number } | null,
    zoom: 1,
    cx: 0,
    cy: 0,
    error: null as string | null,
    busy: "" as "" | "saving" | "removing",
    progress: 0,
    dragging: false,
    status: "",
    depth: 0,
    drag: null as { x: number; y: number; width: number } | null,
    root: null as HTMLElement | null,

    init(this: State) {
      this.root = this.$el;
      this.$watch("zoom", () => this.update({}));
    },
    destroy(this: State) {
      if (this.sourceUrl) URL.revokeObjectURL(this.sourceUrl);
      if (this.savedUrl) URL.revokeObjectURL(this.savedUrl);
    },

    get current(): string | null {
      const s = this as unknown as State;
      return s.removed ? null : (s.savedUrl ?? (s.src || null));
    },
    get editing(): boolean {
      return (this as unknown as State).file !== null;
    },
    get locked(): boolean {
      const s = this as unknown as State;
      return s.disabled || s.busy !== "";
    },
    get uploading(): boolean {
      return (this as unknown as State).busy === "saving";
    },
    get initials(): string {
      const words = (this as unknown as State).name.trim().split(/\s+/).filter(Boolean);
      const first = (w: string) => Array.from(w)[0] ?? "";
      return ((words[0] ? first(words[0]) : "") + (words.length > 1 ? first(words[words.length - 1]!) : "")).toLocaleUpperCase();
    },
    get types(): string {
      const s = this as unknown as State;
      const names = s.accept
        .split(",")
        .map((r) => r.trim().toLowerCase())
        .filter(Boolean)
        .map((rule) => {
          if (rule === "image/*") return s.labels.images ?? "images";
          if (TYPE_NAMES[rule]) return TYPE_NAMES[rule]!;
          return rule.startsWith(".") ? rule.slice(1).toUpperCase() : (rule.split("/")[1] ?? rule).toUpperCase();
        });
      const unique = [...new Set(names)];
      try {
        return new Intl.ListFormat(s.locale, { style: "long", type: "disjunction" }).format(unique);
      } catch {
        return unique.join(", ");
      }
    },
    get maxText(): string {
      const s = this as unknown as State;
      const units = (s.labels.units ?? "B,KB,MB,GB,TB").split(",");
      let v = s.maxSize;
      let i = 0;
      while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i++;
      }
      return `${new Intl.NumberFormat(`${s.locale}-u-nu-latn`, { maximumFractionDigits: i === 0 ? 0 : 1 }).format(v)} ${units[i]}`;
    },
    get hintText(): string {
      const s = this as unknown as State & { types: string; maxText: string };
      return s.dragging ? (s.labels.dropping ?? "") : (s.labels.hint ?? "").replace("{types}", s.types).replace("{max}", s.maxText);
    },
    get placement(): { width: number; height: number; left: number; top: number } | null {
      const s = this as unknown as State;
      if (!s.natural) return null;
      const { width: w, height: h } = s.natural;
      const c = clampCrop({ zoom: s.zoom, cx: s.cx, cy: s.cy }, w, h, s.maxZoom);
      const side = cropSide(w, h, c.zoom, s.maxZoom);
      return { width: (w / side) * 100, height: (h / side) * 100, left: (0.5 - c.cx / side) * 100, top: (0.5 - c.cy / side) * 100 };
    },
    get imageStyle(): string {
      const p = (this as unknown as { placement: ReturnType<() => { width: number; height: number; left: number; top: number } | null> }).placement;
      return p ? `width: ${p.width}%; height: ${p.height}%; left: ${p.left}%; top: ${p.top}%` : "visibility: hidden";
    },
    get zoomPercent(): number {
      return (this as unknown as State).zoom;
    },

    reset(this: State) {
      if (this.sourceUrl) URL.revokeObjectURL(this.sourceUrl);
      this.sourceUrl = null;
      this.file = null;
      this.natural = null;
      this.progress = 0;
    },
    openPicker(this: State) {
      (this.$refs.input as HTMLInputElement | undefined)?.click();
    },
    pick(this: State, list: FileList | File[] | null | undefined) {
      const next = list ? Array.from(list)[0] : undefined;
      if (!next || this.locked) return;
      if (!matchesAccept(next, this.accept)) {
        this.error = (this.labels.wrongType ?? "").replace("{types}", (this as unknown as { types: string }).types);
        return;
      }
      if (next.size > this.maxSize) {
        this.error = (this.labels.tooLarge ?? "").replace("{max}", (this as unknown as { maxText: string }).maxText);
        return;
      }
      this.error = null;
      this.status = "";
      this.natural = null;
      if (this.sourceUrl) URL.revokeObjectURL(this.sourceUrl);
      this.sourceUrl = URL.createObjectURL(next);
      this.file = next;
    },
    onInput(this: State, e: Event) {
      const input = e.currentTarget as HTMLInputElement;
      this.pick(input.files);
      input.value = "";
    },
    onImageLoad(this: State) {
      const img = this.$refs.image as HTMLImageElement | undefined;
      if (!img || !img.naturalWidth || !img.naturalHeight) return;
      this.natural = { width: img.naturalWidth, height: img.naturalHeight };
      this.zoom = MIN_ZOOM;
      this.cx = img.naturalWidth / 2;
      this.cy = img.naturalHeight / 2;
    },
    onImageError(this: State) {
      this.reset();
      this.error = this.labels.unreadable ?? "";
    },
    update(this: State, next: Partial<Crop>) {
      if (!this.natural) return;
      const c = clampCrop({ zoom: this.zoom, cx: this.cx, cy: this.cy, ...next }, this.natural.width, this.natural.height, this.maxZoom);
      this.zoom = c.zoom;
      this.cx = c.cx;
      this.cy = c.cy;
    },
    setZoom(this: State, z: number) {
      this.update({ zoom: Number(z) });
    },
    pan(this: State, dx: number, dy: number) {
      if (!this.natural) return;
      const side = cropSide(this.natural.width, this.natural.height, this.zoom, this.maxZoom);
      this.update({ cx: this.cx - dx * side, cy: this.cy - dy * side });
    },

    /* the crop window */
    pointerDown(this: State, e: PointerEvent) {
      if (this.busy) return;
      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture?.(e.pointerId);
      this.drag = { x: e.clientX, y: e.clientY, width: el.getBoundingClientRect().width || 1 };
    },
    pointerMove(this: State, e: PointerEvent) {
      const d = this.drag;
      if (!d) return;
      const dx = (e.clientX - d.x) / d.width;
      const dy = (e.clientY - d.y) / d.width;
      this.drag = { ...d, x: e.clientX, y: e.clientY };
      this.pan(dx, dy);
    },
    endDrag(this: State) {
      this.drag = null;
    },
    cropKey(this: State, e: KeyboardEvent) {
      if (this.busy || e.altKey || e.ctrlKey || e.metaKey) return;
      const step = e.shiftKey ? 0.15 : 0.04;
      // Arrow keys are physical: the picture moves the way the key points, in both reading directions.
      const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      const move = moves[e.key];
      if (move) {
        e.preventDefault();
        this.pan(move[0], move[1]);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        this.setZoom(this.zoom + 0.15);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        this.setZoom(this.zoom - 0.15);
      }
    },

    /* drop and paste anywhere on the component */
    dragEnter(this: State, e: DragEvent) {
      if (this.locked || !e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      this.depth++;
      this.dragging = true;
    },
    dragOver(this: State, e: DragEvent) {
      if (!this.locked) e.preventDefault();
    },
    dragLeave(this: State) {
      this.depth = Math.max(0, this.depth - 1);
      if (this.depth === 0) this.dragging = false;
    },
    drop(this: State, e: DragEvent) {
      e.preventDefault();
      this.depth = 0;
      this.dragging = false;
      this.pick(e.dataTransfer?.files);
    },
    paste(this: State, e: ClipboardEvent) {
      const image = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith("image/"));
      if (!image) return;
      e.preventDefault();
      this.pick([image]);
    },

    async save(this: State) {
      const image = this.$refs.image as HTMLImageElement | undefined;
      if (!image || !this.natural || this.busy) return;
      this.busy = "saving";
      this.error = null;
      this.progress = 0;
      try {
        const { width: w, height: h } = this.natural;
        const c = clampCrop({ zoom: this.zoom, cx: this.cx, cy: this.cy }, w, h, this.maxZoom);
        const side = cropSide(w, h, c.zoom, this.maxZoom);
        const out = Math.max(1, Math.min(Math.round(this.outputSize), Math.round(side)));
        const canvas = document.createElement("canvas");
        canvas.width = out;
        canvas.height = out;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas");
        if (this.outputType === "image/jpeg") {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, out, out);
        }
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(image, c.cx - side / 2, c.cy - side / 2, side, side, 0, 0, out, out);
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), this.outputType, this.quality));
        const type = blob.type || this.outputType;
        const output = new File([blob], `avatar.${EXTENSIONS[type.toLowerCase()] ?? "png"}`, { type });
        const detail: { file: File; onProgress: (p: number) => void; promise?: Promise<unknown> | unknown } = {
          file: output,
          onProgress: (p) => (this.progress = clamp(Number(p) || 0, 0, 100)),
        };
        this.root?.dispatchEvent(new CustomEvent("nq-avatar-change", { bubbles: true, detail }));
        const r = (await detail.promise) as { error?: string } | undefined | void;
        if (r && typeof r === "object" && r.error) throw new Error(r.error);
        if (this.savedUrl) URL.revokeObjectURL(this.savedUrl);
        this.savedFile = output;
        this.savedUrl = URL.createObjectURL(output);
        this.removed = false;
        this.status = this.labels.saved ?? "";
        this.reset();
      } catch (e) {
        const message = e instanceof Error ? e.message : "";
        this.error = message && message !== "encode" && message !== "canvas" ? message : (this.labels.saveFailed ?? "");
      }
      this.busy = "";
    },
    async removePhoto(this: State) {
      if (this.busy) return;
      this.busy = "removing";
      this.error = null;
      try {
        const detail: { promise?: Promise<unknown> | unknown } = {};
        this.root?.dispatchEvent(new CustomEvent("nq-avatar-remove", { bubbles: true, detail }));
        const r = (await detail.promise) as { error?: string } | undefined | void;
        if (r && typeof r === "object" && r.error) throw new Error(r.error);
        if (this.savedUrl) URL.revokeObjectURL(this.savedUrl);
        this.savedFile = null;
        this.savedUrl = null;
        this.removed = true;
        this.status = this.labels.removed ?? "";
      } catch (e) {
        this.error = e instanceof Error && e.message ? e.message : (this.labels.removeFailed ?? "");
      }
      this.busy = "";
    },
  }));
};
