"use client";

import { closestCenter, DndContext, type DragEndEvent, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronLeft, ChevronRight, GripVertical, ImagePlus, Trash2, TriangleAlert } from "lucide-react";
import { type ComponentProps, useId, useState } from "react";
import type { CommerceImage } from "../../lib/commerce";
import { cn } from "../../lib/cn";
import { Badge } from "../badge";
import { Button } from "../button";
import { Field, FieldLabel, Input } from "../field";
import { EmptyState } from "../states";
import { moveItem } from "./product-admin-logic";
import { type StoreProductsAdminLabels, Thumb, useProductAdminStrings } from "./product-admin-shared";

export interface MediaManagerProps extends Omit<ComponentProps<"section">, "children" | "onChange"> {
  images: readonly CommerceImage[];
  /** Called with the whole new list after an add, reorder, alt-text edit or removal. */
  onImagesChange: (images: CommerceImage[]) => void;
  /** Most images. Default 12. */
  maxImages?: number;
  disabled?: boolean;
  labels?: StoreProductsAdminLabels;
}

/**
 * The picture manager of a product: add by URL, reorder by drag, keyboard (Space, then arrows) or the move buttons,
 * write alt text for each picture, and see which pictures still lack it. The first picture is the main image.
 * A URL that fails to load shows a placeholder, never a broken icon. It stores no files: `images` are URLs.
 */
export function MediaManager({ images, onImagesChange, maxImages = 12, disabled = false, labels, className, ...props }: MediaManagerProps) {
  const { t, n } = useProductAdminStrings(labels);
  const uid = useId();
  const [url, setUrl] = useState("");
  const [announce, setAnnounce] = useState("");
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const keys = images.map((i) => i.src);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length || from === to) return;
    onImagesChange(moveItem(images, from, to));
    setAnnounce(t.movedTo(n(to + 1), n(images.length)));
  };
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    move(keys.indexOf(String(e.active.id)), keys.indexOf(String(e.over.id)));
  };
  const add = () => {
    const src = url.trim();
    if (!src || keys.includes(src) || images.length >= maxImages) return;
    onImagesChange([...images, { src, alt: "" }]);
    setUrl("");
  };
  const missing = images.filter((i) => !i.alt.trim()).length;

  return (
    <section data-slot="media-manager" aria-label={t.mediaLabel} className={cn("flex min-w-0 flex-col gap-3", className)} {...props}>
      {missing > 0 ? (
        <p className="flex items-center gap-2 text-caption text-nq-warning-text">
          <TriangleAlert aria-hidden className="size-4 shrink-0" />
          {t.missingAlt}: <bdi className="tabular-nums">{n(missing)}</bdi>
        </p>
      ) : null}

      {images.length === 0 ? (
        <EmptyState icon={ImagePlus} title={t.noImages} description={t.noImagesHint} className="border-dashed" />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={keys} strategy={rectSortingStrategy}>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {images.map((img, i) => (
                <MediaTile
                  key={img.src}
                  image={img}
                  index={i}
                  total={images.length}
                  disabled={disabled}
                  onMove={(to) => move(i, to)}
                  onAlt={(alt) => onImagesChange(images.map((x, k) => (k === i ? { ...x, alt } : x)))}
                  onRemove={() => onImagesChange(images.filter((_, k) => k !== i))}
                  t={t}
                  n={n}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <Field className="min-w-0 flex-1 basis-56">
          <FieldLabel htmlFor={`${uid}-url`}>{t.imageUrl}</FieldLabel>
          <Input id={`${uid}-url`} ltr type="url" inputMode="url" value={url} placeholder={t.imageUrlPlaceholder} disabled={disabled || images.length >= maxImages} onChange={(e) => setUrl(e.target.value)} />
        </Field>
        <Button type="submit" variant="secondary" disabled={disabled || !url.trim() || images.length >= maxImages}>
          <ImagePlus aria-hidden />
          {t.addImage}
        </Button>
      </form>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </section>
  );
}

function MediaTile({ image, index, total, disabled, onMove, onAlt, onRemove, t, n }: { image: CommerceImage; index: number; total: number; disabled: boolean; onMove: (to: number) => void; onAlt: (alt: string) => void; onRemove: () => void; t: ReturnType<typeof useProductAdminStrings>["t"]; n: (v: number) => string }) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: image.src, disabled });
  const uid = useId();
  const noAlt = !image.alt.trim();
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-slot="media-tile"
      data-dragging={isDragging || undefined}
      className={cn("flex min-w-0 flex-col gap-2 rounded-card border border-border bg-card p-2", isDragging && "relative z-10 shadow-lg")}
    >
      <div className="relative">
        <Thumb src={image.src} alt={image.alt || t.mediaLabel} size={160} label={t.imageFailed} className="aspect-square !h-auto w-full" />
        {index === 0 ? (
          <Badge variant="brand" className="absolute start-1.5 top-1.5">
            {t.primary}
          </Badge>
        ) : null}
        <Button
          ref={setActivatorNodeRef}
          type="button"
          size="icon-sm"
          variant="secondary"
          disabled={disabled}
          aria-label={t.dragHandle(n(index + 1))}
          className="absolute end-1.5 top-1.5 cursor-grab touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden />
        </Button>
      </div>
      <Field invalid={noAlt}>
        <FieldLabel htmlFor={`${uid}-alt`} className="text-caption">
          {t.altText}
        </FieldLabel>
        <Input id={`${uid}-alt`} value={image.alt} disabled={disabled} placeholder={t.altHint} onChange={(e) => onAlt(e.target.value)} />
      </Field>
      <div className="flex items-center justify-between gap-1">
        <div className="flex gap-1">
          <Button type="button" size="icon-sm" variant="ghost" aria-label={t.moveEarlier} disabled={disabled || index === 0} onClick={() => onMove(index - 1)}>
            <ChevronLeft aria-hidden className="rtl:rotate-180" />
          </Button>
          <Button type="button" size="icon-sm" variant="ghost" aria-label={t.moveLater} disabled={disabled || index === total - 1} onClick={() => onMove(index + 1)}>
            <ChevronRight aria-hidden className="rtl:rotate-180" />
          </Button>
        </div>
        <Button type="button" size="icon-sm" variant="ghost" aria-label={t.removeImage} disabled={disabled} onClick={onRemove}>
          <Trash2 aria-hidden />
        </Button>
      </div>
    </li>
  );
}
