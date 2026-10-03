export interface AdminPlan {
  id: string;
  name: string;
  description?: string;
  /** Monthly price in `currency`. 0 is free. */
  priceMonthly: number;
  /** ISO 4217 code. Default USD, or SAR in Arabic. */
  currency?: string;
  /** Seat limit. `null` is unlimited. */
  seats: number | null;
  /** Storage limit in GB. `null` is unlimited. */
  storageGb: number | null;
  features: readonly string[];
  /** Shown on the pricing page. Hidden plans can still be assigned. */
  visible: boolean;
  /** How many workspaces are on it. */
  subscribers?: number;
  /** Tints the card as the recommended plan. */
  featured?: boolean;
}

export type WorkspaceStatus = "active" | "trial" | "suspended";

export interface AdminWorkspace {
  id: string;
  name: string;
  /** The URL part, shown in LTR. */
  slug: string;
  owner: { name: string; email: string };
  planId: string;
  status: WorkspaceStatus;
  seatsUsed: number;
  createdAt: string | Date;
  trialEndsAt?: string | Date | null;
}

export type AdminTenantResult = void | { error?: string };

export type AdminPlanInput = Omit<AdminPlan, "id" | "subscribers"> & { id?: string };

/** Runs an action; returns null on success, the error text ("" for a generic failure) otherwise. */
export async function adminTenantsAttempt(fn: () => Promise<AdminTenantResult> | AdminTenantResult): Promise<string | null> {
  try {
    const result = await fn();
    return result && typeof result === "object" && result.error ? result.error : null;
  } catch {
    return "";
  }
}
