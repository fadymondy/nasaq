// nqRuleBuilder: "when this happens, if these are true, then do these". The markup is the React RuleBuilder's (see the Blade rule-builder
// component); the rule model (conditions as nested all-of / any-of groups, validation, the sentence) is rule-builder-logic.ts, a copy of
// the React rule-model.ts, so nothing here needs a server round trip.
//
//   <div data-slot="rule-builder" x-data="nqRuleBuilder({ events, fields, actionTypes, value, maxDepth, disabled, t })" x-modelable="rule"
//        x-on:nq-rule-change="saveDisabled = $event.detail.issues.length > 0">
//
// rule is the RuleDefinition ({ event, conditions, actions }) and is x-modelable. Fires "nq-rule-change" ({ rule, issues }) after every change.
// The Blade component unrolls the group markup to maxDepth levels (an Alpine template cannot recurse), each level iterating its group's children.

import {
  OPERATORS,
  UNARY,
  countConditions,
  describeRule,
  emptyRule,
  newCondition,
  newGroup,
  retarget,
  ruleUid,
  validateRule,
  type RuleAction,
  type RuleActionType,
  type RuleCondition,
  type RuleDefinition,
  type RuleEvent,
  type RuleField,
  type RuleFieldKind,
  type RuleGroup,
  type RuleIssue,
  type RuleOperator,
  type WorkflowFieldDef,
} from "./rule-builder-logic";
import type { Magics, Register } from "./types";

interface Strings {
  whenHelp: string;
  chooseField: string;
  yes: string;
  no: string;
  groupLabel: string;
  matchAll: string;
  matchAny: string;
  actionRow: string;
  problems: string;
  issueEvent: string;
  issueActions: string;
  issueField: string;
  issueValue: string;
  issueActionField: string;
  sentence: { when: string; ifWord: string; then: string; noConditions: string; and: string; or: string };
  ops: Record<RuleOperator, string>;
}

interface Config {
  events: RuleEvent[];
  fields: RuleField[];
  actionTypes: RuleActionType[];
  /** An Alpine expression, read in the surrounding scope, that returns the action types: the builder follows it when it changes (a host whose choices are edited live). */
  actionTypesFrom?: string | null;
  value?: RuleDefinition | null;
  maxDepth?: number;
  disabled?: boolean;
  t: Strings;
}

interface FieldVm {
  name: string;
  label: string;
  kind: WorkflowFieldDef["kind"];
  required: boolean;
  placeholder: string;
  help: string;
  options: { value: string; label: string }[];
  isBool: boolean;
  isSelect: boolean;
  isArea: boolean;
  isCode: boolean;
  isInput: boolean;
  inputType: string;
  inputMode: string;
  ltr: boolean;
  text: string;
  invalid: boolean;
}

interface State extends Magics {
  rule: RuleDefinition;
  events: RuleEvent[];
  fields: RuleField[];
  actionTypes: RuleActionType[];
  maxDepth: number;
  disabled: boolean;
  t: Strings;
  lastType: Record<string, string>;
  signature: string;
  evInvalid: boolean;
  rememberTypes(): void;
  issues(): RuleIssue[];
  typeOf(a: RuleAction): RuleActionType | undefined;
  messages(): string[];
  fieldOf(c: RuleCondition): RuleField | undefined;
  kindOf(c: RuleCondition): RuleFieldKind;
}

const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");

/** Removes a node wherever it is, in place (so the reactive proxy notices). */
function drop(group: RuleGroup, id: string) {
  const at = group.children.findIndex((c) => c.id === id);
  if (at >= 0) group.children.splice(at, 1);
  else for (const c of group.children) if (c.kind === "group") drop(c, id);
}

export const ruleBuilder: Register = (Alpine) => {
  Alpine.data("nqRuleBuilder", (config: Config) => ({
    rule: (config.value ?? emptyRule()) as RuleDefinition,
    events: config.events ?? [],
    fields: config.fields ?? [],
    actionTypes: config.actionTypes ?? [],
    maxDepth: config.maxDepth ?? 3,
    disabled: Boolean(config.disabled),
    t: config.t,
    lastType: {} as Record<string, string>,
    signature: "",
    evInvalid: !((config.value ?? { event: "" }) as RuleDefinition).event,

    init(this: State) {
      this.rememberTypes();
      if (config.actionTypesFrom) this.$watch<RuleActionType[]>(config.actionTypesFrom, (next) => (this.actionTypes = next ?? []));
      this.$watch("rule", () => (this.evInvalid = !this.rule.event));
      this.$watch("rule", () => {
        // A changed action type starts from that type's defaults, like the React builder's select handler.
        for (const a of this.rule.actions) {
          const before = this.lastType[a.id];
          if (before !== undefined && before !== a.type) a.config = { ...(this.typeOf(a)?.defaults ?? {}) };
          this.lastType[a.id] = a.type;
        }
        const signature = JSON.stringify(this.rule);
        if (signature === this.signature) return;
        this.signature = signature;
        this.$dispatch("nq-rule-change", { rule: JSON.parse(signature) as RuleDefinition, issues: this.issues() });
      });
      this.signature = JSON.stringify(this.rule);
    },
    rememberTypes(this: State) {
      for (const a of this.rule.actions) this.lastType[a.id] = a.type;
    },
    issues(this: State): RuleIssue[] {
      return validateRule(this.rule, this.fields, this.actionTypes);
    },
    typeOf(this: State, a: RuleAction) {
      return this.actionTypes.find((x) => x.id === a.type);
    },

    // ---- the sentence and the list of what is missing
    sentence(this: State): string {
      const s = this.t.sentence;
      return describeRule(this.rule, this.fields, this.events, this.actionTypes, {
        when: (e) => fill(s.when, { event: e }),
        ifWord: s.ifWord,
        then: s.then,
        ops: this.t.ops,
        noConditions: s.noConditions,
        join: (j) => (j === "and" ? s.and : s.or),
      });
    },
    messages(this: State): string[] {
      const list = this.issues().map((i) => {
        switch (i.code) {
          case "no-event":
            return this.t.issueEvent;
          case "no-actions":
            return this.t.issueActions;
          case "no-field":
            return this.t.issueField;
          case "no-value":
            return this.t.issueValue;
          default: {
            const action = this.rule.actions.find((a) => a.id === i.id);
            const def = this.actionTypes.find((x) => x.id === action?.type)?.fields?.find((f) => f.name === i.field);
            return fill(this.t.issueActionField, { field: def?.label ?? i.field ?? "" });
          }
        }
      });
      return [...new Set(list)];
    },
    problemsTitle(this: State): string {
      return fill(this.t.problems, { n: String(this.messages().length) });
    },
    eventHelp(this: State) {
      return this.events.find((e) => e.id === this.rule.event)?.description ?? this.t.whenHelp;
    },
    conditionCount(this: State) {
      return countConditions(this.rule.conditions);
    },

    // ---- groups
    groupLabel(this: State, g: RuleGroup) {
      return fill(this.t.groupLabel, { join: g.join === "and" ? this.t.matchAll : this.t.matchAny });
    },
    setJoin(this: State, g: RuleGroup, join: "and" | "or") {
      if (!this.disabled) g.join = join;
    },
    addCondition(this: State, g: RuleGroup) {
      if (!this.disabled) g.children.push(newCondition(this.fields[0]));
    },
    addGroup(this: State, g: RuleGroup) {
      if (!this.disabled) g.children.push(newGroup(g.join === "and" ? "or" : "and"));
    },
    removeNode(this: State, id: string) {
      if (!this.disabled) drop(this.rule.conditions, id);
    },

    // ---- one condition
    fieldOf(this: State, c: RuleCondition) {
      return this.fields.find((f) => f.id === c.field);
    },
    kindOf(this: State, c: RuleCondition) {
      return this.fieldOf(c)?.kind ?? "text";
    },
    ops(this: State, c: RuleCondition) {
      return OPERATORS[this.kindOf(c)].map((o) => ({ value: o, label: this.t.ops[o] }));
    },
    unary(c: RuleCondition) {
      return UNARY.includes(c.op);
    },
    isChoice(this: State, c: RuleCondition) {
      const k = this.kindOf(c);
      return k === "select" || k === "boolean";
    },
    isNumber(this: State, c: RuleCondition) {
      return this.kindOf(c) === "number";
    },
    choices(this: State, c: RuleCondition) {
      return this.kindOf(c) === "boolean"
        ? [
            { value: "true", label: this.t.yes },
            { value: "false", label: this.t.no },
          ]
        : (this.fieldOf(c)?.options ?? []);
    },
    bad(this: State, c: RuleCondition, code: "no-field" | "no-value") {
      return this.issues().some((i) => i.id === c.id && i.code === code);
    },
    setField(this: State, c: RuleCondition, id: string) {
      Object.assign(c, retarget(c, this.fields.find((f) => f.id === id)));
    },

    // ---- actions
    newAction(): RuleAction {
      return { id: ruleUid("a"), type: "", config: {} };
    },
    actionTitle(this: State, a: RuleAction, index: number) {
      return this.typeOf(a)?.label ?? fill(this.t.actionRow, { n: String(index + 1) });
    },
    actionDescription(this: State, a: RuleAction) {
      return this.typeOf(a)?.description ?? "";
    },
    actionFields(this: State, a: RuleAction): FieldVm[] {
      const missing = new Set(this.issues().filter((i) => i.id === a.id && i.code === "action-field").map((i) => i.field as string));
      return (this.typeOf(a)?.fields ?? []).map((def) => {
        const value = a.config[def.name];
        const text = typeof value === "string" || typeof value === "number" ? String(value) : "";
        const isArea = def.kind === "textarea" || def.kind === "code";
        return {
          name: def.name,
          label: def.label,
          kind: def.kind,
          required: Boolean(def.required),
          placeholder: def.placeholder ?? "",
          help: def.help ?? "",
          options: def.options ?? [],
          isBool: def.kind === "boolean",
          isSelect: def.kind === "select",
          isArea,
          isCode: def.kind === "code",
          isInput: def.kind !== "boolean" && def.kind !== "select" && !isArea,
          inputType: def.kind === "number" ? "number" : "text",
          inputMode: def.kind === "number" ? "decimal" : def.kind === "url" ? "url" : "",
          ltr: def.kind === "url" || def.kind === "code" || def.kind === "number",
          text,
          invalid: missing.has(def.name),
        };
      });
    },
    setConfig(this: State, a: RuleAction, name: string, value: string, kind?: string) {
      a.config[name] = kind === "number" ? (value === "" ? "" : Number(value)) : value;
    },
  }));
};
