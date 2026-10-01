import { addons } from "storybook/manager-api";
import { nasaqDark, nasaqLight } from "./theme";

const prefersDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
document.documentElement.dataset.nqTheme = prefersDark ? "dark" : "light";

addons.setConfig({
  theme: prefersDark ? nasaqDark : nasaqLight,
  // A docs site: readers want the page, not the addon panel. It is one keystroke away (A).
  showPanel: false,
  panelPosition: "right",
  sidebar: { showRoots: true },
  toolbar: {
    // Stock toolbar items that mean nothing to a reader of the docs.
    zoom: { hidden: true },
    eject: { hidden: true },
    copy: { hidden: true },
  },
});

// The manager sets the tab title to "<story> ⋅ Storybook" on every navigation; keep Nasaq's name instead.
const retitle = () => {
  const next = document.title.replace(/\s*⋅\s*Storybook$/, " ⋅ Nasaq").replace(/^storybook.*$/i, "Nasaq design system");
  if (next !== document.title) document.title = next;
};
new MutationObserver(retitle).observe(document.querySelector("title") ?? document.head, { subtree: true, childList: true, characterData: true });
retitle();
