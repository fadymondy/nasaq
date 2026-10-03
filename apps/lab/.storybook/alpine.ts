import Alpine from "alpinejs";
import nasaq from "@nasaq/html/alpine";

let started = false;

/** Starts Alpine once, with the Nasaq runtime, for the HTML and Blade previews. */
export function startAlpine(): typeof Alpine {
  if (!started) {
    started = true;
    Alpine.plugin(nasaq);
    (window as unknown as { Alpine: typeof Alpine }).Alpine = Alpine;
    Alpine.start();
  }
  return Alpine;
}
