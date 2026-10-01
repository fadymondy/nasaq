// @fadymondy/nasaq/vue: Nasaq for Vue 3. Components render the .nq-* classes, so import the stylesheet once:
//
//   import "@fadymondy/nasaq/html.css";
//   import { NasaqProvider, NqButton } from "@fadymondy/nasaq/vue";
//
// Or register everything globally: app.use(Nasaq).

import type { App, Component } from "vue";
import * as form from "./components/form";
import * as navigation from "./components/navigation";
import * as overlay from "./components/overlay";
import * as primitives from "./components/primitives";
import { NasaqProvider } from "./provider";

export * from "./provider";
export * from "./components/primitives";
export * from "./components/form";
export * from "./components/overlay";
export * from "./components/navigation";
export { formatMoney, defaultCurrency, toast, setTheme, setLocale, setBrand } from "@nasaq/html";

/** Vue plugin: registers NasaqProvider and every Nq* component globally. */
export const Nasaq = {
  install(app: App) {
    app.component("NasaqProvider", NasaqProvider);
    for (const mod of [primitives, form, overlay, navigation]) {
      for (const [name, value] of Object.entries(mod)) {
        if (name.startsWith("Nq") && typeof value === "object" && value !== null) app.component(name, value as Component);
      }
    }
  },
};

export default Nasaq;
