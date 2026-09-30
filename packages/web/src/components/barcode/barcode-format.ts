export type BarcodeFormat = "CODE128" | "EAN13" | "EAN8" | "UPC" | "CODE39" | "ITF14" | "ITF" | "codabar" | "pharmacode";

export const BARCODE_FORMATS: readonly { id: BarcodeFormat; name: string; example: string }[] = [
  { id: "CODE128", name: "Code 128", example: "NSQ-2026-0042" },
  { id: "EAN13", name: "EAN-13", example: "5901234123457" },
  { id: "EAN8", name: "EAN-8", example: "96385074" },
  { id: "UPC", name: "UPC-A", example: "123456789012" },
  { id: "CODE39", name: "Code 39", example: "NASAQ-42" },
  { id: "ITF14", name: "ITF-14", example: "12345678901231" },
  { id: "ITF", name: "Interleaved 2 of 5", example: "123456" },
  { id: "codabar", name: "Codabar", example: "A123456A" },
  { id: "pharmacode", name: "Pharmacode", example: "1234" },
];

export type BarcodeProblem = "empty" | "digits" | "length" | "checksum" | "chars";

/** GS1 check digit for the digits before it (EAN-13, EAN-8, UPC-A, ITF-14): weights 3 and 1 from the right. */
export function gtinCheckDigit(body: string): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const digit = Number(body[body.length - 1 - i]);
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

const GTIN_LENGTHS: Partial<Record<BarcodeFormat, number>> = { EAN13: 13, EAN8: 8, UPC: 12, ITF14: 14 };

/**
 * Checks a value against a format before drawing, so the UI can say what is wrong instead of showing nothing.
 * The check-digit formats accept the body without the digit too (jsbarcode adds it), or the full number with a correct digit.
 */
export function validateBarcode(format: BarcodeFormat, value: string): BarcodeProblem | null {
  if (!value) return "empty";
  const full = GTIN_LENGTHS[format];
  if (full) {
    if (!/^\d+$/.test(value)) return "digits";
    if (value.length !== full && value.length !== full - 1) return "length";
    if (value.length === full && gtinCheckDigit(value.slice(0, -1)) !== Number(value.at(-1))) return "checksum";
    return null;
  }
  switch (format) {
    case "CODE128":
      // biome-ignore lint/suspicious/noControlCharactersInRegex: Code 128 encodes the 7-bit ASCII range
      return /^[\x00-\x7f]+$/.test(value) ? null : "chars";
    case "CODE39":
      return /^[0-9A-Z\-. $/+%]+$/.test(value.toUpperCase()) ? null : "chars";
    case "ITF":
      if (!/^\d+$/.test(value)) return "digits";
      return value.length % 2 === 0 ? null : "length";
    case "codabar":
      return /^([A-D][0-9\-$:/.+]+[A-D]|[0-9\-$:/.+]+)$/i.test(value) ? null : "chars";
    case "pharmacode": {
      if (!/^\d+$/.test(value)) return "digits";
      const n = Number(value);
      return n >= 3 && n <= 131070 ? null : "length";
    }
    default:
      return null;
  }
}
