import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/alexandria/400.css";
import "@fontsource/alexandria/500.css";
import "../src/lab.css";

import { BRAND_KEYS } from "@nasaq/brands";
import { FeedbackLauncher, mahaamSubmitter } from "@nasaq/feedback";
import { NasaqProvider, Toaster, toast } from "@nasaq/web";
import type { Decorator, Preview } from "@storybook/react-vite";
import { useGlobals } from "storybook/preview-api";
import { DocsPage } from "./docs-page";
import { nasaqLight } from "./theme";

// Arabic renders in Lusail (the products' face, 300/400/500) when its files are present; see main.ts.
// Alexandria is the OFL fallback. Neither is part of @nasaq/web.

// Reports from the lab land in the Nasaq project's Mahaam inbox. The key lives in apps/lab/.env.local
// (VITE_MAHAAM_FEEDBACK_KEY, gitignored); without it no launcher is mounted.
const FEEDBACK_KEY = import.meta.env.VITE_MAHAAM_FEEDBACK_KEY as string | undefined;
const submitFeedback = FEEDBACK_KEY ? mahaamSubmitter(FEEDBACK_KEY) : null;

const withNasaq: Decorator = (Story, context) => {
  const { brand, theme, locale, direction, density, expression, platform } = context.globals;
  // What Electron's useWindowChrome (or a native shell) would set. Shortcut labels (⌘ / Ctrl) follow it.
  if (typeof document !== "undefined") document.documentElement.dataset.platform = platform;
  // In-app switchers (ThemeSwitcher, LocaleSwitcher, UserMenu) write back to the toolbar.
  const [, updateGlobals] = useGlobals();
  const fullBleed = context.parameters.nasaq?.fullBleed === true;
  return (
    <NasaqProvider
      brand={brand}
      theme={theme}
      onThemeChange={(next) => updateGlobals({ theme: next })}
      locale={locale}
      onLocaleChange={(next) => updateGlobals({ locale: next })}
      direction={direction === "auto" ? undefined : direction}
      density={density}
      expression={expression}
    >
      <div
        className={
          // On a Docs page each story is a block among others, not a whole viewport.
          context.viewMode === "docs"
            ? fullBleed
              ? "h-[640px] overflow-hidden bg-background text-foreground [transform:translateZ(0)]"
              : "bg-background p-6 text-foreground"
            : fullBleed
              ? "min-h-dvh bg-background text-foreground"
              : "min-h-dvh bg-background p-6 text-foreground"
        }
      >
        <Story />
      </div>
      {submitFeedback && context.viewMode !== "docs" ? (
        <div data-reporter="" className="fixed end-3 bottom-3 z-40">
          <FeedbackLauncher
            target={submitFeedback}
            size="icon-sm"
            priorities={["low", "medium", "high", "urgent"]}
            onSubmitted={() => toast.success(locale === "ar" ? "وصل البلاغ" : "Report sent")}
          />
        </div>
      ) : null}
      <Toaster />
    </NasaqProvider>
  );
};

const preview: Preview = {
  // Every component gets a Docs page: its README.md manual around the live stories.
  tags: ["autodocs"],
  decorators: [withNasaq],
  parameters: {
    layout: "fullscreen",
    controls: { expanded: true },
    // The docs blocks (titles, tables, code, controls) use the Nasaq tokens, not the stock blue.
    docs: { page: DocsPage, theme: nasaqLight },
    a11y: { test: "error" },
    // The toolbar's viewport menu. Extension sizes follow Chrome's popup and side panel.
    viewport: {
      options: {
        mobile: { name: "Mobile · 390", styles: { width: "390px", height: "844px" }, type: "mobile" },
        tablet: { name: "Tablet · 768", styles: { width: "768px", height: "1024px" }, type: "tablet" },
        laptop: { name: "Laptop · 1280", styles: { width: "1280px", height: "800px" }, type: "desktop" },
        desktop: { name: "Desktop · 1440", styles: { width: "1440px", height: "900px" }, type: "desktop" },
        popup: { name: "Extension popup · 360", styles: { width: "360px", height: "600px" }, type: "other" },
        sidepanel: { name: "Extension side panel · 400", styles: { width: "400px", height: "800px" }, type: "other" },
      },
    },
    options: {
      storySort: {
        // Components are nested by the README `category` (MH-810): the everyday groups first.
        order: [
          // Real documentation first: the introduction is the first story, so it is what a newcomer lands on.
          "Docs",
          [
            "Introduction",
            "Installation",
            ["shadcn CLI", "npm package", "Project setup"],
            "Guides",
            ["Theming and brands", "Dark mode", "RTL and Arabic", "Tokens", "Accessibility", "MCP server"],
            "Frameworks",
            ["Plain HTML", "Vue", "Alpine", "Laravel and Filament", "Component kit"],
            "Catalogue",
            ["Components", "Page templates"],
            "Project",
            ["Contributing", "Changelog and versioning", "Where things live"],
            "*",
          ],
          "Foundations",
          "Brand",
          // One folder per README `category`, A to Z. Each holds its components, then the full screens
          // built from them (Pages) and any longer compositions (Patterns).
          "Components",
          ["*", ["*", "Pages", "Patterns"]],
        ],
        method: "alphabetical",
      },
    },
  },
  initialGlobals: {
    brand: "nasaq",
    theme: "light",
    locale: "en",
    direction: "auto",
    density: "compact",
    expression: "grid",
    platform: "web",
  },
  globalTypes: {
    brand: {
      description: "Brand",
      toolbar: { title: "Brand", icon: "paintbrush", items: BRAND_KEYS, dynamicTitle: true },
    },
    theme: {
      description: "Theme",
      toolbar: { title: "Theme", icon: "mirror", items: ["light", "dark", "system"], dynamicTitle: true },
    },
    locale: {
      description: "Locale",
      toolbar: {
        title: "Locale",
        icon: "globe",
        items: [
          { value: "en", title: "English" },
          { value: "ar", title: "العربية" },
        ],
        dynamicTitle: true,
      },
    },
    direction: {
      description: "Direction (auto follows locale)",
      toolbar: { title: "Dir", icon: "transfer", items: ["auto", "ltr", "rtl"], dynamicTitle: true },
    },
    density: {
      description: "Density",
      toolbar: { title: "Density", icon: "component", items: ["comfortable", "compact", "dense"], dynamicTitle: true },
    },
    expression: {
      description: "Expression",
      toolbar: { title: "Expression", icon: "grid", items: ["grid", "native"], dynamicTitle: true },
    },
    platform: {
      description: "Platform (sets <html data-platform>)",
      toolbar: {
        title: "Platform",
        icon: "browser",
        items: [
          { value: "web", title: "Web" },
          { value: "darwin", title: "macOS" },
          { value: "win32", title: "Windows" },
          { value: "linux", title: "Linux" },
          { value: "ios", title: "iOS" },
          { value: "android", title: "Android" },
          { value: "extension", title: "Browser extension" },
        ],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
