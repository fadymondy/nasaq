---
name: feature-flag-detail
title: FeatureFlagDetail
category: developer-tools
status: beta
summary: "One feature flag in full: on/off and percentage rollout per environment, targeting rules built with the rule builder, weighted variants, a kill switch and the audit history."
exports: [FeatureFlagDetailLabels, FeatureFlagDetailProps, FeatureFlagDetail, FlagAuditHistory]
related: [feature-flags, rule-builder, slider, switch, timeline, kill-switch]
story: components-developer-tools-feature-flag-detail
base-ui: [tabs, switch, slider, alert-dialog]
keywords: [feature flag, rollout, targeting, variants, kill switch, audit, environments]
---

# FeatureFlagDetail

FeatureFlagDetail is the page body for a single flag. Four tabs: Environments (a switch and a rollout slider per environment), Targeting (rules built with RuleBuilder, each serving a variant, first match wins), Variants (keys and weights that always add up to 100) and History (the audit trail). A Kill switch button forces the flag off everywhere, needs a reason, and turns into a Restore button in a danger banner once used.

Every change goes through a callback that returns a promise, so the host decides what saving means; a returned `{ error }` is shown and the control returns to its old value.

## When to use

- The detail screen of a flag in an admin or developer area.

## When not to use

- The overview of all flags: use [`FeatureFlagList`](../feature-flags/README.md).

## Import

```tsx
import { FeatureFlagDetail } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { FeatureFlagDetail } from "@fadymondy/nasaq/web";

<FeatureFlagDetail
  flag={flag}
  environments={environments}
  fields={[{ id: "plan", label: "Plan", kind: "select", options: [{ value: "pro", label: "Pro" }] }]}
  audit={audit}
  onToggle={async (env, enabled) => { await api.toggle(flag.key, env, enabled); }}
  onRolloutChange={async (env, pct) => { await api.rollout(flag.key, env, pct); }}
  onKill={async (reason) => { await api.kill(flag.key, reason); }}
/>;
```

## Anatomy

```
FeatureFlagDetail       data-slot="feature-flag-detail"
  header                name, key, state, Kill switch
  killed banner         Alert with Restore
  Tabs                  Environments | Targeting | Variants | History
    Environments        Switch + Slider per environment
    Targeting           RuleBuilder per rule, serve variant, move, remove, Save
    Variants            key, label, weight, share
    History             FlagAuditHistory (Timeline)
```

## API

### FeatureFlagDetail

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `flag` | `FeatureFlag` | required | The flag. |
| `environments` | `FlagEnvironmentDef[]` | required | `{ id, label }`. |
| `fields` | `RuleField[]` | required | What targeting rules can test: plan, country and so on. |
| `audit` | `FlagAuditEntry[]` | none | History tab. Newest first. |
| `onToggle` | `(environmentId, enabled) => Promise<void \| { error?: string }>` | none | Without it switches are read only. |
| `onRolloutChange` | `(environmentId, percent) => Promise<...>` | none | Called when the slider is released (`onValueCommitted`), not on every drag step. |
| `onRulesChange` | `(rules: RuleDefinition[]) => Promise<...>` | none | Save on the Targeting tab. |
| `onVariantsChange` | `(variants: FlagVariant[]) => Promise<...>` | none | Save on the Variants tab. |
| `onKill` | `(reason: string) => Promise<...>` | none | Shows the Kill switch. |
| `onRestore` | `() => Promise<...>` | none | Shows Restore on a killed flag. |
| `className / labels` | | none | Classes; `Partial<FeatureFlagDetailLabels>` strings. |

Keep `flag`, `flag.rules`, `flag.variants` and `flag.environments` referentially stable between renders: the component syncs its drafts from them when they change.

### FlagAuditHistory

`entries: FlagAuditEntry[]`, `className?`, `labels?`. An entry is `{ id, action: "created" | "toggled" | "rollout" | "rules" | "variants" | "killed" | "restored", actor, at, environment?, from?, to?, reason? }`.

## Examples

History on its own, for an activity page:

```tsx
import { FlagAuditHistory } from "@fadymondy/nasaq/web";

<FlagAuditHistory entries={audit} />;
```

Read only viewer:

```tsx
import { FeatureFlagDetail } from "@fadymondy/nasaq/web";

<FeatureFlagDetail flag={flag} environments={envs} fields={fields} audit={audit} />;
```

## Accessibility

| Key | Action |
| --- | --- |
| Arrow keys | Switch tabs; adjust a focused slider (Shift for bigger steps). |
| Space | Flip a switch. |
| Escape | Close the kill switch dialog. |

The kill switch asks for a reason in an alert dialog with focus on the input. The killed state is a banner with text and an icon.

## RTL & i18n

Sliders and tabs mirror in RTL. Flag keys and variant keys are left-to-right. Percentages use Latin digits. Built-in English and Arabic strings; override with `labels`.

## Styling & tokens

State and the killed banner use the danger, success, warning and neutral tokens. Logical spacing only.

## Do / Don't

- Do require a reason for the kill switch so the audit trail explains it.
- Do save the rollout on release, not on each drag step.
- Don't rely on rule order without saying so: the first match wins.

## Related

- [FeatureFlagList](../feature-flags/README.md)
- [RuleBuilder](../rule-builder/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-developer-tools-feature-flag-detail--docs
