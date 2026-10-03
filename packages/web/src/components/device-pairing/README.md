---
name: device-pairing
title: Device pairing
category: auth
status: beta
summary: "Approve a device by code with its claims, IP and platform; show an OAuth device-code with a big copyable code and link; and hand a browser sign-in to a native app."
exports: [DevicePairingLabels, DeviceCodeEntryProps, DeviceCodeEntry, DeviceRequest, DeviceApprovalProps, DeviceApproval, DeviceCodeDisplayProps, DeviceCodeDisplay, HandoffState, DeviceHandoffProps, DeviceHandoff]
related: [qr-code, copy-button, otp-input, two-factor-challenge]
story: components-auth-pages-device-pairing
base-ui: [field, input]
keywords: [device, pairing, oauth, device code, rfc 8628, handoff, deep link, native app, approve, cli, tv]
---

# Device pairing

Four screens for signing in a device that cannot easily sign in itself. `DeviceCodeEntry` is where a person types the
code from a TV or CLI. `DeviceApproval` shows what is asking and lets them approve or deny. `DeviceCodeDisplay` is the
device's own screen with the code, link and QR. `DeviceHandoff` passes a finished browser sign-in to a native app.

## When to use

- OAuth device flow (RFC 8628) for CLIs, TVs and agents.
- Signing in a native app through the browser.

## When not to use

- Ordinary sign-in: use `LoginForm`.
- Managing already-linked devices: use a sessions list.

## Import

```tsx
import { DeviceApproval, DeviceCodeDisplay, DeviceCodeEntry, DeviceHandoff } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { DeviceApproval } from "@fadymondy/nasaq/web";

export function Approve({ request, expiresAt }: { request: React.ComponentProps<typeof DeviceApproval>["request"]; expiresAt: number }) {
  return (
    <DeviceApproval
      request={request}
      expiresAt={expiresAt}
      onApprove={async () => {
        await api.approve(request.code);
      }}
      onDeny={async () => {
        await api.deny(request.code);
      }}
    />
  );
}

declare const api: { approve(c: string): Promise<void>; deny(c: string): Promise<void> };
```

## Anatomy

```
DeviceApproval                data-slot="device-approval"
├─ code (large, ltr)          to compare with the device
├─ request details            device, platform, browser, IP, place, time
├─ scopes list
├─ warning + account          who is granting access
├─ Approve · Deny
└─ outcome screens            approved, denied, expired (with Enter another)
DeviceCodeDisplay             code, CopyButton, link, QrCode, live status
DeviceHandoff                 Open the app, state line, browser and typed-code fallbacks
DeviceCodeEntry               OtpInput-style code field, auto-submits when complete
```

## API

- **DeviceCodeEntry**: `form` props plus `onSubmit(code)` (normalised, e.g. `WDJBMJHT`; return `{ error }` if unknown), `length` (8), `defaultCode`, `labels`.
- **DeviceApproval**: `request: DeviceRequest` (`code`, `client`, `deviceName`, `platform`, `browser`, `ip`, `location`, `requestedAt`, `scopes`), `status` (`pending`, `approved`, `denied`, `expired`), `expiresAt`, `account`, `onApprove`, `onDeny`, `onEnterAnother`, `labels`. A pending request past `expiresAt` shows as expired.
- **DeviceCodeDisplay**: `code`, `verificationUri`, `verificationUriComplete` (QR content), `status`, `expiresAt`, `onRefresh`, `mark`, `labels`.
- **DeviceHandoff**: `appName`, `href` (deep link), `state` (`opening`, `opened`, `failed`), `onOpen`, `browserHref`, `fallbackCode`, `onCancel`, `mark`, `labels`. It never navigates by itself.

Helpers: `normalizeUserCode`, `formatUserCode`, `isUserCodeComplete`, `codeSecondsLeft`, `effectiveCodeStatus`, `USER_CODE_ALPHABET` (consonants only, per RFC 8628).

## Examples

**The device screen**

```tsx
import { DeviceCodeDisplay } from "@fadymondy/nasaq/web";

export function Screen({ status }: { status: "pending" | "approved" | "denied" | "expired" }) {
  return (
    <DeviceCodeDisplay
      code="WDJBMJHT"
      verificationUri="https://example.com/device"
      verificationUriComplete="https://example.com/device?user_code=WDJB-MJHT"
      status={status}
    />
  );
}
```

## Accessibility

- Codes are `dir="ltr"` and read as separate groups; the copy button announces "Copied".
- Status changes on the device screen are announced politely; failures use `role="alert"`.
- The QR code has a text alternative and the link is always shown, so it is never the only route.

## RTL & i18n

- English and Arabic are built in; pass `labels` to override.
- Codes, IPs and URLs stay left to right inside an RTL page. Logos are never mirrored.

## Styling & tokens

- Built from `Button`, `Card`, `Alert`, `QrCode` and `CopyButton`; tokens only. The QR sits on a white tile so it scans in dark mode.

## Do / Don't

- Do show the IP, place and platform, and warn that approving grants access.
- Do expire codes quickly and rate-limit entry on the server.
- Don't approve on page load: a person must press Approve.
- Don't put a secret token in the QR code: only the verification URL and user code.

## Related

- [`qr-code`](../qr-code/README.md)
- [`copy-button`](../copy-button/README.md)
- [`two-factor-challenge`](../two-factor-challenge/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-auth-pages-device-pairing--docs
