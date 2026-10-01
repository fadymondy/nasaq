---
name: cookie-consent
title: CookieConsent
category: website
status: beta
summary: "Cookie consent banner and preferences dialog with Consent Mode categories. Reject and Accept carry equal weight, and it holds no tracking code."
exports: [CookieConsentLabels, ConsentSaveResult, CookieConsentProps, CookieConsent]
related: [dialog, switch, collapsible, alert]
story: components-website-cookie-consent
base-ui: [dialog, switch, collapsible]
keywords: [cookie, consent, gdpr, consent mode, privacy, banner, preferences, analytics, marketing]
---

# CookieConsent

Asks a visitor which kinds of storage they allow. A banner offers Customise, Reject and Accept with the same visual
weight; Customise opens a dialog with one switch per category and a table of the cookies in it. The component stores
nothing and runs nothing: `onSave` gets the choice, and `consentModeSignals` turns it into Google Consent Mode v2
values for you to pass on.

## When to use

- A public site that sets non-essential cookies or storage.

## When not to use

- Sites that only use strictly necessary storage: no banner is needed.
- As a tracker: this component contains no tracking code.

## Import

```tsx
import { CookieConsent, consentModeSignals } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { CookieConsent, consentModeSignals, DEFAULT_CONSENT_CATEGORIES } from "@fadymondy/nasaq/web";

export function Consent({ saved }: { saved: Record<string, boolean> | null }) {
  return (
    <CookieConsent
      consent={saved}
      policyHref="/cookies"
      onSave={(state) => {
        localStorage.setItem("consent", JSON.stringify(state));
        window.gtag?.("consent", "update", consentModeSignals(state, DEFAULT_CONSENT_CATEGORIES));
      }}
    />
  );
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
```

## Anatomy

```
CookieConsent                 data-slot="cookie-consent"
├─ banner (shown when consent is null)
│  ├─ text + policy link
│  └─ Customise · Reject all · Accept all
└─ Dialog (preferences)
   ├─ per category: Switch + description
   │  └─ Collapsible cookie table (name, purpose, duration, provider)
   └─ Reject all · Save choices · Accept all
```

## API

`section` props (except `children`, `onChange`) plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `categories` | `ConsentCategory[]` | necessary, preferences, analytics, marketing | Each has `id`, `required`, `cookies`, `consentMode`. |
| `consent` | `ConsentState \| null` | | Saved choice (`id -> boolean`). `null` shows the banner. |
| `onSave` | `(state, source) => void \| { error? } \| Promise` | required | `source` is `accept-all`, `reject-all` or `custom`. |
| `preferencesOpen` | `boolean` | | Controlled dialog state, for a "Cookie settings" link. |
| `onPreferencesOpenChange` | `(open: boolean) => void` | | |
| `policyHref` | `string` | | Link to the cookie policy. |
| `position` | `"bottom" \| "start" \| "end"` | `"bottom"` | Full width bar or corner card. |
| `inline` | `boolean` | `false` | Render in flow instead of fixed (docs, previews). |
| `labels` | `Partial<CookieConsentLabels>` | English or Arabic | Every string and category name. |

Helpers: `acceptAll`, `rejectAll`, `normalizeConsent`, `consentSource`, `consentModeSignals`, `DEFAULT_CONSENT_CATEGORIES`.

## Examples

**Reopen from a footer link**

```tsx
import { CookieConsent } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Footer() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Cookie settings</button>
      <CookieConsent consent={{ necessary: true }} preferencesOpen={open} onPreferencesOpenChange={setOpen} onSave={() => {}} />
    </>
  );
}
```

## Accessibility

- The banner is a labelled region and does not trap focus. The preferences dialog does, and returns focus to its opener.
- Every switch has a visible label and description; the required category is disabled and stays on.
- A failed save shows a message with `role="alert"`.

## RTL & i18n

- English and Arabic are built in; pass `labels` to add another language or rename categories.
- Layout uses logical properties; corner cards flip with `start` and `end`. Cookie names stay left to right.

## Styling & tokens

- Built from `Button`, `Dialog`, `Switch` and `Collapsible` with `--nq-*` tokens only.

## Do / Don't

- Do give Reject the same weight as Accept.
- Do keep optional categories off until the visitor turns them on.
- Don't load tracking scripts before consent, and don't reload the page to apply a choice.
- Don't hide the cookie settings link after the banner closes.

## Related

- [`dialog`](../dialog/README.md)
- [`switch`](../switch/README.md)
- [`collapsible`](../collapsible/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-website-cookie-consent--docs
