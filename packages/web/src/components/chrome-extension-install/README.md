---
name: chrome-extension-install
title: ChromeExtensionInstall
category: platforms
status: beta
summary: Three-step install flow for a Chrome extension (add from the Web Store, pin, sign in) with a detected state, re-check, sign-in action and a notice for unsupported browsers.
exports: [ChromeExtensionInstall, ChromeExtensionInstallProps, ChromeExtensionInstallLabels]
related: [whatsapp-qr-connect, integration-connector, status, alert]
story: components-apps-platforms-chrome-extension-install
base-ui: []
keywords: [chrome, extension, web store, install, pin, sign in, onboarding, browser]
---

# ChromeExtensionInstall

Walks someone through installing your browser extension: open the Web Store, pin it, sign in. It shows
whether the page found the extension, marks finished steps and keeps the next one in front. Presentational:
you tell it what was detected.

## When to use

- Onboarding for a product that has a companion extension.

## When not to use

- Extensions for other stores (Firefox, Safari): pass your own `storeUrl` and `supported`, or build a separate flow.

## Import

```tsx
import { ChromeExtensionInstall } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ChromeExtensionInstall } from "@fadymondy/nasaq/web";

declare const state: { installed: boolean; signedIn: boolean };
declare const ext: { ping(): Promise<void>; signIn(): Promise<void> };

export function Install() {
  return (
    <ChromeExtensionInstall
      storeUrl="https://chromewebstore.google.com/detail/your-extension"
      installed={state.installed}
      signedIn={state.signedIn}
      onCheck={() => ext.ping()}
      onSignIn={() => ext.signIn()}
    />
  );
}
```

## Anatomy

```
ChromeExtensionInstall          data-slot="chrome-extension-install" (data-state="missing|installed|ready")
├─ unsupported Alert            when `supported` is false
├─ detected row                 data-slot="extension-detected": Status + Check again
├─ steps (ol)                   data-slot="extension-step" (data-state="done|current|todo")
│  ├─ 1 Add from the store      link button (data-slot="extension-store-link")
│  ├─ 2 Pin                     "I pinned it" (the page cannot detect pinning)
│  └─ 3 Sign in                 button, error line
└─ ready Alert                  when all three are done
```

## API

**ChromeExtensionInstall**: every `div` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `storeUrl` | `string` | required | The Web Store page. |
| `installed` | `boolean` | required | Whether the page found the extension. |
| `version` | `string` | | Shown when detected. |
| `signedIn` | `boolean` | `false` | Whether the extension is signed in. |
| `pinned`, `defaultPinned`, `onPinnedChange` | | uncontrolled | The person confirms pinning. |
| `onCheck` | `() => Promise<void>` | | Shows Check again. Update `installed` afterwards. |
| `onSignIn` | `() => Promise<void \| { error? }>` | | Runs the sign-in step. |
| `supported` | `boolean` | `true` | Show a notice for browsers that cannot install it. |
| `storeButton` | `ReactNode` | text | Replace the button content, for example a badge you are licensed to use. |
| `labels` | `Partial<ChromeExtensionInstallLabels>` | | Override any string. |

## Examples

**Unsupported browser**

```tsx
import { ChromeExtensionInstall } from "@fadymondy/nasaq/web";

export const Firefox = () => <ChromeExtensionInstall storeUrl="https://example.com" installed={false} supported={false} />;
```

## Accessibility

- Steps are an ordered list; the current step has `aria-current="step"` and each has screen-reader text ("Step 2 of 3, current").
- The detected row is `role="status"`. Sign-in errors are `role="alert"`.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale; the step rail mirrors.

## Styling & tokens

- Built on `Card`, `Button`, `Status`, `Alert` and `--nq-*` tokens.
- Target `[data-slot="extension-step"][data-state="current"]`.

## Do / Don't

- Do detect the extension with a message or a marker the extension adds to the page.
- Don't claim you can detect pinning: ask.
- The Chrome and Web Store marks are Google's. This component uses text; use Google's badge only under its brand rules, through `storeButton`.

## Related

- [`WhatsappQrConnect`](../whatsapp-qr-connect/README.md)
- [`IntegrationConnector`](../integration-connector/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-apps-platforms-chrome-extension-install--docs
