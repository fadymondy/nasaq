"use client";

import { CalendarCheck, CheckCheck, Clock, LogIn, Stethoscope, UserX, XCircle, type LucideIcon } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { BOOKING_STATUSES, type BookingStatus, type BookingTransition, nextStatuses, pipelineIndex, primaryNext } from "../booking-flow/booking-math";
import { Badge, type BadgeProps } from "../badge";
import { Button } from "../button";
import { ConfirmButton } from "../alert-dialog";
import { Stepper, StepperItem } from "../stepper";
import { Timeline, TimelineItem } from "../timeline";

/** Names of the seven booking statuses, in English and Arabic. Other booking and clinic components reuse them. */
export const BOOKING_STATUS_LABELS: Record<"en" | "ar", Record<BookingStatus, string>> = {
  en: { requested: "Requested", confirmed: "Confirmed", checked_in: "Checked in", in_visit: "In visit", done: "Done", no_show: "No-show", cancelled: "Cancelled" },
  ar: { requested: "مطلوب", confirmed: "مؤكد", checked_in: "تم تسجيل الوصول", in_visit: "في الزيارة", done: "منتهي", no_show: "لم يحضر", cancelled: "ملغى" },
};

const ICONS: Record<BookingStatus, LucideIcon> = {
  requested: Clock,
  confirmed: CalendarCheck,
  checked_in: LogIn,
  in_visit: Stethoscope,
  done: CheckCheck,
  no_show: UserX,
  cancelled: XCircle,
};

const VARIANT: Record<BookingStatus, NonNullable<BadgeProps["variant"]>> = {
  requested: "warning",
  confirmed: "neutral",
  checked_in: "info",
  in_visit: "brand",
  done: "success",
  no_show: "danger",
  cancelled: "outline",
};

/** The status name in the active language: `const label = useBookingStatusLabel(); label("checked_in")`. */
export function useBookingStatusLabel(): (status: BookingStatus) => string {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return (status) => BOOKING_STATUS_LABELS[ar ? "ar" : "en"][status];
}

export interface BookingStatusBadgeProps extends Omit<BadgeProps, "variant" | "children"> {
  status: BookingStatus;
  /** Hide the icon. Off by default: the icon keeps the status readable without colour. */
  hideIcon?: boolean;
}

/** A status chip: a distinct icon and the name, coloured by stage. */
export function BookingStatusBadge({ status, hideIcon = false, className, ...props }: BookingStatusBadgeProps) {
  const label = useBookingStatusLabel();
  const Icon = ICONS[status];
  return (
    <Badge data-slot="booking-status-badge" data-status={status} variant={VARIANT[status]} className={cn("gap-1", className)} {...props}>
      {hideIcon ? null : <Icon aria-hidden className="size-3" />}
      {label(status)}
    </Badge>
  );
}

const STRINGS = {
  en: {
    stages: "Booking progress",
    history: "History",
    actions: "Move the booking",
    by: (n: string) => `by ${n}`,
    advanceTo: { confirmed: "Confirm", checked_in: "Check in", in_visit: "Start visit", done: "Finish visit", no_show: "Mark no-show", cancelled: "Cancel booking", requested: "Reopen" } as Record<BookingStatus, string>,
    reopen: "Reopen as confirmed",
    confirmTitle: (to: string) => `${to}?`,
    confirmText: { no_show: "The patient did not come. You can reopen it later if they arrive.", cancelled: "The slot is released. This cannot be undone." } as Partial<Record<BookingStatus, string>>,
    empty: "Nothing has happened yet.",
    failed: "That did not work. Try again.",
  },
  ar: {
    stages: "تقدّم الحجز",
    history: "السجل",
    actions: "نقل الحجز",
    by: (n: string) => `بواسطة ${n}`,
    advanceTo: { confirmed: "تأكيد", checked_in: "تسجيل الوصول", in_visit: "بدء الزيارة", done: "إنهاء الزيارة", no_show: "تسجيل عدم الحضور", cancelled: "إلغاء الحجز", requested: "إعادة الفتح" } as Record<BookingStatus, string>,
    reopen: "إعادة الفتح كمؤكد",
    confirmTitle: (to: string) => `${to}؟`,
    confirmText: { no_show: "المريض لم يحضر. يمكنك إعادة فتح الحجز إذا وصل لاحقًا.", cancelled: "سيتم تحرير الموعد. لا يمكن التراجع." } as Partial<Record<BookingStatus, string>>,
    empty: "لم يحدث شيء بعد.",
    failed: "لم تنجح العملية. حاول مجددًا.",
  },
};

export type BookingPipelineLabels = (typeof STRINGS)["en"];

export interface BookingPipelineProps extends Omit<ComponentProps<"div">, "children"> {
  /** Where the booking is now. */
  status: BookingStatus;
  /** Every move so far, oldest first. Drives the timeline. */
  history?: readonly BookingTransition[];
  /**
   * Called with the status to move to. Return `{ error }` (or throw) to show the message and stay put.
   * Omit for a read-only pipeline: no buttons.
   */
  onAdvance?: (to: BookingStatus) => Promise<void | { error?: string }>;
  /** Show the history timeline under the stages. Default true. */
  showHistory?: boolean;
  orientation?: "horizontal" | "vertical";
  labels?: Partial<BookingPipelineLabels>;
}

/**
 * The staff view of one booking: the five stages (requested, confirmed, checked in, in visit, done), the moves the
 * workflow allows from here as buttons, and the history as a timeline. No-show and cancelled show where the booking stopped.
 * Only allowed moves are offered; the rules live in `canTransition`.
 */
export function BookingPipeline({ status, history = [], onAdvance, showHistory = true, orientation = "horizontal", labels, className, ...rest }: BookingPipelineProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const locale = ar ? "ar" : "en";
  const t = { ...STRINGS[locale], ...labels };
  const name = useBookingStatusLabel();
  const [busy, setBusy] = useState<BookingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopped = status === "no_show" || status === "cancelled";
  const stoppedIndex = (() => {
    for (let i = history.length - 1; i >= 0; i--) {
      const idx = pipelineIndex(history[i]!.status);
      if (idx >= 0) return idx;
    }
    return 0;
  })();
  const current = stopped ? stoppedIndex : pipelineIndex(status);

  const go = async (to: BookingStatus) => {
    if (!onAdvance) return;
    setBusy(to);
    setError(null);
    try {
      const result = await onAdvance(to);
      if (result && result.error) setError(result.error);
    } catch {
      setError(t.failed);
    } finally {
      setBusy(null);
    }
  };

  const next = nextStatuses(status);
  const primary = primaryNext(status);
  const label = (to: BookingStatus) => (status === "no_show" && to === "confirmed" ? t.reopen : t.advanceTo[to]);

  return (
    <div data-slot="booking-pipeline" data-status={status} className={cn("flex flex-col gap-5", className)} {...rest}>
      <div tabIndex={0} className="max-w-full overflow-x-auto rounded-control pb-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Stepper current={current} orientation={orientation} aria-label={t.stages}>
        {BOOKING_STATUSES.map((s, i) => (
          <StepperItem key={s} title={name(s)} error={stopped && i === current} description={stopped && i === current ? `${name(status)}` : undefined} />
        ))}
      </Stepper>
      </div>

      {onAdvance && next.length > 0 ? (
        <div role="group" aria-label={t.actions} className="flex flex-wrap items-center gap-2">
          {next.map((to) => {
            const isPrimary = to === primary;
            if (to === "cancelled" || to === "no_show") {
              return (
                <ConfirmButton
                  key={to}
                  variant="secondary"
                  size="sm"
                  disabled={busy !== null}
                  title={t.confirmTitle(name(to))}
                  description={t.confirmText[to]}
                  confirmLabel={label(to)}
                  onConfirm={() => go(to)}
                >
                  {label(to)}
                </ConfirmButton>
              );
            }
            return (
              <Button key={to} variant={isPrimary ? "primary" : "secondary"} size="sm" disabled={busy !== null} onClick={() => go(to)}>
                {label(to)}
              </Button>
            );
          })}
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-caption text-nq-danger-text">
          {error}
        </p>
      ) : null}

      {showHistory ? (
        <section aria-label={t.history} className="flex flex-col gap-2">
          <h3 className="text-label font-semibold">{t.history}</h3>
          {history.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">{t.empty}</p>
          ) : (
            <Timeline>
              {[...history].reverse().map((h, i) => {
                const Icon = ICONS[h.status];
                return (
                  <TimelineItem
                    key={`${h.status}-${h.at.getTime()}-${i}`}
                    icon={<Icon aria-hidden className="size-3.5" />}
                    title={name(h.status)}
                    description={[h.by ? t.by(h.by) : null, h.note ?? null].filter(Boolean).join(" · ") || undefined}
                    time={h.at}
                  />
                );
              })}
            </Timeline>
          )}
        </section>
      ) : null}
    </div>
  );
}
