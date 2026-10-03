---
name: onboarding-flow
title: OnboardingFlow
category: onboarding
status: beta
summary: "The flow after sign-up: welcome, profile, workspace, invites, preferences, first integration and a review, with skip, back and progress that resumes after a reload."
exports: [OnboardingFlowLabels, OnboardingProfileValues, OnboardingWorkspaceValues, OnboardingInviteValues, OnboardingPreferenceValues, OnboardingValues, OnboardingProgressState, OnboardingIntegration, OnboardingOption, OnboardingFlowProps, OnboardingFlow]
related: [setup-wizard, onboarding-checklist, avatar-upload, tag-input, stepper]
story: components-onboarding-pages-flow
base-ui: []
keywords: [onboarding, first run, welcome, sign up, profile, workspace, invite teammates, preferences, integration, resume]
---

# OnboardingFlow

Everything a new person does once, in order. It is built on [`SetupWizard`](../setup-wizard/README.md) (rail, Back, Continue,
Skip on optional steps, completion screen) and adds the seven steps, per-step validation, live language and theme
switching, and saved progress. It saves nothing: each step calls your async callback when the person continues.

Steps: `welcome`, `profile`, `workspace` (create or join), `invite` (optional), `preferences` (optional), `integration`
(optional), `finish`. Hide some with `hideSteps`.

## When to use

- The screens right after sign-up or after accepting an invite.

## When not to use

- Ongoing settings: use the settings pages.
- A wizard with your own steps: use `SetupWizard`.

## Import

```tsx
import { OnboardingFlow } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { OnboardingFlow } from "@fadymondy/nasaq/web";

export function Onboarding() {
  return (
    <OnboardingFlow
      userName="Sara"
      storageKey="onboarding:u1"
      onSaveProfile={(p) => api.saveProfile(p)}
      onUploadAvatar={async (file) => (await api.upload(file)).url}
      onWorkspace={(w) => api.workspace(w)}
      onInvite={(i) => api.invite(i)}
      onPreferences={(p) => api.prefs(p)}
      onConnect={(id) => api.connect(id)}
      onFinish={() => api.finish()}
      doneAction={<a href="/">Open the dashboard</a>}
    />
  );
}

declare const api: Record<string, (...args: any[]) => Promise<any>>;
```

## Anatomy

```
OnboardingFlow                 data-slot="onboarding-flow"
└─ SetupWizard
   ├─ welcome        data-slot="onboarding-welcome"
   ├─ profile        AvatarUpload, name, role Select
   ├─ workspace      Tabs: create | join with a code
   ├─ invite         TagInput of emails, role Select
   ├─ preferences    language, theme, notification Switches
   ├─ integration    provider rows with Connect
   └─ finish         review of done and skipped steps
```

## API

`div` props (except `children`, `title`) plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `userName` | `string` | | Greets and pre-fills the name. |
| `defaultValues` | `Partial<OnboardingValues>` | | Start values for any section. |
| `progress` / `onProgressChange` | `OnboardingProgressState` | | Controlled progress: `{ current, completed, skipped, values, updatedAt }`. Save it on your server. |
| `storageKey` | `string` | | Keeps progress in `localStorage` and resumes from it. Cleared on finish. |
| `onSaveProfile`, `onWorkspace`, `onInvite`, `onPreferences` | `(values) => AuthSubmitResult` | | Run on Continue. `{ error }` stays on the step. |
| `onUploadAvatar` | `(file, controls) => Promise<string>` | | Uploads the cropped photo, returns its URL. Without it the photo stays local. |
| `onConnect` | `(id) => AuthSubmitResult` | | Starts connecting an integration. |
| `onFinish` | `(values) => AuthSubmitResult` | required | Last step. |
| `roles`, `inviteRoles`, `integrations` | `{ value, label }[]`, `{ id, name, description?, icon? }[]` | built in | Options. Integrations default to GitHub, Google and Microsoft with their own logos. |
| `hideSteps`, `doneAction`, `labels` | | | |

Pure helpers (`initialProgress`, `markCompleted`, `markSkipped`, `moveTo`, `parseProgress`, `serializeProgress`,
`resumeIndex`, `parseInviteEmails`, `checklistSummary`) are exported.

## Examples

**Controlled progress saved on the server**

```tsx
import { OnboardingFlow, type OnboardingProgressState } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Server({ saved }: { saved?: OnboardingProgressState }) {
  const [progress, setProgress] = useState(saved);
  return <OnboardingFlow progress={progress} onProgressChange={(p) => { setProgress(p); void api.saveProgress(p); }} onFinish={async () => undefined} />;
}

declare const api: { saveProgress(p: OnboardingProgressState): Promise<void> };
```

## Accessibility

- Each step heading takes focus when the step changes. Required fields report errors in a summary and inline.
- Language and theme are toggle groups with labels; notification switches sit in labelled rows.
- Skipped steps are stated in words, never only by icon.

## RTL & i18n

- English and Arabic built in, switching live when the person picks a language. Emails and codes stay left to right.

## Styling & tokens

- Tokens only. Uses the brands' own logo marks for integrations.

## Do / Don't

- Do mark only truly optional steps as skippable (invites, preferences, integration).
- Do persist progress server-side for signed-in flows.
- Don't ask for anything you can read from the sign-up.

## Related

- [`setup-wizard`](../setup-wizard/README.md)
- [`onboarding-checklist`](../onboarding-checklist/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-onboarding-pages-flow--docs
