// @fadymondy/nasaq/vue: Nasaq for Vue 3. The components use the same Tailwind classes as the React ones.
//
//   Tailwind app:  @import "@fadymondy/nasaq/vue/styles.css"; @source "../node_modules/@fadymondy/nasaq/dist/vue";
//   No Tailwind:   import "@fadymondy/nasaq/nasaq.css";
//
//   import { NasaqProvider, NqButton } from "@fadymondy/nasaq/vue";   // or app.use(Nasaq) for all of them

import type { App, Component } from "vue";
import * as components from "./components";
import { NasaqProvider } from "./provider";

export * from "./provider";
export * from "./components";
export { cn } from "./lib/cn";
export { formatMoney, defaultCurrency, type MoneyOptions } from "./lib/money";
export { setTheme, setLocale, setBrand, toggleTheme, currentTheme, dirOf } from "./lib/locale";

/** Vue plugin: registers NasaqProvider and every Nq* component globally. */
export const Nasaq = {
  install(app: App) {
    app.component("NasaqProvider", NasaqProvider);
    for (const [name, value] of Object.entries(components)) {
      if (name.startsWith("Nq") && typeof value === "object" && value !== null) app.component(name, value as Component);
    }
  },
};

export default Nasaq;
