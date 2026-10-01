"use client";
import { CloudOff, LogIn } from "lucide-react";
import type { ReactNode } from "react";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { EmptyState, ErrorState, LoadingState, type StateProps } from "../states";

const STRINGS = {
  en: {
    unauthorizedTitle: "Your session has ended",
    unauthorizedBody: "Sign in again to see this page.",
    signIn: "Sign in",
    unavailableTitle: "This service is not available right now",
    unavailableBody: "It may be starting up or under maintenance. Try again in a moment.",
    retry: "Try again",
    errorTitle: "Something went wrong",
    emptyTitle: "Nothing here yet",
    emptyBody: "",
  },
  ar: {
    unauthorizedTitle: "انتهت جلستك",
    unauthorizedBody: "سجّل الدخول مرة أخرى لعرض هذه الصفحة.",
    signIn: "تسجيل الدخول",
    unavailableTitle: "هذه الخدمة غير متاحة الآن",
    unavailableBody: "قد تكون قيد التشغيل أو الصيانة. حاول مرة أخرى بعد قليل.",
    retry: "حاول مرة أخرى",
    errorTitle: "حدث خطأ ما",
    emptyTitle: "لا يوجد شيء هنا بعد",
    emptyBody: "",
  },
};

export type DataStateLabels = (typeof STRINGS)["en"];

function useStrings(labels?: Partial<DataStateLabels>) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return { ...STRINGS[ar ? "ar" : "en"], ...labels };
}

export interface ServiceUnavailableProps extends Omit<StateProps, "title"> {
  title?: ReactNode;
  /** Shows a "Try again" button. */
  onRetry?: () => void;
  labels?: Partial<DataStateLabels>;
}

/** An inline 503 card: the backend or a plugin is down, not the page. Offers a retry when `onRetry` is set. */
export function ServiceUnavailable({ title, description, onRetry, actions, labels, icon = CloudOff, ...props }: ServiceUnavailableProps) {
  const t = useStrings(labels);
  return (
    <EmptyState
      data-slot="service-unavailable"
      role="status"
      icon={icon}
      title={title ?? t.unavailableTitle}
      description={description ?? t.unavailableBody}
      actions={
        actions ??
        (onRetry ? (
          <Button size="sm" onClick={onRetry}>
            {t.retry}
          </Button>
        ) : undefined)
      }
      {...props}
    />
  );
}

export interface DataStateProps {
  loading?: boolean;
  /** 401: the session ended. Wins over every state but loading. */
  unauthorized?: boolean;
  /** 503: the service is down. */
  unavailable?: boolean;
  /** An error detail (an `Error` or a message). Shown under the error title, never as a raw page. */
  error?: unknown;
  /** The request worked and returned nothing. */
  empty?: boolean;
  /** Where "Sign in" goes in the 401 card. Ignored when `onSignIn` is set. */
  signInHref?: string;
  onSignIn?: () => void;
  /** Retry button on the 503 and error cards. */
  onRetry?: () => void;
  /** Action in the empty card, usually a "Create" button. */
  emptyAction?: ReactNode;
  /** Icon of the empty card. */
  emptyIcon?: StateProps["icon"];
  /** Replaces the loading skeleton. */
  loadingFallback?: ReactNode;
  /** Skeleton rows while loading. Default 3. */
  loadingRows?: number;
  labels?: Partial<DataStateLabels>;
  className?: string;
  /** The content, rendered only when no other state applies. */
  children?: ReactNode;
}

function errorText(error: unknown): string | undefined {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Renders exactly one state of a data view, in a fixed order: loading → unauthorized (401) → unavailable (503)
 * → error → empty → the content. A page never shows a raw error string or a blank area.
 */
export function DataState({
  loading,
  unauthorized,
  unavailable,
  error,
  empty,
  signInHref,
  onSignIn,
  onRetry,
  emptyAction,
  emptyIcon,
  loadingFallback,
  loadingRows,
  labels,
  className,
  children,
}: DataStateProps) {
  const t = useStrings(labels);

  if (loading) return <>{loadingFallback ?? <LoadingState rows={loadingRows} className={className} />}</>;

  if (unauthorized) {
    const signIn = onSignIn ? (
      <Button size="sm" variant="primary" onClick={onSignIn}>
        <LogIn aria-hidden /> {t.signIn}
      </Button>
    ) : signInHref ? (
      <Button size="sm" variant="primary" nativeButton={false} render={<a href={signInHref} />}>
        <LogIn aria-hidden /> {t.signIn}
      </Button>
    ) : undefined;
    return (
      <EmptyState
        data-slot="data-state"
        data-state="unauthorized"
        icon={LogIn}
        title={t.unauthorizedTitle}
        description={t.unauthorizedBody}
        actions={signIn}
        className={className}
      />
    );
  }

  if (unavailable) return <ServiceUnavailable data-state="unavailable" onRetry={onRetry} labels={labels} className={className} />;

  const detail = errorText(error);
  if (detail !== undefined) {
    return (
      <ErrorState
        data-state="error"
        title={t.errorTitle}
        description={detail}
        actions={
          onRetry ? (
            <Button size="sm" onClick={onRetry}>
              {t.retry}
            </Button>
          ) : undefined
        }
        className={className}
      />
    );
  }

  if (empty) {
    return (
      <EmptyState
        data-state="empty"
        icon={emptyIcon}
        title={t.emptyTitle}
        description={t.emptyBody || undefined}
        actions={emptyAction}
        className={className}
      />
    );
  }

  return <>{children}</>;
}
