---
name: profile-form
title: ProfileForm
category: account
status: beta
summary: The profile settings form. Photo, display name, username with a live availability check, email with a verified badge, resend and a password-protected change, phone, bio, language and time zone, and a sticky Save / Discard bar that shows only when something changed.
exports: [ProfileForm, ProfileLabels, ProfileValues, ProfileFieldErrors, ProfileSubmitResult, UsernameCheck, ProfileOption, ProfileFormProps]
related: [avatar-upload, account-settings, phone-input, select, combobox, field]
story: components-account-profile-form
base-ui: [field, select, combobox, dialog]
keywords: [profile, account, settings, username, email, verify, phone, bio, timezone, language, dirty, save]
---

# ProfileForm

A complete "Profile" page body. It tracks what changed, checks the username while the user types, and shows a
sticky save bar only when there is something to save. Nasaq talks to no server: every action is an async
callback you provide.

## When to use

- The Profile section of an account settings page.

## When not to use

- Sign-up: use `RegisterForm`.
- A form with different fields: build it from [`Field`](../field/README.md).

## Import

```tsx
import { ProfileForm } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<ProfileForm
  values={{ name: "Sara Alharbi", username: "sara", email: "sara@example.com", phone: "", bio: "", locale: "en", timezone: "Asia/Riyadh" }}
  emailVerified
  checkUsername={async (u) => (await api.usernameFree(u)) }
  onSubmit={async (values) => {
    const res = await api.saveProfile(values);
    if (!res.ok) return { fieldErrors: { username: "That username is taken." } };
  }}
  avatar={{ src: user.avatarUrl, onChange: uploadAvatar, onRemove: removeAvatar }}
  onChangeEmail={async ({ email, password }) => api.changeEmail(email, password)}
  onResendVerification={() => api.resendVerification()}
/>
```

## Anatomy

```
ProfileForm                    data-slot="profile-form"
├─ AvatarUpload                when avatar.onChange is set
├─ Name, Username (@, LTR), Email (badge, resend, change), Phone, Bio (counter)
├─ Language (Select), Time zone (Combobox)
├─ ChangeEmail dialog          new email + current password
└─ save bar                    data-slot="profile-form-bar"  (sticky, only when dirty)
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `values` | `ProfileValues` | required | Saved values `{ name, username, email, phone, bio, locale, timezone }`. New content resets the form. |
| `onSubmit` | `(values) => Promise<void \| { error?, fieldErrors? }>` | required | Resolve on success. Return errors to show them; throwing shows a generic error. |
| `avatar` | `{ src, onChange, onRemove, accept, maxSize, outputSize, outputType }` | none | Photo section; hidden without `onChange`. |
| `checkUsername` | `(username) => Promise<boolean \| { available, message? }>` | none | Debounced, stale answers are dropped. Save is blocked while checking or taken. |
| `usernameDebounce` | `number` | `400` | Milliseconds. |
| `emailVerified` | `boolean` | none | Shows the badge. |
| `onResendVerification` | `() => Promise<void>` | none | Resend button, with a 30 second cooldown. |
| `onChangeEmail` | `({ email, password }) => Promise<void \| ProfileSubmitResult>` | none | Shows Change email and its dialog. |
| `languages`, `timezones` | `ProfileOption[]` | provider locales, all IANA zones | `{ value, label }`. |
| `bioMaxLength` | `number` | `160` | |
| `defaultCountry` | `string` | `"SA"` | For the phone field. |
| `disabled` | `boolean` | `false` | |
| `labels` | `Partial<ProfileLabels>` | en / ar | Override any string. |

## Examples

- **Server-side field error**: return `{ fieldErrors: { username: "..." } }` from `onSubmit`.
- **Fixed language list**: `languages={[{ value: "en", label: "English" }, { value: "ar", label: "العربية" }]}`.

## Accessibility

- Every input has a visible label, help text through `aria-describedby`, and errors through `Field`.
- Availability results, resend results and save results are announced in live regions.
- The save bar is reachable by keyboard; Discard restores the saved values and returns focus.
- Autocomplete: `name`, `username`, `email`, `tel`.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale; override with `labels`.
- Username, email and phone stay left-to-right inside Arabic pages, and are isolated when placed inside sentences.
- Counters use Western digits.

## Styling & tokens

Uses `Field`, `Input`, `Textarea`, `Badge`, `Alert` and `Dialog` tokens; the bar uses `bg-card`, `border-border` and `shadow-floating`. Extend with `className`.

## Do / Don't

- Do re-validate everything on the server, including username availability.
- Do return `fieldErrors` for problems tied to a field.
- Do not save on blur; the sticky bar is the one way to commit.
- Do not skip the password for an email change.

## Related

- [AvatarUpload](../avatar-upload/README.md)
- [AccountSettings](../account-settings/README.md)
- [PhoneInput](../phone-input/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-account-profile-form--docs
