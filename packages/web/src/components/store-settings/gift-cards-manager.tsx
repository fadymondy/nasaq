"use client";

import { CircleX, Gift, RefreshCw, Plus, Trash2 } from "lucide-react";
import { type ComponentProps, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { CurrencyInput } from "../currency-input";
import { DataTable, type DataTableColumn, DataTableFacetFilter, DataTableSearch, DataTableToolbar, useDataTable } from "../data-table";
import { DatePicker } from "../date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldLabel, Input } from "../field";
import { formatDate } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../sheet";
import { EmptyState } from "../states";
import { Status, type StatusTone } from "../status";
import { Switch } from "../switch";
import {
  adjustGiftCard,
  applyGiftCards,
  generateGiftCardCode,
  type GiftCard,
  type GiftCardApplication,
  type GiftCardError,
  type GiftCardStatus,
  giftCardBalance,
  giftCardStatus,
  initialValue,
  isValidGiftCardCode,
  issueGiftCard,
  ledgerIssues,
  maskGiftCardCode,
  normalizeGiftCardCode,
  redeemGiftCard,
} from "./gift-card-logic";
import { Money, type SettingsResult, type StoreSettingsLabels, uid, useAction, useSettingsStrings } from "./store-settings-shared";

const STATUSES: GiftCardStatus[] = ["active", "depleted", "expired", "disabled"];
const STATUS_TONE: Record<GiftCardStatus, StatusTone> = { active: "success", depleted: "neutral", expired: "warning", disabled: "danger" };
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 0).toISOString();

export interface GiftCardsManagerProps extends Omit<ComponentProps<"section">, "children"> {
  cards: readonly GiftCard[];
  /** ISO 4217 code of the store. New cards are issued in it. */
  currency: string;
  /** Today. Defaults to the current time. */
  now?: Date;
  /** Saves a newly issued card (its ledger holds the issue entry). Resolve `{ error }` to keep the dialog open. */
  onIssue: (card: GiftCard) => Promise<SettingsResult>;
  /** Saves a card after a redeem, an adjustment or a disable. It arrives with its new ledger entry. */
  onUpdate: (card: GiftCard) => Promise<SettingsResult>;
  /** Who is acting, recorded on ledger entries. */
  actor?: string;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  labels?: StoreSettingsLabels;
}

/**
 * Gift cards for the merchant: issue with a generated code (with a check character), see each card's balance and full
 * ledger history, redeem an amount, add or remove balance by hand, and disable a card. The balance is never stored, it
 * is the sum of the ledger. Money is integer minor units.
 */
export function GiftCardsManager({ cards, currency, now, onIssue, onUpdate, actor, loading = false, error, onRetry, labels, className, ...props }: GiftCardsManagerProps) {
  const { t, locale } = useSettingsStrings(labels);
  const today = useMemo(() => now ?? new Date(), [now]);
  const [issuing, setIssuing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const action = useAction(t.saveFailed);
  const open = cards.find((c) => c.id === openId) ?? null;
  const dateOf = (iso: string) => formatDate(iso, locale, { dateStyle: "medium" });

  const columns: DataTableColumn<GiftCard>[] = [
    {
      id: "code",
      header: t.code,
      label: t.code,
      cell: (c) => (
        <div className="flex min-w-0 flex-col">
          <bdi dir="ltr" className="truncate font-mono text-body-sm font-medium text-foreground">
            {c.code}
          </bdi>
          {c.recipient?.name ? <span className="truncate text-caption text-muted-foreground">{c.recipient.name}</span> : null}
        </div>
      ),
      sortValue: (c) => c.code,
      searchValue: (c) => `${c.code} ${c.recipient?.name ?? ""} ${c.recipient?.email ?? ""}`,
    },
    { id: "status", header: t.statusCol, label: t.statusCol, cell: (c) => <Status tone={STATUS_TONE[giftCardStatus(c, today)]}>{t.giftStatuses[giftCardStatus(c, today)]}</Status>, sortValue: (c) => giftCardStatus(c, today), filterValue: (c) => giftCardStatus(c, today) },
    { id: "balance", header: t.balance, label: t.balance, align: "end", cell: (c) => <Money minor={giftCardBalance(c, today)} currency={c.currency} className="font-medium" />, sortValue: (c) => giftCardBalance(c, today) },
    { id: "issued", header: t.issuedValue, label: t.issuedValue, align: "end", defaultHidden: true, cell: (c) => <Money minor={initialValue(c)} currency={c.currency} />, sortValue: (c) => initialValue(c) },
    { id: "expires", header: t.expires, label: t.expires, cell: (c) => (c.expiresAt ? dateOf(c.expiresAt) : <span className="text-muted-foreground">{t.never}</span>), sortValue: (c) => c.expiresAt ?? "9999" },
  ];
  const table = useDataTable({ data: cards as GiftCard[], columns, getRowId: (c) => c.id, pageSize: 10, defaultSort: { id: "status", direction: "asc" } });

  return (
    <section data-slot="gift-cards-manager" aria-label={t.giftCards} className={cn("flex min-w-0 flex-col gap-4", className)} {...props}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-h3 text-foreground">{t.giftCards}</h2>
        <Button variant="primary" onClick={() => (action.setError(null), setIssuing(true))}>
          <Plus aria-hidden />
          {t.issueCard}
        </Button>
      </div>
      <DataTableToolbar>
        <DataTableSearch table={table} placeholder={t.searchCards} />
        <DataTableFacetFilter table={table} column="status" title={t.statusCol} options={STATUSES.map((s) => ({ value: s, label: t.giftStatuses[s] }))} />
      </DataTableToolbar>
      <DataTable
        table={table}
        label={t.giftCards}
        rowLabel={(c) => c.code}
        loading={loading}
        error={error}
        onRetry={onRetry}
        onRowClick={(c) => (action.setError(null), setOpenId(c.id))}
        rowActions={(c) => [
          { id: "open", label: t.openCard, icon: Gift, onSelect: () => (action.setError(null), setOpenId(c.id)) },
          { id: "toggle", label: c.disabled ? t.enable : t.disable, group: "state", onSelect: () => void action.run(() => onUpdate({ ...c, disabled: !c.disabled })) },
        ]}
        empty={<EmptyState icon={Gift} title={t.cardsEmpty} description={t.cardsEmptyHint} className="border-0" actions={<Button size="sm" onClick={() => setIssuing(true)}>{t.issueCard}</Button>} />}
      />
      {action.error && !issuing && !open ? (
        <p role="alert" className="flex items-center gap-2 text-body-sm text-nq-danger-text">
          <CircleX aria-hidden className="size-4" />
          {action.error}
        </p>
      ) : null}

      {issuing ? (
        <IssueDialog
          currency={currency}
          now={today}
          existing={cards.map((c) => c.code)}
          actor={actor}
          busy={action.busy}
          error={action.error}
          labels={labels}
          onCancel={() => setIssuing(false)}
          onIssue={(card) => void action.run(() => onIssue(card)).then((ok) => ok && setIssuing(false))}
        />
      ) : null}

      <Sheet open={open !== null} onOpenChange={(o) => !o && !action.busy && setOpenId(null)}>
        <SheetContent className="sm:max-w-lg">
          {open ? <CardDetail card={open} now={today} actor={actor} busy={action.busy} error={action.error} labels={labels} onUpdate={(c) => action.run(() => onUpdate(c))} /> : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}

/* ------------------------------------------------------------------ issue */

function IssueDialog({ currency, now, existing, actor, busy, error, labels, onCancel, onIssue }: { currency: string; now: Date; existing: readonly string[]; actor: string | undefined; busy: boolean; error: string | null; labels?: StoreSettingsLabels; onCancel: () => void; onIssue: (c: GiftCard) => void }) {
  const { t } = useSettingsStrings(labels);
  const id = useId();
  const [code, setCode] = useState(() => generateGiftCardCode());
  const [amount, setAmount] = useState<number | null>(50000);
  const [expires, setExpires] = useState<Date | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const clean = normalizeGiftCardCode(code);
  const codeOk = isValidGiftCardCode(clean);
  const taken = existing.some((c) => normalizeGiftCardCode(c) === clean);
  const emailOk = !email.trim() || /^\S+@\S+\.\S+$/.test(email.trim());
  const bad = !amount || amount <= 0 || !codeOk || taken || !emailOk;
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onCancel()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (bad || !amount) return;
            const card = issueGiftCard({ id: uid("gc"), code: clean, amount, currency, now, ...(expires ? { expiresAt: endOfDay(expires) } : {}), ...(name.trim() || email.trim() ? { recipient: { ...(name.trim() ? { name: name.trim() } : {}), ...(email.trim() ? { email: email.trim() } : {}) } } : {}), ...(actor ? { by: actor } : {}) });
            if (!("error" in card)) onIssue(card);
          }}
        >
          <DialogHeader>
            <DialogTitle>{t.issueCard}</DialogTitle>
            <DialogDescription>{t.issueHint}</DialogDescription>
          </DialogHeader>
          <Field invalid={touched && (!codeOk || taken)}>
            <FieldLabel htmlFor={`${id}-code`}>{t.code}</FieldLabel>
            <div className="flex gap-2">
              <Input id={`${id}-code`} ltr className="flex-1 font-mono uppercase" value={code} onChange={(e) => setCode(e.target.value)} />
              <Button type="button" variant="secondary" onClick={() => setCode(generateGiftCardCode())}>
                <RefreshCw aria-hidden />
                {t.generate}
              </Button>
            </div>
            <FieldDescription>{taken ? t.codeTaken : codeOk ? t.codeHint : t.codeInvalid}</FieldDescription>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field invalid={touched && (!amount || amount <= 0)}>
              <FieldLabel>{t.amount}</FieldLabel>
              <CurrencyInput currency={currency} value={amount} onValueChange={setAmount} aria-label={t.amount} />
            </Field>
            <Field>
              <FieldLabel>{t.expires}</FieldLabel>
              <DatePicker aria-label={t.expires} value={expires} onValueChange={setExpires} />
              <FieldDescription>{t.expiresHint}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-name`}>{t.recipientName}</FieldLabel>
              <Input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field invalid={touched && !emailOk}>
              <FieldLabel htmlFor={`${id}-email`}>{t.recipientEmail}</FieldLabel>
              <Input id={`${id}-email`} ltr type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
          </div>
          {error ? (
            <p role="alert" className="text-body-sm text-nq-danger-text">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              {t.issueCard}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ detail */

function CardDetail({ card, now, actor, busy, error, labels, onUpdate }: { card: GiftCard; now: Date; actor: string | undefined; busy: boolean; error: string | null; labels?: StoreSettingsLabels; onUpdate: (c: GiftCard) => Promise<boolean> }) {
  const { t, locale } = useSettingsStrings(labels);
  const id = useId();
  const [redeem, setRedeem] = useState<number | null>(null);
  const [orderId, setOrderId] = useState("");
  const [adjust, setAdjust] = useState<number | null>(null);
  const [adjustDir, setAdjustDir] = useState<"add" | "remove">("add");
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const status = giftCardStatus(card, now);
  const balance = giftCardBalance(card, now);
  const issues = ledgerIssues(card.ledger);
  const rows = [...card.ledger].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  const fail = (e: GiftCardError) => (setDone(null), setProblem(t.giftErrors[e]));
  const doRedeem = async () => {
    setProblem(null);
    if (!redeem) return fail("invalid-amount");
    const r = redeemGiftCard(card, redeem, { now, currency: card.currency, exact: true, ...(orderId.trim() ? { orderId: orderId.trim() } : {}), ...(actor ? { by: actor } : {}) });
    if (!r.ok) return fail(r.error);
    if (await onUpdate(r.card)) (setRedeem(null), setOrderId(""), setDone(t.redeemed));
  };
  const doAdjust = async () => {
    setProblem(null);
    if (!adjust) return fail("invalid-amount");
    const r = adjustGiftCard(card, adjustDir === "add" ? adjust : -adjust, { now, ...(note.trim() ? { note: note.trim() } : {}), ...(actor ? { by: actor } : {}) });
    if (!r.ok) return fail(r.error);
    if (await onUpdate(r.card)) (setAdjust(null), setNote(""), setDone(t.adjusted));
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>
          <bdi dir="ltr" className="font-mono">
            {card.code}
          </bdi>
        </SheetTitle>
        <SheetDescription>{card.recipient?.name ? `${card.recipient.name}${card.recipient.email ? ` · ${card.recipient.email}` : ""}` : t.noRecipient}</SheetDescription>
      </SheetHeader>
      <SheetBody className="grid content-start gap-5">
        <div className="grid grid-cols-2 gap-3 rounded-card border border-border bg-nq-surface-soft p-3">
          <div>
            <p className="text-caption text-muted-foreground">{t.balance}</p>
            <p className="text-h3 text-foreground">
              <Money minor={balance} currency={card.currency} />
            </p>
          </div>
          <div className="grid content-start gap-1">
            <Status tone={STATUS_TONE[status]}>{t.giftStatuses[status]}</Status>
            <p className="text-caption text-muted-foreground">
              {t.issuedValue}: <Money minor={initialValue(card)} currency={card.currency} />
            </p>
            <p className="text-caption text-muted-foreground">
              {t.expires}: {card.expiresAt ? formatDate(card.expiresAt, locale, { dateStyle: "medium" }) : t.never}
            </p>
          </div>
        </div>

        {issues.length > 0 ? (
          <Alert tone="danger" title={t.ledgerProblem}>
            {issues.map((i) => t.ledgerIssues[i]).join(" ")}
          </Alert>
        ) : null}

        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void doRedeem();
          }}
        >
          <h3 className="text-h4 text-foreground">{t.redeem}</h3>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field>
              <FieldLabel>{t.amount}</FieldLabel>
              <CurrencyInput currency={card.currency} value={redeem} onValueChange={setRedeem} aria-label={`${t.redeem}: ${t.amount}`} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-order`}>{t.orderRef}</FieldLabel>
              <Input id={`${id}-order`} ltr value={orderId} onChange={(e) => setOrderId(e.target.value)} />
            </Field>
            <Button type="submit" variant="primary" loading={busy} disabled={status !== "active"}>
              {t.redeem}
            </Button>
          </div>
        </form>

        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void doAdjust();
          }}
        >
          <h3 className="text-h4 text-foreground">{t.adjust}</h3>
          <div className="grid gap-3 sm:grid-cols-[9rem_1fr] sm:items-end">
            <Field>
              <FieldLabel>{t.direction}</FieldLabel>
              <Select items={[{ value: "add", label: t.addBalance }, { value: "remove", label: t.removeBalance }]} value={adjustDir} onValueChange={(v) => v && setAdjustDir(v as "add" | "remove")}>
                <SelectTrigger aria-label={t.direction}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">{t.addBalance}</SelectItem>
                  <SelectItem value="remove">{t.removeBalance}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>{t.amount}</FieldLabel>
              <CurrencyInput currency={card.currency} value={adjust} onValueChange={setAdjust} aria-label={`${t.adjust}: ${t.amount}`} />
            </Field>
          </div>
          <div className="flex items-end gap-3">
            <Field className="flex-1">
              <FieldLabel htmlFor={`${id}-note`}>{t.note}</FieldLabel>
              <Input id={`${id}-note`} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <Button type="submit" variant="secondary" loading={busy}>
              {t.adjust}
            </Button>
          </div>
        </form>

        <label className="flex items-center gap-2 text-body-sm">
          <Switch checked={!card.disabled} disabled={busy} onCheckedChange={(on) => void onUpdate({ ...card, disabled: !on })} />
          {t.cardEnabled}
        </label>

        <div role="status" aria-live="polite" className="min-h-5 text-body-sm">
          {problem || error ? <span className="text-nq-danger-text">{problem ?? error}</span> : done ? <span className="text-nq-success-text">{done}</span> : null}
        </div>

        <section className="grid gap-2" aria-label={t.history}>
          <h3 className="text-h4 text-foreground">{t.history}</h3>
          <ol className="grid gap-1.5">
            {rows.map((e) => (
              <li key={e.id} className="flex min-w-0 items-start justify-between gap-3 rounded-control border border-border px-2.5 py-1.5 text-body-sm">
                <div className="min-w-0">
                  <p className="flex items-center gap-2">
                    <Badge variant={e.amount >= 0 ? "success" : "neutral"}>{t.entryKinds[e.kind]}</Badge>
                    <span className="text-caption text-muted-foreground">{formatDate(e.at, locale, { dateStyle: "medium", timeStyle: "short" })}</span>
                  </p>
                  {e.orderId || e.note ? (
                    <p className="truncate text-caption text-muted-foreground">
                      {e.orderId ? <bdi dir="ltr">{e.orderId}</bdi> : null}
                      {e.orderId && e.note ? " · " : ""}
                      {e.note}
                    </p>
                  ) : null}
                </div>
                <span className={cn("shrink-0 font-medium tabular-nums", e.amount < 0 ? "text-foreground" : "text-nq-success-text")} dir="ltr">
                  {e.amount > 0 ? "+" : e.amount < 0 ? "−" : ""}
                  <Money minor={Math.abs(e.amount)} currency={card.currency} />
                </span>
              </li>
            ))}
          </ol>
        </section>
      </SheetBody>
    </>
  );
}

/* ------------------------------------------------------------------ checkout field */

export type GiftCardLookup = GiftCard | { error: GiftCardError };

export interface GiftCardFieldProps extends Omit<ComponentProps<"section">, "children" | "onChange"> {
  /** The cards the customer has entered so far. */
  cards: readonly GiftCard[];
  /** What is left to pay before gift cards, in minor units. */
  total: number;
  currency: string;
  /** Finds a card by its normalised code. Resolve the card, or `{ error: "not-found" }`. */
  onLookup: (code: string) => Promise<GiftCardLookup>;
  /** Called with the new list after a card is added or removed. */
  onCardsChange: (cards: GiftCard[]) => void;
  /** Called when the split changes: what each card pays, the total covered and what is left for the customer. */
  onChange?: (result: { applied: GiftCardApplication[]; covered: number; remaining: number }) => void;
  now?: Date;
  disabled?: boolean;
  labels?: StoreSettingsLabels;
}

/**
 * The gift card box at checkout: type a code, see the card's balance, and see how much of the total it covers.
 * The code is checked for shape and check character before any request, so a typo never reaches the server. Several
 * cards can be added; the one that expires soonest is spent first. Cards in another currency are refused.
 */
export function GiftCardField({ cards, total, currency, onLookup, onCardsChange, onChange, now, disabled = false, labels, className, ...props }: GiftCardFieldProps) {
  const { t } = useSettingsStrings(labels);
  const id = useId();
  const today = useMemo(() => now ?? new Date(), [now]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const result = useMemo(() => applyGiftCards(cards, total, { now: today, currency }), [cards, total, today, currency]);
  const byId = new Map(result.applied.map((a) => [a.cardId, a.amount]));

  const commit = (next: GiftCard[]) => {
    onCardsChange(next);
    onChange?.(applyGiftCards(next, total, { now: today, currency }));
  };
  const add = async () => {
    const clean = normalizeGiftCardCode(code);
    if (!clean) return;
    setProblem(null);
    if (!isValidGiftCardCode(clean)) return setProblem(t.codeInvalid);
    if (cards.some((c) => c.code === clean)) return setProblem(t.alreadyAdded);
    setBusy(true);
    try {
      const found = await onLookup(clean);
      if ("error" in found) return setProblem(t.giftErrors[found.error]);
      if (found.currency !== currency) return setProblem(t.giftErrors.currency);
      const st = giftCardStatus(found, today);
      if (st === "expired") return setProblem(t.giftErrors.expired);
      if (st === "disabled") return setProblem(t.giftErrors.disabled);
      if (st === "depleted") return setProblem(t.giftErrors.empty);
      commit([...cards, found]);
      setCode("");
    } catch {
      setProblem(t.lookupFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-slot="gift-card-field" aria-label={t.giftCard} className={cn("grid min-w-0 gap-3", className)} {...props}>
      <form
        className="flex items-start gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <Field className="min-w-0 flex-1" invalid={problem !== null}>
          <FieldLabel htmlFor={`${id}-code`}>{t.giftCard}</FieldLabel>
          <Input id={`${id}-code`} ltr className="font-mono uppercase" value={code} disabled={disabled || busy} placeholder="XXXX-XXXX-XXXX-XXXX" autoComplete="off" onChange={(e) => (setProblem(null), setCode(e.target.value))} aria-describedby={problem ? `${id}-err` : undefined} />
        </Field>
        <Button type="submit" variant="secondary" className="mt-[1.625rem]" loading={busy} disabled={disabled || !code.trim()}>
          {t.applyCard}
        </Button>
      </form>
      <p id={`${id}-err`} role="alert" className={cn("text-body-sm text-nq-danger-text", !problem && "sr-only")}>
        {problem}
      </p>
      {cards.length > 0 ? (
        <ul className="grid gap-1.5">
          {cards.map((c) => (
            <li key={c.id} className="flex min-w-0 items-center justify-between gap-2 rounded-control border border-border bg-card px-2.5 py-1.5 text-body-sm">
              <span className="flex min-w-0 flex-col">
                <bdi dir="ltr" className="truncate font-mono">
                  {maskGiftCardCode(c.code)}
                </bdi>
                <span className="text-caption text-muted-foreground">
                  {t.balance}: <Money minor={giftCardBalance(c, today)} currency={c.currency} />
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="font-medium text-nq-success-text">
                  −<Money minor={byId.get(c.id) ?? 0} currency={currency} />
                </span>
                <Button type="button" size="icon-sm" variant="ghost" disabled={disabled} aria-label={`${t.removeCard}: ${maskGiftCardCode(c.code)}`} onClick={() => commit(cards.filter((x) => x.id !== c.id))}>
                  <Trash2 aria-hidden />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {cards.length > 0 ? (
        <p role="status" aria-live="polite" className="flex items-center justify-between gap-2 text-body-sm">
          <span className="text-muted-foreground">{t.youPay}</span>
          <span className="font-semibold text-foreground">
            <Money minor={result.remaining} currency={currency} />
          </span>
        </p>
      ) : null}
    </section>
  );
}
