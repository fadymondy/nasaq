// @fadymondy/nasaq/html: the helpers shared by the Alpine runtime, for plain-JS pages.
// Components for HTML are the React markup driven by Alpine: see @fadymondy/nasaq/alpine.

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
