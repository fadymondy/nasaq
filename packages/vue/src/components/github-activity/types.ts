import type { TagHue } from "../badge";
import type { DateLike, DeploymentStatus, PullState, RunStatus } from "./github-activity-format";

export interface GithubActor {
  login: string;
  avatar?: string;
  href?: string;
}

export interface GithubCommit {
  /** The full sha. */
  id: string;
  /** The whole message; the first line is the title. */
  message: string;
  author: GithubActor;
  date: DateLike;
  href?: string;
  branch?: string;
  /** CI state of this commit, when known. */
  checks?: "success" | "failure" | "pending";
}

export interface GithubLabel {
  name: string;
  hue?: TagHue;
}

export interface GithubPull {
  /** Any stable id; the number is what people read. */
  id: string;
  number: number;
  title: string;
  author: GithubActor;
  state: PullState;
  createdAt: DateLike;
  mergedAt?: DateLike | null;
  mergedBy?: GithubActor;
  href?: string;
  /** Source branch. */
  head?: string;
  /** Target branch. */
  base?: string;
  labels?: readonly GithubLabel[];
  checks?: "success" | "failure" | "pending";
  comments?: number;
}

export interface GithubRun {
  id: string;
  name: string;
  /** The run number in the workflow, shown as "hash 412". */
  number?: number;
  status: RunStatus;
  branch?: string;
  sha?: string;
  /** The trigger: `push`, `pull_request`, `schedule`, `workflow_dispatch`. */
  event?: string;
  actor?: GithubActor;
  startedAt: DateLike;
  durationMs?: number;
  href?: string;
}

export interface GithubDeployment {
  id: string;
  environment: string;
  status: DeploymentStatus;
  /** Branch or tag that was deployed. */
  ref: string;
  sha?: string;
  creator?: GithubActor;
  createdAt: DateLike;
  /** The deployed site. */
  url?: string;
  href?: string;
}

export interface GithubRepo {
  owner: string;
  name: string;
  href?: string;
}

export type GithubFeedId = "commits" | "pulls" | "runs" | "deployments";

/** What a callback resolves with: nothing, or `{ error }` to show a message. */
export type GithubActionResult = void | { error?: string };
