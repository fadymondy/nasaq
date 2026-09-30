import { contextBridge } from "electron";
import { ARG_PREFIX, type ChromeInfo } from "./shared";

declare const process: { argv: string[] };

/** The chrome info windowChrome() passed to this window, or null when it was built without it. */
export function readChrome(argv: string[] = process.argv): ChromeInfo | null {
  const arg = argv.find((a) => a.startsWith(ARG_PREFIX));
  if (!arg) return null;
  try {
    return JSON.parse(arg.slice(ARG_PREFIX.length)) as ChromeInfo;
  } catch {
    return null;
  }
}

/** Exposes the chrome info as window.nasaqChrome, where useWindowChrome() picks it up. */
export function exposeChrome(): ChromeInfo | null {
  const info = readChrome();
  if (info) contextBridge.exposeInMainWorld("nasaqChrome", info);
  return info;
}
