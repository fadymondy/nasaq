import { execCommand, type InstallOptions, installCommand, PACKAGE_MANAGERS, type PackageManager } from "./format";
import type { CodeTab } from "./strings";

/** Tabs for installing a package with pnpm, npm, yarn and bun. Give `NqCodeTabs` a `sync-key` so the choice sticks. */
export function packageManagerTabs(pkg: string, options?: InstallOptions & { managers?: readonly PackageManager[] }): CodeTab[] {
  return (options?.managers ?? PACKAGE_MANAGERS).map((m) => ({ label: m, value: m, language: "bash", code: installCommand(m, pkg, options) }));
}

/** Tabs for running a package binary without installing it (`pnpm dlx`, `npx`, `yarn dlx`, `bunx`). */
export function execTabs(command: string, options?: { managers?: readonly PackageManager[] }): CodeTab[] {
  return (options?.managers ?? PACKAGE_MANAGERS).map((m) => ({ label: m, value: m, language: "bash", code: execCommand(m, command) }));
}
