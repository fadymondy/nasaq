<script setup lang="ts">
import { Camera, Trash2, Upload, ZoomIn, ZoomOut } from "lucide-vue-next";
import { computed, onBeforeUnmount, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAvatar } from "../avatar";
import { NqButton } from "../button";
import { formatFileSize, matchesAccept, useObjectUrl } from "../file-upload";
import { NqProgress } from "../progress";
import { NqSlider } from "../slider";
import { clampCrop, cropRect, imagePlacement, initialCrop, MAX_ZOOM, MIN_ZOOM, outputName, outputSide, panCrop, zoomCrop, type CropState } from "./crop-math";
import { STRINGS, typeList, type AvatarUploadLabels } from "./strings";

export type AvatarOutputType = "image/webp" | "image/png" | "image/jpeg";
export interface AvatarUploadControls {
  /** Report upload progress, 0 to 100. Without it the bar stays at 0 and the Save button spins. */
  onProgress: (percent: number) => void;
}

// A profile photo with change, crop and remove. Pick by clicking, dropping or pasting; position it in a square window with drag,
// arrow keys and a zoom slider; the crop is drawn on a canvas and handed to your async `onChange` as a File. Nothing is sent
// by the component.
interface Props {
  /** Display name: alt text and the initials shown when there is no photo. */
  name: string;
  /** The saved photo. Update it after `onChange` resolves. */
  src?: string;
  /** Called with the cropped image (never the original). Upload it and resolve; reject (throw) to keep the editor open and show the error. */
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
  /** `row` a small photo beside the buttons (default). `stacked` a large photo with the buttons under it. */
  layout?: "row" | "stacked";
  /** Override any built-in English or Arabic string. */
  labels?: AvatarUploadLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  src: undefined,
  onRemove: undefined,
  accept: "image/png,image/jpeg,image/webp",
  maxSize: 5 * 1024 * 1024,
  outputSize: 256,
  outputType: "image/webp",
  quality: 0.9,
  shape: "circle",
  maxZoom: MAX_ZOOM,
  layout: "row",
  labels: undefined,
});

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => ({ ...STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const hintId = useId();
const helpId = useId();
const inputRef = ref<HTMLInputElement | null>(null);
const imageRef = ref<HTMLImageElement | null>(null);
let depth = 0;
let drag: { x: number; y: number; width: number } | null = null;
let alive = true;
onBeforeUnmount(() => (alive = false));

const file = ref<File | null>(null);
const natural = ref<{ width: number; height: number } | null>(null);
const crop = ref<CropState>({ zoom: 1, cx: 0, cy: 0 });
const error = ref<string | null>(null);
const busy = ref<"saving" | "removing" | null>(null);
const progress = ref(0);
const dragging = ref(false);
const saved = ref<Blob | null>(null);
const removed = ref(false);
const status = ref("");

// A new saved photo from the host replaces whatever was shown optimistically.
watch(
  () => props.src,
  () => {
    saved.value = null;
    removed.value = false;
  },
);

const sourceUrl = useObjectUrl(file);
const savedUrl = useObjectUrl(saved);
const current = computed(() => (removed.value ? undefined : (savedUrl.value ?? props.src)));
const editing = computed(() => file.value !== null);
const disabledAll = computed(() => props.disabled || busy.value !== null);
const types = computed(() => typeList(props.accept, locale.value, t.value.images));

function reset() {
  file.value = null;
  natural.value = null;
  progress.value = 0;
}

function pick(list: FileList | File[] | null | undefined) {
  const next = list ? Array.from(list)[0] : undefined;
  if (!next || disabledAll.value) return;
  if (!matchesAccept(next, props.accept)) return void (error.value = t.value.wrongType(types.value));
  if (next.size > props.maxSize) return void (error.value = t.value.tooLarge(formatFileSize(props.maxSize, locale.value)));
  error.value = null;
  status.value = "";
  natural.value = null;
  file.value = next;
}

function onImageLoad() {
  const img = imageRef.value;
  if (!img || !img.naturalWidth || !img.naturalHeight) return;
  natural.value = { width: img.naturalWidth, height: img.naturalHeight };
  crop.value = initialCrop(img.naturalWidth, img.naturalHeight);
}

function update(fn: (state: CropState, w: number, h: number) => CropState) {
  if (!natural.value) return;
  crop.value = fn(crop.value, natural.value.width, natural.value.height);
}

/** Draws the square `rect` of `image` at `side` pixels and encodes it. */
function exportSquare(image: HTMLImageElement, rect: { sx: number; sy: number; side: number }, side: number, type: AvatarOutputType, quality: number) {
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

async function save() {
  const image = imageRef.value;
  if (!image || !natural.value || busy.value) return;
  busy.value = "saving";
  error.value = null;
  progress.value = 0;
  try {
    const rect = cropRect(crop.value, natural.value.width, natural.value.height);
    const blob = await exportSquare(image, rect, outputSide(rect, props.outputSize), props.outputType, props.quality);
    const output = new File([blob], outputName("avatar", blob.type || props.outputType), { type: blob.type || props.outputType });
    await props.onChange(output, { onProgress: (p) => alive && (progress.value = Math.max(0, Math.min(100, p))) });
    if (!alive) return;
    saved.value = output;
    removed.value = false;
    status.value = t.value.saved;
    reset();
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (alive) error.value = message && message !== "encode" && message !== "canvas" ? message : t.value.saveFailed;
  } finally {
    if (alive) busy.value = null;
  }
}

async function removePhoto() {
  if (!props.onRemove || busy.value) return;
  busy.value = "removing";
  error.value = null;
  try {
    await props.onRemove();
    if (!alive) return;
    saved.value = null;
    removed.value = true;
    status.value = t.value.removed;
  } catch (e) {
    if (alive) error.value = e instanceof Error && e.message ? e.message : t.value.removeFailed;
  } finally {
    if (alive) busy.value = null;
  }
}

/* pointer and keyboard on the crop window */
function onPointerDown(e: PointerEvent) {
  if (busy.value) return;
  const el = e.currentTarget as HTMLElement;
  el.setPointerCapture?.(e.pointerId);
  drag = { x: e.clientX, y: e.clientY, width: el.getBoundingClientRect().width || 1 };
}
function onPointerMove(e: PointerEvent) {
  const d = drag;
  if (!d) return;
  const dx = (e.clientX - d.x) / d.width;
  const dy = (e.clientY - d.y) / d.width;
  drag = { ...d, x: e.clientX, y: e.clientY };
  update((s, w, h) => panCrop(s, dx, dy, w, h, props.maxZoom));
}
const endDrag = () => (drag = null);
function onCropKeyDown(e: KeyboardEvent) {
  if (busy.value || e.altKey || e.ctrlKey || e.metaKey) return;
  const step = e.shiftKey ? 0.15 : 0.04;
  // Arrow keys are physical: the picture moves the way the key points, in both reading directions.
  const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
  const move = moves[e.key];
  if (move) {
    e.preventDefault();
    update((s, w, h) => panCrop(s, move[0], move[1], w, h, props.maxZoom));
  } else if (e.key === "+" || e.key === "=") {
    e.preventDefault();
    update((s, w, h) => zoomCrop(s, s.zoom + 0.15, w, h, props.maxZoom));
  } else if (e.key === "-" || e.key === "_") {
    e.preventDefault();
    update((s, w, h) => zoomCrop(s, s.zoom - 0.15, w, h, props.maxZoom));
  }
}

/* drop and paste anywhere on the component */
function onDragEnter(e: DragEvent) {
  if (disabledAll.value || !e.dataTransfer?.types.includes("Files")) return;
  e.preventDefault();
  depth++;
  dragging.value = true;
}
function onDragLeave() {
  depth = Math.max(0, depth - 1);
  if (depth === 0) dragging.value = false;
}
function onDrop(e: DragEvent) {
  e.preventDefault();
  depth = 0;
  dragging.value = false;
  pick(e.dataTransfer?.files);
}
function onPaste(e: ClipboardEvent) {
  const image = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith("image/"));
  if (!image) return;
  e.preventDefault();
  pick([image]);
}
function onInputChange(e: Event) {
  const input = e.currentTarget as HTMLInputElement;
  pick(input.files);
  input.value = "";
}

const rounded = computed(() => (props.shape === "circle" ? "rounded-full" : "rounded-floating"));
const placement = computed(() => (natural.value ? imagePlacement(clampCrop(crop.value, natural.value.width, natural.value.height, props.maxZoom), natural.value.width, natural.value.height) : null));
const uploading = computed(() => busy.value === "saving");
const imageStyle = computed(() =>
  placement.value
    ? { width: `${placement.value.width}%`, height: `${placement.value.height}%`, left: `${placement.value.left}%`, top: `${placement.value.top}%` }
    : { visibility: "hidden" as const },
);
function onZoom(v: number | number[]) {
  update((s, w, h) => zoomCrop(s, Array.isArray(v) ? (v[0] ?? s.zoom) : v, w, h, props.maxZoom));
}
function onImageError() {
  reset();
  error.value = t.value.unreadable;
}
</script>

<template>
  <div
    data-slot="avatar-upload"
    :data-dragging="dragging || undefined"
    :data-editing="editing || undefined"
    :class="cn('flex flex-col gap-3', props.class)"
    @dragenter="onDragEnter"
    @dragover="(e) => !disabledAll && e.preventDefault()"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @paste="onPaste"
  >
    <div
      v-if="editing"
      role="group"
      :aria-label="t.adjust"
      data-slot="avatar-upload-editor"
      :class="cn('flex flex-col gap-4 rounded-floating border border-border bg-card p-4', props.layout === 'row' && 'sm:flex-row')"
    >
      <div class="flex flex-col items-center gap-2">
        <!-- The window is always left to right: pan and zoom maths are physical. -->
        <div
          dir="ltr"
          role="group"
          tabindex="0"
          :aria-label="t.viewport"
          :aria-describedby="helpId"
          data-slot="avatar-upload-viewport"
          :class="cn(
            'relative size-56 max-w-full shrink-0 cursor-grab touch-none select-none overflow-hidden bg-nq-surface-soft outline-none active:cursor-grabbing',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
            'rounded-control',
          )"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="endDrag"
          @pointercancel="endDrag"
          @keydown="onCropKeyDown"
        >
          <img v-if="sourceUrl" ref="imageRef" :src="sourceUrl" alt="" draggable="false" class="pointer-events-none absolute max-w-none" :style="imageStyle" @load="onImageLoad" @error="onImageError" />
          <span
            aria-hidden="true"
            :class="cn('pointer-events-none absolute inset-0 border border-nq-fg/30', rounded)"
            style="box-shadow: 0 0 0 100vmax color-mix(in oklab, var(--nq-fg) 45%, transparent)"
          />
        </div>
        <p :id="helpId" class="max-w-56 text-center text-caption text-muted-foreground">{{ t.instructions }}</p>
      </div>
      <div class="flex min-w-0 flex-1 flex-col justify-between gap-4">
        <div class="flex items-center gap-2">
          <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="t.zoomOut" :disabled="busy !== null || !natural || crop.zoom <= MIN_ZOOM" @click="update((s, w, h) => zoomCrop(s, s.zoom - 0.25, w, h, props.maxZoom))">
            <ZoomOut aria-hidden="true" />
          </NqButton>
          <NqSlider
            :aria-label="t.zoom"
            :min="MIN_ZOOM"
            :max="props.maxZoom"
            :step="0.01"
            :model-value="crop.zoom"
            :disabled="busy !== null || !natural"
            :format="{ style: 'percent', maximumFractionDigits: 0 }"
            @update:model-value="onZoom"
          />
          <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="t.zoomIn" :disabled="busy !== null || !natural || crop.zoom >= props.maxZoom" @click="update((s, w, h) => zoomCrop(s, s.zoom + 0.25, w, h, props.maxZoom))">
            <ZoomIn aria-hidden="true" />
          </NqButton>
        </div>
        <div class="flex flex-col gap-3">
          <NqProgress v-if="uploading" :value="progress" size="sm" :aria-label="t.uploading" />
          <div class="flex flex-wrap justify-end gap-2">
            <NqButton type="button" variant="ghost" :disabled="busy !== null" @click="reset">{{ t.cancel }}</NqButton>
            <NqButton type="button" variant="primary" :loading="uploading" :disabled="!natural" @click="save">{{ t.save }}</NqButton>
          </div>
        </div>
      </div>
    </div>
    <div v-else data-slot="avatar-upload-idle" :class="cn('flex gap-4', props.layout === 'row' ? 'items-center' : 'flex-col items-start gap-3')">
      <button
        type="button"
        data-slot="avatar-upload-trigger"
        :aria-label="current ? t.change : t.upload"
        :aria-describedby="hintId"
        :disabled="disabledAll"
        :class="cn('group relative shrink-0 outline-none', rounded, 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus', 'disabled:cursor-not-allowed disabled:opacity-50')"
        @click="inputRef?.click()"
      >
        <NqAvatar :name="props.name" :src="current" :shape="props.shape" :class="props.layout === 'row' ? 'size-20 text-h3' : 'size-32 text-h1 ring-1 ring-border @3xl:size-56 @3xl:text-display'" />
        <span
          aria-hidden="true"
          :class="cn(
            'absolute inset-0 flex items-center justify-center bg-nq-fg/50 text-nq-bg opacity-0 transition-opacity duration-150 ease-nq',
            'group-hover:opacity-100 group-focus-visible:opacity-100 group-disabled:hidden',
            dragging && 'border-2 border-dashed border-nq-focus opacity-100',
            rounded,
          )"
        >
          <Camera class="size-5" />
        </span>
      </button>
      <div class="flex min-w-0 flex-col gap-2">
        <div class="flex flex-wrap gap-2">
          <NqButton type="button" size="sm" :disabled="disabledAll" @click="inputRef?.click()">
            <Upload aria-hidden="true" />
            {{ current ? t.change : t.upload }}
          </NqButton>
          <NqButton v-if="current && props.onRemove" type="button" size="sm" variant="ghost" :loading="busy === 'removing'" :disabled="props.disabled || busy === 'saving'" @click="removePhoto">
            <Trash2 aria-hidden="true" />
            {{ t.remove }}
          </NqButton>
        </div>
        <p :id="hintId" class="text-caption text-muted-foreground">{{ dragging ? t.dropping : t.hint(types, formatFileSize(props.maxSize, locale)) }}</p>
      </div>
    </div>
    <p v-if="error" role="alert" data-slot="avatar-upload-error" class="text-caption text-nq-danger-text">{{ error }}</p>
    <span role="status" class="sr-only">{{ status }}</span>
    <input ref="inputRef" type="file" class="sr-only" tabindex="-1" aria-hidden="true" :accept="props.accept" :disabled="disabledAll" @click.stop @change="onInputChange" />
  </div>
</template>
