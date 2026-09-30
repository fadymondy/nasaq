"use client";

import { ArrowLeft, Minus, Package, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import type { CommerceOrder } from "../../lib/commerce";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { Textarea } from "../field";
import { Dropzone, useObjectUrl } from "../file-upload";
import { Num } from "../numeric";
import { RadioCard, RadioGroup } from "../radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { StoreMoney } from "../store-orders-admin/money";
import { type StoreAccountLabels, useStoreAccountStrings } from "./account-strings";
import {
  type RefundMethod,
  type ReturnIssue,
  type ReturnReason,
  type ReturnRequest,
  RETURN_REASONS,
  deliveredAt,
  planReturn,
  reasonNeedsPhotos,
  refundMethodsFor,
  returnWindow,
  returnableLines,
} from "./return-math";

export interface ReturnSubmission {
  orderId: string;
  lines: { lineId: string; quantity: number }[];
  reason: ReturnReason;
  note: string;
  photos: File[];
  refundMethod: RefundMethod;
  /** The estimate shown to the customer, in minor units. The store confirms the final amount. */
  refundAmount: number;
}

export interface StoreReturnRequestProps {
  order: CommerceOrder;
  currency: string;
  /** Existing requests, so units already in a return are not offered again. */
  requests?: readonly ReturnRequest[];
  /** Days after delivery a return can be requested. Default 30. */
  returnDays?: number;
  now?: number | Date;
  maxPhotos?: number;
  onSubmit?: (submission: ReturnSubmission) => void;
  onBack?: () => void;
  labels?: StoreAccountLabels;
  className?: string;
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function Photo({ file, onRemove, label }: { file: File; onRemove: () => void; label: string }) {
  const url = useObjectUrl(file);
  return (
    <li className="relative size-20 overflow-hidden rounded-control border border-border bg-secondary">
      {url ? <img src={url} alt={file.name} className="size-full object-cover" /> : null}
      <button
        type="button"
        aria-label={`${label}: ${file.name}`}
        onClick={onRemove}
        className="absolute end-1 top-1 inline-flex size-6 items-center justify-center rounded-full border border-border bg-card text-foreground outline-none focus-visible:outline-2 focus-visible:outline-nq-focus"
      >
        <X aria-hidden className="size-3.5" />
      </button>
    </li>
  );
}

/**
 * The return / refund request flow: pick lines and quantities, a reason, photos when the reason needs proof, how to be
 * refunded, with the return window and a live refund estimate. All checks come from `planReturn`.
 */
export function StoreReturnRequest({ order, currency, requests = [], returnDays = 30, now, maxPhotos = 5, onSubmit, onBack, labels, className }: StoreReturnRequestProps) {
  const { t } = useStoreAccountStrings(labels);
  const clock = useMemo(() => now ?? Date.now(), [now]);
  const rows = useMemo(() => returnableLines(order, requests), [order, requests]);
  const win = returnWindow(deliveredAt(order), returnDays, clock);
  const methods = refundMethodsFor(order);

  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<ReturnReason | undefined>();
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [method, setMethod] = useState<RefundMethod | undefined>(methods[0]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);

  const picks = Object.entries(qty)
    .filter(([, q]) => q > 0)
    .map(([lineId, quantity]) => ({ lineId, quantity }));
  const plan = planReturn(order, requests, { picks, reason, note, photos: photos.length, refundMethod: method, windowOpen: win.open });
  const has = (code: ReturnIssue["code"]) => plan.issues.some((i) => i.code === code);
  const show = (code: ReturnIssue["code"]) => tried && has(code);
  const needsPhotos = reasonNeedsPhotos(reason);

  const set = (lineId: string, value: number, max: number) => setQty((q) => ({ ...q, [lineId]: Math.min(Math.max(value, 0), max) }));

  const submit = () => {
    setTried(true);
    if (!plan.ok || !reason || !method) return;
    onSubmit?.({ orderId: order.id, lines: plan.picks, reason, note: note.trim(), photos, refundMethod: method, refundAmount: plan.refundAmount });
  };

  return (
    <form
      data-slot="store-return-request"
      noValidate
      className={cn("flex min-w-0 flex-col gap-5", className)}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {onBack ? (
        <Button type="button" variant="ghost" size="sm" className="self-start" onClick={onBack}>
          <ArrowLeft aria-hidden className="rtl:-scale-x-100" />
          {t.back}
        </Button>
      ) : null}
      <header className="flex flex-col gap-1">
        <h2 className="m-0 text-h3 font-semibold">
          {t.returnTitle} <bdi className="text-muted-foreground">{order.number}</bdi>
        </h2>
        <p className="m-0 text-body-sm text-muted-foreground">{t.returnIntro}</p>
        <p className={cn("m-0 text-body-sm", win.open ? "text-muted-foreground" : "font-medium text-foreground")} role={win.open ? undefined : "alert"}>
          {win.open ? t.windowOpen(win.daysLeft) : t.windowShut}
        </p>
      </header>

      <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0" disabled={!win.open}>
        <legend className="mb-2 text-label font-semibold">{t.returnPick}</legend>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {rows.map(({ line, returnable, inRequest }) => {
            const picked = qty[line.id] ?? 0;
            const over = plan.issues.find((i) => i.code === "line-over" && i.lineId === line.id);
            return (
              <li key={line.id} className={cn("flex flex-wrap items-center gap-3 rounded-card border bg-card p-3", picked > 0 ? "border-primary" : "border-border", returnable === 0 && "opacity-60")}>
                <Checkbox aria-label={line.name} disabled={returnable === 0} checked={picked > 0} onCheckedChange={(c) => set(line.id, c ? 1 : 0, returnable)} />
                <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-secondary">
                  {line.image ? <img src={line.image} alt="" className="size-full object-cover" /> : <Package aria-hidden className="size-5 text-muted-foreground" />}
                </span>
                <div className="flex min-w-0 flex-1 basis-40 flex-col gap-0.5">
                  <span className="truncate font-medium">{line.name}</span>
                  {line.variantLabel ? <span className="truncate text-body-sm text-muted-foreground">{line.variantLabel}</span> : null}
                  <span className="text-caption text-muted-foreground">
                    {returnable > 0 ? t.returnableLeft(returnable) : t.notReturnable}
                    {inRequest > 0 ? ` · ${t.inRequest(inRequest)}` : ""}
                  </span>
                </div>
                {returnable > 0 ? (
                  <div className="flex items-center gap-1" role="group" aria-label={`${t.quantity}: ${line.name}`}>
                    <Button type="button" size="icon-sm" variant="secondary" aria-label="-" disabled={picked <= 0} onClick={() => set(line.id, picked - 1, returnable)}>
                      <Minus aria-hidden />
                    </Button>
                    <Num value={picked} className="min-w-6 text-center" aria-live="polite" />
                    <Button type="button" size="icon-sm" variant="secondary" aria-label="+" disabled={picked >= returnable} onClick={() => set(line.id, picked + 1, returnable)}>
                      <Plus aria-hidden />
                    </Button>
                  </div>
                ) : null}
                {over ? <p className="m-0 basis-full text-caption text-nq-danger-text">{t.issueLineOver("max" in over ? over.max : 0)}</p> : null}
              </li>
            );
          })}
        </ul>
        {show("empty") ? <p role="alert" className="m-0 text-body-sm text-nq-danger-text">{t.issueEmpty}</p> : null}
      </fieldset>

      <div className="flex flex-col gap-2">
        <span className="text-label font-semibold">{t.returnReason}</span>
        <Select items={RETURN_REASONS.map((r) => ({ value: r, label: t.reasons[r] }))} value={reason ?? null} onValueChange={(v) => setReason(v ? (String(v) as ReturnReason) : undefined)}>
          <SelectTrigger aria-label={t.returnReason} aria-invalid={show("reason") || undefined}>
            <SelectValue placeholder={t.reasonPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {RETURN_REASONS.map((r) => (
              <SelectItem key={r} value={r}>
                {t.reasons[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {show("reason") ? <p role="alert" className="m-0 text-body-sm text-nq-danger-text">{t.issueReason}</p> : null}
        <label className="flex flex-col gap-1.5 text-body-sm">
          <span className="font-medium">{t.returnNote}</span>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={show("note") || undefined} />
        </label>
        {show("note") ? <p role="alert" className="m-0 text-body-sm text-nq-danger-text">{t.returnNoteRequired}</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-label font-semibold">{t.photos}</span>
        <p className={cn("m-0 text-body-sm", show("photos") ? "text-nq-danger-text" : "text-muted-foreground")} role={show("photos") ? "alert" : undefined}>
          {needsPhotos ? t.photosNeeded : t.photosOptional}
        </p>
        <Dropzone
          accept="image/*"
          maxSize={MAX_PHOTO_BYTES}
          maxFiles={maxPhotos}
          count={photos.length}
          invalid={show("photos")}
          inputProps={{ "aria-label": t.photos }}
          onFiles={(files) => {
            setPhotoError(null);
            setPhotos((p) => [...p, ...files].slice(0, maxPhotos));
          }}
          onReject={(r) => r.length && setPhotoError(r.some((x) => x.code === "too-many") ? t.tooManyPhotos(maxPhotos) : t.photoRejected)}
        >
          {t.photoPrompt}
        </Dropzone>
        {photoError ? <p role="alert" className="m-0 text-body-sm text-nq-danger-text">{photoError}</p> : null}
        {photos.length > 0 ? (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {photos.map((file, i) => (
              <Photo key={`${file.name}-${i}`} file={file} label={t.removePhoto} onRemove={() => setPhotos((p) => p.filter((_, j) => j !== i))} />
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-label font-semibold">{t.refundMethod}</span>
        <RadioGroup aria-label={t.refundMethod} value={method ?? ""} onValueChange={(v) => setMethod(v as RefundMethod)} className="grid gap-2">
          {methods.map((m) => (
            <RadioCard key={m} value={m} title={t.methods[m]} description={t.methodHints[m]} />
          ))}
        </RadioGroup>
        {show("method") ? <p role="alert" className="m-0 text-body-sm text-nq-danger-text">{t.issueMethod}</p> : null}
      </div>

      <div className="flex flex-col gap-1 rounded-card border border-border bg-secondary p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-label font-semibold">{t.refundEstimate}</span>
          <StoreMoney amount={plan.refundAmount} currency={currency} className="text-h3 font-semibold" />
        </div>
        <p className="m-0 text-caption text-muted-foreground">{t.estimateNote}</p>
      </div>

      <div className="flex flex-col gap-2">
        {tried && !plan.ok ? <p role="alert" className="m-0 text-body-sm text-nq-danger-text">{t.fixIssues}</p> : null}
        <Button type="submit" variant="primary" disabled={!win.open} className="self-start">
          {t.submitReturn}
        </Button>
      </div>
    </form>
  );
}
