"use client";

import { Download, ImageUp, X } from "lucide-react";
import { type ComponentProps, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { Field, FieldLabel, Textarea } from "../field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { downloadPng, downloadSvg, resolveColor, toDataUri } from "./download";
import { type QrEcc, type QrEyeStyle, type QrLogo, type QrModuleStyle, qrLayout, qrSvgString } from "./qr-svg";

export { downloadBlob, downloadPng, downloadSvg, resolveColor, svgToPng, toDataUri } from "./download";
export { type QrEcc, type QrEyeStyle, type QrLayout, type QrLayoutOptions, type QrLogo, type QrModuleStyle, qrLayout, qrSvgString } from "./qr-svg";

const STRINGS = {
  en: {
    label: "QR code",
    labelFor: (v: string) => `QR code for ${v}`,
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
    labelFor: (v: string) => `رمز QR لـ ${v}`,
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

export type QrCodeLabels = (typeof STRINGS)["en"];

function useLabels(labels?: Partial<QrCodeLabels>): QrCodeLabels {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return { ...STRINGS[ar ? "ar" : "en"], ...labels };
}

export interface QrCodeProps extends Omit<ComponentProps<"div">, "children"> {
  /** What the code holds: a URL, text, a Wi-Fi string. */
  value: string;
  /** Data module shape. Default "square". */
  moduleStyle?: QrModuleStyle;
  /** Finder pattern (the three big corners) shape. Default "square". */
  eyeStyle?: QrEyeStyle;
  /** Error correction. Default "M"; "H" is forced when there is a logo. */
  ecc?: QrEcc;
  /** Quiet zone in modules. Default 4. */
  margin?: number;
  /** Any CSS colour, including tokens: `"var(--nq-brand)"`. Default black. Keep strong contrast with `bg`. */
  fg?: string;
  /** Default white. */
  bg?: string;
  /** Colour of the three corner eyes. Default: same as `fg`. */
  eyeFg?: string;
  /** Centre logo: an image URL (a data: URI or same-origin URL exports best). */
  logo?: QrLogo;
  /** Width and height in px. Default 192. `"fill"` makes it as wide as its parent. */
  size?: number | "fill";
  /** Accessible name. Default "QR code for <value>". */
  label?: string;
  /** Show Download SVG and Download PNG buttons under the code. */
  downloadable?: boolean;
  /** Base name of downloaded files. Default "qr-code". */
  downloadName?: string;
  /** Pixel width of the downloaded PNG. Default 1024. */
  pngSize?: number;
  labels?: Partial<QrCodeLabels>;
}

/** Resolves colours against the live element, inlines the logo and gives back a standalone SVG string. */
async function buildExport(props: QrCodeProps, node: Element | null) {
  const { value, moduleStyle, eyeStyle, ecc, margin, fg = "black", bg = "white", eyeFg, logo } = props;
  return qrSvgString({
    value,
    moduleStyle,
    eyeStyle,
    ecc,
    margin,
    fg: resolveColor(fg, node),
    bg: resolveColor(bg, node),
    eyeFg: eyeFg ? resolveColor(eyeFg, node) : undefined,
    logo: logo ? { ...logo, src: await toDataUri(logo.src) } : undefined,
    size: props.pngSize ?? 1024,
  });
}

/**
 * A styled QR code drawn as one SVG: square, dot or rounded modules, square, rounded or circular corner eyes,
 * colours from tokens or props, and an optional centre logo. The matrix comes from `uqr`. The code is
 * left-to-right in Arabic too. Set `downloadable` for SVG and PNG buttons.
 */
export function QrCode(props: QrCodeProps) {
  const {
    value,
    moduleStyle = "square",
    eyeStyle = "square",
    ecc = "M",
    margin = 4,
    fg = "black",
    bg = "white",
    eyeFg,
    logo,
    size = 192,
    label,
    downloadable = false,
    downloadName = "qr-code",
    pngSize: _pngSize,
    labels,
    className,
    ...rest
  } = props;
  const t = useLabels(labels);
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const layout = useMemo(() => qrLayout({ value, moduleStyle, eyeStyle, ecc, margin, logo }), [value, moduleStyle, eyeStyle, ecc, margin, logo]);
  const name = label ?? t.labelFor(value.length > 40 ? `${value.slice(0, 40)}…` : value);

  async function save(kind: "svg" | "png") {
    setError(false);
    try {
      const svg = await buildExport(props, ref.current);
      if (kind === "svg") downloadSvg(svg, `${downloadName}.svg`);
      else await downloadPng(svg, `${downloadName}.png`, props.pngSize ?? 1024);
    } catch {
      setError(true);
    }
  }

  return (
    <div
      ref={ref}
      data-slot="qr-code"
      data-module-style={moduleStyle}
      data-eye-style={eyeStyle}
      dir="ltr"
      className={cn("inline-flex flex-col items-center gap-3", size === "fill" && "flex w-full", className)}
      {...rest}
    >
      <svg
        data-slot="qr-code-svg"
        role="img"
        aria-label={name}
        viewBox={`0 0 ${layout.size} ${layout.size}`}
        width={size === "fill" ? undefined : size}
        height={size === "fill" ? undefined : size}
        shapeRendering={moduleStyle === "square" && eyeStyle === "square" ? "crispEdges" : "geometricPrecision"}
        className={cn("aspect-square rounded-control border border-border", size === "fill" && "w-full")}
        style={{ background: bg }}
      >
        <path d={layout.modules} fill={fg} />
        {layout.eyes.map((e, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: three fixed corners
          <g key={i} fill={eyeFg ?? fg}>
            <path d={e.ring} fillRule="evenodd" />
            <path d={e.pupil} />
          </g>
        ))}
        {layout.logo ? (
          <image
            href={layout.logo.src}
            x={layout.logo.x}
            y={layout.logo.y}
            width={layout.logo.size}
            height={layout.logo.size}
            preserveAspectRatio="xMidYMid meet"
          />
        ) : null}
      </svg>
      {downloadable ? (
        <div className="flex flex-wrap items-center justify-center gap-2" dir="inherit" data-slot="qr-code-actions">
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

export interface QrCodeGeneratorProps extends Omit<ComponentProps<"div">, "children" | "onChange"> {
  /** Starting content. */
  defaultValue?: string;
  defaultModuleStyle?: QrModuleStyle;
  defaultEyeStyle?: QrEyeStyle;
  /** Starting foreground and background. Any CSS colour or token. */
  defaultFg?: string;
  defaultBg?: string;
  /** Default centre logo, for example the product mark as a data: URI. The user can remove or replace it. */
  defaultLogo?: string;
  /** Base name of downloaded files. Default "qr-code". */
  downloadName?: string;
  labels?: Partial<QrCodeLabels>;
}

/** Native colour inputs need a #rrggbb value: read the concrete colour of a token when it is one. */
function hexOf(value: string, node: Element | null) {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  const rgb = resolveColor(value, node).match(/\d+(\.\d+)?/g);
  if (!rgb || rgb.length < 3) return `#${"0".repeat(6)}`;
  return `#${rgb
    .slice(0, 3)
    .map((n) => Math.round(Number(n)).toString(16).padStart(2, "0"))
    .join("")}`;
}

/**
 * The QR generator: type the content, pick the module and corner style, colours and a centre logo, watch
 * the code update, and download it as SVG or PNG. Built on `QrCode`.
 */
export function QrCodeGenerator({
  defaultValue = "https://nasaqui.com",
  defaultModuleStyle = "rounded",
  defaultEyeStyle = "rounded",
  defaultFg = "black",
  defaultBg = "white",
  defaultLogo,
  downloadName,
  labels,
  className,
  ...props
}: QrCodeGeneratorProps) {
  const t = useLabels(labels);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [moduleStyle, setModuleStyle] = useState<QrModuleStyle>(defaultModuleStyle);
  const [eyeStyle, setEyeStyle] = useState<QrEyeStyle>(defaultEyeStyle);
  const [ecc, setEcc] = useState<QrEcc>("M");
  const [fg, setFg] = useState(defaultFg);
  const [bg, setBg] = useState(defaultBg);
  const [logo, setLogo] = useState<string | undefined>(defaultLogo);

  const pick = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result));
    reader.readAsDataURL(file);
  };

  const styleItems = (Object.keys(t.styles) as QrModuleStyle[]).map((v) => ({ value: v, label: t.styles[v] }));
  const eyeItems = (Object.keys(t.eyes) as QrEyeStyle[]).map((v) => ({ value: v, label: t.eyes[v] }));
  const eccItems = (Object.keys(t.levels) as QrEcc[]).map((v) => ({ value: v, label: t.levels[v] }));

  return (
    <Card ref={root} data-slot="qr-code-generator" className={cn("w-full max-w-3xl", className)} {...props}>
      <CardHeader>
        <CardTitle as="h2">{t.label}</CardTitle>
        <CardDescription>{t.contentHint}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel>{t.contentLabel}</FieldLabel>
            <Textarea dir="auto" rows={3} value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>{t.moduleStyle}</FieldLabel>
              <Select items={styleItems} value={moduleStyle} onValueChange={(v) => v && setModuleStyle(v as QrModuleStyle)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {styleItems.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>{t.eyeStyle}</FieldLabel>
              <Select items={eyeItems} value={eyeStyle} onValueChange={(v) => v && setEyeStyle(v as QrEyeStyle)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eyeItems.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>{t.ecc}</FieldLabel>
              <Select items={eccItems} value={logo ? "H" : ecc} disabled={Boolean(logo)} onValueChange={(v) => v && setEcc(v as QrEcc)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eccItems.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-end gap-3">
              <label className="flex flex-col gap-1.5 text-label text-foreground" htmlFor={`${id}-fg`}>
                {t.fg}
                <input
                  id={`${id}-fg`}
                  type="color"
                  value={hexOf(fg, root.current)}
                  onChange={(e) => setFg(e.target.value)}
                  className="h-control w-14 cursor-pointer rounded-control border border-input bg-card p-1"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-label text-foreground" htmlFor={`${id}-bg`}>
                {t.bg}
                <input
                  id={`${id}-bg`}
                  type="color"
                  value={hexOf(bg, root.current)}
                  onChange={(e) => setBg(e.target.value)}
                  className="h-control w-14 cursor-pointer rounded-control border border-input bg-card p-1"
                />
              </label>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <input id={`${id}-logo`} type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
              <Button type="button" size="sm" render={<label htmlFor={`${id}-logo`} />} nativeButton={false}>
                <ImageUp aria-hidden />
                {logo ? t.logo : t.logoAdd}
              </Button>
              {logo ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => setLogo(undefined)}>
                  <X aria-hidden />
                  {t.logoRemove}
                </Button>
              ) : null}
            </div>
            {logo ? <p className="text-caption text-muted-foreground">{t.logoNote}</p> : null}
          </div>
        </div>
        <QrCode
          value={value || " "}
          moduleStyle={moduleStyle}
          eyeStyle={eyeStyle}
          ecc={ecc}
          fg={fg}
          bg={bg}
          logo={logo ? { src: logo } : undefined}
          size={224}
          downloadable
          downloadName={downloadName}
          labels={labels}
          className="justify-self-center"
        />
      </CardContent>
    </Card>
  );
}
