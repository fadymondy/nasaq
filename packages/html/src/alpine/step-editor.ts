// nqStepEditor: edit a workflow as a plain list. Steps you add, reorder, duplicate and nest, a form per step type,
// parameters you reference as {{name}} (secrets masked), problems listed before you can run, and a test run.
// The markup is the React StepEditor's (see the Blade component); the state lives here. There is no backend.
//
//   <div data-slot="step-editor" x-data="nqStepEditor({ types, steps, params, nestable: ['loop'], known: ['trigger.body'], testable: true })"
//        x-on:nq-step-test="$event.detail.waitUntil(fetch('/api/test', { method: 'POST', body: JSON.stringify($event.detail) }).then((r) => r.json()))">…</div>
//
// Events (bubbling, from the root):
//   "change"        { steps, params }               after every edit
//   "nq-step-test"  { steps, params, waitUntil(p) } resolve the promise with [{ stepId, status, durationMs?, output?, error? }] or { error }
// Paths: a step list is addressed by the indexes of the steps above it, `[]` for the top list, `[2]` for the children of step 3.

import {
  cloneStep,
  countSteps,
  flattenSteps,
  maskSecrets,
  newStep,
  stepSummary,
  stepUid,
  validateSteps,
  type StepField,
  type StepIssue,
  type StepNode,
  type StepParam,
  type StepType,
} from "./step-editor-logic";
import type { Magics, Register } from "./types";

export interface StepEditorOptions {
  types?: StepType[];
  categories?: { id: string; label: string }[];
  steps?: StepNode[];
  params?: StepParam[];
  nestable?: string[];
  known?: string[];
  testable?: boolean;
  disabled?: boolean;
}

interface TestResult {
  stepId: string;
  status: "success" | "error" | "skipped";
  durationMs?: number;
  output?: unknown;
  error?: string;
}

interface S extends Magics {
  $nq: { t(en: string, ar: string): string };
  root: HTMLElement;
  types: StepType[];
  categories: { id: string; label: string }[];
  steps: StepNode[];
  params: StepParam[];
  nestable: string[];
  known: string[];
  testable: boolean;
  disabled: boolean;
  closed: Record<string, boolean>;
  shown: Record<string, boolean>;
  running: boolean;
  results: TestResult[] | null;
  testError: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
}

const walk = (steps: StepNode[], path: number[]): StepNode[] => {
  let list = steps;
  for (const i of path) {
    const s = list[i];
    if (!s) return [];
    s.children ??= [];
    list = s.children;
  }
  return list;
};

export const stepEditor: Register = (Alpine) => {
  Alpine.data("nqStepEditor", (options: StepEditorOptions = {}) => ({
    root: null as unknown as HTMLElement,
    types: options.types ?? [],
    categories: options.categories ?? [],
    steps: JSON.parse(JSON.stringify(options.steps ?? [])) as StepNode[],
    params: JSON.parse(JSON.stringify(options.params ?? [])) as StepParam[],
    nestable: options.nestable ?? [],
    known: options.known ?? [],
    testable: Boolean(options.testable),
    disabled: Boolean(options.disabled),
    closed: {} as Record<string, boolean>,
    shown: {} as Record<string, boolean>,
    running: false,
    results: null as TestResult[] | null,
    testError: "",
    init(this: S) {
      this.root = this.$el;
    },
    emitChange(this: S) {
      this.root.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: { steps: JSON.parse(JSON.stringify(this.steps)), params: JSON.parse(JSON.stringify(this.params)) } }));
    },

    // ---- lookups
    typeOf(this: S, id: string) {
      return this.types.find((t) => t.id === id);
    },
    fieldsOf(this: S, step: StepNode): StepField[] {
      return this.typeOf(step.type)?.fields ?? [];
    },
    isNestable(this: S, step: StepNode) {
      return this.nestable.includes(step.type);
    },
    nameOf(this: S, step: StepNode) {
      return step.label || this.typeOf(step.type)?.label || this.$nq.t("New step", "خطوة جديدة");
    },
    summaryOf(this: S, step: StepNode) {
      return stepSummary(step, this.typeOf(step.type));
    },
    total(this: S) {
      return countSteps(this.steps);
    },
    listAt(this: S, path: number[]): StepNode[] {
      return walk(this.steps, path);
    },
    countAt(this: S, path: number[]) {
      return walk(this.steps, path).length;
    },
    groups(this: S) {
      const cats = this.categories.length > 0 ? this.categories : [{ id: "", label: "" }];
      const rest = this.types.filter((t) => !cats.some((c) => c.id === (t.category ?? "")));
      return [...cats.map((c) => ({ ...c, items: this.types.filter((t) => (t.category ?? "") === c.id) })), { id: "_", label: "", items: rest }].filter((g) => g.items.length > 0);
    },

    // ---- steps
    isOpen(this: S, step: StepNode) {
      return this.closed[step.id] !== true;
    },
    toggle(this: S, step: StepNode) {
      this.closed = { ...this.closed, [step.id]: this.isOpen(step) };
    },
    add(this: S, path: number[]) {
      if (this.disabled) return;
      walk(this.steps, path).push(newStep());
      this.emitChange();
    },
    pick(this: S, path: number[], index: number, typeId: string) {
      const step = walk(this.steps, path)[index];
      const type = this.typeOf(typeId);
      if (!step || !type) return;
      step.type = typeId;
      step.config = JSON.parse(JSON.stringify(type.defaults ?? {}));
      this.emitChange();
    },
    cancelPick(this: S, path: number[], index: number) {
      walk(this.steps, path).splice(index, 1);
      this.emitChange();
    },
    remove(this: S, path: number[], index: number) {
      if (this.disabled) return;
      walk(this.steps, path).splice(index, 1);
      this.emitChange();
    },
    duplicate(this: S, path: number[], index: number) {
      if (this.disabled) return;
      const list = walk(this.steps, path);
      const src = list[index];
      if (!src) return;
      list.splice(index + 1, 0, cloneStep(JSON.parse(JSON.stringify(src))));
      this.emitChange();
    },
    move(this: S, path: number[], index: number, by: number) {
      const list = walk(this.steps, path);
      const to = index + by;
      if (this.disabled || to < 0 || to >= list.length) return;
      const [item] = list.splice(index, 1);
      list.splice(to, 0, item as StepNode);
      this.emitChange();
    },
    onHandleKey(this: S, e: KeyboardEvent, path: number[], index: number) {
      const list = walk(this.steps, path);
      const to = e.key === "ArrowUp" ? index - 1 : e.key === "ArrowDown" ? index + 1 : e.key === "Home" ? 0 : e.key === "End" ? list.length - 1 : -1;
      if (to < 0 || to === index || to >= list.length) return;
      e.preventDefault();
      this.move(path, index, to - index);
      this.$nextTick(() => this.root.querySelector<HTMLElement>(`[data-handle="${path.join("-")}:${to}"]`)?.focus());
    },
    config(this: S, step: StepNode, name: string) {
      const v = step.config[name];
      return v === undefined || v === null ? "" : v;
    },
    setConfig(this: S, step: StepNode, name: string, value: unknown) {
      step.config[name] = value;
      this.emitChange();
    },

    // ---- issues
    issues(this: S): StepIssue[] {
      return validateSteps(this.steps, this.params, this.types, this.known);
    },
    issuesOf(this: S, id: string) {
      return this.issues().filter((i: StepIssue) => i.id === id);
    },
    stepIssueCount(this: S, step: StepNode) {
      return this.issuesOf(step.id).length;
    },
    isMissing(this: S, step: StepNode, field: string) {
      return this.issuesOf(step.id).some((i: StepIssue) => (i.code === "missing-field" ? i.field === field : false));
    },
    describe(this: S, i: StepIssue): string {
      const t = (en: string, ar: string) => this.$nq.t(en, ar);
      const step = flattenSteps(this.steps).find((s) => s.id === i.id);
      const label = step ? this.nameOf(step) : i.id;
      if (i.code === "missing-field") {
        const f = (step ? this.fieldsOf(step) : []).find((x: StepField) => x.name === i.field);
        const field = f?.label ?? i.field ?? "";
        return t(`${label}: "${field}" is required`, `${label}: الحقل "${field}" مطلوب`);
      }
      if (i.code === "unknown-placeholder") return t(`${label}: {{${i.token}}} is not defined`, `${label}: {{${i.token}}} غير معرَّف`);
      if (i.code === "no-type") return t(`${label}: choose a step type`, `${label}: اختر نوع الخطوة`);
      if (i.code === "bad-param-name") return t(`Parameter "${i.token}": use letters, digits, _ - and . and start with a letter`, `المعامل "${i.token}": استخدم حروفًا وأرقامًا و _ - . وابدأ بحرف`);
      return t(`Parameter "${i.token}" is defined twice`, `المعامل "${i.token}" معرَّف مرتين`);
    },
    problemsTitle(this: S) {
      const n = String(this.issues().length);
      return this.$nq.t(`${n} to fix before running`, `${n} للإصلاح قبل التشغيل`);
    },
    problemLines(this: S) {
      return this.issues()
        .slice(0, 6)
        .map((i: StepIssue) => this.describe(i));
    },

    // ---- parameters
    addParam(this: S) {
      if (this.disabled) return;
      this.params.push({ id: stepUid("param"), name: "", value: "" });
      this.emitChange();
    },
    removeParam(this: S, index: number) {
      if (this.disabled) return;
      this.params.splice(index, 1);
      this.emitChange();
    },
    moveParam(this: S, index: number, by: number) {
      const to = index + by;
      if (this.disabled || to < 0 || to >= this.params.length) return;
      const [item] = this.params.splice(index, 1);
      this.params.splice(to, 0, item as StepParam);
      this.emitChange();
    },
    paramName(this: S, p: StepParam, index: number) {
      return p.name || this.$nq.t(`Parameter ${index + 1}`, `المعامل ${index + 1}`);
    },
    paramIssue(this: S, p: StepParam) {
      const i = this.issuesOf(p.id)[0];
      return i ? this.describe(i) : "";
    },
    usage(this: S, name: string) {
      const text = JSON.stringify(
        this.steps.map(function walkStep(s: StepNode): unknown {
          return [s.config, s.children?.map(walkStep)];
        }),
      );
      return text.split(`{{${name}}}`).length - 1;
    },
    usageText(this: S, p: StepParam) {
      const n = this.usage(p.name);
      return n > 0 ? this.$nq.t(`Used in ${n} places`, `مستخدم في ${n} مواضع`) : this.$nq.t("Not used yet", "غير مستخدم بعد");
    },
    token(p: StepParam) {
      return "{{" + (p.name || "name") + "}}";
    },
    isShown(this: S, p: StepParam) {
      return this.shown[p.id] === true;
    },
    toggleShown(this: S, p: StepParam) {
      this.shown = { ...this.shown, [p.id]: !this.isShown(p) };
    },
    inputType(this: S, p: StepParam) {
      const shown = this.isShown(p);
      return p.secret ? (shown ? "text" : "password") : "text";
    },
    changed(this: S) {
      this.emitChange();
    },

    // ---- test run
    canTest(this: S) {
      return !this.disabled && !this.running && this.steps.length > 0 && this.issues().length === 0;
    },
    async runTest(this: S) {
      if (!this.canTest()) return;
      this.running = true;
      this.testError = "";
      this.results = null;
      const pending: unknown[] = [];
      const detail = { steps: JSON.parse(JSON.stringify(this.steps)), params: JSON.parse(JSON.stringify(this.params)), waitUntil: (p: unknown) => void pending.push(p) };
      this.root.dispatchEvent(new CustomEvent("nq-step-test", { bubbles: true, detail }));
      try {
        const res = (await Promise.all(pending))[0];
        if (Array.isArray(res)) this.results = res as TestResult[];
        else if (res && typeof res === "object" && (res as { error?: string }).error) this.testError = (res as { error: string }).error;
        else this.results = [];
      } catch (e) {
        this.testError = e instanceof Error && e.message ? e.message : this.$nq.t("The test could not run", "تعذّر تشغيل التجربة");
      } finally {
        this.running = false;
      }
    },
    resultLabel(this: S, r: TestResult) {
      const s = flattenSteps(this.steps).find((x) => x.id === r.stepId);
      return s ? this.nameOf(s) : r.stepId;
    },
    statusText(this: S, r: TestResult) {
      return r.status === "success" ? this.$nq.t("Succeeded", "نجحت") : r.status === "error" ? this.$nq.t("Failed", "فشلت") : this.$nq.t("Skipped", "تم تخطيها");
    },
    outputText(this: S, r: TestResult) {
      if (r.output === undefined) return "";
      return maskSecrets(typeof r.output === "string" ? r.output : JSON.stringify(r.output, null, 2), this.params);
    },
    errorText(this: S, r: TestResult) {
      return maskSecrets(r.error ?? "", this.params);
    },
  }));
};
