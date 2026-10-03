export const STRINGS = {
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

export type AvatarUploadLabels = Partial<(typeof STRINGS)["en"]>;

const TYPE_NAMES: Record<string, string> = {
  "image/jpeg": "JPG",
  "image/jpg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/gif": "GIF",
  "image/avif": "AVIF",
};

/** "image/png,image/jpeg" becomes "PNG or JPG" (localised list). A wildcard reads as "images". */
export function typeList(accept: string, locale: string, images: string) {
  const names = accept
    .split(",")
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean)
    .map((rule) => {
      if (rule === "image/*") return images;
      if (TYPE_NAMES[rule]) return TYPE_NAMES[rule] as string;
      return rule.startsWith(".") ? rule.slice(1).toUpperCase() : (rule.split("/")[1] ?? rule).toUpperCase();
    });
  const unique = [...new Set(names)];
  try {
    return new Intl.ListFormat(locale, { style: "long", type: "disjunction" }).format(unique);
  } catch {
    return unique.join(", ");
  }
}
