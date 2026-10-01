import { onBeforeUnmount, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from "vue";
import { formatNumber } from "../numeric";

export const STRINGS = {
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

export const stringsFor = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];

/** "1.5 MB" with Nasaq number formatting (Western digits by default) and Arabic units in Arabic. */
export function formatFileSize(bytes: number, locale = "en") {
  const units = stringsFor(locale).units;
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

export interface FileUploadControls {
  /** Patch one file's state: `update(id, { status: "uploading", progress: 40 })`. */
  update: (id: string, patch: Partial<Omit<UploadFile, "id" | "file">>) => void;
  remove: (id: string) => void;
}

export function validateFiles(files: File[], rules: FileRules, existing: number, locale: string) {
  const t = stringsFor(locale);
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
export const nextUploadId = () => `upl-${Date.now().toString(36)}-${++seq}`;

/** An object URL for `file`, revoked when the file changes or the component unmounts. */
export function useObjectUrl(file: MaybeRefOrGetter<File | Blob | null | undefined>): Ref<string | null> {
  const url = ref<string | null>(null);
  let current: string | null = null;
  const revoke = () => {
    if (current) URL.revokeObjectURL(current);
    current = null;
  };
  watch(
    () => toValue(file),
    (f) => {
      revoke();
      current = f ? URL.createObjectURL(f) : null;
      url.value = current;
    },
    { immediate: true },
  );
  onBeforeUnmount(revoke);
  return url;
}
