---
name: env-list
title: EnvList
category: developer-tools
status: stable
summary: A .env manager with masked values, reveal and copy, add edit delete, import by pasting a .env, export, per-environment tabs and key validation.
exports: [EnvListLabels, EnvResult, EnvEnvironment, EnvImportOptions, EnvListProps, EnvList, checkEnvKey, conflictingKeys, ENV_KEY, EnvKeyProblem, EnvParseIssue, EnvParseResult, EnvVariable, isValidEnvKey, looksPublic, MASK, parseEnv, quoteEnvValue, serializeEnv]
related: [api-keys, code-block-variants, dialog, alert-dialog]
story: components-developer-tools-env-list
base-ui: [dialog, alert-dialog, tabs]
keywords: [env, dotenv, environment, variables, secrets, config, import, export, mask, reveal, keys]
---

# EnvList

Manages environment variables as key and value rows. Values are masked with a fixed-width mask (so length is not
leaked) and only enter the DOM while revealed; a revealed value hides again after 30 seconds. Each row has reveal,
copy, edit and delete. Add and edit open a dialog that checks the key (empty, invalid, duplicate). Import takes a
pasted `.env` or a chosen file, shows what was found, flags conflicts and unreadable lines, and lets the user
choose whether to overwrite. Export downloads a `.env`. Optional tabs switch environments. Nothing is logged, and
error messages never include a value. Presentational: your callbacks talk to the backend.

## When to use

- Project or service settings where a developer edits environment variables.

## When not to use

- API keys with a create-once, show-once flow: use [ApiKeys](../api-keys/README.md).
- A single value to copy: use `CopyField` from [copy-button](../copy-button/README.md).

## Import

```tsx
import { EnvList } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { EnvList } from "@fadymondy/nasaq/web";

export function Env() {
  return (
    <EnvList
      variables={[{ key: "DATABASE_URL", value: "postgres://...", secret: true }]}
      onSave={async (v, previousKey) => {}}
      onDelete={async (key) => {}}
      onImport={async (vars, { overwrite }) => {}}
    />
  );
}
```

## Anatomy

```
EnvList         data-slot="env-list"          <section>
├─ header       title, description, environment tabs, Add / Import / Copy / Download
├─ filter       search, shown when there are more than 5 variables
├─ rows         data-slot="env-row"           key, masked value, reveal, copy, edit, delete
├─ add / edit   Dialog                        key and value, validation, secret switch
├─ import       Dialog                        paste or file, preview, overwrite checkbox, issues
└─ delete       AlertDialog                   confirm
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `variables` | `EnvVariable[]` | required | `{ key, value, secret?, description? }`. `secret` defaults to true. |
| `title?` / `description?` | `ReactNode` | "Environment variables" | Header text. |
| `environments?` | `{ id, label }[]` | none | Tabs. Load the matching `variables` when `onEnvironmentChange` fires. |
| `environment?` / `onEnvironmentChange?` | `string` / `(id) => void` | first | Selected environment. |
| `onSave?` | `(variable, previousKey?) => Promise<{ error? } \| void>` | none | Add (no `previousKey`) or edit. `{ error }` keeps the dialog open. |
| `onDelete?` | `(key) => Promise<{ error? } \| void>` | none | After confirmation. |
| `onImport?` | `(variables, { overwrite }) => Promise<{ error? } \| void>` | none | Imported values are secret unless the key is public (`NEXT_PUBLIC_*`, `VITE_*`). |
| `onExport?` | `(variables) => void` | saves a file | Replaces the default download. |
| `exportFilename?` | `string` | `".env"` | Default download name. |
| `revealTimeout?` | `number` | `30000` | Milliseconds until a revealed value hides. `0` keeps it. |
| `readOnly?` | `boolean` | `false` | No add, edit, delete or import. Reveal and copy still work. |
| `labels?` | `Partial<EnvListLabels>` | built-in en/ar | Translations. |

Helpers: `parseEnv(text)` returns `{ variables, duplicates, issues }` (issues carry a line number and a problem,
never a value), `serializeEnv`, `quoteEnvValue`, `checkEnvKey`, `isValidEnvKey`, `conflictingKeys`, `looksPublic`, `MASK`.

## Examples

### Environments

```tsx
<EnvList
  environments={[{ id: "dev", label: "Development" }, { id: "prod", label: "Production" }]}
  environment={env}
  onEnvironmentChange={setEnv}
  variables={byEnv[env]}
/>
```

### Parsing

```ts
parseEnv('A=1\nexport B="two words"\nA=3').duplicates; // ["A"], the last value wins
```

## Accessibility

| Key | Action |
| --- | --- |
| `Tab` | Row buttons in order |
| `Enter` / `Space` | Reveal, copy, edit or delete |
| `Esc` | Closes a dialog |

- Reveal is a toggle button with `aria-pressed` and a name that includes the key. Masked values are `aria-hidden` text plus the button label, so a mask is never read out as twelve bullets.
- Validation messages are tied to the key field with `aria-describedby` and announced.
- Delete asks first, in an alert dialog that names the key.

## RTL & i18n

- Keys and values are `dir="ltr"` inside Arabic pages; the chrome follows the page.
- Built-in Arabic strings; override with `labels`.
- Buttons sit on the logical inline-end side.

## Styling & tokens

- Rows use `bg-card`, `border-border`, `text-code` for keys and values; conflict and issue text uses `text-nq-warning-text` and `text-nq-danger-text`.
- Slots: `env-list`, `env-row`. `data-revealed` on a row.

## Do / Don't

- **Do** keep values out of logs, analytics and error messages, in your callbacks too.
- **Do** return `{ error }` with a safe message from callbacks.
- **Don't** render this for people who should not see secrets: masking is not access control.
- **Don't** use `revealTimeout={0}` on shared screens.

## Related

- [ApiKeys](../api-keys/README.md) · [CodeBlock variants](../code-block-variants/README.md) · [Dialog](../dialog/README.md) · [AlertDialog](../alert-dialog/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-developer-tools-env-list--docs
