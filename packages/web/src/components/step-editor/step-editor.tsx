"use client";

import { Eye, EyeOff, FlaskConical, ListTree } from "lucide-react";
import { type ComponentProps, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { CodeBlock } from "../code-block";
import { Field, FieldDescription, FieldLabel, Input } from "../field";
import { Repeater } from "../repeater";
import { EmptyState } from "../states";
import { Switch } from "../switch";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import { type WorkflowCanvasLabels, useCanvasLabels } from "../workflow-canvas/canvas-labels";
import { WorkflowFieldEditor } from "../workflow-canvas/field-editor";
import { WorkflowNodePicker } from "../workflow-canvas/node-picker";
import { StatusGlyph } from "../workflow-canvas/status-glyph";
import type { WorkflowStepType } from "../workflow-canvas/workflow-model";
import {
  type StepIssue,
  type StepNode,
  type StepParam,
  type StepTestResult,
  countSteps,
  maskSecrets,
  newStep,
  stepSummary,
  stepUid,
  validateSteps,
} from "./step-model";

const STRINGS = {
  en: {
    steps: "Steps",
    params: "Parameters",
    test: "Test run",
    newStep: "New step",
    addStep: "Add step",
    addChild: "Add a step inside",
    stepList: "Steps",
    innerList: (name: string) => `Steps inside ${name}`,
    innerEmpty: "Nothing inside yet.",
    empty: "No steps yet.",
    name: "Name",
    nameHelp: "Shown in the list. Leave empty to use the step's own name.",
    continueOn: "Continue if this step fails",
    continueHelp: "The next step still runs. The failure is recorded.",
    noFields: "This step has no settings.",
    unknownType: "Unknown step",
    chooseType: "Choose a step type",
    cancelPick: "Cancel",
    required: "Required",
    issueMissing: (label: string, field: string) => `${label}: "${field}" is required`,
    issuePlaceholder: (label: string, name: string) => `${label}: {{${name}}} is not defined`,
    issueNoType: (label: string) => `${label}: choose a step type`,
    issueParamName: (name: string) => `Parameter "${name}": use letters, digits, _ - and . and start with a letter`,
    issueParamDup: (name: string) => `Parameter "${name}" is defined twice`,
    problems: (n: string) => `${n} to fix before running`,
    paramsIntro: "Use a parameter in any text field as {{name}}. Secret values are masked and hidden from test output.",
    paramName: "Name",
    paramValue: "Value",
    paramSecret: "Secret",
    paramAdd: "Add parameter",
    paramList: "Parameters",
    paramEmpty: "No parameters yet.",
    paramRow: (n: string) => `Parameter ${n}`,
    show: "Show value",
    hide: "Hide value",
    usedIn: (n: string) => `Used in ${n} places`,
    unused: "Not used yet",
    testIntro: "Run the steps in order with these parameters. Nothing here is saved.",
    testRun: "Run test",
    testing: "Running",
    testBlocked: "Fix the problems first",
    testNone: "No test yet.",
    testFailed: "The test could not run",
    status: { success: "Succeeded", error: "Failed", skipped: "Skipped" },
    output: "Output",
    error: "Error",
    stepCount: (n: string) => `${n} steps`,
    testAria: "Test run results",
  },
  ar: {
    steps: "الخطوات",
    params: "المعاملات",
    test: "تشغيل تجريبي",
    newStep: "خطوة جديدة",
    addStep: "إضافة خطوة",
    addChild: "أضف خطوة بالداخل",
    stepList: "الخطوات",
    innerList: (name: string) => `الخطوات داخل ${name}`,
    innerEmpty: "لا شيء بالداخل بعد.",
    empty: "لا خطوات بعد.",
    name: "الاسم",
    nameHelp: "يظهر في القائمة. اتركه فارغًا لاستخدام اسم الخطوة نفسها.",
    continueOn: "المتابعة إذا فشلت هذه الخطوة",
    continueHelp: "تعمل الخطوة التالية رغم ذلك، ويُسجَّل الفشل.",
    noFields: "ليس لهذه الخطوة إعدادات.",
    unknownType: "خطوة غير معروفة",
    chooseType: "اختر نوع الخطوة",
    cancelPick: "إلغاء",
    required: "مطلوب",
    issueMissing: (label: string, field: string) => `${label}: الحقل "${field}" مطلوب`,
    issuePlaceholder: (label: string, name: string) => `${label}: {{${name}}} غير معرَّف`,
    issueNoType: (label: string) => `${label}: اختر نوع الخطوة`,
    issueParamName: (name: string) => `المعامل "${name}": استخدم حروفًا وأرقامًا و _ - . وابدأ بحرف`,
    issueParamDup: (name: string) => `المعامل "${name}" معرَّف مرتين`,
    problems: (n: string) => `${n} للإصلاح قبل التشغيل`,
    paramsIntro: "استخدم المعامل في أي حقل نصي بالصيغة {{الاسم}}. القيم السرية مخفية وتُحجب من ناتج التجربة.",
    paramName: "الاسم",
    paramValue: "القيمة",
    paramSecret: "سري",
    paramAdd: "إضافة معامل",
    paramList: "المعاملات",
    paramEmpty: "لا معاملات بعد.",
    paramRow: (n: string) => `المعامل ${n}`,
    show: "إظهار القيمة",
    hide: "إخفاء القيمة",
    usedIn: (n: string) => `مستخدم في ${n} مواضع`,
    unused: "غير مستخدم بعد",
    testIntro: "شغّل الخطوات بالترتيب بهذه المعاملات. لا يُحفظ شيء هنا.",
    testRun: "شغّل التجربة",
    testing: "جارٍ التشغيل",
    testBlocked: "أصلح المشكلات أولًا",
    testNone: "لا تجربة بعد.",
    testFailed: "تعذّر تشغيل التجربة",
    status: { success: "نجحت", error: "فشلت", skipped: "تم تخطيها" },
    output: "المخرج",
    error: "الخطأ",
    stepCount: (n: string) => `${n} خطوات`,
    testAria: "نتائج التشغيل التجريبي",
  },
};

export type StepEditorLabels = (typeof STRINGS)["en"];

interface Ctx {
  types: Map<string, WorkflowStepType>;
  pickable: WorkflowStepType[];
  categories?: { id: string; label: string }[];
  nestable: ReadonlySet<string>;
  issues: StepIssue[];
  t: StepEditorLabels;
  c: WorkflowCanvasLabels;
  disabled?: boolean;
  onEditStep?: () => void;
}

/* ------------------------------------------------------------------ step list */

function StepList({ steps, onChange, ctx, parentName }: { steps: StepNode[]; onChange: (next: StepNode[]) => void; ctx: Ctx; parentName?: string }) {
  const { t, c, types, issues } = ctx;
  const nameOf = (s: StepNode) => s.label || types.get(s.type)?.label || t.newStep;
  return (
    <Repeater<StepNode>
      value={steps}
      onValueChange={onChange}
      createItem={() => newStep()}
      duplicable
      disabled={ctx.disabled}
      label={parentName ? t.innerList(parentName) : t.stepList}
      addLabel={parentName ? t.addChild : t.addStep}
      labels={{ empty: parentName ? t.innerEmpty : t.empty, list: parentName ? t.innerList(parentName) : t.stepList, add: parentName ? t.addChild : t.addStep, row: () => t.newStep }}
      empty={<p className="text-body-sm text-muted-foreground">{parentName ? t.innerEmpty : t.empty}</p>}
      cloneItem={function clone(s: StepNode): StepNode {
        return { ...structuredClone({ ...s, children: undefined }), id: stepUid(), children: s.children?.map(clone) };
      }}
      rowTitle={(s) => nameOf(s)}
      rowLabel={(s) => nameOf(s)}
      rowSummary={(s) => stepSummary(s, types.get(s.type))}
      rowMeta={(s) => {
        const n = issues.filter((i) => i.id === s.id).length;
        return (
          <>
            {s.continueOnFailure ? <Badge variant="outline">{t.continueOn}</Badge> : null}
            {n > 0 ? <Badge variant="danger">{n}</Badge> : null}
          </>
        );
      }}
      renderRow={(s, row) => {
        const type = types.get(s.type);
        const set = (patch: Partial<StepNode>) => row.update((cur) => ({ ...cur, ...patch }));
        if (!s.type) {
          return (
            <div className="overflow-hidden rounded-control border border-border">
              <WorkflowNodePicker
                types={ctx.pickable}
                categories={ctx.categories}
                afterName={parentName}
                onPick={(picked) => row.update((cur) => ({ ...cur, type: picked.id, config: { ...(picked.defaults ?? {}) } }))}
                onClose={() => onChange(steps.filter((x) => x.id !== s.id))}
                className="max-h-96"
              />
            </div>
          );
        }
        const missing = new Set(issues.filter((i) => i.id === s.id && i.code === "missing-field").map((i) => i.field as string));
        return (
          <div className="flex flex-col gap-4" data-step-id={s.id}>
            {type ? (
              <>
                <Field>
                  <FieldLabel>{t.name}</FieldLabel>
                  <Input value={s.label ?? ""} placeholder={type.label} onChange={(e) => set({ label: e.target.value })} />
                  <FieldDescription>{t.nameHelp}</FieldDescription>
                </Field>
                {(type.fields?.length ?? 0) === 0 ? <p className="text-body-sm text-muted-foreground">{t.noFields}</p> : null}
                {(type.fields ?? []).map((f) => (
                  <WorkflowFieldEditor key={f.name} def={f} value={s.config[f.name]} onChange={(v) => set({ config: { ...s.config, [f.name]: v } })} disabled={ctx.disabled} invalid={missing.has(f.name)} requiredLabel={t.required} />
                ))}
              </>
            ) : (
              <p className="text-body-sm text-nq-danger-text">{t.unknownType}</p>
            )}
            <Field className="flex-row items-center justify-between gap-3">
              <div className="min-w-0">
                <FieldLabel>{t.continueOn}</FieldLabel>
                <FieldDescription>{t.continueHelp}</FieldDescription>
              </div>
              <Switch checked={Boolean(s.continueOnFailure)} onCheckedChange={(v) => set({ continueOnFailure: v })} disabled={ctx.disabled} aria-label={t.continueOn} />
            </Field>
            {ctx.nestable.has(s.type) ? (
              <div className="rounded-control border border-dashed border-border p-3">
                <StepList steps={s.children ?? []} onChange={(children) => set({ children })} ctx={ctx} parentName={nameOf(s)} />
              </div>
            ) : null}
          </div>
        );
      }}
    />
  );
}

/* ------------------------------------------------------------------ parameters */

function ParamRow({ param, onChange, t, disabled, issue, used }: { param: StepParam; onChange: (p: StepParam) => void; t: StepEditorLabels; disabled?: boolean; issue?: string; used: number }) {
  const [shown, setShown] = useState(false);
  const masked = param.secret && !shown;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field invalid={Boolean(issue)}>
        <FieldLabel>{t.paramName}</FieldLabel>
        <Input ltr value={param.name} onChange={(e) => onChange({ ...param, name: e.target.value })} placeholder="api_base" spellCheck={false} disabled={disabled} />
        {issue ? (
          <p role="alert" className="text-caption text-nq-danger-text">
            {issue}
          </p>
        ) : (
          <FieldDescription>
            <bdi dir="ltr" className="font-mono">{`{{${param.name || "name"}}}`}</bdi> · {used > 0 ? t.usedIn(String(used)) : t.unused}
          </FieldDescription>
        )}
      </Field>
      <Field>
        <FieldLabel>{t.paramValue}</FieldLabel>
        <div className="flex items-center gap-1">
          <Input ltr type={masked ? "password" : "text"} autoComplete="off" value={param.value} onChange={(e) => onChange({ ...param, value: e.target.value })} spellCheck={false} disabled={disabled} className="flex-1" />
          {param.secret ? (
            <Button variant="ghost" size="icon-sm" type="button" aria-pressed={shown} aria-label={shown ? t.hide : t.show} title={shown ? t.hide : t.show} onClick={() => setShown((v) => !v)}>
              {shown ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            </Button>
          ) : null}
        </div>
      </Field>
      <Field className="flex-row items-center gap-3 sm:col-span-2">
        <Switch checked={Boolean(param.secret)} onCheckedChange={(v) => onChange({ ...param, secret: v })} disabled={disabled} aria-label={t.paramSecret} />
        <FieldLabel>{t.paramSecret}</FieldLabel>
      </Field>
    </div>
  );
}

/* ------------------------------------------------------------------ editor */

export interface StepEditorProps extends Omit<ComponentProps<"div">, "children" | "onChange"> {
  /** The step types on offer, including triggers when a trigger is a step. */
  types: WorkflowStepType[];
  categories?: { id: string; label: string }[];
  /** The steps. Controlled. */
  steps?: StepNode[];
  defaultSteps?: StepNode[];
  onStepsChange?: (steps: StepNode[]) => void;
  /** Parameters and variables. Controlled. */
  params?: StepParam[];
  defaultParams?: StepParam[];
  onParamsChange?: (params: StepParam[]) => void;
  /** Ids of step types that can hold steps inside them (a loop, a branch). */
  nestableTypes?: readonly string[];
  /** Placeholder names that are always available without a parameter (such as `trigger.body`). */
  knownVariables?: readonly string[];
  /**
   * Runs the steps with the parameters and returns what each did, or `{ error }` when the test could not start.
   * Omit it to hide the Test run tab.
   */
  onTestRun?: (steps: StepNode[], params: StepParam[]) => Promise<StepTestResult[] | { error: string }>;
  disabled?: boolean;
  labels?: Partial<StepEditorLabels>;
  canvasLabels?: Partial<WorkflowCanvasLabels>;
}

/**
 * Edits a workflow as a plain list: steps you can reorder, duplicate and nest, each with a form generated from its
 * step type, a continue-on-failure switch, parameters you reference as {{name}} (secrets masked), problems listed
 * before you can run, and a test run that shows each step's result. It has no backend: you keep the steps and
 * parameters, and `onTestRun` does the running.
 */
export function StepEditor({ types, categories, steps: stepsProp, defaultSteps = [], onStepsChange, params: paramsProp, defaultParams = [], onParamsChange, nestableTypes = [], knownVariables = [], onTestRun, disabled, labels, canvasLabels, className, ...rest }: StepEditorProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels } as StepEditorLabels;
  const { t: c } = useCanvasLabels(canvasLabels);
  const [stepsState, setStepsState] = useState(defaultSteps);
  const [paramsState, setParamsState] = useState(defaultParams);
  const steps = stepsProp ?? stepsState;
  const params = paramsProp ?? paramsState;
  const setSteps = (next: StepNode[]) => {
    if (stepsProp === undefined) setStepsState(next);
    onStepsChange?.(next);
  };
  const setParams = (next: StepParam[]) => {
    if (paramsProp === undefined) setParamsState(next);
    onParamsChange?.(next);
  };

  const typeMap = useMemo(() => new Map(types.map((s) => [s.id, s])), [types]);
  const issues = useMemo(() => validateSteps(steps, params, types, knownVariables), [steps, params, types, knownVariables]);
  const usage = useMemo(() => {
    const text = JSON.stringify(steps.map(function walk(s): unknown { return [s.config, s.children?.map(walk)]; }));
    return (name: string) => text.split(`{{${name}}}`).length - 1;
  }, [steps]);
  const [tab, setTab] = useState("steps");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<StepTestResult[] | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const ctx: Ctx = { types: typeMap, pickable: types, categories, nestable: new Set(nestableTypes), issues, t, c, disabled };
  const labelOfStep = (id: string) => {
    const flat = (list: StepNode[]): StepNode[] => list.flatMap((s) => [s, ...flat(s.children ?? [])]);
    const s = flat(steps).find((x) => x.id === id);
    return s ? s.label || typeMap.get(s.type)?.label || t.newStep : id;
  };
  const describe = (i: StepIssue): string => {
    const label = labelOfStep(i.id);
    const field = (name?: string) => typeMap.get(flatType(steps, i.id))?.fields?.find((f) => f.name === name)?.label ?? name ?? "";
    switch (i.code) {
      case "missing-field":
        return t.issueMissing(label, field(i.field));
      case "unknown-placeholder":
        return t.issuePlaceholder(label, i.token ?? "");
      case "no-type":
        return t.issueNoType(label);
      case "bad-param-name":
        return t.issueParamName(i.token ?? "");
      default:
        return t.issueParamDup(i.token ?? "");
    }
  };

  async function runTest() {
    if (!onTestRun) return;
    setRunning(true);
    setTestError(null);
    setResults(null);
    const res = await onTestRun(steps, params);
    setRunning(false);
    if (Array.isArray(res)) setResults(res);
    else setTestError(res.error);
  }

  const problemCount = String(issues.length);
  return (
    <div data-slot="step-editor" className={cn("flex min-w-0 flex-col gap-4", className)} {...rest}>
      {issues.length > 0 ? (
        <Alert tone="warning" title={t.problems(problemCount)}>
          <ul className="mt-1 list-disc ps-5 text-body-sm">
            {issues.slice(0, 6).map((i, n) => (
              <li key={`${i.id}-${i.code}-${i.field ?? i.token ?? ""}-${n}`}>{describe(i)}</li>
            ))}
            {issues.length > 6 ? <li>…</li> : null}
          </ul>
        </Alert>
      ) : null}
      <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
        <TabsList variant="underline">
          <TabsTab value="steps">
            {t.steps} <span className="ms-1 text-caption text-muted-foreground tabular-nums">{countSteps(steps)}</span>
          </TabsTab>
          <TabsTab value="params">
            {t.params} <span className="ms-1 text-caption text-muted-foreground tabular-nums">{params.length}</span>
          </TabsTab>
          {onTestRun ? <TabsTab value="test">{t.test}</TabsTab> : null}
        </TabsList>
        <TabsPanel value="steps">
          <StepList steps={steps} onChange={setSteps} ctx={ctx} />
        </TabsPanel>
        <TabsPanel value="params">
          <div className="flex flex-col gap-3">
            <p className="text-body-sm text-muted-foreground">{t.paramsIntro}</p>
            <Repeater<StepParam>
              value={params}
              onValueChange={setParams}
              createItem={() => ({ id: stepUid("param"), name: "", value: "" })}
              disabled={disabled}
              label={t.paramList}
              addLabel={t.paramAdd}
              reorderable
              rowTitle={(p, i) => (p.name ? <bdi dir="ltr" className="font-mono">{p.name}</bdi> : t.paramRow(String(i + 1)))}
              rowLabel={(p, i) => p.name || t.paramRow(String(i + 1))}
              rowSummary={(p) => (p.secret ? "••••••" : p.value)}
              labels={{ list: t.paramList, add: t.paramAdd, empty: t.paramEmpty, row: (n: string) => t.paramRow(n) }}
              empty={<p className="text-body-sm text-muted-foreground">{t.paramEmpty}</p>}
              renderRow={(p, row) => (
                <ParamRow
                  param={p}
                  onChange={(next) => row.update(next)}
                  t={t}
                  disabled={disabled}
                  used={usage(p.name)}
                  issue={issues.filter((i) => i.id === p.id).map(describe)[0]}
                />
              )}
            />
          </div>
        </TabsPanel>
        {onTestRun ? (
          <TabsPanel value="test">
            <div className="flex flex-col gap-3">
              <p className="text-body-sm text-muted-foreground">{t.testIntro}</p>
              <div className="flex items-center gap-3">
                <Button onClick={() => void runTest()} loading={running} disabled={disabled || issues.length > 0 || steps.length === 0}>
                  <FlaskConical aria-hidden />
                  {running ? t.testing : t.testRun}
                </Button>
                {issues.length > 0 ? <span className="text-body-sm text-muted-foreground">{t.testBlocked}</span> : null}
              </div>
              {testError ? (
                <p role="alert" className="rounded-control bg-nq-danger-soft px-3 py-2 text-body-sm text-nq-danger-text">
                  {t.testFailed}: {testError}
                </p>
              ) : null}
              {results ? (
                <ol aria-label={t.testAria} className="divide-y divide-border rounded-control border border-border">
                  {results.map((r) => (
                    <li key={r.stepId} data-result={r.stepId} className="flex flex-col gap-2 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusGlyph status={r.status} label={t.status[r.status]} className="size-5" />
                        <span className="text-label text-foreground">{labelOfStep(r.stepId)}</span>
                        <Badge variant={r.status === "error" ? "danger" : r.status === "success" ? "success" : "neutral"}>{t.status[r.status]}</Badge>
                        {r.durationMs !== undefined ? (
                          <span dir="ltr" className="ms-auto text-caption text-muted-foreground tabular-nums">
                            {r.durationMs} ms
                          </span>
                        ) : null}
                      </div>
                      {r.error ? (
                        <p role="alert" dir="auto" className="text-body-sm text-nq-danger-text">
                          {maskSecrets(r.error, params)}
                        </p>
                      ) : null}
                      {r.output !== undefined ? <CodeBlock code={maskSecrets(typeof r.output === "string" ? r.output : JSON.stringify(r.output, null, 2), params)} language="json" label={t.output} filename={t.output} preClassName="max-h-48" /> : null}
                    </li>
                  ))}
                </ol>
              ) : !running && !testError ? (
                <EmptyState icon={ListTree} title={t.testNone} />
              ) : null}
            </div>
          </TabsPanel>
        ) : null}
      </Tabs>
    </div>
  );
}

function flatType(steps: StepNode[], id: string): string {
  for (const s of steps) {
    if (s.id === id) return s.type;
    const inner = flatType(s.children ?? [], id);
    if (inner) return inner;
  }
  return "";
}

