"use client";

import { Plus, Trash2, Zap } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { Field, FieldDescription, FieldLabel, Input } from "../field";
import { Repeater } from "../repeater";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Toggle, ToggleGroup } from "../toggle-group";
import { WorkflowFieldEditor } from "../workflow-canvas/field-editor";
import {
  type RuleAction,
  type RuleActionType,
  type RuleCondition,
  type RuleDefinition,
  type RuleEvent,
  type RuleField,
  type RuleGroup,
  type RuleIssue,
  type RuleJoin,
  type RuleNode,
  type RuleOperator,
  OPERATORS,
  UNARY,
  addChild,
  countConditions,
  describeRule,
  emptyRule,
  newCondition,
  newGroup,
  removeNode,
  retarget,
  ruleUid,
  updateNode,
  validateRule,
} from "./rule-model";

const STRINGS = {
  en: {
    summary: "This rule",
    when: "When",
    whenHelp: "The event that starts the rule.",
    chooseEvent: "Choose an event",
    ifTitle: "If",
    ifHelp: "Only continue when these conditions hold. Leave empty to always continue.",
    thenTitle: "Then",
    thenHelp: "What to do, in order.",
    matchAll: "All of these",
    matchAny: "Any of these",
    match: "Match",
    addCondition: "Add condition",
    addGroup: "Add group",
    removeGroup: "Remove group",
    removeCondition: "Remove condition",
    groupLabel: (join: string) => `Group: ${join}`,
    noConditions: "No conditions: the rule always continues.",
    field: "Field",
    operator: "Operator",
    value: "Value",
    chooseField: "Choose a field",
    yes: "True",
    no: "False",
    actions: "Actions",
    addAction: "Add action",
    actionType: "Action",
    chooseAction: "Choose an action",
    actionRow: (n: string) => `Action ${n}`,
    actionsEmpty: "No actions yet.",
    problems: (n: string) => `${n} to fix`,
    issueEvent: "Choose the event that starts the rule",
    issueActions: "Add at least one action",
    issueField: "A condition has no field",
    issueValue: "A condition has no value",
    issueActionField: (field: string) => `An action is missing "${field}"`,
    required: "Required",
    sentence: {
      when: (e: string) => `When ${e}`,
      ifWord: "if",
      then: "then",
      noConditions: "always",
      and: "and",
      or: "or",
    },
    ops: { is: "is", isNot: "is not", contains: "contains", startsWith: "starts with", isEmpty: "is empty", isNotEmpty: "is not empty", gt: "is greater than", gte: "is at least", lt: "is less than", lte: "is at most" } as Record<RuleOperator, string>,
  },
  ar: {
    summary: "هذه القاعدة",
    when: "عندما",
    whenHelp: "الحدث الذي يبدأ القاعدة.",
    chooseEvent: "اختر حدثًا",
    ifTitle: "إذا",
    ifHelp: "تابع فقط عندما تتحقق هذه الشروط. اتركها فارغة للمتابعة دائمًا.",
    thenTitle: "إذن",
    thenHelp: "ما يجب فعله، بالترتيب.",
    matchAll: "كل هذه",
    matchAny: "أي من هذه",
    match: "المطابقة",
    addCondition: "إضافة شرط",
    addGroup: "إضافة مجموعة",
    removeGroup: "حذف المجموعة",
    removeCondition: "حذف الشرط",
    groupLabel: (join: string) => `مجموعة: ${join}`,
    noConditions: "لا شروط: تتابع القاعدة دائمًا.",
    field: "الحقل",
    operator: "المعامل",
    value: "القيمة",
    chooseField: "اختر حقلًا",
    yes: "صحيح",
    no: "خطأ",
    actions: "الإجراءات",
    addAction: "إضافة إجراء",
    actionType: "الإجراء",
    chooseAction: "اختر إجراءً",
    actionRow: (n: string) => `الإجراء ${n}`,
    actionsEmpty: "لا إجراءات بعد.",
    problems: (n: string) => `${n} للإصلاح`,
    issueEvent: "اختر الحدث الذي يبدأ القاعدة",
    issueActions: "أضف إجراءً واحدًا على الأقل",
    issueField: "شرط بلا حقل",
    issueValue: "شرط بلا قيمة",
    issueActionField: (field: string) => `إجراء ينقصه "${field}"`,
    required: "مطلوب",
    sentence: {
      when: (e: string) => `عندما ${e}`,
      ifWord: "وإذا",
      then: "فـ",
      noConditions: "دائمًا",
      and: "و",
      or: "أو",
    },
    ops: { is: "يساوي", isNot: "لا يساوي", contains: "يحتوي", startsWith: "يبدأ بـ", isEmpty: "فارغ", isNotEmpty: "غير فارغ", gt: "أكبر من", gte: "لا يقل عن", lt: "أصغر من", lte: "لا يزيد عن" } as Record<RuleOperator, string>,
  },
};

export type RuleBuilderLabels = Partial<(typeof STRINGS)["en"]>;

interface Ctx {
  fields: RuleField[];
  t: (typeof STRINGS)["en"];
  maxDepth: number;
  disabled?: boolean;
  issues: RuleIssue[];
}

/* ------------------------------------------------------------------ conditions */

function ConditionRow({ cond, ctx, onChange, onRemove }: { cond: RuleCondition; ctx: Ctx; onChange: (c: RuleCondition) => void; onRemove: () => void }) {
  const { t, fields } = ctx;
  const field = fields.find((f) => f.id === cond.field);
  const kind = field?.kind ?? "text";
  const ops = OPERATORS[kind];
  const bad = ctx.issues.filter((i) => i.id === cond.id).map((i) => i.code);
  const unary = UNARY.includes(cond.op);
  const boolItems = [
    { value: "true", label: t.yes },
    { value: "false", label: t.no },
  ];
  return (
    <li data-condition={cond.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)_minmax(0,1fr)_auto]">
      <Select value={cond.field || null} onValueChange={(v) => onChange(retarget(cond, fields.find((f) => f.id === v)))} items={fields.map((f) => ({ value: f.id, label: f.label }))} disabled={ctx.disabled}>
        <SelectTrigger aria-label={t.field} data-invalid={bad.includes("no-field") || undefined}>
          <SelectValue placeholder={t.chooseField} />
        </SelectTrigger>
        <SelectContent>
          {fields.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="ghost" size="icon-sm" className="sm:order-last" aria-label={t.removeCondition} title={t.removeCondition} onClick={onRemove} disabled={ctx.disabled}>
        <Trash2 aria-hidden />
      </Button>
      <Select value={cond.op} onValueChange={(v) => onChange({ ...cond, op: v as RuleOperator })} items={ops.map((o) => ({ value: o, label: t.ops[o] }))} disabled={ctx.disabled || !field}>
        <SelectTrigger aria-label={t.operator} className="col-span-2 sm:col-span-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ops.map((o) => (
            <SelectItem key={o} value={o}>
              {t.ops[o]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="col-span-2 min-w-0 sm:col-span-1">
        {unary ? null : kind === "select" || kind === "boolean" ? (
          <Select value={cond.value || null} onValueChange={(v) => onChange({ ...cond, value: v as string })} items={kind === "boolean" ? boolItems : (field?.options ?? [])} disabled={ctx.disabled}>
            <SelectTrigger aria-label={t.value} data-invalid={bad.includes("no-value") || undefined}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(kind === "boolean" ? boolItems : (field?.options ?? [])).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            aria-label={t.value}
            aria-invalid={bad.includes("no-value") || undefined}
            type={kind === "number" ? "number" : "text"}
            inputMode={kind === "number" ? "decimal" : undefined}
            ltr={kind === "number"}
            value={cond.value}
            onChange={(e) => onChange({ ...cond, value: e.target.value })}
            disabled={ctx.disabled}
          />
        )}
      </div>
    </li>
  );
}

function GroupView({ group, ctx, root, onChange, onRemove, depth }: { group: RuleGroup; ctx: Ctx; root: RuleGroup; onChange: (next: RuleGroup) => void; onRemove?: () => void; depth: number }) {
  const { t } = ctx;
  const setJoin = (join: RuleJoin) => onChange(updateNode(root, group.id, (n) => (n.kind === "group" ? { ...n, join } : n)));
  return (
    <div data-group={group.id} role="group" aria-label={t.groupLabel(group.join === "and" ? t.matchAll : t.matchAny)} className={cn("flex flex-col gap-3 rounded-control border border-border p-3", depth > 1 && "bg-nq-surface-soft")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-label text-muted-foreground">{t.match}</span>
        <ToggleGroup value={[group.join]} onValueChange={(v) => v[0] && setJoin(v[0] as RuleJoin)} aria-label={t.match} disabled={ctx.disabled}>
          <Toggle value="and">{t.matchAll}</Toggle>
          <Toggle value="or">{t.matchAny}</Toggle>
        </ToggleGroup>
        {onRemove ? (
          <Button variant="ghost" size="sm" className="ms-auto" onClick={onRemove} disabled={ctx.disabled}>
            <Trash2 aria-hidden />
            {t.removeGroup}
          </Button>
        ) : null}
      </div>
      {group.children.length === 0 ? <p className="text-body-sm text-muted-foreground">{t.noConditions}</p> : null}
      <ul className="flex flex-col gap-3">
        {group.children.map((c) =>
          c.kind === "group" ? (
            <li key={c.id}>
              <GroupView group={c} ctx={ctx} root={root} depth={depth + 1} onChange={onChange} onRemove={() => onChange(removeNode(root, c.id))} />
            </li>
          ) : (
            <ConditionRow key={c.id} cond={c} ctx={ctx} onChange={(next) => onChange(updateNode(root, c.id, () => next))} onRemove={() => onChange(removeNode(root, c.id))} />
          ),
        )}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" disabled={ctx.disabled} onClick={() => onChange(addChild(root, group.id, newCondition(ctx.fields[0])))}>
          <Plus aria-hidden />
          {t.addCondition}
        </Button>
        {depth < ctx.maxDepth ? (
          <Button variant="ghost" size="sm" disabled={ctx.disabled} onClick={() => onChange(addChild(root, group.id, newGroup(group.join === "and" ? "or" : "and")))}>
            <Plus aria-hidden />
            {t.addGroup}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ builder */

export interface RuleBuilderProps extends Omit<ComponentProps<"div">, "children" | "defaultValue" | "onChange"> {
  /** Events that can start a rule. */
  events: RuleEvent[];
  /** Fields conditions can test. */
  fields: RuleField[];
  /** Actions a rule can take. */
  actionTypes: RuleActionType[];
  value?: RuleDefinition;
  defaultValue?: RuleDefinition;
  /** `issues` lists what is still wrong, so a Save button can stay off until it is empty. */
  onValueChange?: (rule: RuleDefinition, issues: RuleIssue[]) => void;
  /** Deepest nesting of condition groups. Default 3. */
  maxDepth?: number;
  disabled?: boolean;
  labels?: RuleBuilderLabels;
  /** Extra content under the summary sentence, such as a name field or a Save button. */
  header?: ReactNode;
}

/**
 * "When this happens, if these are true, then do these": pick the event, build conditions as nested all-of and
 * any-of groups, and stack the actions. A live sentence reads the rule back in plain language, and what is still
 * missing is listed. It has no backend: it edits a `RuleDefinition` you store and evaluate.
 */
export function RuleBuilder({ events, fields, actionTypes, value: valueProp, defaultValue, onValueChange, maxDepth = 3, disabled, labels, header, className, ...rest }: RuleBuilderProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels } as (typeof STRINGS)["en"];
  const uid = useId();
  const [state, setState] = useState<RuleDefinition>(() => defaultValue ?? emptyRule());
  const rule = valueProp ?? state;
  const issues = useMemo(() => validateRule(rule, fields, actionTypes), [rule, fields, actionTypes]);
  const commit = (next: RuleDefinition) => {
    if (valueProp === undefined) setState(next);
    onValueChange?.(next, validateRule(next, fields, actionTypes));
  };
  const ctx: Ctx = { fields, t, maxDepth, disabled, issues };
  const sentence = describeRule(rule, fields, events, actionTypes, { when: t.sentence.when, ifWord: t.sentence.ifWord, then: t.sentence.then, ops: t.ops, noConditions: t.sentence.noConditions, join: (j) => (j === "and" ? t.sentence.and : t.sentence.or) });
  const eventItems = events.map((e) => ({ value: e.id, label: e.label }));
  const eventInfo = events.find((e) => e.id === rule.event);
  const messages = issues.map((i) => {
    switch (i.code) {
      case "no-event":
        return t.issueEvent;
      case "no-actions":
        return t.issueActions;
      case "no-field":
        return t.issueField;
      case "no-value":
        return t.issueValue;
      default: {
        const action = rule.actions.find((a) => a.id === i.id);
        const def = actionTypes.find((x) => x.id === action?.type)?.fields?.find((f) => f.name === i.field);
        return t.issueActionField(def?.label ?? i.field ?? "");
      }
    }
  });
  const unique = [...new Set(messages)];

  return (
    <div data-slot="rule-builder" className={cn("flex min-w-0 flex-col gap-4", className)} {...rest}>
      <section aria-label={t.summary} data-slot="rule-summary" className="rounded-card border border-border bg-nq-surface-soft p-4">
        <p className="flex items-start gap-2 text-body text-foreground" aria-live="polite">
          <Zap aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
          <span dir="auto">{sentence}</span>
        </p>
        {header}
      </section>

      {unique.length > 0 ? (
        <Alert tone="warning" title={t.problems(String(unique.length))}>
          <ul className="mt-1 list-disc ps-5 text-body-sm">
            {unique.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <section aria-labelledby={`${uid}-when`} className="flex flex-col gap-2 rounded-card border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Badge variant="brand">1</Badge>
          <h3 id={`${uid}-when`} className="text-h4 text-foreground">
            {t.when}
          </h3>
        </div>
        <Field invalid={issues.some((i) => i.code === "no-event")}>
          <FieldLabel className="sr-only">{t.when}</FieldLabel>
          <Select value={rule.event || null} onValueChange={(v) => commit({ ...rule, event: v as string })} items={eventItems} disabled={disabled}>
            <SelectTrigger aria-label={t.when}>
              <SelectValue placeholder={t.chooseEvent} />
            </SelectTrigger>
            <SelectContent>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>{eventInfo?.description ?? t.whenHelp}</FieldDescription>
        </Field>
      </section>

      <section aria-labelledby={`${uid}-if`} className="flex flex-col gap-2 rounded-card border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Badge variant="brand">2</Badge>
          <h3 id={`${uid}-if`} className="text-h4 text-foreground">
            {t.ifTitle}
          </h3>
          <span className="text-caption text-muted-foreground tabular-nums">{countConditions(rule.conditions)}</span>
        </div>
        <p className="text-body-sm text-muted-foreground">{t.ifHelp}</p>
        <GroupView group={rule.conditions} root={rule.conditions} ctx={ctx} depth={1} onChange={(conditions) => commit({ ...rule, conditions })} />
      </section>

      <section aria-labelledby={`${uid}-then`} className="flex flex-col gap-2 rounded-card border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Badge variant="brand">3</Badge>
          <h3 id={`${uid}-then`} className="text-h4 text-foreground">
            {t.thenTitle}
          </h3>
        </div>
        <p className="text-body-sm text-muted-foreground">{t.thenHelp}</p>
        <Repeater<RuleAction>
          value={rule.actions}
          onValueChange={(actions) => commit({ ...rule, actions })}
          createItem={() => ({ id: ruleUid("a"), type: "", config: {} })}
          disabled={disabled}
          label={t.actions}
          addLabel={t.addAction}
          labels={{ list: t.actions, add: t.addAction, empty: t.actionsEmpty, row: (n: string) => t.actionRow(n) }}
          empty={<p className="text-body-sm text-muted-foreground">{t.actionsEmpty}</p>}
          rowTitle={(a, i) => actionTypes.find((x) => x.id === a.type)?.label ?? t.actionRow(String(i + 1))}
          rowLabel={(a, i) => actionTypes.find((x) => x.id === a.type)?.label ?? t.actionRow(String(i + 1))}
          renderRow={(a, row) => {
            const type = actionTypes.find((x) => x.id === a.type);
            const missing = new Set(issues.filter((i) => i.id === a.id && i.code === "action-field").map((i) => i.field as string));
            return (
              <div className="flex flex-col gap-4">
                <Field>
                  <FieldLabel>{t.actionType}</FieldLabel>
                  <Select value={a.type || null} onValueChange={(v) => row.update({ ...a, type: v as string, config: { ...(actionTypes.find((x) => x.id === v)?.defaults ?? {}) } })} items={actionTypes.map((x) => ({ value: x.id, label: x.label }))} disabled={disabled}>
                    <SelectTrigger aria-label={t.actionType}>
                      <SelectValue placeholder={t.chooseAction} />
                    </SelectTrigger>
                    <SelectContent>
                      {actionTypes.map((x) => (
                        <SelectItem key={x.id} value={x.id}>
                          {x.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {type?.description ? <FieldDescription>{type.description}</FieldDescription> : null}
                </Field>
                {(type?.fields ?? []).map((f) => (
                  <WorkflowFieldEditor key={f.name} def={f} value={a.config[f.name]} onChange={(v) => row.update({ ...a, config: { ...a.config, [f.name]: v } })} disabled={disabled} invalid={missing.has(f.name)} requiredLabel={t.required} />
                ))}
              </div>
            );
          }}
        />
      </section>
    </div>
  );
}

