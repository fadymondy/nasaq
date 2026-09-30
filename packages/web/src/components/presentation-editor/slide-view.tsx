"use client";

import { ImageOff } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Icon } from "../icon";
import { bulletText, lines, type Slide, type SlideTheme, safeImageSrc } from "./presentation-math";
import type { PresentationText } from "./presentation-strings";

const THEME: Record<SlideTheme, string> = {
  light: "bg-card text-foreground",
  dark: "bg-nq-fg text-nq-bg",
  brand: "bg-primary text-primary-foreground",
};

export interface SlideViewProps {
  slide: Slide;
  /** Text fields become inputs and call `onChange` with the changed fields. */
  onChange?: (patch: Partial<Slide>) => void;
  /** Strings for placeholders and the empty image. Only needed when editable. */
  t?: PresentationText;
  className?: string;
  /** Marks the frame as decorative (thumbnails). */
  decorative?: boolean;
}

function Text({
  value,
  onChange,
  placeholder,
  className,
  bullets,
}: {
  value: string | undefined;
  onChange?: (next: string) => void;
  placeholder?: string;
  className?: string;
  bullets?: boolean;
}) {
  if (onChange) {
    return (
      <textarea
        rows={1}
        dir="auto"
        value={value ?? ""}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => onChange(e.currentTarget.value)}
        className={cn(
          "block w-full min-w-0 resize-none rounded-[0.6cqw] border-0 bg-transparent p-0 text-start text-[length:inherit] leading-[inherit] [field-sizing:content]",
          "placeholder:text-current placeholder:opacity-40 outline-none focus-visible:outline-2 focus-visible:outline-offset-[0.6cqw] focus-visible:outline-nq-focus",
          className,
        )}
      />
    );
  }
  const items = lines(value);
  if (items.length === 0) return null;
  if (bullets) {
    return (
      <ul dir="auto" className={cn("list-disc space-y-[1cqw] ps-[3cqw] text-start marker:opacity-60", className)}>
        {items.map((l, i) => (
          <li key={`${i}-${l}`}>{bulletText(l)}</li>
        ))}
      </ul>
    );
  }
  return (
    <p dir="auto" className={cn("whitespace-pre-line text-start", className)}>
      {value}
    </p>
  );
}

/**
 * One 16:9 slide, drawn with container-relative units so it looks the same at any size: a thumbnail, the editing
 * canvas or the full-screen player. Pass `onChange` to edit the text in place.
 */
export function SlideView({ slide, onChange, t, className, decorative }: SlideViewProps) {
  const on = (key: keyof Slide) => (onChange ? (next: string) => onChange({ [key]: next } as Partial<Slide>) : undefined);
  const theme = THEME[slide.theme ?? "light"];
  const image = safeImageSrc(slide.image);
  const ph = t ?? ({} as Partial<PresentationText>);

  let content: ReactNode = null;
  switch (slide.layout) {
    case "title":
      content = (
        <div className="flex h-full flex-col justify-center gap-[2cqw]">
          <Text value={slide.title} onChange={on("title")} placeholder={ph.titlePlaceholder} className="text-[6.4cqw] leading-[1.1] font-semibold" />
          <Text value={slide.subtitle} onChange={on("subtitle")} placeholder={ph.subtitlePlaceholder} className="text-[2.8cqw] leading-snug opacity-75" />
        </div>
      );
      break;
    case "section":
      content = (
        <div className="flex h-full flex-col justify-end gap-[1.5cqw]">
          <Text value={slide.title} onChange={on("title")} placeholder={ph.titlePlaceholder} className="text-[5.6cqw] leading-[1.1] font-semibold" />
          <Text value={slide.subtitle} onChange={on("subtitle")} placeholder={ph.subtitlePlaceholder} className="text-[2.4cqw] leading-snug opacity-75" />
        </div>
      );
      break;
    case "content":
      content = (
        <div className="flex h-full flex-col gap-[3cqw]">
          <Text value={slide.title} onChange={on("title")} placeholder={ph.titlePlaceholder} className="text-[4.2cqw] leading-[1.15] font-semibold" />
          <Text value={slide.body} onChange={on("body")} placeholder={ph.bodyPlaceholder} bullets className="text-[2.6cqw] leading-snug" />
        </div>
      );
      break;
    case "two-column":
      content = (
        <div className="flex h-full flex-col gap-[3cqw]">
          <Text value={slide.title} onChange={on("title")} placeholder={ph.titlePlaceholder} className="text-[4.2cqw] leading-[1.15] font-semibold" />
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-[4cqw]">
            <Text value={slide.body} onChange={on("body")} placeholder={ph.leftPlaceholder} bullets className="text-[2.3cqw] leading-snug" />
            <Text value={slide.body2} onChange={on("body2")} placeholder={ph.rightPlaceholder} bullets className="text-[2.3cqw] leading-snug" />
          </div>
        </div>
      );
      break;
    case "quote":
      content = (
        <div className="flex h-full flex-col justify-center gap-[3cqw] ps-[3cqw]">
          <Text value={slide.body} onChange={on("body")} placeholder={ph.quotePlaceholder} className="text-[3.8cqw] leading-[1.25] font-medium" />
          <Text value={slide.subtitle} onChange={on("subtitle")} placeholder={ph.authorPlaceholder} className="text-[2.2cqw] opacity-70" />
        </div>
      );
      break;
    case "image":
      content = (
        <div className="flex h-full flex-col gap-[2.5cqw]">
          <Text value={slide.title} onChange={on("title")} placeholder={ph.titlePlaceholder} className="text-[4.2cqw] leading-[1.15] font-semibold" />
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[1cqw] border border-current/15 bg-current/5">
            {image ? (
              <img src={image} alt={slide.imageAlt ?? ""} className="size-full object-cover" draggable={false} />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-[1cqw] text-[2cqw] opacity-50">
                <Icon icon={ImageOff} className="size-[4cqw]" />
                {ph.noImage}
              </div>
            )}
          </div>
        </div>
      );
      break;
    default:
      content = null;
  }

  return (
    <div
      data-slot="slide"
      data-layout={slide.layout}
      aria-hidden={decorative || undefined}
      className={cn("@container relative aspect-video w-full overflow-hidden", theme, className)}
    >
      <div className="absolute inset-0 p-[6cqw]">{content}</div>
    </div>
  );
}
