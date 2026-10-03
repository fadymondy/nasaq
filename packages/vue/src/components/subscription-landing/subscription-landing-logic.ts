/* Pure helpers for the subscribe, confirm and unsubscribe pages. Copy of packages/web/src/components/subscription-landing/subscription-landing-logic.ts. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Whether the text is shaped like an email address. Only the server can say it is real. */
export function isSubscriberEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** "sara@example.com" becomes "s***@example.com", so a page that others might see does not print the address whole. */
export function maskSubscriberEmail(value: string): string {
  const v = value.trim();
  const at = v.lastIndexOf("@");
  if (at < 1) return v;
  return `${v[0]}***${v.slice(at)}`;
}

export type SubscriptionIssue = "email-empty" | "email-invalid" | "consent-missing";

/** What stops the subscribe form. The consent box must be ticked by the person, never pre-ticked. */
export function validateSubscription(input: { email: string; consent: boolean; requireConsent?: boolean }): SubscriptionIssue[] {
  const issues: SubscriptionIssue[] = [];
  if (!input.email.trim()) issues.push("email-empty");
  else if (!isSubscriberEmail(input.email)) issues.push("email-invalid");
  if ((input.requireConsent ?? true) && !input.consent) issues.push("consent-missing");
  return issues;
}
