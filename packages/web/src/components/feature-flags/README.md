---
name: feature-flags
title: FeatureFlagList
category: developer
status: beta
summary: "A feature flag list with a key, an on/off switch per environment, rollout percentage, state and last update, plus the pure bucketing and evaluation logic behind percentage rollouts."
exports: [ruleMatcher, FeatureFlagsLabels, FeatureFlagListProps, FeatureFlagList, bucketFor, clampRollout, evaluateFlag, flagKeyFromName, flagState, hash32, isInRollout, isValidFlagKey, normalizeWeights, pickVariant, ruleVariant]
related: [feature-flag-detail, rule-builder, kill-switch, data-table, switch]
story: components-developer-feature-flags
base-ui: [switch]
keywords: [feature flags, toggles, rollout, environments, targeting, release, kill switch]
---

# FeatureFlagList

FeatureFlagList is the overview of every flag. Each row has the name and key, one switch per environment that you can flip in place, the rollout percentage and a one-word state (on, partial, off or killed) for one environment, and when the flag last changed. A row opens the flag detail. The same package holds the model that decides what a user sees: a stable hash puts each user in a bucket from 0 to 100, so raising a rollout from 10% to 20% keeps the first 10% in.

The evaluation code is for releasing features. It is not a security boundary: do not use it to guard data.

## When to use

- The flag overview in an admin or developer area.
- Anywhere you need deterministic percentage rollouts in tests or a preview.

## When not to use

- One flag in depth: use [`FeatureFlagDetail`](../feature-flag-detail/README.md).
- Emergency stops for automations: use [`KillSwitch`](../kill-switch/README.md).

## Import

```tsx
import { FeatureFlagList, evaluateFlag } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { FeatureFlagList } from "@fadymondy/nasaq/web";

<FeatureFlagList
  flags={flags}
  environments={[{ id: "dev", label: "Development" }, { id: "prod", label: "Production" }]}
  onToggle={async (key, env, enabled) => { await api.toggle(key, env, enabled); }}
  onOpen={(key) => navigate(`/flags/${key}`)}
/>;
```

## Anatomy

```
FeatureFlagList     data-slot="feature-flag-list"   (Card + DataTable)
  toolbar           search, state facet, New flag
  row               name and key, switch per environment (env-<id>), rollout, state, updated
  row actions       open, copy key, delete
```

## API

### FeatureFlagList

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `flags` | `FeatureFlag[]` | required | See below. |
| `environments` | `FlagEnvironmentDef[]` | required | `{ id, label }`, in column order. |
| `onToggle` | `(key, environmentId, enabled) => Promise<void \| { error?: string }>` | none | Makes the switches live; without it they are read only. A failure puts the switch back and shows the message. |
| `onOpen` | `(key) => void` | none | Row click and Open. |
| `onCreate` | `() => void` | none | Shows New flag. |
| `onDelete` | `(key) => Promise<...>` | none | Row action. |
| `rolloutEnvironment` | `string` | last environment | Which environment the rollout and state columns use. |
| `title / description / pageSize / loading / error / onRetry / className` | | | As in the other lists. |
| `labels` | `Partial<FeatureFlagsLabels>` | none | Strings. |

### FeatureFlag

`{ key, name, description?, killed?, environments: Record<id, { enabled, rollout }>, variants: { key, label?, weight }[], rules: RuleDefinition[], updatedAt, updatedBy?, tags? }`.

### Model

- `bucketFor(flagKey, userId)` is the user's bucket, 0 up to (not including) 100, stable per flag.
- `isInRollout(bucket, percent)`: 0% lets nobody in and 100% everybody.
- `evaluateFlag(flag, environmentId, { userId, ...context }, matches?)` returns `{ on, variant, reason, bucket }`. Order: killed, environment off, first matching targeting rule (serves its variant and skips the rollout), then the percentage. `matches` comes from `ruleMatcher(fields)`; without it rules are ignored.
- `pickVariant(flagKey, userId, variants)` uses an independent hash over normalised weights.
- `normalizeWeights(weights)` returns whole numbers that add up to 100.
- `flagState(flag, environmentId)`, `clampRollout`, `hash32`, `ruleVariant`, `isValidFlagKey`, `flagKeyFromName`.

## Examples

Check a user in code or a preview:

```tsx
import { evaluateFlag, ruleMatcher } from "@fadymondy/nasaq/web";

const matches = ruleMatcher(fields);
const { on, variant, reason } = evaluateFlag(flag, "prod", { userId: "u-42", plan: "pro" }, matches);
```

Show production only:

```tsx
import { FeatureFlagList } from "@fadymondy/nasaq/web";

<FeatureFlagList flags={flags} environments={envs.filter((e) => e.id === "prod")} />;
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Move between switches and rows. |
| Space | Flip a switch. |
| Enter | Open the flag. |

Each switch has a name that includes the flag and environment. State is a word, not just a colour.

## RTL & i18n

Flag keys are left-to-right (`<bdi dir="ltr">`) inside the RTL layout. Dates use `DateTime`. Built-in English and Arabic strings; override with `labels`.

## Styling & tokens

State uses the success, warning, danger and neutral tokens. Logical spacing only.

## Do / Don't

- Do keep environment order stable (dev, staging, production).
- Do treat killed as stronger than any switch.
- Don't use flags for permissions or data access.

## Related

- [FeatureFlagDetail](../feature-flag-detail/README.md)
- [RuleBuilder](../rule-builder/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-developer-feature-flags--docs
