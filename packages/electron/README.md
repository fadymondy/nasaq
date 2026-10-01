# @nasaq/electron

Desktop window chrome for Electron: the main-process `BrowserWindow` options, a preload bridge, and the
renderer title bar. Everything else in a desktop app comes from `@nasaq/web`.

## Main process

```ts
import { app, BrowserWindow, nativeTheme } from "electron";
import { updateTitleBarOverlay, windowChrome } from "@nasaq/electron/main";

const theme = () => (nativeTheme.shouldUseDarkColors ? "dark" : "light");

const chrome = windowChrome({ theme: theme(), kind: "main" });
const win = new BrowserWindow({
  ...chrome,
  // Keep the chrome's additionalArguments: the preload reads the chrome info from them.
  webPreferences: { ...chrome.webPreferences, preload: join(__dirname, "preload.js") },
});
win.once("ready-to-show", () => win.show());
nativeTheme.on("updated", () => updateTitleBarOverlay(win, theme()));
```

| Platform | What `windowChrome()` sets |
| --- | --- |
| macOS | `titleBarStyle: "hiddenInset"`, traffic lights centred in the 52px bar, `vibrancy: "sidebar"`, `visualEffectState: "followWindow"`, transparent ground. |
| Windows | `titleBarStyle: "hidden"` with a `titleBarOverlay` (transparent, symbols in the theme's `fg`, 40px) and Mica on Windows 11. Never `frame: false`, so snap layouts and the system menu keep working. |
| Linux | The OS frame, `autoHideMenuBar`. |

`kind` is `main` (1280×820), `panel` (420×640) or `settings` (760×580, not maximizable). Every window starts
hidden (`show: false`); show it on `ready-to-show`.

Override the defaults per window with `size` (`width`, `height`, `minWidth`, `minHeight`, `maxWidth`, `maxHeight`,
`maximizable`, `fullscreenable`, `resizable`; unset keys keep the defaults of the `kind`) and any other
`BrowserWindow` option with `overrides` (merged last; `webPreferences` merges key by key, so the chrome argument
survives):

```ts
windowChrome({ kind: "main", size: { width: 1440, height: 900, minWidth: 1100 }, overrides: { title: "Wasla" } });
```

## Preload

```ts
import { exposeChrome } from "@nasaq/electron/preload";
exposeChrome(); // window.nasaqChrome
```

## Renderer

```tsx
import "@nasaq/electron/chrome.css";
import { useWindowChrome, WindowTitleBar } from "@nasaq/electron";

function App() {
  useWindowChrome(); // <html data-platform data-chrome data-material>
  return (
    <WindowTitleBar title="Mahaam">
      <Button variant="ghost" size="icon" aria-label="Sidebar"><PanelLeft /></Button>
    </WindowTitleBar>
  );
}
```

| Export | What it does |
| --- | --- |
| `useWindowChrome(info?)` | Writes `data-platform`, `data-chrome` and `data-material` on `<html>` from `window.nasaqChrome`. CSS (`--nq-window-titlebar`, `--nq-window-inset`) and ⌘/Ctrl shortcut labels follow it. |
| `useChromeInfo()` | The chrome read back from `<html>`: `platform`, `chrome`, `material`, `titlebar`, `inset`. |
| `WindowTitleBar` | Platform height, drag region, centred `title`, and room for the OS caption buttons on the correct edge. `chrome` overrides `<html>`; `controls` renders when the chrome is `custom`. |
| `DragRegion`, `NoDrag` | Drag the window from any area. Buttons, links, inputs and focusable elements inside stay clickable. |
| `WindowControlsInset` | `edge="start"` / `"end"`: reserves the caption width on whichever edge the OS draws it. |
| `WindowControls` | Drawn minimize, maximize/restore and close for frameless windows; `labels` for translation. |
| `controlsSide(platform, dir)` | `left` or `right`. |

## RTL

Windows keeps its caption buttons on the right in every language. macOS moves the traffic lights to the
right when the app runs in an RTL language. Drawn Linux controls follow the reading end. `WindowTitleBar`
reads the direction from its own element, so `dir="rtl"` on any ancestor is enough.

## Tokens

`chrome.titlebar` = darwin 52, win32 40, linux 46. `chrome.inset` = darwin 80, win32 138, linux 108.
In CSS: `--nq-window-titlebar` and `--nq-window-inset`, which follow `<html data-platform>` (0 on web).

## Lab

**Electron/Window chrome**: *Overview* follows the toolbar's Platform and Direction; *Platforms* shows
macOS, Windows, Linux and Linux custom in LTR and RTL. The grey caption buttons are stand-ins for what the
OS draws.
