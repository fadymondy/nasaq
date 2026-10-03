import { inject, type ComputedRef, type InjectionKey, type Ref } from "vue";

export const SIDEBAR_STORAGE_KEY = "nasaq-sidebar";
export const SIDEBAR_WIDTH_KEY = "nasaq-sidebar-width";
export const DESKTOP_QUERY = "(min-width: 48rem)";
/** Dragging this far below minWidth snaps the sidebar to the icon rail. */
export const SNAP_TO_RAIL = 56;
export const KEY_STEP = 16;

export interface ShellContext {
  /** Desktop only: the sidebar is reduced to an icon rail. */
  collapsed: ComputedRef<boolean>;
  setCollapsed(collapsed: boolean): void;
  mobileOpen: Ref<boolean>;
  setMobileOpen(open: boolean): void;
  /** Collapses the rail on desktop, opens the sheet below md. */
  toggleSidebar(): void;
  commandOpen: ComputedRef<boolean>;
  setCommandOpen(open: boolean): void;
}

export const SHELL_KEY: InjectionKey<ShellContext> = Symbol("nq-app-shell");
/** Whether the sidebar this component renders in is the collapsed rail (always false inside the mobile sheet). */
export const RAIL_KEY: InjectionKey<Readonly<Ref<boolean>>> = Symbol("nq-sidebar-rail");

export type AppNavPlacement = "tabs" | "bar" | "sheet";
export interface AppNavContext {
  placement: AppNavPlacement;
  onNavigate?: () => void;
  icons?: boolean;
}
export const NAV_KEY: InjectionKey<AppNavContext> = Symbol("nq-app-nav");

export function useAppShell(): ShellContext {
  const ctx = inject(SHELL_KEY, null);
  if (!ctx) throw new Error("useAppShell() must be used inside <NqAppShell>.");
  return ctx;
}

export function useOptionalAppShell(): ShellContext | null {
  return inject(SHELL_KEY, null);
}

/** Whether the sidebar this part renders in is the collapsed rail. */
export function useSidebarCollapsed(): Readonly<Ref<boolean>> {
  return inject(RAIL_KEY, { value: false } as Readonly<Ref<boolean>>);
}

export const readStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // blocked storage
  }
};
export const writeStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* blocked or full: keep the in-memory value */
  }
};
