"use client";

import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { ConfirmButton } from "../alert-dialog";
import { Button } from "../button";
import type { IntegrationConnectorProps, IntegrationService } from "../integration-connector";
import { DateTime } from "../numeric";
import { ErrorState } from "../states";
import { Status } from "../status";
import { AnalyticsConnect } from "./analytics-connect";

const STRINGS = {
  en: {
    refresh: "Refresh",
    updated: "Updated",
    connected: "Connected",
    disconnect: "Disconnect",
    disconnectTitle: (name: string) => `Disconnect ${name}?`,
    disconnectBody: "This page goes back to the connect screen. Nothing is deleted from your account.",
    connectedTo: "Connected to",
    errorTitle: "Could not load the report",
    retry: "Try again",
  },
  ar: {
    refresh: "تحديث",
    updated: "آخر تحديث",
    connected: "مرتبط",
    disconnect: "فك الربط",
    disconnectTitle: (name: string) => `فك ربط ${name}؟`,
    disconnectBody: "تعود هذه الصفحة إلى شاشة الربط. لا يُحذف شيء من حسابك.",
    connectedTo: "مرتبط بـ",
    errorTitle: "تعذّر تحميل التقرير",
    retry: "أعد المحاولة",
  },
};

export type AnalyticsPageFrameLabels = typeof STRINGS.en;

export interface AnalyticsPageFrameProps extends Pick<IntegrationConnectorProps, "onConnect" | "onDisconnect" | "onSelectAccount"> {
  /** Page heading. Use the product's name as text. */
  title: ReactNode;
  /** One line under the heading, for example the property, site or channel being shown. */
  description?: ReactNode;
  /** The data source. While its status is not "connected" the frame shows AnalyticsConnect instead of `children`. */
  service: IntegrationService;
  /** Bullets for the connect screen. */
  benefits?: readonly string[];
  /** Controls at the inline end of the header: a PeriodToggle, a device switch. */
  actions?: ReactNode;
  /** Replaces the report with an error state. */
  error?: ReactNode;
  onRetry?: () => void;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  updatedAt?: number | Date | string;
  className?: string;
  children: ReactNode;
  labels?: Partial<AnalyticsPageFrameLabels>;
}

/**
 * The shell shared by the analytics pages: a heading with the connected source, period controls, refresh and disconnect,
 * then the report. Without a connected source it shows the connect empty state instead.
 */
export function AnalyticsPageFrame({ title, description, service, benefits, actions, error, onRetry, onRefresh, refreshing, updatedAt, onConnect, onDisconnect, onSelectAccount, className, children, labels }: AnalyticsPageFrameProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const connected = service.status === "connected";
  return (
    <div data-slot="analytics-page" data-connected={connected} className={cn("flex w-full flex-col gap-6", className)}>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-h1 text-foreground">{title}</h1>
          {description ? <p className="text-pretty text-body-sm text-muted-foreground">{description}</p> : null}
        </div>
        {connected ? (
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            {onRefresh ? (
              <Button size="sm" variant="secondary" loading={refreshing} onClick={() => void onRefresh()}>
                <RefreshCw aria-hidden />
                {t.refresh}
              </Button>
            ) : null}
            <ConfirmButton
              size="sm"
              variant="secondary"
              title={t.disconnectTitle(service.name)}
              description={t.disconnectBody}
              confirmLabel={t.disconnect}
              onConfirm={async () => {
                await onDisconnect(service.id);
              }}
            >
              {t.disconnect}
            </ConfirmButton>
          </div>
        ) : null}
      </header>
      {connected ? (
        <>
          {updatedAt !== undefined || service.connectedAs ? (
            <p className="-mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
              <Status tone="success">{t.connected}</Status>
              {service.connectedAs ? (
                <span>
                  {t.connectedTo} <bdi dir="ltr">{service.connectedAs}</bdi>
                </span>
              ) : null}
              {updatedAt !== undefined ? (
                <span>
                  {t.updated} <DateTime value={updatedAt} relative />
                </span>
              ) : null}
            </p>
          ) : null}
          {error ? (
            <ErrorState title={t.errorTitle} description={error} actions={onRetry ? <Button size="sm" onClick={onRetry}>{t.retry}</Button> : undefined} />
          ) : (
            children
          )}
        </>
      ) : (
        <AnalyticsConnect service={service} benefits={benefits} onConnect={onConnect} onDisconnect={onDisconnect} onSelectAccount={onSelectAccount} />
      )}
    </div>
  );
}

/** The props every analytics page takes besides its own data: the source, the period, and the states around loading. */
export interface AnalyticsPageBaseProps extends Pick<IntegrationConnectorProps, "onConnect" | "onDisconnect" | "onSelectAccount"> {
  /** The data source and its connection state. Anything but "connected" shows the connect screen. */
  service: IntegrationService;
  /** Reporting period in days. */
  period: number;
  onPeriodChange: (days: number) => void;
  /** Show skeletons. Also the state while `data` is still undefined. */
  loading?: boolean;
  /** Replace the report with an error and a retry button. */
  error?: ReactNode;
  onRetry?: () => void;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  updatedAt?: number | Date | string;
  className?: string;
}

/** Name of the account or property the service currently reads, for the page subtitle. */
export function activeAccountName(service: IntegrationService): string | undefined {
  return service.accounts?.find((a) => a.id === service.accountId)?.name ?? service.accounts?.[0]?.name;
}
