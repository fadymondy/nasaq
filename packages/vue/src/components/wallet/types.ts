export type WalletTransactionType = "topup" | "payout" | "payment" | "refund" | "fee";
export type WalletTransactionStatus = "completed" | "pending" | "failed";

export interface WalletTransaction {
  id: string;
  type: WalletTransactionType;
  /** Signed: positive adds to the balance, negative takes from it. */
  amount: number;
  status: WalletTransactionStatus;
  date: Date | number | string;
  description: string;
  /** Gateway or bank reference. Shown left-to-right. */
  reference?: string;
}

/** Where top-ups come from, or where withdrawals go: "Visa ending 4242", "Al Rajhi IBAN ...9012". */
export interface WalletAccount {
  id: string;
  label: string;
  description?: string;
}

/** What a top-up or withdrawal callback may resolve: `{ error }` keeps the dialog open with that message. */
export type WalletResult = void | { error?: string };
