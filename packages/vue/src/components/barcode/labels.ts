// The built-in strings of packages/web/src/components/barcode/barcode.tsx.
import type { BarcodeFormat, BarcodeProblem } from "./barcode-format";

export interface BarcodeLabels {
  label: (format: string, value: string) => string;
  svg: string;
  png: string;
  failed: string;
  title: string;
  description: string;
  value: string;
  format: string;
  problems: Record<BarcodeProblem, string>;
  hints: Record<BarcodeFormat, string>;
}

export const BARCODE_STRINGS: Record<"en" | "ar", BarcodeLabels> = {
  en: {
    label: (format, value) => `${format} barcode for ${value}`,
    svg: "Download SVG",
    png: "Download PNG",
    failed: "Could not create the file. Try again.",
    title: "Barcode generator",
    description: "Type a value, pick a format, download it as SVG or PNG.",
    value: "Value",
    format: "Format",
    problems: {
      empty: "Enter a value to make a barcode.",
      digits: "This format takes digits only.",
      length: "This value has the wrong length for the format.",
      checksum: "The check digit at the end is wrong.",
      chars: "This value has characters the format cannot encode.",
    },
    hints: {
      CODE128: "Any ASCII text. The most flexible format.",
      EAN13: "12 digits, or 13 with the check digit. Retail products.",
      EAN8: "7 digits, or 8 with the check digit. Small packages.",
      UPC: "11 digits, or 12 with the check digit. North American retail.",
      CODE39: "Capital letters, digits and - . $ / + % and space.",
      ITF14: "13 digits, or 14 with the check digit. Cartons and cases.",
      ITF: "An even number of digits.",
      codabar: "Digits and - $ : / . + , optionally between A to D.",
      pharmacode: "A number from 3 to 131070.",
    },
  },
  ar: {
    label: (format, value) => `باركود ${format} للقيمة ${value}`,
    svg: "تنزيل SVG",
    png: "تنزيل PNG",
    failed: "تعذر إنشاء الملف. حاول مرة أخرى.",
    title: "مولّد الباركود",
    description: "اكتب قيمة واختر الصيغة ونزّلها بصيغة SVG أو PNG.",
    value: "القيمة",
    format: "الصيغة",
    problems: {
      empty: "أدخل قيمة لإنشاء الباركود.",
      digits: "هذه الصيغة تقبل الأرقام فقط.",
      length: "طول القيمة غير مناسب لهذه الصيغة.",
      checksum: "رقم التحقق في النهاية غير صحيح.",
      chars: "تحتوي القيمة على رموز لا تدعمها الصيغة.",
    },
    hints: {
      CODE128: "أي نص ASCII. أكثر الصيغ مرونة.",
      EAN13: "12 رقمًا، أو 13 مع رقم التحقق. منتجات التجزئة.",
      EAN8: "7 أرقام، أو 8 مع رقم التحقق. العبوات الصغيرة.",
      UPC: "11 رقمًا، أو 12 مع رقم التحقق. التجزئة في أمريكا الشمالية.",
      CODE39: "أحرف لاتينية كبيرة وأرقام و - . $ / + % ومسافة.",
      ITF14: "13 رقمًا، أو 14 مع رقم التحقق. الكراتين والصناديق.",
      ITF: "عدد زوجي من الأرقام.",
      codabar: "أرقام و - $ : / . + ، ويمكن أن تحيط بها الأحرف من A إلى D.",
      pharmacode: "رقم من 3 إلى 131070.",
    },
  },
};
