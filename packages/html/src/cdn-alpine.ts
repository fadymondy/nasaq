// nasaq-alpine.js: the script-tag build. Load it before Alpine (or anywhere with Livewire/Filament,
// whose Alpine fires alpine:init after scripts in the page have run); it registers the plugin on alpine:init.
//
//   <script defer src="…/nasaq-alpine.js"></script>
//   <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js"></script>

import nasaq from "./alpine";
import type { AlpineLike } from "./alpine/types";

declare global {
  interface Window {
    Alpine?: AlpineLike;
    Nasaq?: { plugin: typeof nasaq };
  }
}

window.Nasaq = { plugin: nasaq };
if (window.Alpine) nasaq(window.Alpine);
document.addEventListener("alpine:init", () => window.Alpine && nasaq(window.Alpine));
