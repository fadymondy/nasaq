// CDN build (nasaq.global.js): exposes window.Nasaq and binds every data-nq element on the page.
//   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fadymondy/nasaq/dist/html.css">
//   <script src="https://cdn.jsdelivr.net/npm/@fadymondy/nasaq/dist/cdn/nasaq.global.js" defer></script>

import * as Nasaq from "./index";

declare global {
  interface Window {
    Nasaq: typeof Nasaq;
  }
}

window.Nasaq = Nasaq;
Nasaq.restoreTheme();
Nasaq.start();
