"use client";

import { Eye, ShieldUser } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { DateTime } from "../numeric";

const STRINGS = {
  en: {
    impersonating: (name: string) => `You are viewing the app as ${name}.`,
    impersonatingHint: "Actions you take count as this user.",
    previewing: (name: string) => `Previewing as ${name}.`,
    previewingHint: "Nothing you do here is saved.",
    exit: "Exit impersonation",
    exitPreview: "Exit preview",
    exiting: "Exiting…",
    since: "Since",
    failed: "Could not exit. Try again.",
  },
  ar: {
    impersonating: (name: string) => `أنت تتصفح التطبيق بصفة ${name}.`,
    impersonatingHint: "الإجراءات التي تنفذها تُنسب إلى هذا المستخدم.",
    previewing: (name: string) => `معاينة بصفة ${name}.`,
    previewingHint: "لا يُحفظ أي شيء تفعله هنا.",
    exit: "إنهاء انتحال الصفة",
    exitPreview: "إنهاء المعاينة",
    exiting: "جارٍ الخروج…",
    since: "منذ",
    failed: "تعذّر الخروج. حاول مرة أخرى.",
  },
};
const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];

export type ImpersonationBannerLabels = Partial<typeof STRINGS.en>;

export interface ImpersonationBannerProps extends Omit<ComponentProps<"div">, "children"> {
  /** Whose view this is. `email` shows beside the name, always left-to-right. */
  as: { name: string; email?: string };
  /** `impersonate`: an admin acts as the user (actions count as them). `preview`: a safe look, nothing is saved. Default `impersonate`. */
  mode?: "impersonate" | "preview";
  /** When the session started. Shown as a relative time. */
  startedAt?: string | number | Date;
  /** Ends the session. Reject to keep the banner and show a failure. */
  onExit: () => void | Promise<void>;
  /** Pin to the top of the scroll container. Default true. */
  sticky?: boolean;
  /** Replaces the hint sentence. */
  hint?: ReactNode;
  labels?: ImpersonationBannerLabels;
}

/**
 * A bar that says "you are viewing as X" with an exit button. It sits at the very top of the app while an
 * admin impersonates a user, or while someone previews the product as another role. It is a `role="status"`
 * region, so the change is announced, and it stays pinned so it cannot be scrolled out of sight.
 */
export function ImpersonationBanner({ as, mode = "impersonate", startedAt, onExit, sticky = true, hint, labels, className, ...props }: ImpersonationBannerProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels };
  const preview = mode === "preview";
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const exit = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await onExit();
    } catch {
      if (mounted.current) setFailed(true);
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const Icon = preview ? Eye : ShieldUser;
  return (
    <div
      role="status"
      data-slot="impersonation-banner"
      data-mode={mode}
      className={cn(
        "flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-body-sm",
        preview ? "bg-nq-info-soft text-nq-info-text" : "bg-nq-warning-soft text-nq-warning-text",
        sticky && "sticky top-0 z-40",
        className,
      )}
      {...props}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="font-medium">{(preview ? t.previewing : t.impersonating)(as.name)}</span>{" "}
        {as.email ? (
          <bdi dir="ltr" className="opacity-80">
            {as.email}
          </bdi>
        ) : null}{" "}
        <span className="opacity-80">{hint ?? (preview ? t.previewingHint : t.impersonatingHint)}</span>
        {startedAt !== undefined ? (
          <span className="ms-2 opacity-80">
            {t.since} <DateTime value={startedAt} relative />
          </span>
        ) : null}
        {failed ? (
          <span role="alert" className="ms-2 font-medium">
            {t.failed}
          </span>
        ) : null}
      </span>
      <Button size="sm" variant="secondary" loading={busy} onClick={() => void exit()}>
        {busy ? t.exiting : preview ? t.exitPreview : t.exit}
      </Button>
    </div>
  );
}
