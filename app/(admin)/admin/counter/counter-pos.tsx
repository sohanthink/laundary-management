"use client";

import { Banknote, Minus, NotebookPen, Phone, Plus, Trash2, X } from "lucide-react";
import { startTransition, useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useT } from "@/components/i18n-provider";
import { BAR_BUTTON } from "@/components/pos/bar";
import { clearDraft, loadDraft, useSaveDraft } from "@/components/pos/draft";
import { applyKey, Keypad } from "@/components/pos/keypad";
import { ProductTile } from "@/components/pos/product-tile";
import { Sheet } from "@/components/pos/sheet";
import { FormMessage } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { applyPhoneKey, counterUnitPrice, isValidPhone, type CounterServiceType } from "@/server/counter";
import type { ActionState } from "@/server/forms";
import { formatMoney, isMoneyInput, toCents } from "@/server/money";
import { createCounterSale, lookupCounterCustomer } from "@/server/modules/counter/actions";

type Item = { id: string; name: string; washIronPrice: number };
type Line = { itemId: string; service: CounterServiceType; quantity: number };
type Customer = { found: boolean; phone: string; name: string; due: number };

const DRAFT_KEY = "annafi:draft:counter:current";
const METHODS = ["CASH", "POS", "BANK", "EMPLOYEE"] as const;
const METHOD_TEXT: Record<(typeof METHODS)[number], string> = {
  CASH: "Cash",
  POS: "POS (card)",
  BANK: "Bank",
  EMPLOYEE: "Employee",
};
const SERVICE_TEXT: Record<CounterServiceType, string> = { WASH_IRON: "Wash + iron", IRON_ONLY: "Iron only" };

type CounterDraft = { lines: Line[]; phone: string; name: string; note: string; payment: string; method: (typeof METHODS)[number] };

const lineKey = (l: { itemId: string; service: CounterServiceType }) => `${l.itemId}:${l.service}`;

function cents(value: string) {
  return value && isMoneyInput(value) ? toCents(value) : 0;
}

export function CounterPos({ items, initialPhone }: { items: Item[]; initialPhone?: string }) {
  const t = useT();
  const [draft] = useState(() => loadDraft<CounterDraft>(DRAFT_KEY));
  const [service, setService] = useState<CounterServiceType>("WASH_IRON");
  const [lines, setLines] = useState<Line[]>(draft?.lines ?? []);
  const [selected, setSelected] = useState<string | null>(null);
  const [buffer, setBuffer] = useState("");
  const [phone, setPhone] = useState(initialPhone ?? draft?.phone ?? "");
  const [name, setName] = useState(draft?.name ?? "");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [looking, startLookup] = useTransition();
  const [sheet, setSheet] = useState<"payment" | "note" | null>(null);
  const [payment, setPayment] = useState(draft?.payment ?? "");
  const [method, setMethod] = useState<(typeof METHODS)[number]>(draft?.method ?? "CASH");
  const [note, setNote] = useState(draft?.note ?? "");
  const phoneRef = useRef<HTMLInputElement>(null);
  const [lookupTick, setLookupTick] = useState(0);
  // True while the name was filled in by a phone match (not typed by hand).
  const nameFromLookup = useRef(false);
  // While true, the number pad types the phone number instead of a quantity.
  const [phoneOnPad, setPhoneOnPad] = useState(() => !(initialPhone ?? draft?.phone));
  // On a tablet the phone is typed on the number pad, so the on-screen keyboard stays closed.
  const [touch] = useState(() => window.matchMedia("(pointer: coarse)").matches);

  // An order goes to its receipt page; a payment-only entry stays here and refreshes the due.
  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await createCounterSale(prev, formData);
    if (result?.ok) {
      setPayment("");
      setNote("");
      lookup();
    }
    return result;
  }, undefined);

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const priced = lines
    .filter((l) => l.quantity > 0 && itemById.has(l.itemId))
    .map((l) => {
      const item = itemById.get(l.itemId)!;
      const unit = counterUnitPrice(item.washIronPrice, l.service);
      return { ...l, item, unit, total: unit * l.quantity };
    });
  const total = priced.reduce((s, l) => s + l.total, 0);
  const pieces = priced.reduce((s, l) => s + l.quantity, 0);
  const paid = cents(payment);
  const previousDue = customer?.due ?? 0;

  useSaveDraft(DRAFT_KEY, { lines, phone, name, note, payment, method } satisfies CounterDraft, (pieces > 0 || paid > 0) && !pending, state);

  function lookup() {
    setLookupTick((n) => n + 1);
  }

  // Looks the customer up as soon as the number is long enough (also when the screen opens with one).
  // A match fills in the saved name; no match clears a name that an earlier match filled in.
  useEffect(() => {
    if (!isValidPhone(phone)) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      startLookup(async () => {
        const result = await lookupCounterCustomer(phone);
        if (cancelled) return;
        setCustomer(result);
        if (result.found && result.name) {
          setName(result.name);
          nameFromLookup.current = true;
        } else if (nameFromLookup.current) {
          setName("");
          nameFromLookup.current = false;
        }
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phone, lookupTick]);

  function changePhone(next: string | ((current: string) => string)) {
    setPhone(next);
    setCustomer(null);
    if (nameFromLookup.current) {
      setName("");
      nameFromLookup.current = false;
    }
  }

  function typePhoneOnPad() {
    setPhoneOnPad(true);
    setSelected(null);
  }

  function countOf(key: string) {
    return lines.find((l) => lineKey(l) === key)?.quantity ?? 0;
  }

  function setCount(key: string, value: number) {
    const [itemId, svc] = key.split(":") as [string, CounterServiceType];
    const n = Math.max(0, Math.min(9999, value));
    setLines((current) => {
      const exists = current.some((l) => lineKey(l) === key);
      if (!exists) return n > 0 ? [...current, { itemId, service: svc, quantity: n }] : current;
      return current.map((l) => (lineKey(l) === key ? { ...l, quantity: n } : l)).filter((l) => l.quantity > 0);
    });
  }

  function tap(itemId: string) {
    const key = lineKey({ itemId, service });
    setCount(key, countOf(key) + 1);
    setSelected(key);
    setPhoneOnPad(false);
    setBuffer("");
  }

  function onKey(key: string) {
    if (phoneOnPad) {
      changePhone((current) => applyPhoneKey(current, key));
      return;
    }
    if (!selected) return;
    const next = applyKey(buffer, key, false);
    setBuffer(next);
    setCount(selected, Number(next || 0));
  }

  function clearAll() {
    if ((pieces > 0 || paid > 0) && !window.confirm(t("Clear the whole list?"))) return;
    setLines([]);
    setSelected(null);
    setPayment("");
    setNote("");
    setPhone("");
    setName("");
    nameFromLookup.current = false;
    setCustomer(null);
    clearDraft(DRAFT_KEY);
    typePhoneOnPad();
    phoneRef.current?.focus();
  }

  function confirm() {
    if (!isValidPhone(phone)) {
      typePhoneOnPad();
      phoneRef.current?.focus();
      return;
    }
    const formData = new FormData();
    formData.set("phone", phone);
    formData.set("name", name);
    formData.set("lines", JSON.stringify(priced.map((l) => ({ itemId: l.itemId, service: l.service, quantity: l.quantity }))));
    formData.set("note", note);
    formData.set("paymentAmount", payment);
    formData.set("paymentMethod", method);
    clearDraft(DRAFT_KEY);
    startTransition(() => action(formData));
  }

  const selectedLine = priced.find((l) => lineKey(l) === selected);
  const phoneOk = isValidPhone(phone);

  return (
    <div className="flex flex-col gap-4 pb-28">
      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label={t("Service")} className="inline-flex rounded-2xl border-2 border-(--line) bg-white p-1">
          {(["WASH_IRON", "IRON_ONLY"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={service === s}
              onClick={() => setService(s)}
              className={`h-14 min-w-40 rounded-xl px-5 text-lg font-bold transition ${
                service === s ? (s === "IRON_ONLY" ? "bg-amber-500 text-white" : "bg-(--teal) text-white") : "text-(--ink) hover:bg-(--paper)"
              }`}
            >
              {t(SERVICE_TEXT[s])}
            </button>
          ))}
        </div>
        <span className="text-sm text-(--muted)">{t("Iron only is half price.")}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-[200px_1fr_184px] lg:grid-cols-[minmax(240px,300px)_1fr_220px] xl:grid-cols-[minmax(260px,320px)_1fr_250px]">
        <section className="order-2 flex flex-col rounded-3xl border border-(--line) bg-white md:order-1" aria-label={t("Counter list")}>
          <div className="space-y-2 border-b border-(--line) p-3">
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-(--muted)" aria-hidden />
              <input
                ref={phoneRef}
                value={phone}
                onChange={(e) => changePhone(e.target.value)}
                onFocus={typePhoneOnPad}
                onClick={typePhoneOnPad}
                onKeyDown={(e) => e.key === "Enter" && lookup()}
                inputMode={touch ? "none" : "tel"}
                autoComplete="off"
                placeholder={t("Customer phone")}
                aria-label={t("Customer phone")}
                className={`${inputClass} h-14 pl-11 text-lg tabular-nums ${phoneOnPad ? "border-(--teal)! ring-4 ring-(--teal-soft)" : ""}`}
              />
            </div>
            {looking ? (
              <p className="rounded-xl bg-(--paper) px-3 py-2 text-sm text-(--muted)">{t("Searching...")}</p>
            ) : (
              customer && (
                <p className={`rounded-xl px-3 py-2 text-sm font-medium ${customer.found ? "bg-(--paper)" : "bg-sky-50 text-sky-900"}`}>
                  {customer.found
                    ? `${t("Returning customer")} · ${t("Due")} ${formatMoney(customer.due)}`
                    : t("New customer: saved when you confirm.")}
                </p>
              )
            )}
            <input
              value={name}
              onFocus={() => setPhoneOnPad(false)}
              onChange={(e) => {
                setName(e.target.value);
                nameFromLookup.current = false;
              }}
              placeholder={t("Name (optional)")}
              aria-label={t("Name (optional)")}
              className={`${inputClass} h-12`}
            />
          </div>

          <ul className="max-h-[38vh] min-h-32 flex-1 divide-y divide-(--line) overflow-y-auto">
            {priced.length === 0 && <li className="px-4 py-8 text-center text-sm text-(--muted)">{t("Tap an item to add it.")}</li>}
            {priced.map((l) => {
              const key = lineKey(l);
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(key);
                      setPhoneOnPad(false);
                      setBuffer("");
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${selected === key ? "bg-(--teal-soft)" : "hover:bg-(--paper)"}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{l.item.name}</span>
                      <span className={`block text-sm tabular-nums ${l.service === "IRON_ONLY" ? "text-amber-700" : "text-(--muted)"}`}>
                        {t(SERVICE_TEXT[l.service])} · {l.quantity} × {formatMoney(l.unit)}
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums">{formatMoney(l.total)}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="space-y-1.5 border-t border-(--line) px-4 py-3 text-sm">
            <Row label={t("Order total")} value={formatMoney(total)} strong />
            {previousDue !== 0 && <Row label={t("Previous due")} value={formatMoney(previousDue)} muted />}
            {paid > 0 && <Row label={t("Payment now")} value={`−${formatMoney(paid)}`} muted />}
            <Row label={t("Due after")} value={formatMoney(previousDue + total - paid)} strong />
          </div>
        </section>

        <section className="order-1 min-w-0 md:order-2">
          {items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-(--line) bg-white p-8 text-center text-(--muted)">
              {t("No counter items yet. Add them in Setup > Counter prices.")}
            </p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(124px,1fr))] gap-2">
              {items.map((item) => {
                const key = lineKey({ itemId: item.id, service });
                return (
                  <ProductTile
                    key={item.id}
                    name={item.name}
                    price={formatMoney(counterUnitPrice(item.washIronPrice, service))}
                    count={countOf(key)}
                    selected={selected === key}
                    onTap={() => tap(item.id)}
                  />
                );
              })}
            </div>
          )}
        </section>

        <section className="order-2 space-y-3 self-start rounded-3xl border border-(--line) bg-white p-3 md:sticky md:top-24 md:order-3">
          <p className="min-h-10 text-sm leading-snug text-(--muted)">
            {phoneOnPad ? (
              <>
                {t("Typing")}: <span className="font-semibold text-(--ink)">{t("Customer phone")}</span>
              </>
            ) : selectedLine ? (
              <>
                {t("Selected")}: <span className="font-semibold text-(--ink)">{selectedLine.item.name}</span> ({t(SERVICE_TEXT[selectedLine.service])})
              </>
            ) : (
              t("Tap a line or tile, then type the quantity.")
            )}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Button size="lg" variant="secondary" className="px-0" disabled={!selected} onClick={() => selected && setCount(selected, countOf(selected) - 1)} aria-label={t("One less")}>
              <Minus className="size-5" aria-hidden />
            </Button>
            <Button size="lg" variant="secondary" className="px-0" disabled={!selected} onClick={() => selected && setCount(selected, countOf(selected) + 1)} aria-label={t("One more")}>
              <Plus className="size-5" aria-hidden />
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="px-0"
              disabled={!selected}
              onClick={() => {
                if (selected) setCount(selected, 0);
                setSelected(null);
              }}
              aria-label={t("Remove")}
            >
              <Trash2 className="size-5" aria-hidden />
            </Button>
          </div>
          <FormMessage state={state} />
          <Keypad onKey={onKey} disabled={!selected && !phoneOnPad} pointKey={phoneOnPad ? "+" : "."} />
        </section>
      </div>

      <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-(--line) bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <Button size="lg" variant="secondary" className={BAR_BUTTON} onClick={() => setSheet("payment")}>
            <Banknote className="size-5" aria-hidden />
            {t("Payment")}
            {paid > 0 && <span className="tabular-nums">{formatMoney(paid)}</span>}
          </Button>
          <Button size="lg" variant="secondary" className={BAR_BUTTON} onClick={() => setSheet("note")}>
            <NotebookPen className="size-5" aria-hidden />
            {t("Note")}
          </Button>
          {!phoneOk && (pieces > 0 || paid > 0) && <span className="text-sm font-medium text-red-600">{t("Type the customer's phone number")}</span>}
          <div className="ml-auto flex gap-2">
            <Button size="lg" variant="danger" className={BAR_BUTTON} onClick={clearAll} disabled={pending}>
              <X className="size-5" aria-hidden />
              {t("Cancel")}
            </Button>
            <Button size="lg" onClick={confirm} disabled={pending || (pieces === 0 && paid === 0)} className="min-w-48">
              {pending ? t("Saving...") : pieces > 0 ? `${t("Confirm")} · ${formatMoney(total)}` : t("Record payment")}
            </Button>
          </div>
        </div>
      </div>

      <Sheet open={sheet === "payment"} title="Payment now" onClose={() => setSheet(null)}>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{t("Amount received (€)")}</span>
          <input className={`${inputClass} h-14 text-xl`} inputMode="decimal" placeholder="0" value={payment} onChange={(e) => setPayment(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          {METHODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              aria-pressed={method === m}
              className={`h-14 rounded-xl border-2 font-semibold ${method === m ? "border-(--teal) bg-(--teal) text-white" : "border-(--line) bg-white"}`}
            >
              {t(METHOD_TEXT[m])}
            </button>
          ))}
        </div>
        <div className="grid gap-2">
          {total > 0 && (
            <Button variant="secondary" onClick={() => setPayment((total / 100).toFixed(2))}>
              {t("This order")} ({formatMoney(total)})
            </Button>
          )}
          {previousDue > 0 && (
            <Button variant="secondary" onClick={() => setPayment(((total + previousDue) / 100).toFixed(2))}>
              {t("Everything due")} ({formatMoney(total + previousDue)})
            </Button>
          )}
        </div>
      </Sheet>

      <Sheet open={sheet === "note"} title="Note" onClose={() => setSheet(null)}>
        <textarea className={`${inputClass} h-32 py-3`} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Optional note on the receipt")} />
      </Sheet>
    </div>
  );
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${muted ? "text-(--muted)" : ""} ${strong ? "text-base font-semibold" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
