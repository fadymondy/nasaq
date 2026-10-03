export type InstallPlatform = "prompt" | "ios" | "installed" | "unsupported";

/**
 * Which install path a browser has. Pure: pass the user agent and whether the page already runs as an installed
 * app (`display-mode: standalone`, or `navigator.standalone` on iOS).
 *
 * - `installed`: already running as an app.
 * - `prompt`: the browser fires `beforeinstallprompt` (Chrome, Edge, Android), so the app can open its own dialog.
 * - `ios`: Safari on iPhone and iPad, where the only way is Share, then Add to Home Screen.
 * - `unsupported`: anything else.
 *
 * `prompt` is decided by the caller from the event; this returns `ios`, `installed` or `unsupported`, and
 * `hasPromptEvent` turns the rest into `prompt`.
 */
export function detectInstallPlatform(userAgent: string, standalone: boolean, hasPromptEvent = false): InstallPlatform {
  if (standalone) return "installed";
  if (hasPromptEvent) return "prompt";
  const ios = /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && /Mobile/.test(userAgent));
  if (ios) return "ios";
  return "unsupported";
}

/** How long to stay quiet after "Not now", in days, as a next-ask timestamp. Pure. */
export function nextAskAt(now: number, snoozeDays = 14): number {
  return now + snoozeDays * 24 * 60 * 60 * 1000;
}

/** True when it is time to ask again, given the stored next-ask time. Pure. */
export function shouldAsk(now: number, nextAsk: number | null | undefined): boolean {
  return nextAsk == null || now >= nextAsk;
}
