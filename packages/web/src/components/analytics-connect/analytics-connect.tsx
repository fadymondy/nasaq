"use client";

import { Check } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { IntegrationConnector, type IntegrationConnectorProps, type IntegrationService } from "../integration-connector";

const STRINGS = {
  en: {
    title: (name: string) => `Connect ${name}`,
    description: (name: string) => `Nasaq reads your ${name} data to build this page. It never changes anything in your account.`,
    reauth: (name: string) => `Sign in to ${name} again`,
    reauthDescription: "The connection expired, so the data below is out of date until you reconnect.",
    benefits: "What you will see",
    readOnly: "Read-only access. You can disconnect at any time.",
  },
  ar: {
    title: (name: string) => `ربط ${name}`,
    description: (name: string) => `يقرأ نسق بيانات ${name} لبناء هذه الصفحة. ولا يغيّر شيئًا في حسابك أبدًا.`,
    reauth: (name: string) => `سجّل الدخول إلى ${name} مجددًا`,
    reauthDescription: "انتهت صلاحية الاتصال، لذا تبقى البيانات قديمة حتى تعيد الربط.",
    benefits: "ما الذي ستراه",
    readOnly: "وصول للقراءة فقط. يمكنك فك الربط في أي وقت.",
  },
};

export type AnalyticsConnectLabels = typeof STRINGS.en;

export interface AnalyticsConnectProps extends Pick<IntegrationConnectorProps, "onConnect" | "onDisconnect" | "onSelectAccount"> {
  /** The service to connect, its consent scopes and its state. The name is shown as text; pass `icon` only with the brand's official logo. */
  service: IntegrationService;
  /** Short bullets on what the page will show once connected. */
  benefits?: readonly string[];
  /** Replaces the default "Connect {service}" heading. */
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
  labels?: Partial<AnalyticsConnectLabels>;
  connectorLabels?: IntegrationConnectorProps["labels"];
}

/**
 * The empty state of an analytics page that has no data source yet: what connecting gives you, then the
 * IntegrationConnector card for that one service (consent dialog with scopes, account picker, reconnect when the
 * sign-in expired). The host runs OAuth in the callbacks.
 */
export function AnalyticsConnect({ service, benefits, title, description, onConnect, onDisconnect, onSelectAccount, className, labels, connectorLabels }: AnalyticsConnectProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const reauth = service.status === "needs-reauth";
  return (
    <section data-slot="analytics-connect" data-status={service.status} aria-label={t.title(service.name)} className={cn("mx-auto flex w-full max-w-2xl flex-col items-center gap-6 rounded-card border border-dashed border-border px-4 py-10 text-center sm:px-8", className)}>
      <div className="flex max-w-lg flex-col gap-2">
        <h2 className="text-h2 text-foreground">{title ?? (reauth ? t.reauth(service.name) : t.title(service.name))}</h2>
        <p className="text-pretty text-body-sm text-muted-foreground">{description ?? (reauth ? t.reauthDescription : t.description(service.name))}</p>
      </div>
      {benefits?.length ? (
        <div className="flex flex-col gap-2 text-start">
          <h3 className="text-label text-muted-foreground">{t.benefits}</h3>
          <ul className="flex flex-col gap-1.5">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-body-sm text-foreground">
                <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-nq-success-text" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <IntegrationConnector
        bare
        services={[service]}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        onSelectAccount={onSelectAccount}
        labels={connectorLabels}
        className="max-w-sm border-0 bg-transparent p-0 text-start [&_[data-slot=card-content]]:p-0 [&_ul]:sm:grid-cols-1 [&_ul]:xl:grid-cols-1"
      />
      <p className="text-caption text-muted-foreground">{t.readOnly}</p>
    </section>
  );
}
