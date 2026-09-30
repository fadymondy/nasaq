"use client";

import { ChevronDown, Cookie } from "lucide-react";
import { type ComponentProps, useEffect, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { useAuthLocale } from "../auth-layout/auth-utils";
import { Alert } from "../alert";
import { Button } from "../button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "../collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Switch } from "../switch";
import { acceptAll, type ConsentCategory, consentSource, type ConsentSource, type ConsentState, DEFAULT_CONSENT_CATEGORIES, normalizeConsent, rejectAll } from "./consent-model";

const STRINGS = {
  en: {
    title: "Your privacy choices",
    description: "We use cookies to keep the site working. With your permission we also use them to understand how it is used and to remember your settings. You can change this at any time.",
    policy: "Cookie policy",
    acceptAll: "Accept all",
    rejectAll: "Reject all",
    customise: "Customise",
    preferencesTitle: "Cookie preferences",
    preferencesDescription: "Choose which kinds of cookies we may use. Strictly necessary cookies cannot be turned off because the site does not work without them.",
    save: "Save choices",
    alwaysOn: "Always on",
    showCookies: "Show cookies ({count})",
    hideCookies: "Hide cookies",
    colName: "Name",
    colPurpose: "Purpose",
    colDuration: "Duration",
    failed: "Your choices could not be saved. Try again.",
    banner: "Cookie consent",
    categories: {
      necessary: { label: "Strictly necessary", description: "Keep you signed in, protect against fraud and remember this choice." },
      preferences: { label: "Preferences", description: "Remember your language, theme and layout." },
      analytics: { label: "Analytics", description: "Help us see which pages are used and where things break, in aggregate." },
      marketing: { label: "Marketing", description: "Measure campaigns and show relevant ads on other sites." },
    } as Record<string, { label: string; description: string }>,
  },
  ar: {
    title: "خياراتك في الخصوصية",
    description: "نستخدم ملفات تعريف الارتباط لإبقاء الموقع يعمل. وبإذنك نستخدمها أيضًا لفهم كيفية استخدامه وتذكّر إعداداتك. يمكنك تغيير ذلك في أي وقت.",
    policy: "سياسة ملفات تعريف الارتباط",
    acceptAll: "قبول الكل",
    rejectAll: "رفض الكل",
    customise: "تخصيص",
    preferencesTitle: "تفضيلات ملفات تعريف الارتباط",
    preferencesDescription: "اختر أنواع ملفات تعريف الارتباط التي يمكننا استخدامها. لا يمكن إيقاف الضرورية منها لأن الموقع لا يعمل بدونها.",
    save: "حفظ الاختيارات",
    alwaysOn: "مفعّلة دائمًا",
    showCookies: "عرض الملفات ({count})",
    hideCookies: "إخفاء الملفات",
    colName: "الاسم",
    colPurpose: "الغرض",
    colDuration: "المدة",
    failed: "تعذّر حفظ اختياراتك. حاول مرة أخرى.",
    banner: "الموافقة على ملفات تعريف الارتباط",
    categories: {
      necessary: { label: "ضرورية", description: "تُبقيك مسجّل الدخول وتحميك من الاحتيال وتتذكّر هذا الاختيار." },
      preferences: { label: "التفضيلات", description: "تتذكّر لغتك وسمتك وتخطيطك." },
      analytics: { label: "التحليلات", description: "تساعدنا على معرفة الصفحات المستخدمة وأماكن الأعطال، بشكل مجمّع." },
      marketing: { label: "التسويق", description: "تقيس الحملات وتعرض إعلانات مناسبة في مواقع أخرى." },
    } as Record<string, { label: string; description: string }>,
  },
};

export type CookieConsentLabels = Omit<(typeof STRINGS)["en"], "categories"> & { categories: Record<string, { label: string; description: string }> };

export type ConsentSaveResult = void | { error?: string };

export interface CookieConsentProps extends Omit<ComponentProps<"section">, "children" | "onChange"> {
  /** What you ask about. Default: necessary, preferences, analytics, marketing. */
  categories?: ConsentCategory[];
  /** The saved choice. `null` or omitted means the visitor has not decided, so the banner shows. */
  consent?: ConsentState | null;
  /** Called with the full state when the visitor accepts, rejects or saves. Store it and apply it; this component does neither. */
  onSave: (consent: ConsentState, source: ConsentSource) => Promise<ConsentSaveResult> | ConsentSaveResult;
  /** Controlled open state of the preferences dialog. Use it to reopen from a "Cookie settings" link. */
  preferencesOpen?: boolean;
  onPreferencesOpenChange?: (open: boolean) => void;
  /** Link to your cookie policy. */
  policyHref?: string;
  /** `bottom` spans the width; `start` and `end` are corner cards. Default `bottom`. */
  position?: "bottom" | "start" | "end";
  /** Render in the page flow instead of fixed to the viewport (docs, previews). */
  inline?: boolean;
  labels?: Partial<Omit<CookieConsentLabels, "categories">> & { categories?: CookieConsentLabels["categories"] };
}

/**
 * A consent banner and its preferences dialog. Reject and Accept carry the same weight, categories
 * start off unless required, and every choice goes through `onSave`. It holds no tracking code and
 * sets no cookies of its own: `consentModeSignals` turns the result into Consent Mode values.
 */
export function CookieConsent({
  categories = DEFAULT_CONSENT_CATEGORIES,
  consent,
  onSave,
  preferencesOpen,
  onPreferencesOpenChange,
  policyHref,
  position = "bottom",
  inline = false,
  labels: labelsProp,
  className,
  ...props
}: CookieConsentProps) {
  const locale = STRINGS[useAuthLocale()];
  const t = { ...locale, ...labelsProp, categories: { ...locale.categories, ...labelsProp?.categories } };
  const [saved, setSaved] = useState<ConsentState | null>(consent ?? null);
  useEffect(() => {
    if (consent !== undefined) setSaved(consent);
  }, [consent]);
  const [innerOpen, setInnerOpen] = useState(false);
  const open = preferencesOpen ?? innerOpen;
  const setOpen = (next: boolean) => {
    setInnerOpen(next);
    onPreferencesOpenChange?.(next);
  };
  const [pending, setPending] = useState<ConsentSource | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [draft, setDraft] = useState<ConsentState>(() => normalizeConsent(categories, saved));

  useEffect(() => {
    if (open) setDraft(normalizeConsent(categories, saved));
  }, [open, categories, saved]);

  const commit = async (state: ConsentState, source: ConsentSource) => {
    setPending(source);
    setError(undefined);
    try {
      const result = await onSave(state, source);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSaved(state);
      setOpen(false);
    } catch {
      setError(t.failed);
    } finally {
      setPending(null);
    }
  };

  const busy = pending !== null;
  const banner =
    saved === null ? (
      <section
        data-slot="cookie-consent"
        data-position={position}
        aria-label={t.banner}
        className={cn(
          "z-50 flex flex-col gap-4 rounded-floating border border-border bg-popover p-4 text-popover-foreground shadow-floating sm:p-5",
          !inline && "fixed bottom-4 inset-x-4",
          !inline && position === "bottom" && "mx-auto max-w-4xl sm:flex-row sm:items-center",
          !inline && position === "start" && "sm:end-auto sm:start-4 sm:max-w-sm",
          !inline && position === "end" && "sm:start-auto sm:end-4 sm:max-w-sm",
          inline && "max-w-4xl",
          className,
        )}
        {...props}
      >
        <div className="flex min-w-0 flex-1 gap-3">
          <Cookie aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-label text-foreground">{t.title}</h2>
            <p className="text-body-sm text-muted-foreground">
              {t.description}
              {policyHref ? (
                <>
                  {" "}
                  <a href={policyHref} className="text-foreground underline underline-offset-4">
                    {t.policy}
                  </a>
                </>
              ) : null}
            </p>
            {error && !open ? <p role="alert" className="text-caption text-nq-danger-text">{error}</p> : null}
          </div>
        </div>
        <div data-slot="cookie-consent-actions" className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
          <Button variant="ghost" disabled={busy} onClick={() => setOpen(true)}>
            {t.customise}
          </Button>
          <Button variant="secondary" loading={pending === "reject-all"} disabled={busy && pending !== "reject-all"} onClick={() => void commit(rejectAll(categories), "reject-all")}>
            {t.rejectAll}
          </Button>
          <Button variant="secondary" loading={pending === "accept-all"} disabled={busy && pending !== "accept-all"} onClick={() => void commit(acceptAll(categories), "accept-all")}>
            {t.acceptAll}
          </Button>
        </div>
      </section>
    ) : null;

  return (
    <>
      {banner}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl" data-slot="cookie-preferences">
          <DialogHeader>
            <DialogTitle>{t.preferencesTitle}</DialogTitle>
            <DialogDescription>{t.preferencesDescription}</DialogDescription>
          </DialogHeader>
          <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
            {categories.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                labels={t}
                checked={category.required ? true : Boolean(draft[category.id])}
                onCheckedChange={(next) => setDraft((d) => ({ ...d, [category.id]: next }))}
              />
            ))}
          </ul>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <DialogFooter>
            <Button variant="secondary" loading={pending === "reject-all"} disabled={busy && pending !== "reject-all"} onClick={() => void commit(rejectAll(categories), "reject-all")}>
              {t.rejectAll}
            </Button>
            <Button variant="secondary" loading={pending === "accept-all"} disabled={busy && pending !== "accept-all"} onClick={() => void commit(acceptAll(categories), "accept-all")}>
              {t.acceptAll}
            </Button>
            <Button variant="primary" loading={pending === "custom"} disabled={busy && pending !== "custom"} onClick={() => void commit(normalizeConsent(categories, draft), consentSource(categories, draft))}>
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CategoryRow({
  category,
  labels: t,
  checked,
  onCheckedChange,
}: {
  category: ConsentCategory;
  labels: CookieConsentLabels;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = useId();
  const built = t.categories[category.id];
  const label = category.label ?? built?.label ?? category.id;
  const description = category.description ?? built?.description;
  const cookies = category.cookies ?? [];
  return (
    <li data-slot="cookie-category" data-category={category.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span id={`${id}-label`} className="text-label text-foreground">
            {label}
          </span>
          {description ? (
            <span id={`${id}-desc`} className="text-body-sm text-muted-foreground">
              {description}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {category.required ? <span className="text-caption text-muted-foreground">{t.alwaysOn}</span> : null}
          <Switch checked={checked} disabled={category.required} onCheckedChange={onCheckedChange} aria-labelledby={`${id}-label`} aria-describedby={description ? `${id}-desc` : undefined} />
        </div>
      </div>
      {cookies.length ? (
        <Collapsible>
          <CollapsibleTrigger className="group inline-flex items-center gap-1 rounded-control text-caption text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">
            <ChevronDown aria-hidden="true" className="size-3.5 transition-transform group-data-panel-open:rotate-180" />
            <span className="group-data-panel-open:hidden">{t.showCookies.replace("{count}", String(cookies.length))}</span>
            <span className="hidden group-data-panel-open:inline">{t.hideCookies}</span>
          </CollapsibleTrigger>
          <CollapsiblePanel>
            <div className="mt-2 overflow-x-auto rounded-control border border-border">
              <table className="w-full text-start text-caption">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-2.5 py-1.5 text-start font-medium">{t.colName}</th>
                    <th scope="col" className="px-2.5 py-1.5 text-start font-medium">{t.colPurpose}</th>
                    <th scope="col" className="px-2.5 py-1.5 text-start font-medium">{t.colDuration}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cookies.map((cookie) => (
                    <tr key={cookie.name}>
                      <td className="px-2.5 py-1.5 align-top">
                        <bdi dir="ltr" className="font-mono text-foreground">{cookie.name}</bdi>
                      </td>
                      <td className="px-2.5 py-1.5 align-top text-muted-foreground">{cookie.purpose}</td>
                      <td className="px-2.5 py-1.5 align-top whitespace-nowrap text-muted-foreground">{cookie.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsiblePanel>
        </Collapsible>
      ) : null}
    </li>
  );
}
