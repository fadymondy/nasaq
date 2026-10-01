/** The system menu a desktop puts at its leading corner: About, Settings, then Sleep, Restart, Shut Down and Log out. */

export type DesktopPowerActionId = "about" | "settings" | "sleep" | "restart" | "shutDown" | "logOut";

/** The order the actions appear in. */
export const DESKTOP_POWER_ACTIONS: readonly DesktopPowerActionId[] = ["about", "settings", "sleep", "restart", "shutDown", "logOut"];

/** Actions that ask first when a `confirm` is given. Sleep is easy to undo, so it never asks. */
export const DESKTOP_POWER_CONFIRMED: readonly DesktopPowerActionId[] = ["restart", "shutDown", "logOut"];

const POWER_STRINGS = {
  en: {
    menu: "System",
    about: "About",
    aboutApp: "About {app}",
    settings: "System Settings…",
    sleep: "Sleep",
    restart: "Restart…",
    shutDown: "Shut Down…",
    logOut: "Log Out",
    restartTitle: "Restart now?",
    restartDescription: "Open apps close. Unsaved work may be lost.",
    restartConfirm: "Restart",
    shutDownTitle: "Shut down now?",
    shutDownDescription: "Open apps close. Unsaved work may be lost.",
    shutDownConfirm: "Shut Down",
    logOutTitle: "Log out now?",
    logOutDescription: "You will need to sign in again.",
    logOutConfirm: "Log Out",
  },
  ar: {
    menu: "النظام",
    about: "حول",
    aboutApp: "حول {app}",
    settings: "إعدادات النظام…",
    sleep: "سكون",
    restart: "إعادة التشغيل…",
    shutDown: "إيقاف التشغيل…",
    logOut: "تسجيل الخروج",
    restartTitle: "إعادة التشغيل الآن؟",
    restartDescription: "ستُغلق التطبيقات المفتوحة وقد يضيع العمل غير المحفوظ.",
    restartConfirm: "إعادة التشغيل",
    shutDownTitle: "إيقاف التشغيل الآن؟",
    shutDownDescription: "ستُغلق التطبيقات المفتوحة وقد يضيع العمل غير المحفوظ.",
    shutDownConfirm: "إيقاف التشغيل",
    logOutTitle: "تسجيل الخروج الآن؟",
    logOutDescription: "ستحتاج إلى تسجيل الدخول مرة أخرى.",
    logOutConfirm: "تسجيل الخروج",
  },
};

export type DesktopPowerMenuLabels = (typeof POWER_STRINGS)["en"];

/** What `confirm` receives. It matches Nasaq's `ConfirmOptions`, so `useConfirm()` can be passed as is. */
export interface DesktopPowerConfirm {
  action: DesktopPowerActionId;
  title: string;
  description: string;
  confirmLabel: string;
  danger: boolean;
}

export interface DesktopPowerMenuItem {
  id: string;
  label: string;
  onSelect?: () => void;
  danger?: boolean;
  separated?: boolean;
}

export interface DesktopPowerMenu {
  id: string;
  label: string;
  items: DesktopPowerMenuItem[];
}

export interface DesktopPowerMenuOptions {
  onAbout?: () => void;
  onSettings?: () => void;
  onSleep?: () => void;
  onRestart?: () => void;
  onShutDown?: () => void;
  onLogOut?: () => void;
  /** Names the About item: "About ToGO". */
  appName?: string;
  /** Asked before restart, shut down and log out. Resolve `false` to cancel. Pass `useConfirm()`. */
  confirm?: (prompt: DesktopPowerConfirm) => boolean | Promise<boolean>;
  /** Picks the built-in strings. Default "en". */
  locale?: string;
  id?: string;
  label?: string;
  labels?: Partial<DesktopPowerMenuLabels>;
}

/** The built-in strings for a locale with any overrides on top. */
export function desktopPowerLabels(locale?: string, labels?: Partial<DesktopPowerMenuLabels>): DesktopPowerMenuLabels {
  return { ...POWER_STRINGS[locale?.startsWith("ar") ? "ar" : "en"], ...labels };
}

const HANDLER: Record<DesktopPowerActionId, keyof DesktopPowerMenuOptions> = {
  about: "onAbout",
  settings: "onSettings",
  sleep: "onSleep",
  restart: "onRestart",
  shutDown: "onShutDown",
  logOut: "onLogOut",
};

/** The confirmation for an action, or null for one that never asks. */
export function desktopPowerConfirm(action: DesktopPowerActionId, t: DesktopPowerMenuLabels): DesktopPowerConfirm | null {
  if (action === "restart") return { action, title: t.restartTitle, description: t.restartDescription, confirmLabel: t.restartConfirm, danger: false };
  if (action === "shutDown") return { action, title: t.shutDownTitle, description: t.shutDownDescription, confirmLabel: t.shutDownConfirm, danger: true };
  if (action === "logOut") return { action, title: t.logOutTitle, description: t.logOutDescription, confirmLabel: t.logOutConfirm, danger: true };
  return null;
}

/**
 * Builds a `DesktopMenu` for `DesktopShell`'s `menus`. Only the actions you give a handler appear. The power group
 * (Sleep, Restart, Shut Down) and Log out each start after a separator; Log out is marked danger.
 */
export function desktopPowerMenu(options: DesktopPowerMenuOptions): DesktopPowerMenu {
  const t = desktopPowerLabels(options.locale, options.labels);
  const items: DesktopPowerMenuItem[] = [];
  let group = "";
  for (const action of DESKTOP_POWER_ACTIONS) {
    const handler = options[HANDLER[action]] as (() => void) | undefined;
    if (!handler) continue;
    const itemGroup = action === "about" || action === "settings" ? "info" : action === "logOut" ? "session" : "power";
    const label = action === "about" && options.appName ? t.aboutApp.replace("{app}", options.appName) : t[action];
    const prompt = options.confirm ? desktopPowerConfirm(action, t) : null;
    const confirm = options.confirm;
    items.push({
      id: action,
      label,
      danger: action === "logOut" || undefined,
      separated: (group !== "" && group !== itemGroup) || undefined,
      onSelect:
        prompt && confirm
          ? () => {
              void Promise.resolve(confirm(prompt)).then((ok) => {
                if (ok) handler();
              });
            }
          : handler,
    });
    group = itemGroup;
  }
  return { id: options.id ?? "system", label: options.label ?? t.menu, items };
}
