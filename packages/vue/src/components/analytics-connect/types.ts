import type { IntegrationResult, IntegrationService } from "../integration-connector";

/** The props every analytics page takes besides its own data: the source, the period, and the states around loading. */
export interface AnalyticsPageBaseProps {
  /** The data source and its connection state. Anything but "connected" shows the connect screen. */
  service: IntegrationService;
  onConnect: (id: string, scopeIds: string[]) => Promise<IntegrationResult>;
  onDisconnect: (id: string) => Promise<IntegrationResult>;
  onSelectAccount?: (id: string, accountId: string) => Promise<IntegrationResult>;
  /** Reporting period in days. */
  period: number;
  onPeriodChange: (days: number) => void;
  /** Show skeletons. Also the state while `data` is still undefined. */
  loading?: boolean;
  /** Replace the report with an error and a retry button. */
  error?: string;
  onRetry?: () => void;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  updatedAt?: number | Date | string;
  class?: string;
}

/** Name of the account or property the service currently reads, for the page subtitle. */
export function activeAccountName(service: IntegrationService): string | undefined {
  return service.accounts?.find((a) => a.id === service.accountId)?.name ?? service.accounts?.[0]?.name;
}
