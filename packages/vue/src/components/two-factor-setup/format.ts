/** Pure helpers for the two-factor setup: no DOM, no React, tested with node --test. */

/** "JBSWY3DPEHPK3PXP" becomes "JBSW Y3DP EHPK 3PXP". Spaces and case are normalised, so a pasted key works. */
export function groupSecret(secret: string, size = 4): string {
  const clean = normalizeSecret(secret);
  const groups: string[] = [];
  for (let i = 0; i < clean.length; i += size) groups.push(clean.slice(i, i + size));
  return groups.join(" ");
}

/** Upper-case base32 with no spaces or dashes: what an authenticator app and the clipboard should get. */
export function normalizeSecret(secret: string): string {
  return secret.replace(/[\s-]+/g, "").toUpperCase();
}

export interface OtpAuthInfo {
  secret: string;
  issuer?: string;
  account?: string;
}

/** Reads the secret, issuer and account out of an `otpauth://totp/Issuer:account?secret=...&issuer=Issuer` URI. Returns null for anything else. */
export function parseOtpAuthUri(uri: string): OtpAuthInfo | null {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return null;
  }
  if (url.protocol !== "otpauth:") return null;
  const secret = url.searchParams.get("secret");
  if (!secret) return null;
  let label = "";
  try {
    label = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    label = url.pathname.replace(/^\/+/, "");
  }
  const colon = label.indexOf(":");
  const labelIssuer = colon > -1 ? label.slice(0, colon).trim() : undefined;
  const account = (colon > -1 ? label.slice(colon + 1) : label).trim() || undefined;
  const issuer = url.searchParams.get("issuer") ?? labelIssuer;
  return { secret: normalizeSecret(secret), issuer: issuer || undefined, account };
}

/** The text of the downloaded recovery-codes file: an optional header, then one code per line. */
export function recoveryCodesText(codes: readonly string[], header?: string): string {
  return `${header ? `${header}\n\n` : ""}${codes.join("\n")}\n`;
}
