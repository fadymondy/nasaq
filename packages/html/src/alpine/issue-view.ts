// nqIssueView and nqIssueProperties: the behaviour of the React IssueView and IssueProperties. The page is rendered by the server;
// this adds the inline title, the description editor, the sub-issue add row and the property pickers, and tells the host through events.
//
//   <article data-slot="issue-view" x-data="nqIssueView({ title, description, plain, labels })"> … </article>
//   <dl data-slot="issue-properties" x-data="nqIssueProperties({ values, labelIds, estimate, due, labels })"> … </dl>
//
// Every change fires an event on the root with detail `{ …, wait(promise) }`. Resolve the promise to confirm, or resolve `{ error }` to
// show the message and put the field back (a rejection shows a generic one). Without a listener the change fails with that message.
// The properties sit inside the view, so one listener on the view root receives everything:
//   nq-issue-update     { patch: { statusId | priority | type | assigneeId | labelIds | estimateHours | dueDate | projectId | parentId | title | description }, wait }
//   nq-issue-add-sub    { title, wait }
//   nq-issue-open       { id }
//   nq-issue-back       {}

import { issueFormatHours, issueParseEstimate, issueTextToHtml } from "./issue-view-logic";
import type { Magics, Register } from "./types";

type Outcome = void | { error?: string } | undefined;
const NONE = "__none__";

interface Labels {
  failed?: string;
  titleEmpty?: string;
  estimateHint?: string;
}

/** Fire an update event from the root and wait for the host. Returns an error message, or "" on success. */
async function ask(root: HTMLElement, name: string, detail: Record<string, unknown>, failed: string): Promise<string> {
  let pending: Promise<Outcome> | undefined;
  root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } }));
  if (!pending) return failed;
  try {
    const result = await pending;
    return result && "error" in result && result.error ? result.error : "";
  } catch {
    return failed;
  }
}

const PATCH_KEY: Record<string, string> = { status: "statusId", priority: "priority", type: "type", assignee: "assigneeId", project: "projectId", parent: "parentId" };

interface PropsConfig {
  readOnly?: boolean;
  values: Record<string, string>;
  labelIds: string[];
  estimate: string;
  due: string;
  labels?: Labels;
}

interface PropsState extends Magics {
  root: HTMLElement;
  alive: boolean;
  v: Record<string, string>;
  saved: Record<string, string>;
  labelIds: string[];
  savedLabelIds: string[];
  estimate: string;
  savedEstimate: string;
  due: string;
  savedDue: string;
  busy: boolean;
  error: string;
  config: PropsConfig;
  save(patch: Record<string, unknown>): Promise<boolean>;
  change(key: string, value: string): Promise<void>;
}

interface ViewConfig {
  title: string;
  description: string;
  plain: string;
  labels?: Labels;
}

interface ViewState extends Magics {
  root: HTMLElement;
  config: ViewConfig;
  title: string;
  editingTitle: boolean;
  titleDraft: string;
  titleError: string;
  titleBusy: boolean;
  description: string;
  plain: string;
  editingDesc: boolean;
  descDraft: string;
  descError: string;
  descBusy: boolean;
  subTitle: string;
  subBusy: boolean;
  subError: string;
  failed(): string;
}

export const issueView: Register = (Alpine) => {
  Alpine.data("nqIssueProperties", (config: PropsConfig) => ({
    config,
    root: null as unknown as HTMLElement,
    alive: true,
    v: { ...config.values } as Record<string, string>,
    saved: { ...config.values } as Record<string, string>,
    labelIds: [...(config.labelIds ?? [])],
    savedLabelIds: [...(config.labelIds ?? [])],
    estimate: config.estimate ?? "",
    savedEstimate: config.estimate ?? "",
    due: config.due ?? "",
    savedDue: config.due ?? "",
    busy: false,
    error: "",
    init(this: PropsState) {
      this.root = this.$el;
      for (const key of Object.keys(PATCH_KEY)) this.$watch(`v.${key}`, (value: string) => void this.change(key, value));
    },
    destroy(this: PropsState) {
      this.alive = false;
    },
    get locked() {
      const self = this as unknown as PropsState;
      return self.busy || Boolean(self.config.readOnly);
    },
    has(this: PropsState, id: string) {
      return this.labelIds.includes(id);
    },
    async change(this: PropsState, key: string, value: string) {
      if (value === this.saved[key] || value == null || value === "") return;
      const previous = this.saved[key];
      const ok = await this.save({ [PATCH_KEY[key] as string]: value === NONE ? null : value });
      if (ok) this.saved[key] = value;
      else this.v[key] = previous as string;
    },
    async toggleLabel(this: PropsState, id: string) {
      const next = this.labelIds.includes(id) ? this.labelIds.filter((x) => x !== id) : [...this.labelIds, id];
      this.labelIds = next;
      if (await this.save({ labelIds: next })) this.savedLabelIds = next;
      else this.labelIds = this.savedLabelIds;
    },
    async commitEstimate(this: PropsState) {
      const text = this.estimate;
      const parsed = issueParseEstimate(text);
      if (text.trim() !== "" && parsed === null) {
        this.error = this.config.labels?.estimateHint ?? "";
        return;
      }
      const shown = parsed === null ? "" : issueFormatHours(parsed);
      if (shown === this.savedEstimate) {
        this.estimate = shown;
        return;
      }
      if (await this.save({ estimateHours: parsed })) {
        this.savedEstimate = shown;
        this.estimate = shown;
      } else this.estimate = this.savedEstimate;
    },
    revertEstimate(this: PropsState) {
      this.estimate = this.savedEstimate;
    },
    async commitDue(this: PropsState) {
      if (this.due === this.savedDue) return;
      if (await this.save({ dueDate: this.due || null })) this.savedDue = this.due;
      else this.due = this.savedDue;
    },
    revertDue(this: PropsState) {
      this.due = this.savedDue;
    },
    async save(this: PropsState, patch: Record<string, unknown>) {
      this.busy = true;
      this.error = "";
      const message = await ask(this.root, "nq-issue-update", { patch }, this.config.labels?.failed ?? "That did not work. Try again.");
      if (!this.alive) return false;
      this.busy = false;
      this.error = message;
      return message === "";
    },
  }));

  Alpine.data("nqIssueView", (config: ViewConfig) => ({
    config,
    root: null as unknown as HTMLElement,
    title: config.title,
    editingTitle: false,
    titleDraft: config.title,
    titleError: "",
    titleBusy: false,
    description: config.description,
    plain: config.plain,
    editingDesc: false,
    descDraft: config.description,
    descError: "",
    descBusy: false,
    subTitle: "",
    subBusy: false,
    subError: "",
    init(this: ViewState) {
      this.root = this.$el;
    },
    failed(this: ViewState) {
      return this.config.labels?.failed ?? "That did not work. Try again.";
    },
    startTitle(this: ViewState) {
      this.titleDraft = this.title;
      this.titleError = "";
      this.editingTitle = true;
      this.$nextTick(() => (this.$refs.titleInput as HTMLInputElement | undefined)?.select());
    },
    cancelTitle(this: ViewState) {
      this.titleDraft = this.title;
      this.titleError = "";
      this.editingTitle = false;
    },
    async commitTitle(this: ViewState) {
      if (!this.editingTitle || this.titleBusy) return;
      const next = this.titleDraft.trim();
      if (next === this.title) {
        this.editingTitle = false;
        return;
      }
      if (!next) {
        this.titleError = this.config.labels?.titleEmpty ?? "A title is required";
        return;
      }
      this.titleBusy = true;
      const message = await ask(this.root, "nq-issue-update", { patch: { title: next } }, this.failed());
      this.titleBusy = false;
      this.titleError = message;
      if (!message) {
        this.title = next;
        this.editingTitle = false;
      }
    },
    /** Plain-text mode (no editor loaded) edits the text; with an editor it edits the HTML. */
    startDesc(this: ViewState, rich: boolean) {
      this.descDraft = rich ? this.description : this.plain;
      this.descError = "";
      this.editingDesc = true;
    },
    cancelDesc(this: ViewState) {
      this.editingDesc = false;
      this.descError = "";
    },
    async saveDesc(this: ViewState, rich: boolean) {
      const html = rich ? this.descDraft : issueTextToHtml(this.descDraft);
      this.descBusy = true;
      const message = await ask(this.root, "nq-issue-update", { patch: { description: html } }, this.failed());
      this.descBusy = false;
      this.descError = message;
      if (!message) {
        this.description = html;
        this.plain = rich ? this.plain : this.descDraft.trim();
        this.editingDesc = false;
      }
    },
    async addSub(this: ViewState) {
      const next = this.subTitle.trim();
      if (!next || this.subBusy) return;
      this.subBusy = true;
      const message = await ask(this.root, "nq-issue-add-sub", { title: next }, this.failed());
      this.subBusy = false;
      this.subError = message;
      if (!message) this.subTitle = "";
    },
    openIssue(this: ViewState, id: string) {
      this.root.dispatchEvent(new CustomEvent("nq-issue-open", { bubbles: true, detail: { id } }));
    },
    back(this: ViewState) {
      this.root.dispatchEvent(new CustomEvent("nq-issue-back", { bubbles: true }));
    },
    copy(text: string) {
      void navigator.clipboard?.writeText(text);
    },
  }));
};
