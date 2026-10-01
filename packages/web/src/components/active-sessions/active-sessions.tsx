"use client";
import { Laptop, LogOut, MonitorSmartphone, Smartphone, Tablet, type LucideIcon } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { ConfirmButton } from "../alert-dialog";
import { Badge } from "../badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { DateTime } from "../numeric";
import { EmptyState } from "../states";

const STRINGS = {
  en: {
    title: "Active sessions",
    description: "Devices signed in to your account. Sign out any you do not recognise.",
    list: "Signed-in devices",
    current: "This device",
    lastActive: "Active",
    signOut: "Sign out",
    signOutTitle: "Sign out this device?",
    signOutBody: "It will need the password to sign in again.",
    signOutOthers: "Sign out other devices",
    signOutOthersTitle: "Sign out every other device?",
    signOutOthersBody: "Only this device stays signed in.",
    emptyTitle: "No other sessions",
    emptyBody: "You are signed in on this device only.",
    unknownDevice: "Unknown device",
  },
  ar: {
    title: "الجلسات النشطة",
    description: "الأجهزة المسجّل دخولها إلى حسابك. سجّل الخروج من أي جهاز لا تعرفه.",
    list: "الأجهزة المسجّل دخولها",
    current: "هذا الجهاز",
    lastActive: "نشط",
    signOut: "تسجيل الخروج",
    signOutTitle: "تسجيل الخروج من هذا الجهاز؟",
    signOutBody: "سيحتاج إلى كلمة المرور لتسجيل الدخول مرة أخرى.",
    signOutOthers: "تسجيل الخروج من الأجهزة الأخرى",
    signOutOthersTitle: "تسجيل الخروج من كل الأجهزة الأخرى؟",
    signOutOthersBody: "سيبقى هذا الجهاز فقط مسجّل الدخول.",
    emptyTitle: "لا توجد جلسات أخرى",
    emptyBody: "أنت مسجّل الدخول على هذا الجهاز فقط.",
    unknownDevice: "جهاز غير معروف",
  },
};

export type ActiveSessionsLabels = (typeof STRINGS)["en"];

export type SessionDeviceKind = "desktop" | "mobile" | "tablet" | "other";

type DateInput = Date | number | string;

export interface ActiveSession {
  id: string;
  /** "Chrome on macOS". Built from the user agent on your server. */
  device?: string;
  kind?: SessionDeviceKind;
  ip?: string;
  /** "Cairo, Egypt". */
  location?: string;
  lastActiveAt: DateInput;
  createdAt?: DateInput;
  /** The session making this request. It cannot be signed out from the list. */
  current?: boolean;
}

const KIND_ICON: Record<SessionDeviceKind, LucideIcon> = {
  desktop: Laptop,
  mobile: Smartphone,
  tablet: Tablet,
  other: MonitorSmartphone,
};

export interface ActiveSessionsProps extends Omit<ComponentProps<"div">, "children"> {
  sessions: readonly ActiveSession[];
  /** Shows "Sign out" on every other session. Throw or return `{ error }` to keep it. */
  onRevoke?: (id: string) => Promise<void | { error?: string }>;
  /** Shows "Sign out other devices" in the header when there is more than one session. */
  onRevokeOthers?: () => Promise<void | { error?: string }>;
  labels?: Partial<ActiveSessionsLabels>;
}

/**
 * The devices signed in to an account, the current one first and marked, with sign out per device and for
 * every other device. It only draws the list; your callbacks end the sessions on the server.
 */
export function ActiveSessions({ sessions, onRevoke, onRevokeOthers, labels, className, ...props }: ActiveSessionsProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [error, setError] = useState<string | null>(null);

  const sorted = [...sessions].sort((a, b) => Number(!!b.current) - Number(!!a.current));
  const others = sessions.filter((s) => !s.current).length;

  async function run(action: () => Promise<void | { error?: string }>) {
    setError(null);
    try {
      const result = await action();
      if (result && result.error) {
        setError(result.error);
        throw new Error(result.error);
      }
    } catch (e) {
      setError((prev) => prev ?? (e instanceof Error ? e.message : String(e)));
      throw e;
    }
  }

  return (
    <Card data-slot="active-sessions" className={cn("w-full max-w-2xl", className)} {...props}>
      <CardHeader>
        <CardTitle as="h2">{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
        {onRevokeOthers && others > 0 ? (
          <CardAction>
            <ConfirmButton size="sm" variant="secondary" title={t.signOutOthersTitle} description={t.signOutOthersBody} confirmLabel={t.signOutOthers} onConfirm={() => run(onRevokeOthers)}>
              <LogOut aria-hidden /> {t.signOutOthers}
            </ConfirmButton>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {sorted.length ? (
          <ul aria-label={t.list} className="overflow-hidden rounded-card border border-border">
            {sorted.map((s) => {
              const Icon = KIND_ICON[s.kind ?? "other"];
              const name = s.device ?? t.unknownDevice;
              return (
                <li
                  key={s.id}
                  data-slot="session-row"
                  data-current={s.current ? "" : undefined}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border px-4 py-3 first:border-t-0"
                >
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-secondary text-muted-foreground [&_svg]:size-4">
                    <Icon aria-hidden />
                  </span>
                  <div className="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
                    <p className="flex items-center gap-2 text-label text-foreground">
                      <span className="truncate" title={name}>
                        {name}
                      </span>
                      {s.current ? <Badge variant="success">{t.current}</Badge> : null}
                    </p>
                    <p className="flex flex-wrap gap-x-2 text-caption text-muted-foreground">
                      {s.location ? <span>{s.location}</span> : null}
                      {s.ip ? (
                        <span dir="ltr" className="font-mono">
                          {s.ip}
                        </span>
                      ) : null}
                      <span>
                        {t.lastActive} <DateTime value={s.lastActiveAt} relative />
                      </span>
                    </p>
                  </div>
                  {onRevoke && !s.current ? (
                    <ConfirmButton
                      size="sm"
                      variant="ghost"
                      aria-label={`${t.signOut}: ${name}`}
                      title={t.signOutTitle}
                      description={t.signOutBody}
                      confirmLabel={t.signOut}
                      onConfirm={() => run(() => onRevoke(s.id))}
                    >
                      {t.signOut}
                    </ConfirmButton>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={MonitorSmartphone} title={t.emptyTitle} description={t.emptyBody} />
        )}
      </CardContent>
    </Card>
  );
}
