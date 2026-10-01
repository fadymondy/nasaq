---
name: github-activity
title: GithubActivity
category: developer-tools
status: beta
summary: A repository activity card with a merged timeline plus commits, pull requests, workflow runs and deployments, each with status, author and a link to GitHub, filterable, with refresh, deploy and re-run callbacks.
exports: [GithubActivity, GithubActivityProps, GithubActivityLabels, GithubActor, GithubCommit, GithubPull, GithubRun, GithubDeployment, GithubRepo, GithubLabel, ActivityKind, ActivityTone, DeploymentStatus, PullState, RunStatus, commitBody, commitTitle, countBy, deploymentTone, isActive, matches, mergeActivity, pullTone, runTone, shortSha]
related: [deploy-view, log-viewer, timeline, oauth-buttons, status]
story: components-developer-tools-github-activity
base-ui: [tabs]
keywords: [github, commits, pull requests, workflow runs, ci, deployments, activity, timeline, repository]
---

# GithubActivity

What is happening in a repository, in one card: a merged timeline of everything, and a tab each for commits,
pull requests, workflow runs and deployments. Every row has its status, the author and a link to GitHub.
It has no backend and does not call GitHub: you fetch the feeds (a GitHub App, or the Mahaam GitHub tools)
and pass them in. It uses the official GitHub mark, reused from `GitHubLogo` in `oauth-buttons`.

## When to use

- A project or deploy page that shows the health of the repository next to the product.
- A dashboard that needs commits, PRs, CI and deploys together, newest first.

## When not to use

- Reading the full log of one run: use `LogViewer` or `DeployView`.
- Code review (diffs, comments): this only lists.

## Import

```tsx
import { GithubActivity } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { GithubActivity, type GithubCommit, type GithubRun } from "@fadymondy/nasaq/web";

declare const commits: GithubCommit[];
declare const runs: GithubRun[];

export function Repo() {
  return (
    <GithubActivity
      repo={{ owner: "acme", name: "storefront", href: "https://github.com/acme/storefront" }}
      commits={commits}
      runs={runs}
      onRerun={async (id) => {
        await fetch(`/api/runs/${id}/rerun`, { method: "POST" });
      }}
    />
  );
}
```

## Anatomy

```
GithubActivity                  data-slot="github-activity" (Card)
├─ header                       GitHubLogo, owner/name link, Refresh and Deploy buttons
├─ filter Input                 searches the message, author, branch, number
└─ Tabs (underline)             only for the feeds you pass
   ├─ Activity                  merged Timeline, newest first
   ├─ Commits                   short SHA, title, author, branch, checks
   ├─ Pull requests             state badge, labels, head to base, comments
   ├─ Workflow runs             Status, branch, event, duration, Re-run
   └─ Deployments               environment, ref, status, URL
```

## API

**GithubActivity**: every `div` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `repo` | `GithubRepo` | required | `{ owner, name, href? }`. |
| `commits` | `readonly GithubCommit[]` | none | `{ id, message, author, date, href?, branch?, checks? }`. |
| `pulls` | `readonly GithubPull[]` | none | `{ id, number, title, author, state, createdAt, mergedAt?, labels?, checks?, comments?, head?, base?, href? }`. State is `open`, `draft`, `merged` or `closed`. |
| `runs` | `readonly GithubRun[]` | none | `{ id, name, status, startedAt, durationMs?, branch?, sha?, event?, actor?, href? }`. |
| `deployments` | `readonly GithubDeployment[]` | none | `{ id, environment, status, ref, createdAt, sha?, creator?, url?, href? }`. |
| `defaultTab` | `"activity" \| "commits" \| "pulls" \| "runs" \| "deployments"` | activity | The tab shown first. |
| `loading` | `boolean` | `false` | Skeleton rows. |
| `onRefresh` | `() => Promise<void \| { error? }>` | | Shows Refresh. |
| `onDeploy` | `() => Promise<void \| { error? }>` | | Shows Deploy. |
| `onRerun` | `(runId) => Promise<void \| { error? }>` | | Shows Re-run on finished runs. |
| `hideSearch` | `boolean` | `false` | Hide the filter box. |
| `labels` | `Partial<GithubActivityLabels>` | | Override any string. |

**Helpers** (pure, tested): `shortSha`, `commitTitle`, `commitBody`, `runTone`, `pullTone`, `deploymentTone`, `isActive`,
`matches`, `mergeActivity`, `countBy`.

## Examples

**Only pull requests**

```tsx
import { GithubActivity, type GithubPull } from "@fadymondy/nasaq/web";

declare const pulls: GithubPull[];

export const Pulls = () => <GithubActivity repo={{ owner: "acme", name: "storefront" }} pulls={pulls} hideSearch />;
```

## Accessibility

- Tabs follow the WAI-ARIA tabs pattern (arrow keys, and they mirror in RTL).
- Status is an icon plus a word, never colour alone. Links say where they go, and external ones open in a new tab with `rel="noopener noreferrer"`.
- Refresh, Deploy and Re-run show a busy state and errors appear in an `Alert` with `role="alert"`.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. SHAs, branch names, refs, URLs and PR numbers are `dir="ltr"`.
- The GitHub mark never mirrors. Direction icons flip.

## Styling & tokens

- Built on `Card`, `Tabs`, `Timeline`, `Status`, `Badge`, `Avatar`, `DateTime` and `--nq-*` tokens.
- Target `[data-slot="github-activity"]`.

## Do / Don't

- Do keep the token and API calls on your server. Pass only public data in.
- Do pass the feeds you have; a tab appears only for a feed that is given.
- Don't use another GitHub logo. Reuse the official mark from `oauth-buttons`.
- Don't put more than a few dozen items per feed. Page on the server and refresh.

## Related

- [`DeployView`](../deploy-view/README.md)
- [`LogViewer`](../log-viewer/README.md)
- [`Timeline`](../timeline/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-developer-tools-github-activity--docs
