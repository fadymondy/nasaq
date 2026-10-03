import type { Component } from "vue";
import type { NqEnvList } from "../env-list";
import type { EntityPerson } from "../entity-list";
import type { GithubRepo } from "../github-activity";
import type { NqGithubActivity } from "../github-activity";
import type { NqMembersManager } from "../members-manager";
import type { Issue, IssuePriority, IssueType } from "../issue-view/issue-logic";
import type { Project } from "../project-list";
import type { NqRepositoryPicker } from "../repository-picker";
import type { NqStatusLabelManager } from "../status-label-manager";
import type { NqVault } from "../vault";

export type { Issue };

/** One line of the project's recent activity. */
export interface ProjectActivityItem {
  id: string;
  actor?: { name: string; avatar?: string };
  /** What happened, already a sentence: "moved NSQ-14 to Review". */
  title: string;
  description?: string;
  at: Date | string | number;
  /** What kind of event, for the Activity tab filter. Default "other". */
  kind?: "issue" | "comment" | "status" | "member" | "file" | "code" | "time" | "other";
}

export interface ProjectBudget {
  total: number;
  spent: number;
  currency?: string;
}

export type MemoryKind = "fact" | "decision";

/** One thing the project remembers: a fact or a decision, with where it came from. */
export interface ProjectMemoryItem {
  id: string;
  kind?: MemoryKind;
  text: string;
  tags?: string[];
  /** Where it came from: a call, a document, a person. */
  source?: string;
  at: Date | string | number;
}

export interface ProjectMemoryInput {
  kind: MemoryKind;
  text: string;
  tags: string[];
  source?: string;
}

export type ProjectResult = void | { error?: string } | undefined;

/** The Memory tab: the items and the callbacks that change them. */
export interface ProjectMemoryProps {
  items: readonly ProjectMemoryItem[];
  /** Add (`id` undefined) or edit. Return `{ error }` to keep the dialog open. Omit to make the list read-only. */
  onSave?: (input: ProjectMemoryInput, id?: string) => Promise<ProjectResult>;
  /** Forget one, after the confirm. Omit to hide it. */
  onForget?: (id: string) => Promise<ProjectResult>;
}

/** A tool the project can be connected to: GitHub, Slack, a calendar. */
export interface ProjectIntegration {
  id: string;
  name: string;
  description?: string;
  connected: boolean;
  /** A lucide-vue-next icon component. */
  icon?: Component;
}

/** The project header and settings fields. */
export interface ProjectDetails extends Omit<Project, "dueDate" | "members" | "owner"> {
  members?: EntityPerson[];
  startDate?: string | null;
  dueDate?: string | null;
  budget?: number | null;
  currency?: string;
}

export type ProjectPatch = Partial<Pick<ProjectDetails, "name" | "client" | "status" | "startDate" | "dueDate" | "budget">>;

export interface ProjectFile {
  id: string;
  name: string;
  /** Bytes. */
  size: number;
  uploadedBy?: string;
  uploadedAt: Date | string | number;
}

export interface NewIssueInput {
  title: string;
  type: IssueType;
  priority: IssuePriority;
}

export type ProjectTab = "overview" | "board" | "list" | "timeline" | "time" | "ai" | "files" | "memory" | "vault" | "github" | "activity" | "settings";

/** The GitHub tab: the connected repository and its feeds, and the picker that connects it. */
export type ProjectGithub = Omit<InstanceType<typeof NqGithubActivity>["$props"], "repo"> & {
  /** The connected repository, or null before one is picked. */
  repo: GithubRepo | null;
  /** Shows the repository picker above the feeds. */
  picker?: InstanceType<typeof NqRepositoryPicker>["$props"];
};

/** The Vault tab: this project's secrets, and optionally its environment variables. */
export type ProjectVault = InstanceType<typeof NqVault>["$props"] & { env?: InstanceType<typeof NqEnvList>["$props"] };

/** What the Settings tab adds to the details form: members, integrations and the danger zone. */
export interface ProjectSettingsExtras {
  /** Members and roles, as `NqMembersManager` takes them. */
  members?: InstanceType<typeof NqMembersManager>["$props"];
  integrations?: ProjectIntegration[];
  onToggleIntegration?: (id: string, connected: boolean) => Promise<ProjectResult>;
  /** Shows Archive in the danger zone, behind a confirm. */
  onArchive?: () => Promise<ProjectResult>;
  /** Shows Delete in the danger zone; the person types the project key to confirm. */
  onDelete?: () => Promise<ProjectResult>;
}

export type ProjectWorkflow = Omit<InstanceType<typeof NqStatusLabelManager>["$props"], "statuses" | "labels">;
