"use client";

import { Ban, Check, CircleX } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/cn";
import type { CommerceOrder } from "../../lib/commerce";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { DateTime, Num } from "../numeric";
import { StoreMoney } from "../store-orders-admin/money";
import { type StoreAccountLabels, useStoreAccountStrings } from "./account-strings";
import { type ReturnRequest, type RmaStatus, rmaIsOpen, rmaSteps } from "./return-math";
import { useCurrency } from "../../provider/nasaq-provider";

const VARIANT: Record<RmaStatus, "info" | "success" | "warning" | "danger" | "neutral"> = {
  requested: "warning",
  approved: "info",
  "shipped-back": "info",
  received: "info",
  refunded: "success",
  rejected: "danger",
  cancelled: "neutral",
};

export interface StoreReturnStatusProps {
  request: ReturnRequest;
  /** The order the return belongs to, to name the items. */
  order: Pick<CommerceOrder, "lines" | "number">;
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** Shows a "Cancel request" button while the request is still open and not yet sent back. */
  onCancel?: (request: ReturnRequest) => void;
  labels?: StoreAccountLabels;
  className?: string;
}

/** One return request: its number, the items, the five-step RMA progress, the refund and, when it was refused, why. */
export function StoreReturnStatus({ request, order, currency: currencyProp, onCancel, labels, className }: StoreReturnStatusProps) {
  const currency = useCurrency(currencyProp);
  const { t } = useStoreAccountStrings(labels);
  const [confirm, setConfirm] = useState(false);
  const steps = rmaSteps(request.status, request.stoppedAfter);
  const stopped = request.status === "rejected" || request.status === "cancelled";
  const canCancel = !!onCancel && (request.status === "requested" || request.status === "approved");
  return (
    <article data-slot="store-return-status" data-status={request.status} className={cn("flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-4", className)}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-semibold">
            {t.rma} <bdi>{request.number}</bdi>
          </span>
          <span className="text-body-sm text-muted-foreground">
            {t.requestedOn} <DateTime value={request.createdAt} format={{ dateStyle: "medium" }} />
          </span>
        </div>
        <Badge variant={VARIANT[request.status]}>{t.rmaStatus[request.status]}</Badge>
      </header>

      <ol aria-label={t.rma} className="m-0 grid list-none gap-2 p-0 sm:grid-cols-5">
        {steps.map((step) => (
          <li
            key={step.key}
            data-state={step.state}
            aria-current={step.state === "current" ? "step" : undefined}
            className={cn(
              "flex items-center gap-1.5 border-s-4 ps-2 text-body-sm sm:flex-col sm:items-start sm:border-s-0 sm:border-t-4 sm:ps-0 sm:pt-2",
              step.state === "done" ? "border-primary" : step.state === "current" ? "border-primary/50" : step.state === "skipped" ? "border-dashed border-border" : "border-border",
              step.state === "upcoming" || step.state === "skipped" ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {step.state === "done" ? <Check aria-hidden className="size-4 text-primary" /> : null}
            <span>{t.rmaStatus[step.key]}</span>
          </li>
        ))}
      </ol>

      <p className={cn("flex items-start gap-2 text-body-sm", stopped ? "text-foreground" : "text-muted-foreground")}>
        {request.status === "rejected" ? <CircleX aria-hidden className="mt-0.5 size-4 shrink-0" /> : request.status === "cancelled" ? <Ban aria-hidden className="mt-0.5 size-4 shrink-0" /> : null}
        <span>{t.rmaHint[request.status]}</span>
      </p>
      {request.status === "rejected" && request.rejectionReason ? (
        <p className="rounded-control border border-border bg-secondary px-3 py-2 text-body-sm">
          <span className="font-medium">{t.rejectionReason}:</span> {request.rejectionReason}
        </p>
      ) : null}

      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-body-sm">
        {request.lines.map((pick) => {
          const line = order.lines.find((l) => l.id === pick.lineId);
          return (
            <li key={pick.lineId} className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate">{line?.name ?? pick.lineId}</span>
              <span className="shrink-0 text-muted-foreground">
                {t.quantity} <Num value={pick.quantity} />
              </span>
            </li>
          );
        })}
      </ul>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <span className="text-body-sm">
          <span className="text-muted-foreground">{t.refundTotal}:</span> <StoreMoney amount={request.refundAmount} currency={currency} className="font-semibold" />{" "}
          <span className="text-muted-foreground">({t.methods[request.refundMethod]})</span>
        </span>
        {canCancel && rmaIsOpen(request.status) ? (
          <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
            {t.cancelRequest}
          </Button>
        ) : null}
      </footer>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.cancelRequestTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.cancelRequestText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.keepRequest}</AlertDialogCancel>
            <AlertDialogAction variant="danger" onClick={() => onCancel?.(request)}>
              {t.cancelRequest}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
