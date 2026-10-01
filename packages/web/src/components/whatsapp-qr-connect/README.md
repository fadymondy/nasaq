---
name: whatsapp-qr-connect
title: WhatsappQrConnect
category: integrations
status: beta
summary: Link a WhatsApp number by scanning a QR code, with numbered steps, a live countdown, automatic refresh when the code expires, and connected and disconnected states with a confirmed disconnect.
exports: [WhatsappQrConnect, WhatsappQrConnectProps, WhatsappQrConnectLabels, WhatsappConnectStatus]
related: [qr-code, chrome-extension-install, integration-connector, status]
story: components-integrations-whatsapp-qr-connect
base-ui: [alert-dialog]
keywords: [whatsapp, qr, pairing, linked devices, connect, countdown, refresh]
---

# WhatsappQrConnect

The screen for pairing a WhatsApp number: the three steps on the phone, the QR code, how long it is valid,
and a new code when it runs out. Once linked it shows the number and a disconnect with confirmation. Your
server owns the pairing session and feeds the current `qr`.

## When to use

- Connecting a WhatsApp number to inbox, CRM or messaging tools.

## When not to use

- A plain QR: use [`QrCode`](../qr-code/README.md).
- The official Cloud API, which has no QR: build a form instead.

## Import

```tsx
import { WhatsappQrConnect } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { WhatsappQrConnect, type WhatsappConnectStatus } from "@fadymondy/nasaq/web";

declare const session: { status: WhatsappConnectStatus; qr?: string; expiresAt?: number; number?: string };
declare const api: { start(): Promise<void>; refresh(): Promise<void>; disconnect(): Promise<void> };

export function Connect() {
  return (
    <WhatsappQrConnect
      status={session.status}
      qr={session.qr}
      expiresAt={session.expiresAt}
      account={session.number}
      onStart={() => api.start()}
      onRefresh={() => api.refresh()}
      onDisconnect={() => api.disconnect()}
    />
  );
}
```

## Anatomy

```
WhatsappQrConnect               data-slot="whatsapp-qr-connect" (data-status)
├─ header                       title, Status
├─ disconnected: placeholder    Show QR code button
├─ qr: QrCode (black on white)  data-slot="whatsapp-qr" + countdown (data-slot="whatsapp-countdown") + New code
├─ steps (ol)                   three steps on the phone
└─ connected                    data-slot="whatsapp-connected": number, since, Disconnect (ConfirmButton)
```

## API

**WhatsappQrConnect**: every `div` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `status` | `"disconnected" \| "qr" \| "connected"` | required | Which view to show. |
| `qr` | `string` | | The current pairing payload. |
| `expiresAt` | `number` | | When `qr` expires, in ms since epoch. Drives the countdown. |
| `account` | `string` | | The linked number, shown left-to-right. |
| `connectedSince` | `string` | | Already formatted text. |
| `onStart` | `() => Promise<void>` | | Begin pairing. |
| `onRefresh` | `() => Promise<void>` | | New code. Called by the button and on expiry. |
| `onDisconnect` | `() => Promise<void>` | | Shows Disconnect. |
| `error` | `boolean` | `false` | Show the failure with a retry. |
| `autoRefresh` | `boolean` | `true` | Ask for a new code at zero. |
| `now` | `() => number` | `Date.now` | Clock for tests. |
| `labels` | `Partial<WhatsappQrConnectLabels>` | | Override any string. |

## Examples

**Manual refresh only**

```tsx
import { WhatsappQrConnect } from "@fadymondy/nasaq/web";

export const Manual = () => <WhatsappQrConnect status="qr" qr="2@example" autoRefresh={false} onRefresh={async () => undefined} />;
```

## Accessibility

- The QR is `role="img"` with a name; the countdown is a `role="timer"` that does not announce every second.
- Steps are an ordered list. The status is text. The disconnect dialog is an `AlertDialog`.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. The QR and the phone number stay left-to-right.

## Styling & tokens

- The QR is drawn plain black on white with square modules and a white frame in both themes: phone cameras need it.
- Target `[data-slot="whatsapp-qr-connect"][data-status="qr"]`.

## Do / Don't

- Do treat the payload as a credential: send it over your own session and do not log it.
- Do refresh the code before WhatsApp invalidates it.
- Don't restyle the QR colours.

## Related

- [`QrCode`](../qr-code/README.md)
- [`ChromeExtensionInstall`](../chrome-extension-install/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-integrations-whatsapp-qr-connect--docs
