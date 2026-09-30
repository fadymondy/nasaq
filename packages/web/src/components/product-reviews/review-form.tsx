"use client";

import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { CircleCheck, ImagePlus, Star, X } from "lucide-react";
import { type ComponentProps, useEffect, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { Button } from "../button";
import { Field, FieldDescription, FieldError, FieldLabel, Input, Textarea } from "../field";
import { useFormatNumber } from "../numeric";
import { DEFAULT_REVIEW_RULES, type ReviewErrors, type ReviewFit, type ReviewRules, validateReview } from "./review-logic";
import { type ProductReviewsLabels, type ReviewActionResult, useReviewStrings } from "./review-strings";

export interface ProductReviewInput {
  rating: number;
  title: string;
  body: string;
  name: string;
  fit?: ReviewFit;
  photos: File[];
}

export interface ProductReviewFormProps extends Omit<ComponentProps<"form">, "onSubmit"> {
  /** Send the review. Return `{ error }` (or throw) to keep the form open with the message. */
  onSubmit: (review: ProductReviewInput) => ReviewActionResult | Promise<ReviewActionResult>;
  /** Show the "how does it fit?" question, for clothing and shoes. */
  askFit?: boolean;
  /** Ask for a name (guests). Signed-in shoppers do not need it. */
  askName?: boolean;
  defaultName?: string;
  rules?: ReviewRules;
  /** Called after a successful send, once the thank-you is shown. */
  onSubmitted?: () => void;
  onCancel?: () => void;
  labels?: ProductReviewsLabels;
}

const FITS: ReviewFit[] = ["small", "true", "large"];

/** A preview tile that revokes its object URL when it goes away. */
function PhotoPreview({ file, remove, label }: { file: File; remove: () => void; label: string }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <li className="relative size-16 overflow-hidden rounded-control border border-border bg-secondary">
      {url && <img src={url} alt={file.name} width={64} height={64} className="size-full object-cover" />}
      <button type="button" aria-label={`${label}: ${file.name}`} onClick={remove} className="absolute end-0.5 top-0.5 inline-flex size-5 items-center justify-center rounded-full bg-background/90 text-foreground outline-none hover:bg-background focus-visible:outline-2 focus-visible:outline-nq-focus">
        <X aria-hidden className="size-3" />
      </button>
    </li>
  );
}

/**
 * Write-a-review form: star rating, optional title, body, name, fit feedback and photos, with validation on
 * submit (and once a field has been left). It sends through `onSubmit` and shows a thank-you afterwards.
 */
export function ProductReviewForm({ onSubmit, askFit, askName, defaultName = "", rules, onSubmitted, onCancel, labels, className, ...props }: ProductReviewFormProps) {
  const { t } = useReviewStrings(labels);
  const fmt = useFormatNumber();
  const uid = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const r = { ...DEFAULT_REVIEW_RULES, ...rules };
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [name, setName] = useState(defaultName);
  const [fit, setFit] = useState<ReviewFit | "">("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [failure, setFailure] = useState<string | null>(null);

  const rulesForCheck: ReviewRules = { ...rules, requireName: askName ? true : rules?.requireName };
  const errors: ReviewErrors = validateReview({ rating, title, body, name, fit, photos: photos.length }, rulesForCheck);
  const show = (field: keyof ReviewErrors) => (submitted || touched.has(field)) && errors[field];
  const touch = (field: string) => setTouched((s) => new Set(s).add(field));

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setFailure(null);
    if (Object.keys(errors).length) {
      const first = (["rating", "title", "body", "name", "photos"] as const).find((k) => errors[k]);
      (document.getElementById(`${uid}-${first}`) ?? undefined)?.focus();
      return;
    }
    setState("sending");
    try {
      const result = await onSubmit({ rating, title: title.trim(), body: body.trim(), name: name.trim(), ...(fit ? { fit } : {}), photos });
      if (result && typeof result === "object" && result.error) {
        setFailure(result.error);
        setState("idle");
        return;
      }
      setState("done");
      onSubmitted?.();
    } catch {
      setFailure(t.submitFailed);
      setState("idle");
    }
  };

  if (state === "done")
    return (
      <div data-slot="product-review-form" role="status" className={cn("flex flex-col items-center gap-2 py-8 text-center", className)}>
        <CircleCheck aria-hidden className="size-10 text-nq-success" />
        <p className="text-h3 text-foreground">{t.reviewThanks}</p>
        <p className="text-body-sm text-muted-foreground">{t.reviewThanksHint}</p>
      </div>
    );

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...photos, ...Array.from(list).filter((f) => f.type.startsWith("image/"))];
    setPhotos(next);
    touch("photos");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <form data-slot="product-review-form" noValidate onSubmit={send} className={cn("flex flex-col gap-5", className)} {...props}>
      <div className="flex flex-col gap-1.5">
        <span id={`${uid}-rating-label`} className="text-label text-foreground">
          {t.yourRating}
        </span>
        <div className="flex items-center gap-3">
          <BaseRadioGroup
            id={`${uid}-rating`}
            value={rating ? String(rating) : null}
            onValueChange={(v) => {
              setRating(Number(v));
              touch("rating");
            }}
            aria-labelledby={`${uid}-rating-label`}
            aria-invalid={Boolean(show("rating")) || undefined}
            aria-describedby={show("rating") ? `${uid}-rating-error` : undefined}
            className="flex gap-1"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <BaseRadio.Root
                key={n}
                value={String(n)}
                aria-label={t.ratingStar(fmt(n))}
                className="inline-flex size-9 items-center justify-center rounded-control outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
              >
                <Star aria-hidden className={cn("size-6 transition-colors duration-150", n <= rating ? "fill-nq-accent text-nq-accent" : "text-nq-line-strong")} />
              </BaseRadio.Root>
            ))}
          </BaseRadioGroup>
          <span aria-hidden className="text-body-sm text-muted-foreground">
            {rating ? t.ratingWord[rating] : ""}
          </span>
        </div>
        {show("rating") && (
          <p id={`${uid}-rating-error`} role="alert" className="text-caption text-nq-danger-text">
            {t.errors[errors.rating!]}
          </p>
        )}
      </div>

      <Field invalid={Boolean(show("title"))}>
        <FieldLabel>{t.reviewTitle}</FieldLabel>
        <Input id={`${uid}-title`} value={title} maxLength={r.titleMax + 20} onChange={(e) => setTitle(e.target.value)} onBlur={() => touch("title")} autoComplete="off" />
        <FieldDescription>{t.reviewTitleHint}</FieldDescription>
        {show("title") && <FieldError match>{t.errors[errors.title!]}</FieldError>}
      </Field>

      <Field invalid={Boolean(show("body"))}>
        <FieldLabel>{t.reviewBody}</FieldLabel>
        <Textarea id={`${uid}-body`} value={body} rows={5} onChange={(e) => setBody(e.target.value)} onBlur={() => touch("body")} />
        <FieldDescription>{t.reviewBodyHint(fmt(r.bodyMin))}</FieldDescription>
        {show("body") && <FieldError match>{t.errors[errors.body!]}</FieldError>}
      </Field>

      {askName && (
        <Field invalid={Boolean(show("name"))}>
          <FieldLabel>{t.yourName}</FieldLabel>
          <Input id={`${uid}-name`} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => touch("name")} autoComplete="name" />
          {show("name") && <FieldError match>{t.errors[errors.name!]}</FieldError>}
        </Field>
      )}

      {askFit && (
        <div className="flex flex-col gap-1.5">
          <span id={`${uid}-fit-label`} className="text-label text-foreground">
            {t.fitQuestion}
          </span>
          <BaseRadioGroup value={fit || null} onValueChange={(v) => setFit(v as ReviewFit)} aria-labelledby={`${uid}-fit-label`} className="flex flex-wrap gap-2">
            {FITS.map((f) => (
              <BaseRadio.Root
                key={f}
                value={f}
                className="inline-flex h-control items-center rounded-control border border-border bg-card px-3 text-label text-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus data-checked:border-foreground data-checked:ring-1 data-checked:ring-foreground"
              >
                {f === "small" ? t.fitSmall : f === "true" ? t.fitTrue : t.fitLarge}
              </BaseRadio.Root>
            ))}
          </BaseRadioGroup>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileRef} id={`${uid}-photos`} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
          <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()} disabled={photos.length >= r.maxPhotos}>
            <ImagePlus aria-hidden />
            {t.addPhotos}
          </Button>
          <span className={cn("text-caption", show("photos") ? "text-nq-danger-text" : "text-muted-foreground")}>{show("photos") ? t.errors["too-many-photos"] : t.photosHint(fmt(r.maxPhotos))}</span>
        </div>
        {photos.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {photos.map((file, i) => (
              <PhotoPreview key={`${file.name}-${i}`} file={file} label={t.removePhoto} remove={() => setPhotos((p) => p.filter((_, j) => j !== i))} />
            ))}
          </ul>
        )}
      </div>

      {failure && (
        <p role="alert" className="text-body-sm text-nq-danger-text">
          {failure}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t.cancel}
          </Button>
        )}
        <Button type="submit" variant="primary" loading={state === "sending"}>
          {state === "sending" ? t.submitting : t.submitReview}
        </Button>
      </div>
    </form>
  );
}
