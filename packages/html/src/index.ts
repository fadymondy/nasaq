// @fadymondy/nasaq/html: framework-agnostic behaviours for the .nq-* component classes.
// Import the stylesheet once (@fadymondy/nasaq/html.css), then call start() or use the Alpine/Vue entries.

export { start, init, delegate, observe, money } from "./core/init";
export { openDialog, closeDialog, dialog, dialogTriggers } from "./core/dialog";
export { tabs, type TabsHandle } from "./core/tabs";
export { menu, type MenuHandle } from "./core/menu";
export { tooltip } from "./core/tooltip";
export { toast, toaster, type ToastOptions, type Tone } from "./core/toast";
export { defaultCurrency, formatMoney, type MoneyOptions } from "./core/money";
export {
  setLocale,
  currentLocale,
  isRtl,
  dirOf,
  setTheme,
  currentTheme,
  toggleTheme,
  restoreTheme,
  setBrand,
  type Theme,
} from "./core/locale";
export { place, type Cleanup } from "./core/dom";
