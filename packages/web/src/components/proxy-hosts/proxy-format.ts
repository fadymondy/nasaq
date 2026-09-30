/** Pure helpers for reverse-proxy hosts: validating the upstream and the host names. No React here. */

export type TlsMode = "off" | "auto" | "custom" | "passthrough";
export type ProxyHostError = "hosts" | "upstream";

/** `http://10.0.0.5:3000`, `https://app.internal`, `http://localhost:8080`. A scheme and a host are required; a port and path are optional. */
export function isValidUpstream(value: string): boolean {
  const m = /^(https?):\/\/([^/\s:]+|\[[0-9a-f:]+\])(?::(\d{1,5}))?(\/\S*)?$/i.exec(value.trim());
  if (!m) return false;
  if (m[3] !== undefined && (Number(m[3]) < 1 || Number(m[3]) > 65535)) return false;
  return true;
}

/** Splits `a.com, b.com` or one per line into unique lower-case host names. */
export function parseHosts(input: string): string[] {
  const seen = new Set<string>();
  for (const part of input.split(/[\s,;]+/)) {
    const h = part.trim().toLowerCase();
    if (h) seen.add(h);
  }
  return [...seen];
}

const HOST = /^(\*\.)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function validateProxyHost(input: { hosts: readonly string[]; upstream: string }): ProxyHostError[] {
  const errors: ProxyHostError[] = [];
  if (input.hosts.length === 0 || !input.hosts.every((h) => HOST.test(h))) errors.push("hosts");
  if (!isValidUpstream(input.upstream)) errors.push("upstream");
  return errors;
}

/** Passthrough hands the encrypted connection to the upstream untouched, so it cannot use websockets settings or a managed certificate. */
export const tlsModeAllowsWebsockets = (mode: TlsMode): boolean => mode !== "passthrough";
