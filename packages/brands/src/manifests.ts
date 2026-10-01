import { brands as brandTokens } from "@nasaq/tokens";
import { BRAND_ALIASES, MARKS, type MarkSpec } from "./marks";

export type BrandKey = keyof typeof MARKS;
type Pair = { light: string; dark: string };

export interface BrandManifest {
  key: BrandKey;
  aliases: string[];
  name: { en: string; ar?: string };
  /** Typeset, never an image: JetBrains Mono 500 +0.14em uppercase (Latin) or the Arabic face, no tracking. */
  wordmark: { latin: string; arabic?: string };
  mark: MarkSpec;
  color: { brand: Pair; action: Pair; onAction: Pair; accent: string };
  typography: { latin: "lusail" | "inter" };
  tagline?: { en: string; ar?: string };
  links?: { site?: string };
}

const meta: Record<BrandKey, Pick<BrandManifest, "name" | "typography" | "tagline"> & { site?: string }> = {
  nasaq: { name: { en: "Nasaq", ar: "نسق" }, typography: { latin: "lusail" }, site: "https://nasaq.fadymondy.com" },
  fadymondy: { name: { en: "Fady Mondy" }, typography: { latin: "lusail" }, site: "https://fadymondy.com" },
  mahaam: { name: { en: "Mahaam", ar: "مهام" }, typography: { latin: "inter" }, site: "https://mahaam.app" },
  zekra: { name: { en: "Zekra", ar: "ذكرة" }, typography: { latin: "inter" }, site: "https://zekra.dev" },
  moharrik: { name: { en: "Moharrik", ar: "محرّك" }, typography: { latin: "inter" } },
  seatfor: { name: { en: "SeatFor" }, typography: { latin: "lusail" } },
  "health-debug": { name: { en: "Health Debug", ar: "شفرة التعافي الصحي" }, typography: { latin: "lusail" } },
  circlexo: { name: { en: "CircleXO", ar: "سيركل إكس أو" }, typography: { latin: "lusail" } },
  hosbah: { name: { en: "Hosbah", ar: "حوسبة" }, typography: { latin: "inter" } },
  orchestra: { name: { en: "Orchestra", ar: "اوركيسترا" }, typography: { latin: "lusail" } },
  matjar: { name: { en: "Matjar", ar: "متجر" }, typography: { latin: "lusail" }, tagline: { en: "E-commerce stores", ar: "المتاجر الإلكترونية" }, site: "https://matjar.circlexo.com" },
  sanduq: { name: { en: "Sanduq", ar: "صندوق" }, typography: { latin: "lusail" }, tagline: { en: "Point of sale", ar: "نقاط البيع" }, site: "https://sanduq.circlexo.com" },
  mizan: { name: { en: "Mizan", ar: "ميزان" }, typography: { latin: "lusail" }, tagline: { en: "Invoicing and accounting", ar: "الفواتير والمحاسبة" }, site: "https://mizan.circlexo.com" },
  qaima: { name: { en: "Qaima", ar: "قائمة" }, typography: { latin: "lusail" }, tagline: { en: "QR e-menus", ar: "القوائم الرقمية بـ QR" }, site: "https://qaima.circlexo.com" },
  makhzan: { name: { en: "Makhzan", ar: "مخزن" }, typography: { latin: "lusail" }, tagline: { en: "Inventory", ar: "المخزون" }, site: "https://makhzan.circlexo.com" },
  mawared: { name: { en: "Mawared", ar: "موارد" }, typography: { latin: "lusail" }, tagline: { en: "HR and payroll", ar: "الموارد البشرية والرواتب" }, site: "https://mawared.circlexo.com" },
  togo: { name: { en: "ToGO" }, typography: { latin: "lusail" }, site: "https://to-go.dev" },
};

export const BRAND_KEYS = Object.keys(MARKS) as BrandKey[];

export const BRANDS = Object.fromEntries(
  BRAND_KEYS.map((key) => {
    const m = meta[key];
    const t = brandTokens[key];
    const manifest: BrandManifest = {
      key,
      aliases: Object.entries(BRAND_ALIASES)
        .filter(([, v]) => v === key)
        .map(([k]) => k),
      name: m.name,
      wordmark: { latin: m.name.en.toUpperCase(), ...(m.name.ar ? { arabic: m.name.ar } : {}) },
      mark: MARKS[key],
      color: { brand: { ...t.brand }, action: { ...t.action }, onAction: { ...t.onAction }, accent: t.accent },
      typography: m.typography,
      ...(m.tagline ? { tagline: m.tagline } : {}),
      ...(m.site ? { links: { site: m.site } } : {}),
    };
    return [key, manifest];
  }),
) as Record<BrandKey, BrandManifest>;

/** Resolve a Nasaq key or a legacy alias (managy, cabrain, cloudy, …). */
export function resolveBrand(key: string): BrandManifest | undefined {
  const k = (key in BRANDS ? key : BRAND_ALIASES[key]) as BrandKey | undefined;
  return k ? BRANDS[k] : undefined;
}
