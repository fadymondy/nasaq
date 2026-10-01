// nqFileUpload / nqImageUpload: the state behind the Blade file-upload and image-upload components.
//
//   <div data-slot="file-upload" x-data="nqFileUpload({ accept: 'image/*,.pdf', maxSize: 5242880, maxFiles: 4 })" x-modelable="items"
//        @files="$event.detail.added.forEach((f) => send(f, $event.detail.controls))">
//     <div data-slot="dropzone" x-bind="zone">… <input type="file" class="sr-only" x-ref="input" x-bind="picker"> </div>
//     <ul data-slot="file-upload-errors" x-show="rejections.length"> <template x-for="r in rejections">…</template> </ul>
//     <ul data-slot="file-list" x-show="items.length"> <template x-for="item in items" :key="item.id">…</template> </ul>
//   </div>
//
// Nothing is sent by this module. Bubbling events carry the work to you:
//   "files"  { added, controls }   validated files, status "pending"; start the upload, report with controls.update(id, { status, progress, error })
//   "retry"  { item, controls }    the retry button of a failed file
//   "remove" { item }              after a file left the list (cancel its request)
//   "reject" { rejections }        after every pick or drop (empty when all passed)
// `items` is x-modelable. nqImageUpload keeps one `file` (x-modelable) plus the saved `src`, and dispatches "change" ({ file }) and "remove".

import type { Magics, Register } from "./types";

export type UploadStatus = "pending" | "uploading" | "done" | "error";

export interface UploadItem {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number | null;
  error?: string;
}

interface Rejection {
  file: File;
  code: "too-large" | "wrong-type" | "too-many";
  message: string;
}

interface Options {
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  multiple?: boolean;
  disabled?: boolean;
}

interface Core extends Magics {
  $nq: { t(en: string, ar: string): string; locale: string };
  accept: string | undefined;
  maxSize: number | undefined;
  maxFiles: number | undefined;
  multiple: boolean;
  disabled: boolean;
  dragging: boolean;
  depth: number;
  rejections: Rejection[];
  onFiles(files: File[]): void;
  count(): number;
  fileSize(bytes: number): string;
  handle(list: FileList | File[] | null): void;
  limitsText(): string;
  open(): void;
}

const UNITS: ReadonlyArray<readonly [string, string]> = [
  ["B", "ب"],
  ["KB", "ك.ب"],
  ["MB", "م.ب"],
  ["GB", "ج.ب"],
  ["TB", "ت.ب"],
];

/** Does `file` satisfy an `accept` string like "image/*,.pdf,application/zip"? Empty accept matches all. */
export function matchesAccept(file: Pick<File, "name" | "type">, accept?: string): boolean {
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

let seq = 0;
const nextId = () => `upl-${Date.now().toString(36)}-${++seq}`;

/** Dropzone + validation: shared by both components. */
const core = (options: Options) => ({
  accept: options.accept,
  maxSize: options.maxSize,
  maxFiles: options.maxFiles,
  multiple: options.multiple ?? true,
  disabled: Boolean(options.disabled),
  dragging: false,
  depth: 0,
  rejections: [] as Rejection[],

  fileSize(this: Core, bytes: number) {
    let value = bytes;
    let i = 0;
    while (value >= 1024 && i < UNITS.length - 1) {
      value /= 1024;
      i++;
    }
    const unit = UNITS[i] as readonly [string, string];
    const num = new Intl.NumberFormat(`${this.$nq.locale}-u-nu-latn`, { maximumFractionDigits: i === 0 ? 0 : 1 }).format(value);
    return `${num} ${this.$nq.t(unit[0], unit[1])}`;
  },
  limitsText(this: Core) {
    return [
      this.accept ? this.$nq.t(`Accepted: ${this.accept}`, `المسموح: ${this.accept}`) : null,
      this.maxSize !== undefined ? this.$nq.t(`Up to ${this.fileSize(this.maxSize)} each`, `حتى ${this.fileSize(this.maxSize)} للملف`) : null,
    ]
      .filter(Boolean)
      .join(" · ");
  },
  open(this: Core) {
    if (!this.disabled) this.$refs.input?.click();
  },
  handle(this: Core, list: FileList | File[] | null) {
    const files = list ? Array.from(list) : [];
    if (!files.length) return;
    const limit = this.multiple ? this.maxFiles : 1;
    // Single mode replaces rather than appends, so the existing count does not block it.
    const existing = this.multiple ? this.count() : 0;
    const accepted: File[] = [];
    const rejected: Rejection[] = [];
    for (const file of files) {
      if (!matchesAccept(file, this.accept)) {
        rejected.push({ file, code: "wrong-type", message: this.$nq.t(`${file.name} is not an accepted file type.`, `نوع الملف ${file.name} غير مقبول.`) });
      } else if (this.maxSize !== undefined && file.size > this.maxSize) {
        const max = this.fileSize(this.maxSize);
        rejected.push({ file, code: "too-large", message: this.$nq.t(`${file.name} is larger than ${max}.`, `حجم ${file.name} أكبر من ${max}.`) });
      } else if (limit !== undefined && existing + accepted.length >= limit) {
        const n = new Intl.NumberFormat("ar-u-nu-arab").format(limit);
        rejected.push({
          file,
          code: "too-many",
          message: this.$nq.t(`${file.name} was not added: the limit is ${limit} ${limit === 1 ? "file" : "files"}.`, `لم تتم إضافة ${file.name}: الحد الأقصى ${n} ملف.`),
        });
      } else {
        accepted.push(file);
      }
    }
    this.rejections = rejected;
    if (accepted.length) this.onFiles(accepted);
    this.$dispatch("reject", { rejections: rejected });
  },

  /** Bind on the dropzone element. */
  zone: {
    role: "button",
    ":tabindex"(this: Core) {
      return this.disabled ? -1 : 0;
    },
    ":aria-disabled"(this: Core) {
      return this.disabled ? "true" : undefined;
    },
    ":data-dragging"(this: Core) {
      return this.dragging ? "true" : undefined;
    },
    ":data-disabled"(this: Core) {
      return this.disabled ? "true" : undefined;
    },
    ":data-invalid"(this: Core) {
      return this.rejections.length ? "true" : undefined;
    },
    "x-on:click"(this: Core) {
      this.open();
    },
    "x-on:keydown"(this: Core, event: KeyboardEvent) {
      if (event.defaultPrevented || event.target !== event.currentTarget) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.open();
      }
    },
    "x-on:dragenter"(this: Core, event: DragEvent) {
      if (this.disabled || !event.dataTransfer?.types.includes("Files")) return;
      event.preventDefault();
      this.depth++;
      this.dragging = true;
    },
    "x-on:dragover"(this: Core, event: DragEvent) {
      if (!this.disabled) event.preventDefault();
    },
    "x-on:dragleave"(this: Core) {
      this.depth = Math.max(0, this.depth - 1);
      if (this.depth === 0) this.dragging = false;
    },
    "x-on:drop"(this: Core, event: DragEvent) {
      event.preventDefault();
      this.depth = 0;
      this.dragging = false;
      if (!this.disabled) this.handle(event.dataTransfer?.files ?? null);
    },
  },
  /** Bind on the hidden file input (x-ref="input"). */
  picker: {
    "x-on:click.stop"() {},
    "x-on:change"(this: Core, event: Event) {
      const input = event.target as HTMLInputElement;
      this.handle(input.files);
      input.value = "";
    },
  },
});

export const fileUpload: Register = (Alpine) => {
  interface State extends Core {
    items: UploadItem[];
    controls(): { update(id: string, patch: Partial<Omit<UploadItem, "id" | "file">>): void; remove(id: string): void };
    retry(item: UploadItem): void;
    removeItem(item: UploadItem): void;
    statusText(item: UploadItem): string;
    percent(item: UploadItem): number;
  }

  Alpine.data("nqFileUpload", (options: Options = {}, initial: UploadItem[] = []) => ({
    ...core(options),
    items: [...initial] as UploadItem[],
    count(this: State) {
      return this.items.length;
    },
    controls(this: State) {
      return {
        update: (id: string, patch: Partial<Omit<UploadItem, "id" | "file">>) => {
          this.items = this.items.map((f) => (f.id === id ? { ...f, ...patch } : f));
        },
        remove: (id: string) => {
          this.items = this.items.filter((f) => f.id !== id);
        },
      };
    },
    onFiles(this: State, files: File[]) {
      const added: UploadItem[] = files.map((file) => ({ id: nextId(), file, status: "pending", progress: 0 }));
      this.items = [...this.items, ...added];
      this.$dispatch("files", { added, controls: this.controls() });
    },
    retry(this: State, item: UploadItem) {
      this.$dispatch("retry", { item, controls: this.controls() });
    },
    removeItem(this: State, item: UploadItem) {
      this.items = this.items.filter((f) => f.id !== item.id);
      this.$dispatch("remove", { item });
    },
    statusText(this: State, item: UploadItem) {
      const t = this.$nq.t.bind(this.$nq);
      return { pending: t("Waiting", "في الانتظار"), uploading: t("Uploading", "جارٍ الرفع"), done: t("Uploaded", "تم الرفع"), error: t("Failed", "فشل") }[item.status];
    },
    percent(item: UploadItem) {
      return item.status === "pending" ? 0 : (item.progress ?? 0);
    },
  }));

  interface ImageState extends Core {
    file: File | null;
    src: string | null;
    removedSrc: boolean;
    url: string | null;
    progress: number | null | undefined;
    setFile(file: File | null): void;
    preview(): string | null;
    showProgress(): boolean;
  }

  Alpine.data("nqImageUpload", (options: Options & { src?: string } = {}) => ({
    ...core({ accept: "image/*", ...options, multiple: false }),
    file: null as File | null,
    src: options.src ?? null,
    removedSrc: false,
    url: null as string | null,
    /** 0 to 100 while you upload the chosen image; undefined hides the bar. */
    progress: undefined as number | null | undefined,
    init(this: ImageState) {
      this.$watch<File | null>("file", (file) => {
        if (this.url) URL.revokeObjectURL(this.url);
        this.url = file ? URL.createObjectURL(file) : null;
      });
    },
    destroy(this: ImageState) {
      if (this.url) URL.revokeObjectURL(this.url);
    },
    count() {
      return 0;
    },
    onFiles(this: ImageState, files: File[]) {
      this.setFile(files[0] ?? null);
    },
    setFile(this: ImageState, file: File | null) {
      this.file = file;
      // From the root, not `$el`: inside the input's own change handler `$el` is the input and the event would loop back into it.
      this.$root.dispatchEvent(new CustomEvent("change", { detail: { file }, bubbles: true }));
    },
    preview(this: ImageState) {
      return this.url ?? (this.removedSrc ? null : this.src);
    },
    showProgress(this: ImageState) {
      return this.progress !== undefined && this.progress !== null && this.progress < 100;
    },
    removeImage(this: ImageState) {
      this.removedSrc = true;
      this.setFile(null);
      this.$dispatch("remove");
    },
  }));
};
