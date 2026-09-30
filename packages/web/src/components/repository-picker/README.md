---
name: repository-picker
title: Repository picker
category: pickers
status: beta
summary: Pick a GitHub repository and branch by searching through the app installation, with the official GitHub mark, debounced search, keyboard support and a Configure access link.
exports: [RepositoryPicker, PickerRepo, PickerBranch, PickerAccount, RepositoryPickerValue, RepositoryPickerLabels, RepositoryPickerProps]
related: [oauth-buttons, connected-accounts, popover, input]
story: components-pickers-repository-picker
base-ui: [popover]
keywords: [github, repository, repo, branch, picker, search, installation, app, select]
---

# Repository picker

Two linked fields: a repository and a branch. Both open a search list. Repositories are searched through the GitHub app installation (the picker only asks your `searchRepositories`), and picking one loads its branches and selects the default. The footer says whose installation this is and offers "Configure access" for repositories that are not listed. It calls no backend.

## When to use

- Connecting a project, deploy or workflow to a GitHub repository and branch.

## When not to use

- Choosing from a short fixed list: use [`Select`](../select/README.md).
- Signing in with GitHub: use [`OAuthButtons`](../oauth-buttons/README.md).

## Import

```tsx
import { RepositoryPicker } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
<RepositoryPicker
  account={{ login: "acme" }}
  searchRepositories={(q) => api.repos(q)}
  loadBranches={(repo) => api.branches(repo.fullName)}
  onConfigure={() => window.open("https://github.com/settings/installations")}
  onChange={({ repo, branch }) => save(repo?.fullName, branch)}
/>
```

## Anatomy

```
RepositoryPicker            data-slot="repository-picker"
├─ repository trigger       GitHub mark, owner/name, private lock
├─ branch trigger           default and protected tags
└─ Popover                  search input, listbox of options, error and retry, footer
   └─ footer                installation account, Configure access
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value?` / `defaultValue?` | `{ repo: PickerRepo \| null; branch: string \| null }` | empty | Controlled or initial value. |
| `onChange?` | `(value) => void` | none | Fired on every pick. Picking a repository sets its default branch. |
| `searchRepositories` | `(query) => Promise<PickerRepo[]>` | required | Called with `""` when the list opens, then debounced (250 ms) while typing. |
| `loadBranches` | `(repo) => Promise<PickerBranch[]>` | required | Branches of the picked repository. |
| `account?` | `{ login, avatar? }` | none | Shown in the footer. |
| `onConfigure?` | `() => void` | none | Adds the "Configure access" button. |
| `hideBranch?` | `boolean` | `false` | Repository only. |
| `disabled?` | `boolean` | `false` | |
| `labels?` | `Partial<RepositoryPickerLabels>` | en/ar | Override any string. |

`PickerRepo` is `{ id, fullName, description?, private?, language?, defaultBranch?, stars?, updatedAt? }`; `PickerBranch` is `{ name, default?, protected? }`.

## Examples

### Repository only

```tsx
<RepositoryPicker hideBranch searchRepositories={search} loadBranches={async () => []} />
```

## Accessibility

- Each list is a `listbox` with `aria-activedescendant`; ArrowUp/ArrowDown move, Enter picks, Escape closes and returns focus to the trigger.
- Loading, empty and error states are announced; a failed search offers Retry.
- Private repositories show a lock with a text label, not colour alone.

## RTL & i18n

- English and Arabic built in. `owner/name`, branch names and language names stay left-to-right in `<bdi dir="ltr">`.
- The GitHub mark is the official one from `oauth-logos` and never mirrors or recolours; it switches to the light artwork on dark themes.

## Styling & tokens

- Uses the `Popover`, `Input` and `Button` tokens; hover `--nq-hover`. No raw hex.
- Target `[data-slot=repository-picker]`.

## Do / Don't

- **Do** debounce on the server side too; the picker only debounces the calls.
- **Do** return the `defaultBranch` on each repo so the first branch loads instantly.
- **Don't** pass tokens to the picker; keep them in your `searchRepositories`.

## Related

- [OAuthButtons](../oauth-buttons/README.md) · [ConnectedAccounts](../connected-accounts/README.md) · [Popover](../popover/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-pickers-repository-picker--docs
