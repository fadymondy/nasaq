"use client";

import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/cn";
import type { CommerceAddress } from "../../lib/commerce";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Input } from "../field";
import { EmptyState, ErrorState, Skeleton } from "../states";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { type AddressField, addressLines, removeAddress, setDefaultAddress, upsertAddress, validateAddress } from "./account-logic";
import { type StoreAccountLabels, useStoreAccountStrings } from "./account-strings";

const DEFAULT_COUNTRIES = ["SA", "AE", "EG", "KW", "QA", "BH", "OM", "JO"];

export interface StoreAddressBookProps {
  addresses: readonly CommerceAddress[];
  /** Called with the whole new book after every add, edit, default change or delete. */
  onChange?: (addresses: CommerceAddress[]) => void;
  /** ISO 3166-1 alpha-2 codes offered in the country field. */
  countries?: readonly string[];
  /** Id maker for new addresses. Default: `addr-<n>`. */
  makeId?: () => string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  labels?: StoreAccountLabels;
  className?: string;
}

const EMPTY: CommerceAddress = { name: "", phone: "", line1: "", line2: "", city: "", region: "", postalCode: "", country: "SA" };

/** The address book: add, edit, set the default, delete. Validation comes from `validateAddress`, the book from the pure helpers. */
export function StoreAddressBook({ addresses, onChange, countries = DEFAULT_COUNTRIES, makeId, loading, error, onRetry, labels, className }: StoreAddressBookProps) {
  const { t, locale } = useStoreAccountStrings(labels);
  const [draft, setDraft] = useState<CommerceAddress | null>(null);
  const [tried, setTried] = useState(false);
  const [toDelete, setToDelete] = useState<CommerceAddress | null>(null);
  const names = new Intl.DisplayNames([locale], { type: "region" });
  const country = (code: string) => {
    try {
      return names.of(code) ?? code;
    } catch {
      return code;
    }
  };
  const problems = draft ? validateAddress(draft) : {};
  const err = (field: AddressField) => (tried && problems[field] ? (problems[field] === "required" ? t.required : t.invalid) : undefined);

  const commit = (next: CommerceAddress[]) => onChange?.(next);
  const save = () => {
    setTried(true);
    if (!draft || Object.keys(validateAddress(draft)).length > 0) return;
    const clean: CommerceAddress = { ...draft };
    for (const key of ["phone", "line2", "region", "postalCode"] as const) if (!clean[key]?.trim()) delete clean[key];
    commit(upsertAddress(addresses, clean, makeId));
    setDraft(null);
  };
  const open = (address: CommerceAddress) => {
    setTried(false);
    setDraft({ ...EMPTY, ...address });
  };
  const field = (key: keyof CommerceAddress, value: string) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  if (error) {
    return (
      <ErrorState
        title={t.loadError}
        actions={
          onRetry ? (
            <Button size="sm" variant="secondary" onClick={onRetry}>
              {t.retry}
            </Button>
          ) : undefined
        }
      />
    );
  }

  const text = (key: AddressField, label: string, props: { ltr?: boolean; autoComplete?: string; type?: string } = {}) => (
    <label className="flex flex-col gap-1.5 text-label text-foreground">
      {label}
      <Input value={(draft?.[key] as string | undefined) ?? ""} onChange={(e) => field(key, e.target.value)} aria-invalid={err(key) ? true : undefined} {...props} />
      {err(key) ? (
        <span role="alert" className="text-caption font-normal text-nq-danger-text">
          {err(key)}
        </span>
      ) : null}
    </label>
  );

  return (
    <section data-slot="store-address-book" aria-label={t.addressesTitle} className={cn("flex min-w-0 flex-col gap-4", className)}>
      <Button variant="primary" size="sm" className="self-start" onClick={() => open(EMPTY)}>
        <Plus aria-hidden />
        {t.addAddress}
      </Button>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2" aria-busy>
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : addresses.length === 0 ? (
        <EmptyState icon={MapPin} title={t.noAddresses} description={t.noAddressesText} />
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
          {addresses.map((a, i) => (
            <li key={a.id ?? i} className={cn("flex flex-col gap-3 rounded-card border bg-card p-4", a.isDefault ? "border-primary" : "border-border")}>
              <div className="flex items-start justify-between gap-2">
                <address className="flex min-w-0 flex-col gap-0.5 text-body-sm not-italic">
                  <span className="font-medium">{a.name}</span>
                  {addressLines(a).map((line, j) => (
                    <span key={j} className="text-muted-foreground">
                      {line}
                    </span>
                  ))}
                  <span className="text-muted-foreground">{country(a.country)}</span>
                  {a.phone ? (
                    <bdi dir="ltr" className="text-start text-muted-foreground">
                      {a.phone}
                    </bdi>
                  ) : null}
                </address>
                {a.isDefault ? <Badge variant="info">{t.defaultAddress}</Badge> : null}
              </div>
              <div className="mt-auto flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => open(a)}>
                  <Pencil aria-hidden />
                  {t.edit}
                </Button>
                {!a.isDefault && a.id ? (
                  <Button size="sm" variant="ghost" onClick={() => commit(setDefaultAddress(addresses, a.id!))}>
                    {t.makeDefault}
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => setToDelete(a)}>
                  <Trash2 aria-hidden />
                  {t.delete}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-lg">
          {draft ? (
            <form
              noValidate
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
            >
              <DialogHeader>
                <DialogTitle>{draft.id ? t.editAddress : t.newAddress}</DialogTitle>
                <DialogDescription>{t.addressesTitle}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">{text("name", t.fullName, { autoComplete: "name" })}</div>
                <div className="sm:col-span-2">{text("phone", t.phone, { ltr: true, autoComplete: "tel", type: "tel" })}</div>
                <div className="sm:col-span-2">{text("line1", t.line1, { autoComplete: "address-line1" })}</div>
                <label className="flex flex-col gap-1.5 text-label text-foreground sm:col-span-2">
                  {t.line2}
                  <Input value={draft.line2 ?? ""} onChange={(e) => field("line2", e.target.value)} autoComplete="address-line2" />
                </label>
                {text("city", t.city, { autoComplete: "address-level2" })}
                <label className="flex flex-col gap-1.5 text-label text-foreground">
                  {t.region}
                  <Input value={draft.region ?? ""} onChange={(e) => field("region", e.target.value)} autoComplete="address-level1" />
                </label>
                {text("postalCode", t.postalCode, { ltr: true, autoComplete: "postal-code" })}
                <label className="flex flex-col gap-1.5 text-label text-foreground">
                  {t.country}
                  <Select items={countries.map((c) => ({ value: c, label: country(c) }))} value={draft.country || null} onValueChange={(v) => v && field("country", String(v))}>
                    <SelectTrigger aria-label={t.country}>
                      <SelectValue placeholder={t.country} />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c} value={c}>
                          {country(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>
              <label className="flex items-center gap-2 text-body-sm">
                <Checkbox checked={!!draft.isDefault} onCheckedChange={(c) => setDraft((d) => (d ? { ...d, isDefault: !!c } : d))} />
                {t.setDefaultCheck}
              </label>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
                  {t.cancel}
                </Button>
                <Button type="submit" variant="primary">
                  {t.save}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.deleteText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="danger"
              onClick={() => {
                if (toDelete?.id) commit(removeAddress(addresses, toDelete.id));
                setToDelete(null);
              }}
            >
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
