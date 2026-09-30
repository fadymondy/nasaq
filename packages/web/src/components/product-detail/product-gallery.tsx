"use client";

import { ChevronLeft, ChevronRight, ImageOff, Maximize2, Play, ZoomIn } from "lucide-react";
import { type ComponentProps, type CSSProperties, type KeyboardEvent, type PointerEvent, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import type { CommerceImage } from "../../lib/commerce";
import { Button } from "../button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../dialog";
import { Icon } from "../icon";
import { useFormatNumber } from "../numeric";
import { resolveSwipe, stepIndex, zoomOrigin } from "./pdp-logic";
import { type ProductDetailLabels, usePdpStrings } from "./pdp-strings";

export interface ProductGalleryProps extends Omit<ComponentProps<"div">, "onChange"> {
  images: readonly CommerceImage[];
  /** Controlled slide. Pair with `onIndexChange`. */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Hover-zoom on mouse pointers and the full-screen viewer. Default true. */
  zoom?: boolean;
  /** Fallback alt text when an image has none. */
  name?: string;
  labels?: ProductDetailLabels;
}

/** Neutral token-coloured stand-in for a missing or broken image. */
function Placeholder({ label, className }: { label: string; className?: string }) {
  return (
    <div role="img" aria-label={label} className={cn("flex size-full items-center justify-center bg-secondary text-muted-foreground", className)}>
      <ImageOff aria-hidden className="size-8" />
    </div>
  );
}

function Picture({ image, name, label, eager, className, style }: { image: CommerceImage | undefined; name?: string; label: string; eager?: boolean; className?: string; style?: CSSProperties }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!image || failed === image.src) return <Placeholder label={label} />;
  return (
    <img
      src={image.src}
      alt={image.alt || name || ""}
      width={image.width ?? 800}
      height={image.height ?? 800}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      onError={() => setFailed(image.src)}
      className={className}
      style={style}
    />
  );
}

interface ViewportProps {
  image: CommerceImage | undefined;
  name?: string;
  rtl: boolean;
  zoom: boolean;
  /** "hover": follow a mouse pointer. "click": toggle at the click point (the full-screen viewer). */
  zoomMode: "hover" | "click";
  fit: "contain" | "cover";
  onStep: (delta: number) => void;
  onActivate?: () => void;
  activateLabel: string;
  noImageLabel: string;
  videoLabel: string;
  eager?: boolean;
  className?: string;
}

/** One image with swipe, hover or click zoom and arrow-key stepping. Purely visual: the caller owns the index. */
function GalleryViewport({ image, name, rtl, zoom, zoomMode, fit, onStep, onActivate, activateLabel, noImageLabel, videoLabel, eager, className }: ViewportProps) {
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const ref = useRef<HTMLDivElement>(null);
  const zoomed = origin !== null;

  const track = (event: PointerEvent<HTMLElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) setOrigin(zoomOrigin(event.clientX, event.clientY, rect));
  };

  const onKey = (event: KeyboardEvent<HTMLElement>) => {
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    if (event.key === forward) onStep(1);
    else if (event.key === back) onStep(-1);
    else if (event.key === "Escape" && zoomed) setOrigin(null);
    else return;
    if (event.key !== "Escape") setOrigin(null);
  };

  return (
    <div
      ref={ref}
      data-slot="product-gallery-viewport"
      data-zoomed={zoomed || undefined}
      className={cn("relative overflow-hidden bg-secondary [touch-action:pan-y]", className)}
      onPointerDown={(event) => {
        swiped.current = false;
        start.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        const from = start.current;
        start.current = null;
        if (!from || zoomed) return;
        const result = resolveSwipe(event.clientX - from.x, event.clientY - from.y, { rtl });
        if (result) {
          swiped.current = true;
          onStep(result === "next" ? 1 : -1);
        }
      }}
      onPointerCancel={() => {
        start.current = null;
      }}
      onPointerMove={(event) => {
        if (zoom && zoomMode === "hover" && event.pointerType === "mouse" && zoomed) track(event);
      }}
      onPointerEnter={(event) => {
        if (zoom && zoomMode === "hover" && event.pointerType === "mouse") track(event);
      }}
      onPointerLeave={() => zoomMode === "hover" && setOrigin(null)}
    >
      <button
        type="button"
        data-slot="product-gallery-stage"
        aria-label={activateLabel}
        onKeyDown={onKey}
        onClick={(event) => {
          if (swiped.current) {
            swiped.current = false;
            return;
          }
          if (zoomMode === "click") {
            if (zoomed) setOrigin(null);
            else {
              const rect = ref.current?.getBoundingClientRect();
              if (rect) setOrigin(zoomOrigin(event.clientX, event.clientY, rect));
            }
          } else onActivate?.();
        }}
        className={cn(
          "block size-full outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
          zoomMode === "click" ? (zoomed ? "cursor-zoom-out" : "cursor-zoom-in") : zoom ? "cursor-zoom-in" : "cursor-pointer",
        )}
      >
        {image ? (
          <Picture
            image={image}
            name={name}
            label={noImageLabel}
            eager={eager}
            className={cn("size-full select-none transition-transform duration-200 ease-nq motion-reduce:transition-none", fit === "contain" ? "object-contain" : "object-cover")}
            style={{ transform: zoomed ? "scale(2)" : undefined, transformOrigin: origin ? `${origin.x}% ${origin.y}%` : undefined }}
          />
        ) : (
          <Placeholder label={noImageLabel} />
        )}
      </button>
      {image?.kind === "video" && (
        <span className="pointer-events-none absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-caption font-medium text-foreground">
          <Play aria-hidden className="size-3 fill-current" />
          {videoLabel}
        </span>
      )}
    </div>
  );
}

function Thumbs({ images, index, onSelect, name, labels, fmt, className }: { images: readonly CommerceImage[]; index: number; onSelect: (i: number) => void; name?: string; labels: ReturnType<typeof usePdpStrings>["t"]; fmt: (n: number) => string; className?: string }) {
  return (
    <ul data-slot="product-gallery-thumbs" className={cn("flex gap-2 overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}>
      {images.map((image, i) => (
        <li key={`${image.src}-${i}`} className="shrink-0">
          <button
            type="button"
            aria-label={labels.showImage(fmt(i + 1))}
            aria-current={i === index ? "true" : undefined}
            onClick={() => onSelect(i)}
            className={cn(
              "relative block size-16 overflow-hidden rounded-control border bg-secondary outline-none transition-colors duration-150 ease-nq",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
              i === index ? "border-foreground ring-1 ring-foreground" : "border-border opacity-80 hover:opacity-100",
            )}
          >
            <Picture image={image} name={name} label={labels.noImage} className="size-full object-cover" />
            {image.kind === "video" && (
              <span className="absolute inset-0 flex items-center justify-center bg-nq-fg/25 text-background">
                <Play aria-hidden className="size-4 fill-current" />
                <span className="sr-only">{labels.video}</span>
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * The product media block: a large image with hover zoom on a mouse, swipe on touch and arrow keys, a
 * thumbnail strip, a video badge and a full-screen viewer with click zoom. It does not know about variants:
 * drive `index` from `imageForSelection` to make the picture follow the colour.
 */
export function ProductGallery({ images, index, defaultIndex = 0, onIndexChange, zoom = true, name, labels, className, ...props }: ProductGalleryProps) {
  const { t, rtl } = usePdpStrings(labels);
  const fmtNumber = useFormatNumber();
  const fmt = (n: number) => fmtNumber(n);
  const [inner, setInner] = useState(defaultIndex);
  const [open, setOpen] = useState(false);
  const controlled = index !== undefined;
  const raw = controlled ? index : inner;
  const current = images.length ? Math.min(Math.max(raw, 0), images.length - 1) : 0;
  const go = (next: number) => {
    if (!controlled) setInner(next);
    onIndexChange?.(next);
  };
  const step = (delta: number) => go(stepIndex(current, delta, images.length));
  const image = images[current];
  const many = images.length > 1;
  const position = t.imageOf(fmt(current + 1), fmt(images.length));

  return (
    <div data-slot="product-gallery" role="group" aria-roledescription="carousel" aria-label={t.gallery} className={cn("flex min-w-0 flex-col gap-3", className)} {...props}>
      <div className="relative">
        <GalleryViewport
          image={image}
          name={name}
          rtl={rtl}
          zoom={zoom}
          zoomMode="hover"
          fit="contain"
          onStep={step}
          onActivate={zoom ? () => setOpen(true) : undefined}
          activateLabel={zoom ? t.fullScreen : position}
          noImageLabel={t.noImage}
          videoLabel={t.video}
          eager
          className="aspect-square rounded-card border border-border"
        />
        {many && (
          <>
            <Button type="button" variant="secondary" size="icon-sm" aria-label={t.prevImage} onClick={() => step(-1)} className="absolute start-2 top-1/2 -translate-y-1/2 rounded-full opacity-90 shadow-sm">
              <Icon icon={ChevronLeft} directional />
            </Button>
            <Button type="button" variant="secondary" size="icon-sm" aria-label={t.nextImage} onClick={() => step(1)} className="absolute end-2 top-1/2 -translate-y-1/2 rounded-full opacity-90 shadow-sm">
              <Icon icon={ChevronRight} directional />
            </Button>
          </>
        )}
        {zoom && (
          <Button type="button" variant="secondary" size="icon-sm" aria-label={t.fullScreen} onClick={() => setOpen(true)} className="absolute end-2 top-2 rounded-full opacity-90 shadow-sm">
            <Maximize2 aria-hidden />
          </Button>
        )}
        <span className="pointer-events-none absolute bottom-2 end-2 rounded-full bg-background/90 px-2 py-0.5 text-caption tabular-nums text-muted-foreground" aria-hidden>
          <bdi>{fmt(current + 1)}</bdi> / <bdi>{fmt(images.length)}</bdi>
        </span>
      </div>
      <p className="sr-only" aria-live="polite">
        {position}
      </p>
      {many && <Thumbs images={images} index={current} onSelect={go} name={name} labels={t} fmt={fmt} />}

      {zoom && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="h-[calc(100dvh-1rem)] max-h-none w-[calc(100%-1rem)] max-w-none grid-rows-[auto_minmax(0,1fr)_auto] gap-3 p-3" aria-describedby={undefined}>
            <div className="flex items-center justify-between gap-3 pe-10">
              <DialogTitle className="text-body font-medium">{name ?? t.lightbox}</DialogTitle>
              <DialogDescription className="text-caption tabular-nums">{position}</DialogDescription>
            </div>
            <div className="relative min-h-0">
              <GalleryViewport
                image={image}
                name={name}
                rtl={rtl}
                zoom
                zoomMode="click"
                fit="contain"
                onStep={step}
                activateLabel={t.zoomIn}
                noImageLabel={t.noImage}
                videoLabel={t.video}
                className="size-full rounded-card"
              />
              {many && (
                <>
                  <Button type="button" variant="secondary" size="icon" aria-label={t.prevImage} onClick={() => step(-1)} className="absolute start-2 top-1/2 -translate-y-1/2 rounded-full">
                    <Icon icon={ChevronLeft} directional />
                  </Button>
                  <Button type="button" variant="secondary" size="icon" aria-label={t.nextImage} onClick={() => step(1)} className="absolute end-2 top-1/2 -translate-y-1/2 rounded-full">
                    <Icon icon={ChevronRight} directional />
                  </Button>
                </>
              )}
              <span className="pointer-events-none absolute bottom-2 start-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-caption text-muted-foreground" aria-hidden>
                <ZoomIn className="size-3" />
              </span>
            </div>
            {many && <Thumbs images={images} index={current} onSelect={go} name={name} labels={t} fmt={fmt} className="justify-center" />}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
