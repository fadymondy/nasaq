export { default as NqGithubActivity } from "./NqGithubActivity.vue";
// Helpers and types carry a `github` prefix: the package index re-exports every component with `export *`.
export {
  commitBody as githubCommitBody,
  commitTitle as githubCommitTitle,
  countBy as githubCountBy,
  deploymentTone as githubDeploymentTone,
  isActive as githubIsActive,
  matches as githubMatches,
  mergeActivity as githubMergeActivity,
  pullTone as githubPullTone,
  runTone as githubRunTone,
  shortSha as githubShortSha,
  type ActivityKind as GithubActivityKind,
  type ActivityTone as GithubActivityTone,
  type DeploymentStatus as GithubDeploymentStatus,
  type PullState as GithubPullState,
  type RunStatus as GithubRunStatus,
} from "./github-activity-format";
export type { GithubActivityLabels } from "./strings";
export type { GithubActionResult, GithubActor, GithubCommit, GithubDeployment, GithubFeedId, GithubLabel, GithubPull, GithubRepo, GithubRun } from "./types";
