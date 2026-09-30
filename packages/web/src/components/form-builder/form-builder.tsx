"use client";

import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { type ComponentProps, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { CodeBlock } from "../code-block";
import { ContextMenuActions, type ContextMenuAction } from "../context-menu";
import { CopyButton } from "../copy-button";
import { Field, FieldDescription, FieldLabel, Input, Textarea } from "../field";
import {
  FORM_FIELD_KINDS,
  type FormDefinition,
  type FormFieldDef,
  type FormFieldKind,
  formatFormOptions,
  formEmbedSnippet,
  formOriginAllowed,
  moveFormField,
  newFormField,
  newFormRule,
  normalizeFormOrigin,
  parseFormOptions,
  uniqueFormFieldId,
} from "../public-form/form-model";
import { PublicForm } from "../public-form";
import { Card, CardContent, CardHeader, CardTitle } from "../card";
import type { RuleActionType, RuleField } from "../rule-builder";
import { RuleBuilder } from "../rule-builder";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Status } from "../status";
import { Switch } from "../switch";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import { TagInput } from "../tag-input";

const STRINGS = {
  en: {
    tabs: { fields: "Fields", logic: "Logic", settings: "Settings", embed: "Embed" },
    name: "Form name",
    enabled: "Accepting responses",
    save: "Save form",
    addField: "Add a field",
    kinds: { text: "Short text", email: "Email", phone: "Phone", number: "Number", textarea: "Long text", select: "Dropdown", radio: "Choice", checkbox: "Checkbox" } satisfies Record<FormFieldKind, string>,
    untitled: "Untitled field",
    required: "Required",
    moveUp: "Move up",
    moveDown: "Move down",
    duplicate: "Duplicate",
    remove: "Remove field",
    fieldList: "Form fields",
    noFields: "No fields yet. Add one to start.",
    editing: "Field settings",
    labelEn: "Label (English)",
    labelAr: "Label (Arabic)",
    kind: "Type",
    isRequired: "Visitors must fill this in",
    placeholder: "Placeholder",
    help: "Help text",
    options: "Options",
    optionsHint: "One per line. Write the Arabic after a bar: Riyadh | الرياض",
    preview: "Live preview",
    logicIntro: "Show, hide or require a field depending on what the visitor answered.",
    addRule: "Add a rule",
    removeRule: "Remove rule",
    rule: (n: string) => `Rule ${n}`,
    noRules: "No rules. Every field always shows.",
    event: "An answer changes",
    show: "Show field",
    hide: "Hide field",
    requireField: "Require field",
    target: "Field",
    origins: "Allowed sites",
    originsHint: "Where this form may be embedded. Separate with a comma or Enter, for example https://example.com or https://*.example.com.",
    originsAdd: "https://example.com",
    originsInvalid: "Use a full address that starts with http:// or https://.",
    originsClosed: "Closed: no site can embed this form until you add its address.",
    originsOpen: (n: string) => `Open to ${n} site(s).`,
    originTest: "Try an address",
    originTestAllowed: "Allowed",
    originTestBlocked: "Blocked",
    thanksEn: "Thank-you message (English)",
    thanksAr: "Thank-you message (Arabic)",
    honeypot: "Hide a trap field from bots",
    honeypotHint: "Bots fill it in, people never see it. Those submissions are dropped without telling the sender.",
    embedIntro: "Paste this where the form should appear.",
    iframe: "Iframe",
    script: "Script",
    copyLink: "Copy public link",
    embedClosed: "This form is closed. Add the site under Settings first, or the snippet will be refused.",
    ruleFieldsMissing: "Add fields first to build rules.",
  },
  ar: {
    tabs: { fields: "الحقول", logic: "المنطق", settings: "الإعدادات", embed: "التضمين" },
    name: "اسم النموذج",
    enabled: "يستقبل الردود",
    save: "حفظ النموذج",
    addField: "إضافة حقل",
    kinds: { text: "نص قصير", email: "بريد إلكتروني", phone: "هاتف", number: "رقم", textarea: "نص طويل", select: "قائمة منسدلة", radio: "اختيار", checkbox: "خانة اختيار" } satisfies Record<FormFieldKind, string>,
    untitled: "حقل بلا عنوان",
    required: "مطلوب",
    moveUp: "نقل لأعلى",
    moveDown: "نقل لأسفل",
    duplicate: "تكرار",
    remove: "حذف الحقل",
    fieldList: "حقول النموذج",
    noFields: "لا حقول بعد. أضف حقلًا للبدء.",
    editing: "إعدادات الحقل",
    labelEn: "العنوان (بالإنجليزية)",
    labelAr: "العنوان (بالعربية)",
    kind: "النوع",
    isRequired: "يجب على الزائر تعبئته",
    placeholder: "النص الإرشادي",
    help: "نص مساعد",
    options: "الخيارات",
    optionsHint: "خيار في كل سطر. اكتب العربية بعد شرطة: Riyadh | الرياض",
    preview: "معاينة مباشرة",
    logicIntro: "أظهر حقلًا أو أخفِه أو اجعله مطلوبًا بحسب ما أجاب به الزائر.",
    addRule: "إضافة قاعدة",
    removeRule: "حذف القاعدة",
    rule: (n: string) => `القاعدة ${n}`,
    noRules: "لا قواعد. كل الحقول تظهر دائمًا.",
    event: "تغيّرت إجابة",
    show: "إظهار الحقل",
    hide: "إخفاء الحقل",
    requireField: "جعل الحقل مطلوبًا",
    target: "الحقل",
    origins: "المواقع المسموح بها",
    originsHint: "المواقع التي يجوز تضمين النموذج فيها. افصل بفاصلة أو Enter، مثل https://example.com أو https://*.example.com.",
    originsAdd: "https://example.com",
    originsInvalid: "استخدم عنوانًا كاملًا يبدأ بـ http:// أو https://.",
    originsClosed: "مغلق: لا يستطيع أي موقع تضمين النموذج حتى تضيف عنوانه.",
    originsOpen: (n: string) => `مفتوح لـ ${n} موقع.`,
    originTest: "جرّب عنوانًا",
    originTestAllowed: "مسموح",
    originTestBlocked: "محظور",
    thanksEn: "رسالة الشكر (بالإنجليزية)",
    thanksAr: "رسالة الشكر (بالعربية)",
    honeypot: "إخفاء حقل فخ عن الروبوتات",
    honeypotHint: "تعبئه الروبوتات ولا يراه الناس. تُهمل هذه الردود دون إخبار المرسل.",
    embedIntro: "الصق هذا حيث يجب أن يظهر النموذج.",
    iframe: "إطار iframe",
    script: "سكربت",
    copyLink: "نسخ الرابط العام",
    embedClosed: "هذا النموذج مغلق. أضف الموقع من الإعدادات أولًا وإلا سيُرفض التضمين.",
    ruleFieldsMissing: "أضف حقولًا أولًا لبناء القواعد.",
  },
} as const;
export type FormBuilderLabels = Partial<{ [K in keyof (typeof STRINGS)["en"]]: (typeof STRINGS)["en"][K] extends string ? string : (typeof STRINGS)["en"][K] }>;

export interface FormBuilderProps extends Omit<ComponentProps<"div">, "defaultValue" | "onChange" | "children"> {
  value?: FormDefinition;
  defaultValue?: FormDefinition;
  onValueChange?: (form: FormDefinition) => void;
  /** The public key of the form, used in the embed snippet and public link. */
  formKey?: string;
  /** Where public forms are served. Default `https://forms.example.com`. */
  embedBaseUrl?: string;
  /** Adds a Save button. Resolve when saved. */
  onSave?: (form: FormDefinition) => void | Promise<void>;
  saving?: boolean;
  locale?: string;
  labels?: FormBuilderLabels;
}

const BLANK: FormDefinition = {
  name: "",
  kind: "inquiry",
  fields: [],
  rules: [],
  allowedOrigins: [],
  enabled: true,
  thanksEn: "Thank you!",
  thanksAr: "شكرًا لك!",
  honeypot: true,
};

/**
 * Builds a public form: add and order fields in English and Arabic, add rules that show, hide or require fields,
 * choose the sites allowed to embed it (closed until you add one), write the thank-you, and copy the embed snippet.
 * The model is a plain `FormDefinition` you store; `PublicForm` renders it.
 */
export function FormBuilder({ value, defaultValue = BLANK, onValueChange, formKey = "pk_live_demo", embedBaseUrl = "https://forms.example.com", onSave, saving, locale: localeProp, labels, className, ...props }: FormBuilderProps) {
  const ambient = useOptionalNasaq()?.locale;
  const locale = localeProp ?? ambient ?? "en";
  const ar = locale.startsWith("ar");
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels } as (typeof STRINGS)["en"];
  const [inner, setInner] = useState<FormDefinition>(defaultValue);
  const form = value ?? inner;
  const [selected, setSelected] = useState<string | null>(form.fields[0]?.id ?? null);
  const [tab, setTab] = useState("fields");
  const [style, setStyle] = useState<"iframe" | "script">("iframe");
  const [probe, setProbe] = useState("");
  const [originError, setOriginError] = useState<string | null>(null);

  const update = (patch: Partial<FormDefinition>) => {
    const next = { ...form, ...patch };
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  };
  const updateField = (id: string, patch: Partial<FormFieldDef>) => update({ fields: form.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  const current = form.fields.find((f) => f.id === selected) ?? null;

  const addField = (kind: FormFieldKind) => {
    const field = newFormField(kind, form.fields, STRINGS.en.kinds[kind], STRINGS.ar.kinds[kind]);
    update({ fields: [...form.fields, field] });
    setSelected(field.id);
  };
  const removeField = (id: string) => {
    const index = form.fields.findIndex((f) => f.id === id);
    const fields = form.fields.filter((f) => f.id !== id);
    update({
      fields,
      rules: form.rules
        .map((r) => ({ ...r, actions: r.actions.filter((a) => a.config?.target !== id) }))
        .filter((r) => r.actions.length > 0),
    });
    setSelected(fields[Math.min(index, fields.length - 1)]?.id ?? null);
  };
  const duplicateField = (id: string) => {
    const source = form.fields.find((f) => f.id === id);
    if (!source) return;
    const copy = { ...source, id: uniqueFormFieldId(source.id, form.fields) };
    const at = form.fields.findIndex((f) => f.id === id);
    const fields = [...form.fields];
    fields.splice(at + 1, 0, copy);
    update({ fields });
    setSelected(copy.id);
  };

  const rowActions = (f: FormFieldDef, index: number): ContextMenuAction[] => [
    { id: "up", label: t.moveUp, icon: ArrowUp, disabled: index === 0, onSelect: () => update({ fields: moveFormField(form.fields, f.id, -1) }) },
    { id: "down", label: t.moveDown, icon: ArrowDown, disabled: index === form.fields.length - 1, onSelect: () => update({ fields: moveFormField(form.fields, f.id, 1) }) },
    { id: "dup", label: t.duplicate, icon: Copy, onSelect: () => duplicateField(f.id) },
    { id: "remove", label: t.remove, icon: Trash2, danger: true, group: "danger", onSelect: () => removeField(f.id) },
  ];

  const ruleFields: RuleField[] = useMemo(
    () =>
      form.fields.map((f) => ({
        id: f.id,
        label: (ar ? f.labelAr || f.label : f.label || f.labelAr) || f.id,
        kind: f.kind === "number" ? "number" : f.kind === "checkbox" ? "boolean" : f.kind === "select" || f.kind === "radio" ? "select" : "text",
        options: f.options?.map((o) => ({ value: o.value, label: (ar ? o.labelAr || o.label : o.label) || o.value })),
      })),
    [form.fields, ar],
  );
  const targetOptions = ruleFields.map((f) => ({ value: f.id, label: f.label }));
  const actionTypes: RuleActionType[] = (["show", "hide", "require"] as const).map((id) => ({
    id,
    label: id === "require" ? t.requireField : t[id],
    fields: [{ name: "target", label: t.target, kind: "select", required: true, options: targetOptions }],
    defaults: { target: "" },
  }));

  const kindItems = FORM_FIELD_KINDS.map((k) => ({ value: k, label: t.kinds[k] }));
  const closed = form.allowedOrigins.length === 0;
  const probeResult = probe.trim() ? formOriginAllowed(form.allowedOrigins, probe) : null;
  const publicLink = `${embedBaseUrl.replace(/\/+$/, "")}/f/${formKey}`;
  const snippet = formEmbedSnippet({ baseUrl: embedBaseUrl, formKey, style, title: form.name || "Form" });

  return (
    <div data-slot="form-builder" className={cn("flex w-full min-w-0 flex-col gap-4", className)} {...props}>
      <div className="flex flex-wrap items-end gap-3">
        <Field className="min-w-48 flex-1">
          <FieldLabel>{t.name}</FieldLabel>
          <Input value={form.name} onChange={(e) => update({ name: e.target.value })} />
        </Field>
        <label className="flex items-center gap-2 pb-2 text-body">
          <Switch checked={form.enabled} onCheckedChange={(c) => update({ enabled: c })} />
          {t.enabled}
        </label>
        {onSave ? (
          <Button type="button" loading={saving} onClick={() => onSave(form)}>
            {t.save}
          </Button>
        ) : null}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList variant="underline">
          {(["fields", "logic", "settings", "embed"] as const).map((k) => (
            <TabsTab key={k} value={k}>
              {t.tabs[k]}
            </TabsTab>
          ))}
        </TabsList>

        <TabsPanel value="fields" className="pt-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="flex min-w-0 flex-col gap-4">
              <Select items={kindItems} value={null} onValueChange={(k) => k && addField(k as FormFieldKind)}>
                <SelectTrigger aria-label={t.addField} className="w-full sm:w-64">
                  <Plus aria-hidden className="size-4 text-muted-foreground" />
                  <SelectValue placeholder={t.addField} />
                </SelectTrigger>
                <SelectContent>
                  {FORM_FIELD_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {t.kinds[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {form.fields.length === 0 ? (
                <p className="text-body-sm text-muted-foreground">{t.noFields}</p>
              ) : (
                <ul aria-label={t.fieldList} className="flex flex-col gap-2">
                  {form.fields.map((f, i) => (
                    <ContextMenuActions
                      key={f.id}
                      actions={rowActions(f, i)}
                      focusTarget={(li) => li.querySelector<HTMLElement>("button[data-field-select]")}
                      render={<li data-slot="form-builder-field" data-id={f.id} className={cn("flex items-center gap-2 rounded-card border border-border bg-card p-2", f.id === selected && "border-primary bg-nq-selected")} />}
                    >
                      <button
                        type="button"
                        data-field-select
                        aria-current={f.id === selected ? "true" : undefined}
                        onClick={() => setSelected(f.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 rounded-control px-1 py-1 text-start outline-none focus-visible:outline-2 focus-visible:outline-nq-focus"
                      >
                        <span className="truncate font-medium">{(ar ? f.labelAr || f.label : f.label || f.labelAr) || t.untitled}</span>
                        <Badge variant="outline">{t.kinds[f.kind]}</Badge>
                        {f.required ? <span className="text-caption text-nq-danger-text">{t.required}</span> : null}
                      </button>
                      <Button type="button" variant="ghost" size="icon-sm" aria-label={t.moveUp} disabled={i === 0} onClick={() => update({ fields: moveFormField(form.fields, f.id, -1) })}>
                        <ArrowUp aria-hidden />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" aria-label={t.moveDown} disabled={i === form.fields.length - 1} onClick={() => update({ fields: moveFormField(form.fields, f.id, 1) })}>
                        <ArrowDown aria-hidden />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" aria-label={t.remove} onClick={() => removeField(f.id)}>
                        <Trash2 aria-hidden />
                      </Button>
                    </ContextMenuActions>
                  ))}
                </ul>
              )}

              {current ? (
                <Card>
                  <CardHeader>
                    <CardTitle as="h3" className="text-body font-medium">
                      {t.editing}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>{t.labelEn}</FieldLabel>
                      <Input value={current.label} onChange={(e) => updateField(current.id, { label: e.target.value })} />
                    </Field>
                    <Field>
                      <FieldLabel>{t.labelAr}</FieldLabel>
                      <Input dir="rtl" value={current.labelAr ?? ""} onChange={(e) => updateField(current.id, { labelAr: e.target.value })} />
                    </Field>
                    <Field>
                      <FieldLabel>{t.kind}</FieldLabel>
                      <Select
                        items={kindItems}
                        value={current.kind}
                        onValueChange={(k) => {
                          const kind = k as FormFieldKind;
                          const options = kind === "select" || kind === "radio" ? (current.options?.length ? current.options : newFormField(kind, []).options) : current.options;
                          updateField(current.id, { kind, options });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FORM_FIELD_KINDS.map((k) => (
                            <SelectItem key={k} value={k}>
                              {t.kinds[k]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <label className="flex items-center gap-2 self-end pb-2 text-body">
                      <Switch checked={Boolean(current.required)} onCheckedChange={(c) => updateField(current.id, { required: c })} />
                      {t.isRequired}
                    </label>
                    {current.kind !== "checkbox" && current.kind !== "radio" && current.kind !== "select" ? (
                      <Field>
                        <FieldLabel>{t.placeholder}</FieldLabel>
                        <Input value={current.placeholder ?? ""} onChange={(e) => updateField(current.id, { placeholder: e.target.value })} />
                      </Field>
                    ) : null}
                    <Field>
                      <FieldLabel>{t.help}</FieldLabel>
                      <Input value={current.help ?? ""} onChange={(e) => updateField(current.id, { help: e.target.value })} />
                    </Field>
                    {current.kind === "select" || current.kind === "radio" ? (
                      <Field className="sm:col-span-2">
                        <FieldLabel>{t.options}</FieldLabel>
                        <OptionsEditor key={current.id} field={current} onChange={(options) => updateField(current.id, { options })} />
                        <FieldDescription>{t.optionsHint}</FieldDescription>
                      </Field>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}
            </div>

            <aside aria-label={t.preview} className="min-w-0">
              <Card>
                <CardHeader>
                  <CardTitle as="h3" className="text-body font-medium">
                    {t.preview}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PublicForm form={{ ...form, enabled: true }} preview locale={locale} />
                </CardContent>
              </Card>
            </aside>
          </div>
        </TabsPanel>

        <TabsPanel value="logic" className="flex flex-col gap-4 pt-4">
          <p className="text-body-sm text-muted-foreground">{t.logicIntro}</p>
          {form.fields.length === 0 ? <p className="text-body-sm text-muted-foreground">{t.ruleFieldsMissing}</p> : null}
          {form.rules.length === 0 && form.fields.length > 0 ? <p className="text-body-sm text-muted-foreground">{t.noRules}</p> : null}
          {form.rules.map((rule, i) => (
            <Card key={i}>
              <CardHeader className="flex-row items-center justify-between gap-2">
                <CardTitle as="h3" className="text-body font-medium">
                  {t.rule(String(i + 1))}
                </CardTitle>
                <Button type="button" variant="ghost" size="sm" onClick={() => update({ rules: form.rules.filter((_, j) => j !== i) })}>
                  <Trash2 aria-hidden />
                  {t.removeRule}
                </Button>
              </CardHeader>
              <CardContent>
                <RuleBuilder
                  events={[{ id: "change", label: t.event }]}
                  fields={ruleFields}
                  actionTypes={actionTypes}
                  value={rule}
                  onValueChange={(next) => update({ rules: form.rules.map((r, j) => (j === i ? next : r)) })}
                />
              </CardContent>
            </Card>
          ))}
          {form.fields.length > 0 ? (
            <div>
              <Button type="button" variant="secondary" onClick={() => update({ rules: [...form.rules, newFormRule("show")] })}>
                <Plus aria-hidden />
                {t.addRule}
              </Button>
            </div>
          ) : null}
        </TabsPanel>

        <TabsPanel value="settings" className="flex max-w-2xl flex-col gap-5 pt-4">
          <Field invalid={originError !== null}>
            <FieldLabel>{t.origins}</FieldLabel>
            <TagInput
              value={form.allowedOrigins}
              placeholder={t.originsAdd}
              inputProps={{ dir: "ltr", "aria-label": t.origins }}
              validate={(tag) => (normalizeFormOrigin(tag) ? true : t.originsInvalid)}
              onReject={(_tag, reason) => setOriginError(reason === "invalid" ? t.originsInvalid : null)}
              onValueChange={(tags) => {
                setOriginError(null);
                const next: string[] = [];
                for (const tag of tags) {
                  const origin = normalizeFormOrigin(tag);
                  if (origin && !next.includes(origin)) next.push(origin);
                }
                update({ allowedOrigins: next });
              }}
            />
            <FieldDescription>{t.originsHint}</FieldDescription>
            <Status tone={closed ? "warning" : "success"}>{closed ? t.originsClosed : t.originsOpen(String(form.allowedOrigins.length))}</Status>
          </Field>
          <Field>
            <FieldLabel>{t.originTest}</FieldLabel>
            <div className="flex flex-wrap items-center gap-3">
              <Input ltr className="max-w-72" value={probe} placeholder="https://www.example.com" onChange={(e) => setProbe(e.target.value)} />
              {probeResult === null ? null : <Status tone={probeResult ? "success" : "danger"}>{probeResult ? t.originTestAllowed : t.originTestBlocked}</Status>}
            </div>
          </Field>
          <Field>
            <FieldLabel>{t.thanksEn}</FieldLabel>
            <Textarea rows={2} value={form.thanksEn} onChange={(e) => update({ thanksEn: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel>{t.thanksAr}</FieldLabel>
            <Textarea rows={2} dir="rtl" value={form.thanksAr} onChange={(e) => update({ thanksAr: e.target.value })} />
          </Field>
          <Field>
            <label className="flex items-center gap-2 text-body">
              <Switch checked={form.honeypot} onCheckedChange={(c) => update({ honeypot: c })} />
              {t.honeypot}
            </label>
            <FieldDescription>{t.honeypotHint}</FieldDescription>
          </Field>
        </TabsPanel>

        <TabsPanel value="embed" className="flex max-w-2xl flex-col gap-4 pt-4">
          <p className="text-body-sm text-muted-foreground">{t.embedIntro}</p>
          {closed ? <Status tone="warning">{t.embedClosed}</Status> : null}
          <div className="flex gap-2">
            {(["iframe", "script"] as const).map((k) => (
              <Button key={k} type="button" size="sm" variant="secondary" aria-pressed={style === k} data-selected={style === k || undefined} className="data-selected:border-primary data-selected:bg-nq-selected" onClick={() => setStyle(k)}>
                {t[k]}
              </Button>
            ))}
          </div>
          <CodeBlock code={snippet} language="html" />
          <div className="flex items-center gap-2">
            <CopyButton variant="secondary" value={publicLink} label={t.copyLink} />
            <bdi dir="ltr" className="truncate text-body-sm text-muted-foreground">
              {publicLink}
            </bdi>
          </div>
        </TabsPanel>
      </Tabs>
    </div>
  );
}

/** Options are typed as lines; the text is kept while typing and parsed on every change. */
function OptionsEditor({ field, onChange }: { field: FormFieldDef; onChange: (options: NonNullable<FormFieldDef["options"]>) => void }) {
  const [text, setText] = useState(() => formatFormOptions(field.options));
  return (
    <Textarea
      rows={4}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseFormOptions(e.target.value));
      }}
    />
  );
}
