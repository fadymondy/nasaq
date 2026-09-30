"use client";

import { Bot, Plus, RotateCcw } from "lucide-react";
import { type ComponentProps, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { AiModelSelect } from "../ai-model-picker";
import { Badge } from "../badge";
import { Button } from "../button";
import { ColorPicker, colorToCss } from "../color-picker";
import { Field, FieldDescription, FieldError, FieldLabel, Input, Textarea } from "../field";
import { IconByName, IconPicker } from "../icon-picker";
import { Markdown } from "../markdown";
import { formatNumber } from "../numeric";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import { TagInput } from "../tag-input";
import { appendSection, countWords, isPersonaDirty, type PersonaProblem, personaProblems } from "./persona-math";


/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    label: "Agent persona",
    identity: "Identity",
    name: "Name",
    namePlaceholder: "Support agent",
    nameRequired: "Give the agent a name.",
    tagline: "Tagline",
    taglinePlaceholder: "Answers billing questions",
    color: "Colour",
    icon: "Icon",
    model: "Model",
    traits: "Traits",
    traitsHint: "Short words for how the agent comes across. Press Enter to add one.",
    traitsPlaceholder: "Add a trait",
    greeting: "Greeting",
    greetingHint: "The first thing the agent says.",
    persona: "Persona",
    personaHint: "Who the agent is and how it behaves, in Markdown. This is added to its instructions.",
    write: "Write",
    preview: "Preview",
    previewEmpty: "Nothing to preview yet.",
    personaTooLong: (max: string) => `Keep the persona under ${max} characters.`,
    insert: "Add a section",
    sections: ["Role", "Tone", "Rules", "Boundaries"],
    words: (n: string) => `${n} words`,
    chars: (n: string, max: string) => `${n} of ${max}`,
    save: "Save persona",
    saving: "Saving",
    revert: "Revert",
    unsaved: "Unsaved changes",
    saved: "Saved.",
    saveFailed: "The persona could not be saved. Try again.",
    previewTitle: "How it looks",
    unnamed: "Unnamed agent",
  },
  ar: {
    label: "شخصية الوكيل",
    identity: "الهوية",
    name: "الاسم",
    namePlaceholder: "وكيل الدعم",
    nameRequired: "أعطِ الوكيل اسمًا.",
    tagline: "الوصف المختصر",
    taglinePlaceholder: "يجيب عن أسئلة الفواتير",
    color: "اللون",
    icon: "الأيقونة",
    model: "النموذج",
    traits: "السمات",
    traitsHint: "كلمات قصيرة تصف طريقة الوكيل. اضغط Enter لإضافة سمة.",
    traitsPlaceholder: "أضف سمة",
    greeting: "التحية",
    greetingHint: "أول ما يقوله الوكيل.",
    persona: "الشخصية",
    personaHint: "من هو الوكيل وكيف يتصرف، بصيغة Markdown. تُضاف إلى تعليماته.",
    write: "كتابة",
    preview: "معاينة",
    previewEmpty: "لا شيء للمعاينة بعد.",
    personaTooLong: (max: string) => `اجعل الشخصية أقل من ${max} حرف.`,
    insert: "إضافة قسم",
    sections: ["الدور", "النبرة", "القواعد", "الحدود"],
    words: (n: string) => `${n} كلمة`,
    chars: (n: string, max: string) => `${n} من ${max}`,
    save: "حفظ الشخصية",
    saving: "جارٍ الحفظ",
    revert: "تراجع",
    unsaved: "تغييرات غير محفوظة",
    saved: "تم الحفظ.",
    saveFailed: "تعذر حفظ الشخصية. حاول مرة أخرى.",
    previewTitle: "كيف تبدو",
    unnamed: "وكيل بلا اسم",
  },
};

export type AgentPersonaEditorLabels = typeof STRINGS.en;

function useStrings(labels?: Partial<AgentPersonaEditorLabels>) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  return { locale, t: { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels } as AgentPersonaEditorLabels };
}

/* ------------------------------------------------------------------ types */

export interface AgentPersona {
  name: string;
  tagline?: string;
  /** A hex colour or a `--nq-tag-*` custom property name, as `ColorPicker` returns it. */
  color: string;
  /** A kebab-case icon name from the icon picker, such as `bot` or `headphones`. */
  icon: string;
  /** The persona as Markdown. */
  persona: string;
  /** Short words for the agent's manner. */
  traits: readonly string[];
  /** Model id, one of `models`. */
  model?: string;
  greeting?: string;
}

export interface AgentPersonaModel {
  id: string;
  label: string;
  description?: string;
}

export type AgentPersonaSaveResult = void | { error?: string };

export interface AgentPersonaEditorProps extends Omit<ComponentProps<"form">, "onChange" | "onSubmit" | "defaultValue"> {
  /** The saved persona. The editor keeps its own draft and compares it to this. */
  value: AgentPersona;
  /** Called on every edit with the draft. */
  onChange?: (draft: AgentPersona) => void;
  /** Save the draft. Return `{ error }` (or throw) to keep it unsaved and show the message. */
  onSave: (draft: AgentPersona) => Promise<AgentPersonaSaveResult> | AgentPersonaSaveResult;
  /** Models to choose from. Leave out to hide the model field. */
  models?: readonly AgentPersonaModel[];
  /** Words offered while typing a trait. */
  traitSuggestions?: readonly string[];
  /** Longest persona text. Default 4000. 0 for no limit. */
  maxLength?: number;
  /** Hide the live preview card. */
  hidePreview?: boolean;
  disabled?: boolean;
  labels?: Partial<AgentPersonaEditorLabels>;
}

/* ------------------------------------------------------------------ preview */

export interface AgentPersonaPreviewProps extends Omit<ComponentProps<"div">, "children"> {
  persona: Pick<AgentPersona, "name" | "tagline" | "color" | "icon" | "traits" | "greeting">;
  labels?: Partial<AgentPersonaEditorLabels>;
}

/** The agent as its users will meet it: a coloured icon tile, name, tagline, traits and the greeting. */
export function AgentPersonaPreview({ persona, labels, className, ...props }: AgentPersonaPreviewProps) {
  const { t } = useStrings(labels);
  const css = colorToCss(persona.color || "--nq-tag-gray");
  return (
    <div data-slot="agent-persona-preview" className={cn("flex flex-col gap-3 rounded-card border border-border bg-card p-4", className)} {...props}>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-control [&_svg]:size-5"
          style={{ backgroundColor: `color-mix(in oklab, ${css} 16%, transparent)`, color: css }}
        >
          {persona.icon ? <IconByName name={persona.icon} /> : <Bot />}
        </span>
        <div className="min-w-0">
          <p dir="auto" className="truncate text-label text-foreground">
            {persona.name.trim() || t.unnamed}
          </p>
          {persona.tagline ? (
            <p dir="auto" className="truncate text-caption text-muted-foreground">
              {persona.tagline}
            </p>
          ) : null}
        </div>
      </div>
      {persona.traits.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label={t.traits}>
          {persona.traits.map((trait) => (
            <li key={trait}>
              <Badge variant="outline" dir="auto">
                {trait}
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
      {persona.greeting ? (
        <p dir="auto" className="rounded-card rounded-ss-none bg-secondary px-3 py-2 text-body-sm text-foreground">
          {persona.greeting}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ editor */

/**
 * Edit an AI agent's profile: name, tagline, colour, icon, model, traits, greeting and the persona itself as Markdown
 * with a write and preview switch and section shortcuts. A live card shows how it will look. It keeps a draft, tells
 * you what is unsaved, and calls `onSave` with the whole persona.
 */
export function AgentPersonaEditor({
  value,
  onChange,
  onSave,
  models,
  traitSuggestions,
  maxLength = 4000,
  hidePreview,
  disabled,
  labels,
  className,
  ...props
}: AgentPersonaEditorProps) {
  const { locale, t } = useStrings(labels);
  const uid = useId();
  const [draft, setDraft] = useState<AgentPersona>(value);
  const [saved, setSaved] = useState<AgentPersona>(value);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [tried, setTried] = useState(false);
  const [tab, setTab] = useState<string>("write");
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // A new saved value from outside replaces both the draft and the baseline.
  const [seen, setSeen] = useState(value);
  if (isPersonaDirty(seen, value)) {
    setSeen(value);
    setDraft(value);
    setSaved(value);
  }

  const dirty = isPersonaDirty(draft, saved);
  const problems = personaProblems(draft, maxLength);
  const has = (p: PersonaProblem) => problems.includes(p);

  const edit = (patch: Partial<AgentPersona>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    setMessage(null);
    onChange?.(next);
  };

  async function submit() {
    setTried(true);
    if (saving || problems.length > 0) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await onSave(draft);
      if (result && result.error) setMessage({ tone: "error", text: result.error });
      else {
        setSaved(draft);
        setMessage({ tone: "ok", text: t.saved });
      }
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof Error && e.message ? e.message : t.saveFailed });
    } finally {
      setSaving(false);
    }
  }

  const over = maxLength > 0 && draft.persona.length > maxLength;

  return (
    <form
      data-slot="agent-persona-editor"
      aria-label={t.label}
      noValidate
      className={cn("grid min-w-0 gap-6", !hidePreview && "lg:grid-cols-[minmax(0,1fr)_18rem]", className)}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2" invalid={tried && has("nameRequired")}>
            <FieldLabel>{t.name}</FieldLabel>
            <Input dir="auto" value={draft.name} disabled={disabled} placeholder={t.namePlaceholder} onChange={(e) => edit({ name: e.target.value })} />
            {tried && has("nameRequired") ? <FieldError match>{t.nameRequired}</FieldError> : null}
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>{t.tagline}</FieldLabel>
            <Input dir="auto" value={draft.tagline ?? ""} disabled={disabled} placeholder={t.taglinePlaceholder} onChange={(e) => edit({ tagline: e.target.value })} />
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-label text-foreground" id={`${uid}-color`}>
              {t.color}
            </span>
            <ColorPicker value={draft.color} disabled={disabled} onValueChange={(color) => edit({ color })} locale={locale} aria-label={t.color} />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-label text-foreground">{t.icon}</span>
            <div>
              <IconPicker value={draft.icon} disabled={disabled} onValueChange={(icon) => edit({ icon })} recentKey={null} />
            </div>
          </div>
          {models && models.length > 0 ? (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-label text-foreground">{t.model}</span>
              <AiModelSelect models={models} value={draft.model} disabled={disabled} onValueChange={(model) => edit({ model })} label={t.model} />
            </div>
          ) : null}
        </div>

        <Field>
          <FieldLabel>{t.traits}</FieldLabel>
          <TagInput value={draft.traits} disabled={disabled} suggestions={traitSuggestions} maxTags={8} placeholder={t.traitsPlaceholder} onValueChange={(traits) => edit({ traits })} />
          <FieldDescription>{t.traitsHint}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel>{t.greeting}</FieldLabel>
          <Input dir="auto" value={draft.greeting ?? ""} disabled={disabled} onChange={(e) => edit({ greeting: e.target.value })} />
          <FieldDescription>{t.greetingHint}</FieldDescription>
        </Field>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              <span className="text-label text-foreground">{t.persona}</span>
              <p className="text-caption text-muted-foreground">{t.personaHint}</p>
            </div>
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <TabsList>
                <TabsTab value="write">{t.write}</TabsTab>
                <TabsTab value="preview">{t.preview}</TabsTab>
              </TabsList>
              {tab === "write" ? (
                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t.insert}>
                  {t.sections.map((s) => (
                    <Button
                      key={s}
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-caption"
                      disabled={disabled}
                      onClick={() => {
                        edit({ persona: appendSection(draft.persona, s) });
                        areaRef.current?.focus();
                      }}
                    >
                      <Plus aria-hidden />
                      {s}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
            <TabsPanel value="write" className="mt-2">
              <Textarea
                ref={areaRef}
                dir="auto"
                rows={12}
                value={draft.persona}
                disabled={disabled}
                aria-label={t.persona}
                aria-invalid={over || undefined}
                spellCheck
                className="min-h-56 font-mono text-body-sm"
                onChange={(e) => edit({ persona: e.target.value })}
              />
            </TabsPanel>
            <TabsPanel value="preview" className="mt-2 min-h-56 rounded-control border border-border bg-card p-4">
              {draft.persona.trim() ? <Markdown>{draft.persona}</Markdown> : <p className="text-body-sm text-muted-foreground">{t.previewEmpty}</p>}
            </TabsPanel>
          </Tabs>
          <p className={cn("flex flex-wrap justify-between gap-2 text-caption", over ? "text-nq-danger-text" : "text-muted-foreground")}>
            <span>{over ? t.personaTooLong(formatNumber(maxLength, locale)) : t.words(formatNumber(countWords(draft.persona), locale))}</span>
            {maxLength > 0 ? <span className="tabular-nums">{t.chars(formatNumber(draft.persona.length, locale), formatNumber(maxLength, locale))}</span> : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <Button type="submit" variant="primary" loading={saving} disabled={disabled || !dirty || (tried && problems.length > 0)}>
            {saving ? t.saving : t.save}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={disabled || saving || !dirty}
            onClick={() => {
              setDraft(saved);
              setTried(false);
              setMessage(null);
              onChange?.(saved);
            }}
          >
            <RotateCcw aria-hidden />
            {t.revert}
          </Button>
          <span role="status" aria-live="polite" className={cn("text-body-sm", message?.tone === "error" ? "text-nq-danger-text" : "text-muted-foreground")}>
            {message?.text ?? (dirty ? t.unsaved : "")}
          </span>
        </div>
      </div>

      {hidePreview ? null : (
        <aside aria-label={t.previewTitle} className="flex min-w-0 flex-col gap-2 lg:sticky lg:top-4 lg:self-start">
          <h3 className="text-caption text-muted-foreground">{t.previewTitle}</h3>
          <AgentPersonaPreview persona={draft} labels={labels} />
        </aside>
      )}
    </form>
  );
}
