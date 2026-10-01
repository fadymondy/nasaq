// CDN build for Alpine pages, Livewire, FilamentPHP and TomatoPHP (nasaq-alpine.global.js).
// Everything in nasaq.global.js, plus the Alpine plugin registered on alpine:init.
// Load it BEFORE Alpine (or before @livewireScripts / Filament's scripts), so the plugin is in place when Alpine starts.

import nasaq, { type AlpineLike } from "./alpine";
import "./cdn";

declare global {
  interface Window {
    Alpine?: AlpineLike & { plugin(p: (a: AlpineLike) => void): void };
    NasaqAlpine: typeof nasaq;
  }
}

window.NasaqAlpine = nasaq;
let registered = false;
const register = () => {
  if (registered || !window.Alpine) return;
  registered = true;
  window.Alpine.plugin(nasaq);
};
document.addEventListener("alpine:init", register);
// Alpine already on the page but not started yet (a bundle that set window.Alpine first).
register();
