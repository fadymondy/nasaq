"use client";

import JsBarcode from "jsbarcode";
import { Download } from "lucide-react";
import { type ComponentProps, useEffect, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { Field, FieldDescription, FieldLabel, Input } from "../field";
import { downloadPng, downloadSvg, resolveColor } from "../qr-code";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { BARCODE_FORMATS, type BarcodeFormat, type BarcodeProblem, validateBarcode } from "./barcode-format";

export { BARCODE_FORMATS, type BarcodeFormat, type BarcodeProblem, gtinCheckDigit, validateBarcode } from "./barcode-format";

const STRINGS = {
  en: {
    label: (format: string, value: string) => `${format} barcode for ${value}`,
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
    } satisfies Record<BarcodeProblem, string>,
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
    } satisfies Record<BarcodeFormat, string>,
  },
  ar: {
    label: (format: string, value: string) => `باركود ${format} للقيمة ${value}`,
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
    } satisfies Record<BarcodeProblem, string>,
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
    } satisfies Record<BarcodeFormat, string>,
  },
};

export type BarcodeLabels = (typeof STRINGS)["en"];

function useLabels(labels?: Partial<BarcodeLabels>): BarcodeLabels {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return { ...STRINGS[ar ? "ar" : "en"], ...labels };
}

export interface BarcodeProps extends Omit<ComponentProps<"div">, "children"> {
  /** What the bars encode. */
  value: string;
  /** Default "CODE128". */
  format?: BarcodeFormat;
  /** Print the value under the bars. Default true. */
  showValue?: boolean;
  /** Bar height in px. Default 80. */
  height?: number;
  /** Width of the thinnest bar in px. Default 2. */
  barWidth?: number;
  /** Bar colour: any CSS colour or token. Default black. */
  fg?: string;
  /** Background colour. Default white. */
  bg?: string;
  /** Quiet zone around the bars, in px. Default 10. */
  margin?: number;
  /** Show Download SVG and Download PNG buttons under the barcode. */
  downloadable?: boolean;
  /** Base name of downloaded files. Default "barcode". */
  downloadName?: string;
  /** Pixel width of the downloaded PNG. Default 1200. */
  pngSize?: number;
  /** Called after each draw with the problem, or null when the value is valid. */
  onValidate?: (problem: BarcodeProblem | null) => void;
  labels?: Partial<BarcodeLabels>;
}

/**
 * A barcode drawn as SVG by jsbarcode: Code 128, EAN-13, EAN-8, UPC-A, Code 39, ITF-14, ITF, Codabar
 * and Pharmacode. A value the format cannot encode shows the reason instead of a broken image.
 * It stays left-to-right in Arabic. Set `downloadable` for SVG and PNG buttons.
 */
export function Barcode({
  value,
  format = "CODE128",
  showValue = true,
  height = 80,
  barWidth = 2,
  fg = "black",
  bg = "white",
  margin = 10,
  downloadable = false,
  downloadName = "barcode",
  pngSize = 1200,
  onValidate,
  labels,
  className,
  ...props
}: BarcodeProps) {
  const t = useLabels(labels);
  const svg = useRef<SVGSVGElement>(null);
  const [failed, setFailed] = useState(false);
  const problem = validateBarcode(format, value);
  const name = BARCODE_FORMATS.find((f) => f.id === format)?.name ?? format;
  const validate = useRef(onValidate);
  validate.current = onValidate;

  useEffect(() => {
    const el = svg.current;
    validate.current?.(problem);
    if (!el || problem) return;
    try {
      let ok = true;
      JsBarcode(el, value, {
        format,
        displayValue: showValue,
        height,
        width: barWidth,
        margin,
        lineColor: resolveColor(fg, el),
        background: resolveColor(bg, el),
        fontSize: 16,
        font: "ui-monospace, monospace",
        valid: (v) => {
          ok = v;
        },
      });
      // jsbarcode sizes in px; a viewBox lets CSS scale it.
      const w = el.getAttribute("width");
      const h = el.getAttribute("height");
      if (w && h) {
        el.setAttribute("viewBox", `0 0 ${Number.parseFloat(w)} ${Number.parseFloat(h)}`);
        el.removeAttribute("height");
      }
      if (!ok) {
        el.replaceChildren();
        setFailed(true);
      } else setFailed(false);
    } catch {
      el.replaceChildren();
      setFailed(true);
    }
  }, [value, format, showValue, height, barWidth, margin, fg, bg, problem]);

  const [error, setError] = useState(false);
  function markup() {
    const el = svg.current;
    if (!el) throw new Error("not drawn");
    const clone = el.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const vb = (clone.getAttribute("viewBox") ?? "0 0 100 100").split(" ").map(Number);
    clone.setAttribute("width", String(vb[2]));
    clone.setAttribute("height", String(vb[3]));
    return clone.outerHTML;
  }
  async function save(kind: "svg" | "png") {
    setError(false);
    try {
      if (kind === "svg") downloadSvg(markup(), `${downloadName}.svg`);
      else await downloadPng(markup(), `${downloadName}.png`, pngSize);
    } catch {
      setError(true);
    }
  }

  const message = problem ? t.problems[problem] : failed ? t.problems.chars : null;

  return (
    <div data-slot="barcode" data-format={format} data-invalid={message ? "" : undefined} dir="ltr" className={cn("inline-flex max-w-full flex-col items-center gap-3", className)} {...props}>
      {message ? (
        <p role="alert" className="rounded-control border border-dashed border-border px-4 py-6 text-center text-body-sm text-nq-danger-text" dir="auto">
          {message}
        </p>
      ) : null}
      <svg
        ref={svg}
        data-slot="barcode-svg"
        role="img"
        aria-label={t.label(name, value)}
        style={{ background: bg, display: message ? "none" : undefined }}
        className="h-auto max-w-full rounded-control border border-border"
      />
      {downloadable && !message ? (
        <div className="flex flex-wrap items-center justify-center gap-2" data-slot="barcode-actions">
          <Button type="button" size="sm" onClick={() => save("svg")}>
            <Download aria-hidden />
            {t.svg}
          </Button>
          <Button type="button" size="sm" onClick={() => save("png")}>
            <Download aria-hidden />
            {t.png}
          </Button>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-caption text-nq-danger-text">
          {t.failed}
        </p>
      ) : null}
    </div>
  );
}

export interface BarcodeGeneratorProps extends Omit<ComponentProps<"div">, "children" | "onChange"> {
  defaultValue?: string;
  defaultFormat?: BarcodeFormat;
  /** Formats offered. Default all. */
  formats?: readonly BarcodeFormat[];
  downloadName?: string;
  labels?: Partial<BarcodeLabels>;
}

/** Type a value, pick a format, see the barcode, download SVG or PNG. Built on `Barcode`. */
export function BarcodeGenerator({
  defaultValue = "NSQ-2026-0042",
  defaultFormat = "CODE128",
  formats,
  downloadName,
  labels,
  className,
  ...props
}: BarcodeGeneratorProps) {
  const t = useLabels(labels);
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const [format, setFormat] = useState<BarcodeFormat>(defaultFormat);
  const items = BARCODE_FORMATS.filter((f) => !formats || formats.includes(f.id)).map((f) => ({ value: f.id, label: f.name }));
  return (
    <Card data-slot="barcode-generator" className={cn("w-full max-w-2xl", className)} {...props}>
      <CardHeader>
        <CardTitle as="h2">{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <Field>
            <FieldLabel>{t.value}</FieldLabel>
            <Input ltr id={`${id}-value`} value={value} onChange={(e) => setValue(e.target.value)} spellCheck={false} autoComplete="off" />
            <FieldDescription>{t.hints[format]}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>{t.format}</FieldLabel>
            <Select
              items={items}
              value={format}
              onValueChange={(v) => {
                if (!v) return;
                const next = v as BarcodeFormat;
                setFormat(next);
                // Move to that format's example when the current value cannot work, so the preview is never empty.
                if (validateBarcode(next, value)) setValue(BARCODE_FORMATS.find((f) => f.id === next)?.example ?? value);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {items.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="flex justify-center">
          <Barcode value={value} format={format} downloadable downloadName={downloadName} labels={labels} />
        </div>
      </CardContent>
    </Card>
  );
}
