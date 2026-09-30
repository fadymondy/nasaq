---
name: account-settings
title: AccountSettings
category: account
status: beta
summary: The account settings page layout. A title, a section nav (vertical on desktop, tabs on mobile) and a content area, plus SettingsSection blocks and a DangerZone with typed delete confirmation.
exports: [AccountSettings, SettingsSection, DangerZone, defaultAccountSettingsItems, AccountSettingsItem, AccountSettingsProps, SettingsSectionProps, DangerZoneProps]
related: [profile-form, avatar-upload, card, tabs, alert-dialog]
story: components-account-account-settings
base-ui: [tabs, alert-dialog]
keywords: [account, settings, profile, security, nav, sections, danger, delete, tabs, layout]
---

# AccountSettings

The frame of a settings page. It switches between sections; the sections themselves (`ProfileForm`,
security components, notifications) are yours, wrapped in `SettingsSection`.

## When to use

- User account settings with several sections.

## When not to use

- App-level or admin settings with deep trees: use `SidebarLayout`.

## Import

```tsx
import { AccountSettings, SettingsSection, DangerZone } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<AccountSettings>
  {(section) =>
    section === "profile" ? <ProfileForm {...profileProps} /> :
    section === "danger" ? <DangerZone onDelete={deleteAccount} /> :
    <SettingsSection title="Coming soon" />
  }
</AccountSettings>
```

## Anatomy

```
AccountSettings                data-slot="account-settings"
├─ header (h1, description)
├─ nav                         desktop: buttons; mobile: Tabs (same state)
└─ content                     role="region", named by the active item

SettingsSection                Card: title (h2), description, action, content, footer (hint + actions)
DangerZone                     SettingsSection tone="danger" + AlertDialog with typed confirmation
```

## API

### AccountSettings

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `title`, `description` | `ReactNode` | localised | `description={null}` hides it. |
| `items` | `AccountSettingsItem[]` | `defaultAccountSettingsItems(locale)` | `{ id, label, icon?, description?, tone?, badge?, content? }`. |
| `value`, `defaultValue`, `onValueChange` | `string`, `(id) => void` | first item | Active section. |
| `children` | `ReactNode \| (id) => ReactNode` | none | Content; an item's own `content` wins. |
| `navLabel` | `string` | localised | Accessible name of the nav. |

### SettingsSection

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `title`, `description` | `ReactNode` | required / none | |
| `action` | `ReactNode` | none | Inline end of the header. |
| `footer`, `actions` | `ReactNode` | none | Hint at the start, buttons at the end. |
| `tone` | `"default" \| "danger"` | `"default"` | |
| `headingLevel` | `2 \| 3 \| 4` | `2` | |

### DangerZone

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `onDelete` | `() => Promise<void>` | required | Reject to keep the dialog open and show the error. |
| `confirmText` | `string` | "DELETE" / "حذف" | Phrase to type. Use the email for more weight. |
| `title`, `heading`, `description` | `ReactNode` | localised | |
| `labels` | partial strings | en / ar | Button, dialog and error text. |

## Examples

- **Custom items**: `items={[{ id: "profile", label: "Profile", icon: User }, { id: "billing", label: "Billing", icon: CreditCard, content: <Billing /> }]}`.
- **Controlled**: `value={section} onValueChange={setSection}` to sync with the URL.

## Accessibility

- The desktop nav is a `<nav>` with `aria-current="page"` on the active item; the mobile nav is a tab list with arrow-key navigation.
- The content is a labelled region; each `SettingsSection` is a labelled region too.
- The delete button opens an alert dialog; the red button stays disabled until the phrase matches exactly, and Enter cannot submit early.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale.
- The layout mirrors; the nav sits at the inline start. The typed phrase is `dir="ltr"`.

## Styling & tokens

Uses `bg-nq-selected`, `bg-nq-hover`, `text-nq-danger-text`, `border-nq-danger` and the Card tokens. Extend with `className`.

## Do / Don't

- Do put destructive actions only in the danger zone.
- Do keep each section to one topic.
- Do not skip server-side re-authentication for deletion.

## Related

- [ProfileForm](../profile-form/README.md)
- [Card](../card/README.md)
- [AlertDialog](../alert-dialog/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-account-account-settings--docs
