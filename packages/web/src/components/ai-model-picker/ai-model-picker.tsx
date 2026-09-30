"use client";

import { Bot, TriangleAlert } from "lucide-react";
import { type ComponentProps, type ReactNode, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { Field, FieldLabel } from "../field";
import { formatNumber } from "../numeric";
import { RadioCard, RadioGroup } from "../radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Toggle, ToggleGroup } from "../toggle-group";
import { resolveEffort } from "./model-picker-math";

const STRINGS = {
  en: {
    model: "Model",
    effort: "Reasoning effort",
    effortHint: "Higher effort thinks longer and costs more.",
    agent: "Agent",
    agentRequired: "Required",
    agentPlaceholder: "Choose an agent",
    agentMissing: "Choose the agent that will run this.",
    low: "Low",
    medium: "Medium",
    high: "High",
    max: "Max",
    flagship: "Most capable",
    balanced: "Balanced",
    fast: "Fastest",
    context: (n: string) => `${n} context`,
    price: (input: string, output: string) => `${input} in, ${output} out per 1M tokens`,
    persona: "Persona",
    personas: "Personas",
    starters: "Try asking",
    models: "Models",
  },
  ar: {
    model: "النموذج",
    effort: "جهد التفكير",
    effortHint: "الجهد الأعلى يفكّر أطول ويكلّف أكثر.",
    agent: "الوكيل",
    agentRequired: "مطلوب",
    agentPlaceholder: "اختر وكيلًا",
    agentMissing: "اختر الوكيل الذي سينفّذ هذا.",
    low: "منخفض",
    medium: "متوسط",
    high: "مرتفع",
    max: "أقصى",
    flagship: "الأقوى",
    balanced: "متوازن",
    fast: "الأسرع",
    context: (n: string) => `سياق ${n}`,
    price: (input: string, output: string) => `${input} للإدخال، ${output} للإخراج لكل مليون رمز`,
    persona: "الشخصية",
    personas: "الشخصيات",
    starters: "جرّب أن تسأل",
    models: "النماذج",
  },
};

export type AiModelPickerLabels = Partial<typeof STRINGS.en>;

function useLabels(labels?: AiModelPickerLabels) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  return { locale, t: { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels } };
}

export type AiModelTier = "flagship" | "balanced" | "fast";

export interface AiModel {
  id: string;
  /** The model's name as people know it: "Sonnet 5.5". Not translated. */
  label: string;
  description?: string;
  /** Who runs it, shown as small text: "Anthropic". */
  provider?: string;
  tier?: AiModelTier;
  /** Reasoning efforts this model supports, lowest first: `["low", "medium", "high"]`. None means no effort control. */
  efforts?: readonly string[];
  /** Context window in tokens. */
  contextWindow?: number;
  /** Price per million tokens, in `currency`. */
  price?: { input: number; output: number };
  disabled?: boolean;
}

export interface AiAgentOption {
  id: string;
  label: string;
  description?: string;
}

export interface AiModelSelection {
  model?: string;
  effort?: string;
  agent?: string;
}

/* ------------------------------------------------------------------ AiModelSelect */

export interface AiModelSelectProps {
  models: readonly Pick<AiModel, "id" | "label" | "description">[];
  value?: string;
  onValueChange: (id: string) => void;
  /** Accessible name of the select. Default "Model" / "النموذج". */
  label?: string;
  disabled?: boolean;
  /** Classes for the trigger. */
  className?: string;
  labels?: AiModelPickerLabels;
}

/**
 * The compact model chooser: one select listing the models. It is what a chat composer shows; `AiModelPicker` is the
 * full version with effort and agent. CopilotChat uses this component for its model menu.
 */
export function AiModelSelect({ models, value, onValueChange, label, disabled, className, labels }: AiModelSelectProps) {
  const { t } = useLabels(labels);
  const items = models.map((m) => ({ value: m.id, label: m.label }));
  return (
    <Select items={items} value={value} disabled={disabled} onValueChange={(v) => v && onValueChange(String(v))}>
      <SelectTrigger data-slot="ai-model-select" aria-label={label ?? t.model} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {models.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ------------------------------------------------------------------ AiModelPicker */

export interface AiModelPickerProps extends Omit<ComponentProps<"div">, "defaultValue" | "onChange"> {
  models: readonly AiModel[];
  /** Controlled selection. */
  value?: AiModelSelection;
  defaultValue?: AiModelSelection;
  onValueChange?: (value: AiModelSelection) => void;
  /** Agents or skills the run can be handed to. Omit to hide the field. */
  agents?: readonly AiAgentOption[];
  /** The run cannot start without an agent: the field is marked required and turns invalid until one is chosen. */
  agentRequired?: boolean;
  /** Names for effort ids that are not low, medium, high or max. */
  effortLabels?: Record<string, string>;
  /** `cards` (default) lists every model with its details; `compact` is one row of controls for a toolbar. */
  variant?: "cards" | "compact";
  /** ISO 4217 code for prices. Default "USD". */
  currency?: string;
  disabled?: boolean;
  labels?: AiModelPickerLabels;
}

/**
 * Picks what runs an AI task: the model (with its tier, context window and price), the reasoning effort that model
 * supports, and, when required, the agent or skill that runs it. Changing the model keeps the effort if the new model
 * supports it. Model names are not translated; everything around them is.
 */
export function AiModelPicker({
  models,
  value,
  defaultValue,
  onValueChange,
  agents,
  agentRequired = false,
  effortLabels,
  variant = "cards",
  currency = "USD",
  disabled = false,
  labels,
  className,
  ...props
}: AiModelPickerProps) {
  const { locale, t } = useLabels(labels);
  const [inner, setInner] = useState<AiModelSelection>(() => {
    const first = defaultValue?.model ?? models[0]?.id;
    return { model: first, effort: resolveEffort(models.find((m) => m.id === first), defaultValue?.effort), agent: defaultValue?.agent };
  });
  const [touched, setTouched] = useState(false);
  const sel = value ?? inner;
  const current = models.find((m) => m.id === sel.model);

  const commit = (next: AiModelSelection) => {
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  };
  const chooseModel = (id: string) => {
    const model = models.find((m) => m.id === id);
    commit({ ...sel, model: id, effort: resolveEffort(model, sel.effort) });
  };

  const effortName = (id: string) => effortLabels?.[id] ?? (id in STRINGS.en ? (t as Record<string, unknown>)[id] : undefined) ?? id;
  const money = (n: number) => formatNumber(n, locale, { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const tierLabel: Record<AiModelTier, string> = { flagship: t.flagship, balanced: t.balanced, fast: t.fast };

  const agentMissing = agentRequired && !sel.agent;
  const showEffort = !!current?.efforts?.length;

  const effortControl = showEffort ? (
    <ToggleGroup
      aria-label={t.effort}
      disabled={disabled}
      value={sel.effort ? [sel.effort] : []}
      onValueChange={(v) => v[0] && commit({ ...sel, effort: v[0] })}
    >
      {current.efforts!.map((e) => (
        <Toggle key={e} value={e}>
          {String(effortName(e))}
        </Toggle>
      ))}
    </ToggleGroup>
  ) : null;

  const agentControl =
    agents && agents.length > 0 ? (
      <Field invalid={agentMissing && touched} disabled={disabled} className={variant === "compact" ? "w-auto min-w-40" : undefined}>
        {variant === "compact" ? null : (
          <FieldLabel>
            {t.agent}
            {agentRequired ? <span className="ms-1.5 text-caption text-muted-foreground">({t.agentRequired})</span> : null}
          </FieldLabel>
        )}
        <Select
          items={agents.map((a) => ({ value: a.id, label: a.label }))}
          value={sel.agent ?? null}
          required={agentRequired}
          onValueChange={(v) => v && commit({ ...sel, agent: String(v) })}
          onOpenChange={(open) => !open && setTouched(true)}
        >
          <SelectTrigger data-slot="ai-agent-select" aria-label={t.agent} className={variant === "compact" ? "h-control-sm" : undefined}>
            <SelectValue placeholder={t.agentPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {agents.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {agentMissing && touched ? (
          <span role="alert" className="inline-flex items-center gap-1 text-caption text-nq-danger-text">
            <TriangleAlert aria-hidden className="size-3.5" />
            {t.agentMissing}
          </span>
        ) : variant === "cards" ? (
          <span className="text-caption text-muted-foreground">{agents.find((a) => a.id === sel.agent)?.description}</span>
        ) : null}
      </Field>
    ) : null;

  if (variant === "compact") {
    return (
      <div data-slot="ai-model-picker" data-variant="compact" className={cn("flex flex-wrap items-center gap-2", className)} {...props}>
        <AiModelSelect models={models} value={sel.model} onValueChange={chooseModel} disabled={disabled} labels={labels} className="h-control-sm w-auto min-w-40" />
        {effortControl}
        {agentControl}
      </div>
    );
  }

  return (
    <div data-slot="ai-model-picker" data-variant="cards" className={cn("flex flex-col gap-5", className)} {...props}>
      <RadioGroup aria-label={t.models} value={sel.model ?? ""} disabled={disabled} onValueChange={(v) => chooseModel(String(v))} className="grid gap-2 sm:grid-cols-2">
        {models.map((m) => (
          <RadioCard
            key={m.id}
            value={m.id}
            disabled={m.disabled}
            title={
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <bdi dir="ltr">{m.label}</bdi>
                {m.tier ? <Badge variant={m.tier === "flagship" ? "accent" : "neutral"}>{tierLabel[m.tier]}</Badge> : null}
              </span>
            }
            description={
              <span className="flex flex-col gap-1">
                {m.description ? <span>{m.description}</span> : null}
                <span className="flex flex-wrap gap-x-3 text-caption text-muted-foreground">
                  {m.provider ? <bdi dir="ltr">{m.provider}</bdi> : null}
                  {m.contextWindow ? <span>{t.context(formatNumber(m.contextWindow, locale, { notation: "compact" }))}</span> : null}
                  {m.price ? <span>{t.price(money(m.price.input), money(m.price.output))}</span> : null}
                </span>
              </span>
            }
          />
        ))}
      </RadioGroup>
      {showEffort ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-label text-foreground">{t.effort}</span>
          {effortControl}
          <span className="text-caption text-muted-foreground">{t.effortHint}</span>
        </div>
      ) : null}
      {agentControl}
    </div>
  );
}

/* ------------------------------------------------------------------ PersonaPicker */

export interface AiPersona {
  id: string;
  name: string;
  description?: string;
  /** Glyph before the name, for example `<Bot />`. Decorative. */
  icon?: ReactNode;
  /** Prompt starters for this persona, shown when it is selected. */
  starters?: readonly string[];
}

export interface PersonaPickerProps extends Omit<ComponentProps<"div">, "defaultValue" | "onChange"> {
  personas: readonly AiPersona[];
  /** Selected persona id (controlled). */
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  /** A starter was chosen. Send it as the first prompt. */
  onStarter?: (prompt: string, persona: AiPersona) => void;
  disabled?: boolean;
  labels?: AiModelPickerLabels;
}

/**
 * Choose who the assistant should be, then start from one of that persona's prompts. Each persona is a radio card;
 * the starters of the selected one are buttons that call `onStarter`.
 */
export function PersonaPicker({ personas, value, defaultValue, onValueChange, onStarter, disabled = false, labels, className, ...props }: PersonaPickerProps) {
  const { t } = useLabels(labels);
  const [inner, setInner] = useState(defaultValue ?? personas[0]?.id ?? "");
  const id = value ?? inner;
  const persona = personas.find((p) => p.id === id);
  return (
    <div data-slot="persona-picker" className={cn("flex flex-col gap-4", className)} {...props}>
      <RadioGroup
        aria-label={t.personas}
        value={id}
        disabled={disabled}
        onValueChange={(v) => {
          if (value === undefined) setInner(String(v));
          onValueChange?.(String(v));
        }}
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
      >
        {personas.map((p) => (
          <RadioCard
            key={p.id}
            value={p.id}
            title={
              <span className="flex items-center gap-2">
                <span aria-hidden className="text-muted-foreground [&_svg]:size-4">
                  {p.icon ?? <Bot />}
                </span>
                {p.name}
              </span>
            }
            description={p.description}
          />
        ))}
      </RadioGroup>
      {persona?.starters?.length ? (
        <div data-slot="persona-starters" className="flex flex-col gap-2">
          <span className="text-label text-foreground">{t.starters}</span>
          <ul aria-label={t.starters} className="flex flex-wrap gap-2">
            {persona.starters.map((s) => (
              <li key={s}>
                <Button variant="secondary" size="sm" disabled={disabled} className="h-auto min-h-control-sm whitespace-normal py-1.5 text-start" onClick={() => onStarter?.(s, persona)}>
                  {s}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
