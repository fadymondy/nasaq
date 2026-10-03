import type { QrEcc, QrEyeStyle, QrModuleStyle } from "./qr-svg";

export interface QrCodeLabels {
  label: string;
  labelFor: (value: string) => string;
  svg: string;
  png: string;
  failed: string;
  contentLabel: string;
  contentHint: string;
  moduleStyle: string;
  eyeStyle: string;
  ecc: string;
  fg: string;
  bg: string;
  logo: string;
  logoAdd: string;
  logoRemove: string;
  logoNote: string;
  styles: Record<QrModuleStyle, string>;
  eyes: Record<QrEyeStyle, string>;
  levels: Record<QrEcc, string>;
}

export const QR_STRINGS: Record<"en" | "ar", QrCodeLabels> = {
  en: {
    label: "QR code",
    labelFor: (v) => `QR code for ${v}`,
    svg: "Download SVG",
    png: "Download PNG",
    failed: "Could not create the file. Try again.",
    contentLabel: "Content",
    contentHint: "A link, text or any string the code should hold.",
    moduleStyle: "Dots",
    eyeStyle: "Corners",
    ecc: "Error correction",
    fg: "Foreground",
    bg: "Background",
    logo: "Centre logo",
    logoAdd: "Add a logo",
    logoRemove: "Remove logo",
    logoNote: "A logo raises error correction to the highest level so the code still scans.",
    styles: { square: "Squares", dots: "Dots", rounded: "Rounded" },
    eyes: { square: "Square", rounded: "Rounded", circle: "Circle" },
    levels: { L: "Low (7%)", M: "Medium (15%)", Q: "Quartile (25%)", H: "High (30%)" },
  },
  ar: {
    label: "رمز QR",
    labelFor: (v) => `رمز QR لـ ${v}`,
    svg: "تنزيل SVG",
    png: "تنزيل PNG",
    failed: "تعذر إنشاء الملف. حاول مرة أخرى.",
    contentLabel: "المحتوى",
    contentHint: "رابط أو نص أو أي سلسلة تريد أن يحملها الرمز.",
    moduleStyle: "شكل النقاط",
    eyeStyle: "شكل الزوايا",
    ecc: "تصحيح الأخطاء",
    fg: "لون الرمز",
    bg: "لون الخلفية",
    logo: "الشعار في المنتصف",
    logoAdd: "إضافة شعار",
    logoRemove: "إزالة الشعار",
    logoNote: "الشعار يرفع تصحيح الأخطاء إلى أعلى مستوى ليبقى الرمز قابلًا للمسح.",
    styles: { square: "مربعات", dots: "نقاط", rounded: "مستديرة" },
    eyes: { square: "مربعة", rounded: "مستديرة الحواف", circle: "دائرية" },
    levels: { L: "منخفض (7%)", M: "متوسط (15%)", Q: "ربعي (25%)", H: "عالٍ (30%)" },
  },
};
