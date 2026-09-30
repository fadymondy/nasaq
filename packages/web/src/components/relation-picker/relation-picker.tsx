"use client";

import { LoaderCircle, Plus, TriangleAlert } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Combobox, ComboboxChips, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, comboboxFilter } from "../combobox";

const STRINGS = {
  en: {
    placeholder: "Search…",
    searching: "Searching…",
    empty: "No results",
    hint: "Type to search",
    error: "Could not load results.",
    retry: "Try again",
    create: (q: string) => `Create “${q}”`,
    creating: "Creating…",
    createFailed: "Could not create it.",
    clear: "Clear",
    open: "Open list",
    remove: "Remove",
  },
  ar: {
    placeholder: "ابحث…",
    searching: "جارٍ البحث…",
    empty: "لا توجد نتائج",
    hint: "اكتب للبحث",
    error: "تعذر تحميل النتائج.",
    retry: "حاول مرة أخرى",
    create: (q: string) => `إنشاء «${q}»`,
    creating: "جارٍ الإنشاء…",
    createFailed: "تعذر الإنشاء.",
    clear: "مسح",
    open: "فتح القائمة",
    remove: "إزالة",
  },
};
export type RelationPickerLabels = Partial<(typeof STRINGS)["en"]>;

/** One record the picker can point at. `value` is what gets stored: the record's id. */
export interface RelationOption {
  value: string;
  label: string;
  labelAr?: string;
  /** Second line: an email, a code, an address. */
  description?: string;
  disabled?: boolean;
}

interface RelationPickerBase {
  /** Finds records for what was typed. Called with an empty query to fill the list on open. Aborted when the query changes. */
  search?: (query: string, signal: AbortSignal) => Promise<readonly RelationOption[]>;
  /** Fixed records. Shown before anything is typed, and searched on the client when `search` is omitted. */
  options?: readonly RelationOption[];
  /** Turns stored ids into records, so a saved value shows its name and not its id. Called once for ids it has not seen. */
  resolve?: (ids: readonly string[]) => Promise<readonly RelationOption[]>;
  /** Adds a "Create ..." row for the typed text. Resolve with the new record to select it, or `{ error }`. */
  onCreate?: (query: string) => Promise<RelationOption | { error: string }>;
  /** Milliseconds to wait after typing before searching. Default 250. */
  debounce?: number;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  name?: string;
  /** Accessible name when no label points at the field. */
  "aria-label"?: string;
  /** Custom row: defaults to the label and its description. */
  renderOption?: (option: RelationOption) => ReactNode;
  locale?: string;
  labels?: RelationPickerLabels;
  className?: string;
}

export type RelationPickerProps = RelationPickerBase &
  (
    | { multiple?: false; value?: string | null; defaultValue?: string | null; onValueChange?: (value: string | null, option: RelationOption | null) => void }
    | { multiple: true; value?: readonly string[]; defaultValue?: readonly string[]; onValueChange?: (value: string[], options: RelationOption[]) => void }
  );

const CREATE = "\u0000create";

const text = (option: RelationOption, ar: boolean) => (ar ? option.labelAr || option.label : option.label || option.labelAr) ?? "";

/**
 * A field that points at another record (a customer, a project, an assignee) and finds it by searching. Results come
 * from your `search` function, so the list can be millions of rows long. It stores ids, shows names, can create a
 * record from what was typed, and works on one record or many. Filtering is Arabic-aware.
 */
export function RelationPicker(props: RelationPickerProps) {
  const {
    search,
    options: fixed,
    resolve,
    onCreate,
    debounce = 250,
    placeholder,
    disabled,
    invalid,
    id,
    name,
    renderOption,
    locale: localeProp,
    labels,
    className,
  } = props;
  const ambient = useOptionalNasaq()?.locale ?? "en";
  const locale = localeProp ?? ambient;
  const ar = locale.startsWith("ar");
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const multiple = props.multiple === true;

  const [inner, setInner] = useState<string | readonly string[] | null>(props.defaultValue ?? (multiple ? [] : null));
  const raw = props.value === undefined ? inner : props.value;
  const ids = useMemo<string[]>(() => (multiple ? [...((raw as readonly string[] | null) ?? [])] : raw ? [raw as string] : []), [multiple, raw]);

  // Every record seen so far, so a selected id keeps its name when the results change.
  const known = useRef(new Map<string, RelationOption>());
  const [, bump] = useState(0);
  const remember = useCallback((list: readonly RelationOption[]) => {
    let changed = false;
    for (const o of list) {
      const before = known.current.get(o.value);
      if (!before || before.label !== o.label || before.labelAr !== o.labelAr) {
        known.current.set(o.value, o);
        changed = true;
      }
    }
    if (changed) bump((n) => n + 1);
  }, []);
  useEffect(() => remember(fixed ?? []), [fixed, remember]);

  useEffect(() => {
    const missing = ids.filter((x) => !known.current.has(x));
    if (!missing.length || !resolve) return;
    let cancelled = false;
    resolve(missing).then(
      (list) => !cancelled && remember(list),
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [ids, resolve, remember]);

  const optionOf = useCallback((value: string): RelationOption => known.current.get(value) ?? { value, label: value }, []);
  const selected = ids.map(optionOf);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly RelationOption[]>(fixed ?? []);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [open, setOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const [createState, setCreateState] = useState<"idle" | "busy" | "failed">("idle");

  useEffect(() => {
    if (!open) return;
    if (!search) {
      setResults((fixed ?? []).filter((o) => comboboxFilter(o, query, (x) => `${text(x, ar)} ${x.description ?? ""}`)));
      setStatus("idle");
      return;
    }
    const controller = new AbortController();
    setStatus("loading");
    const timer = setTimeout(
      () => {
        search(query, controller.signal).then(
          (list) => {
            if (controller.signal.aborted) return;
            remember(list);
            setResults(list);
            setStatus("idle");
          },
          () => {
            if (!controller.signal.aborted) setStatus("error");
          },
        );
      },
      query ? debounce : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, search, fixed, debounce, ar, remember, retry]);

  const commit = (values: string[]) => {
    if (props.value === undefined) setInner(multiple ? values : (values[0] ?? null));
    if (props.multiple === true) props.onValueChange?.(values, values.map(optionOf));
    else (props as { onValueChange?: (v: string | null, o: RelationOption | null) => void }).onValueChange?.(values[0] ?? null, values[0] ? optionOf(values[0]) : null);
  };

  const create = async () => {
    if (!onCreate || !query.trim()) return;
    setCreateState("busy");
    try {
      const made = await onCreate(query.trim());
      if ("error" in made) {
        setCreateState("failed");
        return;
      }
      remember([made]);
      known.current.set(made.value, made);
      commit(multiple ? [...ids.filter((x) => x !== made.value), made.value] : [made.value]);
      setCreateState("idle");
      setQuery("");
      setOpen(false);
    } catch {
      setCreateState("failed");
    }
  };

  // Selected records always stay in the list, so the box can show them.
  const items = useMemo(() => {
    const shown = new Map<string, RelationOption>();
    for (const o of selected) shown.set(o.value, o);
    for (const o of results) shown.set(o.value, o);
    const list = [...shown.values()];
    const canCreate = onCreate && query.trim() && !list.some((o) => text(o, ar).trim().toLowerCase() === query.trim().toLowerCase());
    return canCreate ? [...list, { value: CREATE, label: t.create(query.trim()) }] : list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, ids, onCreate, query, ar, t.create]);

  const row = (o: RelationOption) => (
    <ComboboxItem key={o.value} value={o} disabled={o.disabled}>
      {o.value === CREATE ? (
        <span className="flex items-center gap-2 text-foreground">
          <Plus aria-hidden className="size-4 shrink-0" />
          <bdi dir="auto" className="truncate">
            {o.label}
          </bdi>
        </span>
      ) : renderOption ? (
        renderOption(o)
      ) : (
        <span className="flex min-w-0 flex-col leading-tight">
          <bdi dir="auto" className="truncate">
            {text(o, ar)}
          </bdi>
          {o.description ? (
            <bdi dir="auto" className="truncate text-caption text-muted-foreground">
              {o.description}
            </bdi>
          ) : null}
        </span>
      )}
    </ComboboxItem>
  );

  const emptyText = status === "loading" ? t.searching : status === "error" ? t.error : query || fixed?.length || search === undefined ? t.empty : t.hint;
  const common = {
    items,
    filter: null,
    open,
    disabled,
    itemToStringLabel: (o: RelationOption) => text(o, ar),
    isItemEqualToValue: (a: RelationOption, b: RelationOption) => a.value === b.value,
    onOpenChange: (next: boolean) => {
      setOpen(next);
      if (!next) setQuery("");
    },
    onInputValueChange: (value: string, details: { reason: string }) => {
      if (details.reason === "input-change") setQuery(value);
      else if (details.reason === "input-clear" || details.reason === "clear-press") setQuery("");
    },
  };

  const list = (
    <ComboboxContent>
      <ComboboxEmpty>
        <span className="flex items-center justify-center gap-2" role="status">
          {status === "loading" ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : status === "error" ? <TriangleAlert aria-hidden className="size-4 text-nq-danger-text" /> : null}
          {emptyText}
          {status === "error" ? (
            <button type="button" className="text-foreground underline underline-offset-2" onClick={() => setRetry((n) => n + 1)}>
              {t.retry}
            </button>
          ) : null}
        </span>
      </ComboboxEmpty>
      {createState === "failed" ? (
        <p role="alert" className="px-2.5 py-1.5 text-caption text-nq-danger-text">
          {t.createFailed}
        </p>
      ) : null}
      <ComboboxList>{(o: RelationOption) => row(o)}</ComboboxList>
    </ComboboxContent>
  );

  const pick = (next: RelationOption | null, all?: RelationOption[]) => {
    if (all) {
      if (all.some((o) => o.value === CREATE)) {
        void create();
        return;
      }
      remember(all);
      commit(all.map((o) => o.value));
      return;
    }
    if (next?.value === CREATE) {
      void create();
      return;
    }
    if (next) remember([next]);
    commit(next ? [next.value] : []);
  };

  return (
    <div data-slot="relation-picker" data-busy={status === "loading" || createState === "busy" ? "" : undefined} className={cn("min-w-0", className)}>
      {multiple ? (
        <Combobox<RelationOption, true> {...common} multiple value={selected} onValueChange={(next) => pick(null, next)}>
          <ComboboxChips
            placeholder={placeholder ?? t.placeholder}
            removeLabel={t.remove}
            itemToLabel={(o) => <bdi dir="auto">{text(o as RelationOption, ar)}</bdi>}
            inputProps={{ id, "aria-label": props["aria-label"], "aria-invalid": invalid || undefined }}
          />
          {list}
        </Combobox>
      ) : (
        <Combobox<RelationOption> {...common} value={selected[0] ?? null} onValueChange={(next) => pick(next)}>
          <ComboboxInput id={id} placeholder={placeholder ?? t.placeholder} aria-label={props["aria-label"]} aria-invalid={invalid || undefined} clearLabel={t.clear} triggerLabel={t.open} />
          {list}
        </Combobox>
      )}
      {name ? ids.map((x) => <input key={x} type="hidden" name={name} value={x} />) : null}
    </div>
  );
}
