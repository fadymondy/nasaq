---
name: settings-sections
title: SettingsSections
category: account
status: beta
summary: A settings page with grouped sections in a nav, search across every setting, and a sticky save bar that shows unsaved changes.
exports: [SettingsSections, SettingRow, SettingsSectionsProps, SettingRowProps, SettingsSectionsLabels, SettingsEntry, SettingsPage, SettingsGroup, SettingsSaveResult]
related: [account-settings, settings-section, field, select]
story: components-account-settings-sections
base-ui: [select]
keywords: [settings, sections, search, save bar, dirty, unsaved, groups, preferences, nav]
---

# SettingsSections

The larger sibling of `AccountSettings`. Pages are grouped in the nav, a search box finds pages and single
settings (and scrolls to them), and one sticky bar saves or discards every edit at once.

## When to use

- Workspace, app or admin settings with many pages and one save action.

## When not to use

- A short account page with self-saving sections: use `AccountSettings`.

## Import

```tsx
import { SettingsSections, SettingRow } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { useState } from "react";
import { Switch, SettingRow, SettingsSections } from "@fadymondy/nasaq/web";

export function Settings() {
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState(false);
  const dirty = draft !== saved ? 1 : 0;
  return (
    <SettingsSections
      title="Settings"
      dirty={dirty}
      onSave={async () => setSaved(draft)}
      onDiscard={() => setDraft(saved)}
      groups={[
        {
          id: "general",
          label: "General",
          pages: [
            {
              id: "notifications",
              label: "Notifications",
              entries: [{ id: "email", label: "Email digest" }],
              content: (
                <SettingRow id="email" label="Email digest" description="A weekly summary.">
                  <Switch checked={draft} onCheckedChange={setDraft} aria-label="Email digest" />
                </SettingRow>
              ),
            },
          ],
        },
      ]}
    />
  );
}
```

## Anatomy

```
SettingsSections       data-slot="settings-sections"
├─ header              title, description, search
├─ nav                 groups of pages (desktop) or a Select with groups (mobile)
├─ content             the active page; visited pages stay mounted so edits persist
└─ save bar            sticky, role="status": idle, saving, saved, error
```

## API

### SettingsSections

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `groups` | `SettingsGroup[]` | required | `{ id, label, pages }`. A page is `{ id, label, description?, icon?, keywords?, entries?, tone?, content }`. |
| `value`, `defaultValue`, `onValueChange` | `string`, `(id) => void` | first page | Active page. |
| `title`, `description` | `ReactNode` | localised | `description={null}` hides it. |
| `dirty` | `number \| boolean` | `0` | Unsaved change count. 0 or false hides the bar. You track it. |
| `onSave` | `() => Promise<void \| { error? }>` | none | Return `{ error }` or throw to keep the bar open with a message. |
| `onDiscard` | `() => void \| Promise<void>` | none | Reset your state. |
| `searchable` | `boolean` | `true` | |
| `labels` | `SettingsSectionsLabels` | en / ar | |

### SettingRow

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `id` | `string` | required | Must equal the `SettingsEntry.id` so a search hit scrolls here. |
| `label`, `description` | `ReactNode` | required / none | |
| `children` | `ReactNode` | none | The control at the inline end. |

## Examples

- **Search**: list every `SettingRow` as an `entries` item and add `keywords` (also Arabic words).
- **Errors**: `onSave={async () => ({ error: "Could not reach the server." })}`.

## Accessibility

- The nav marks the active page with `aria-current="page"`; search hits are a listbox and Enter opens one.
- The save bar is a polite `role="status"` region, so "Saved" is announced.
- Pass `labels` for save, discard and search text in other languages.

## RTL & i18n

Search folds Arabic letters (alef forms, ya, taa marbuta, diacritics). Counts use the locale's numerals.

## Styling & tokens

Uses `bg-nq-selected`, `bg-nq-hover`, `text-nq-danger-text`, `shadow-floating`. A found setting flashes with
`data-highlight="true"`. Extend with `className`.

## Do / Don't

- Do put destructive actions on a page with `tone="danger"`.
- Do not make the save bar the only feedback for a failed save; return the error.

## Related

- [AccountSettings](../account-settings/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-account-settings-sections--docs
