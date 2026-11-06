"use client";

import { Banknote, Building2, Minus, NotebookPen, Percent, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useMemo, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { applyKey, Keypad } from "@/components/pos/keypad";
import { ModeToggle } from "@/components/pos/mode-toggle";
import { ProductTile } from "@/components/pos/product-tile";
import { Sheet } from "@/components/pos/sheet";
import { FormMessage } from "@/components/ui/action-form";
import { Button, buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { formatMoney, isMoneyInput, toCents } from "@/server/money";
import { createSend } from "@/server/modules/send/actions";
import { calculateSend } from "@/server/pricing";

type Row = {
  productId: string;
  name: string;
  category: string;
  photoPath: string | null;
  basePrice: number;
  agreedPrice: number;
  atHotel: number;
};
type ItemRow = { serviceItemId: string; name: string; price: number; withUs: number };

type Selected = { kind: "product" | "item"; id: string } | null;
type PadMode = "qty" | "extra";

const ITEMS_TAB = "__items__";
const METHODS = ["CASH", "BANK", "POS", "EMPLOYEE"] as const;
const METHOD_TEXT: Record<(typeof METHODS)[number], string> = {
  CASH: "Cash",
  BANK: "Bank",
  POS: "POS (card)",
  EMPLOYEE: "Employee",
};

function cents(value: string) {
  return value && isMoneyInput(value) ? toCents(value) : 0;
}

export function SendPos({
  hotel,
  rows,
  itemRows,
  due,
}: {
  hotel: { id: string; name: string };
  rows: Row[];
  itemRows: ItemRow[];
  due: number;
}) {
  const t = useT();
  const [state, action, pending] = useActionState(createSend, undefined);

  const categories = useMemo(() => [...new Set(rows.map((r) => r.category))], [rows]);
  const [tab, setTab] = useState(categories[0] ?? ITEMS_TAB);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [itemQty, setItemQty] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Selected>(null);
  const [padMode, setPadMode] = useState<PadMode>("qty");
  const [buffer, setBuffer] = useState("");

  const [sheet, setSheet] = useState<"discount" | "payment" | "note" | null>(null);
  const [whole, setWhole] = useState("");
  const [reason, setReason] = useState("");
  const [payment, setPayment] = useState("");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("CASH");
  const [note, setNote] = useState("");

  const totals = useMemo(
    () =>
      calculateSend(
        rows.map((r) => ({
          basePrice: r.basePrice,
          agreedPrice: r.agreedPrice,
          extraPerPiece: cents(extra[r.productId] ?? ""),
          quantity: qty[r.productId] ?? 0,
        })),
        cents(whole),
        itemRows.map((r) => ({ price: r.price, quantity: itemQty[r.serviceItemId] ?? 0 })),
      ),
    [rows, itemRows, qty, extra, itemQty, whole],
  );

  const productLines = rows.map((r, i) => ({ row: r, line: totals.lines[i] })).filter((x) => x.line.quantity > 0);
  const itemLines = itemRows
    .map((r, i) => ({ row: r, line: totals.itemLines[i] }))
    .filter((x) => x.line.quantity > 0);
  const pieces = productLines.reduce((s, x) => s + x.line.quantity, 0) + itemLines.reduce((s, x) => s + x.line.quantity, 0);
  const hasExtra = totals.extraDiscountTotal > 0;
  const paid = cents(payment);

  function select(next: Selected) {
    setSelected(next);
    setBuffer("");
    setPadMode("qty");
  }

  function setCount(target: Selected, value: number) {
    if (!target) return;
    const n = Math.max(0, Math.min(99999, value));
    if (target.kind === "product") setQty((q) => ({ ...q, [target.id]: n }));
    else setItemQty((q) => ({ ...q, [target.id]: n }));
  }

  function countOf(target: Selected) {
    if (!target) return 0;
    return target.kind === "product" ? qty[target.id] ?? 0 : itemQty[target.id] ?? 0;
  }

  function tapProduct(id: string) {
    const target = { kind: "product" as const, id };
    setCount(target, countOf(target) + 1);
    select(target);
  }

  function tapItem(id: string) {
    const target = { kind: "item" as const, id };
    setCount(target, countOf(target) + 1);
    select(target);
  }

  function onKey(key: string) {
    if (!selected) return;
    if (padMode === "extra" && selected.kind === "product") {
      const next = applyKey(buffer, key, true);
      setBuffer(next);
      setExtra((e) => ({ ...e, [selected.id]: next }));
      return;
    }
    const next = applyKey(buffer, key, false);
    setBuffer(next);
    setCount(selected, Number(next || 0));
  }

  function removeSelected() {
    if (!selected) return;
    setCount(selected, 0);
    if (selected.kind === "product") setExtra((e) => ({ ...e, [selected.id]: "" }));
    select(null);
  }

  function clearAll() {
    if (pieces > 0 && !window.confirm(t("Clear the whole list?"))) return;
    setQty({});
    setExtra({});
    setItemQty({});
    setWhole("");
    setReason("");
    setPayment("");
    setNote("");
    select(null);
  }

  function confirmSend() {
    if (hasExtra && !reason.trim()) {
      setSheet("discount");
      return;
    }
    const formData = new FormData();
    formData.set("hotelId", hotel.id);
    formData.set(
      "lines",
      JSON.stringify(rows.map((r) => ({ productId: r.productId, quantity: qty[r.productId] ?? 0, extraPerPiece: extra[r.productId] ?? "" }))),
    );
    formData.set("items", JSON.stringify(itemRows.map((r) => ({ serviceItemId: r.serviceItemId, quantity: itemQty[r.serviceItemId] ?? 0 }))));
    formData.set("wholeDiscount", whole);
    formData.set("discountReason", reason);
    formData.set("paymentAmount", payment);
    formData.set("paymentMethod", method);
    formData.set("note", note);
    startTransition(() => action(formData));
  }

  const selectedName =
    selected?.kind === "product"
      ? rows.find((r) => r.productId === selected.id)?.name
      : itemRows.find((r) => r.serviceItemId === selected?.id)?.name;

  return (
    <div className="flex flex-col gap-4 pb-28">
      <ModeToggle mode="send" hotelId={hotel.id} hotelName={hotel.name} dirty={pieces > 0} />
      <div className="grid gap-4 lg:grid-cols-[minmax(320px,400px)_1fr]">
        {/* Running list */}
        <section className="order-2 flex flex-col rounded-3xl border border-(--line) bg-white lg:order-1" aria-label={t("Send list")}>
          <div className="flex items-center justify-between border-b border-(--line) px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-(--muted)">{t("Send to")}</p>
              <p className="text-lg font-semibold">{hotel.name}</p>
            </div>
            <span className="rounded-full bg-(--paper) px-3 py-1 text-sm font-semibold">
              {t("{count} pcs", { count: pieces })}
            </span>
          </div>

          <ul className="max-h-[42vh] min-h-40 flex-1 divide-y divide-(--line) overflow-y-auto">
            {productLines.length === 0 && itemLines.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-(--muted)">{t("Tap a product to add it.")}</li>
            )}
            {productLines.map(({ row, line }) => {
              const isSel = selected?.kind === "product" && selected.id === row.productId;
              return (
                <li key={row.productId}>
                  <button
                    type="button"
                    onClick={() => select({ kind: "product", id: row.productId })}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${isSel ? "bg-(--teal-soft)" : "hover:bg-(--paper)"}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{row.name}</span>
                      <span className="block text-sm text-(--muted) tabular-nums">
                        {line.quantity} × {formatMoney(line.finalUnitPrice)}
                        {line.appliedExtra > 0 && (
                          <span className="ml-2 text-amber-700">
                            ({t("extra")} −{formatMoney(line.appliedExtra)})
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums">{formatMoney(line.lineTotal)}</span>
                  </button>
                </li>
              );
            })}
            {itemLines.map(({ row, line }) => {
              const isSel = selected?.kind === "item" && selected.id === row.serviceItemId;
              return (
                <li key={row.serviceItemId}>
                  <button
                    type="button"
                    onClick={() => select({ kind: "item", id: row.serviceItemId })}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${isSel ? "bg-(--teal-soft)" : "hover:bg-(--paper)"}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{row.name}</span>
                      <span className="block text-sm text-(--muted) tabular-nums">
                        {t("Their item")} · {line.quantity} × {formatMoney(row.price)}
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums">{formatMoney(line.lineTotal)}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="space-y-1.5 border-t border-(--line) px-4 py-3 text-sm">
            <Line label={t("Subtotal")} value={formatMoney(totals.subtotal)} />
            {totals.wholeDiscount > 0 && <Line label={t("Extra discount (whole)")} value={`−${formatMoney(totals.wholeDiscount)}`} />}
            <Line label={t("Total charge")} value={formatMoney(totals.total)} strong />
            <Line label={t("Current due")} value={formatMoney(due)} muted />
            {paid > 0 && <Line label={t("Payment now")} value={`−${formatMoney(paid)}`} muted />}
            <Line label={t("Due after this send")} value={formatMoney(due + totals.total - paid)} strong />
          </div>
        </section>

        {/* Tiles + keypad */}
        <section className="order-1 space-y-4 lg:order-2">
          <div className="flex flex-wrap gap-2" role="tablist">
            {categories.map((c) => (
              <TabButton key={c} active={tab === c} onClick={() => setTab(c)}>
                {c}
              </TabButton>
            ))}
            {itemRows.length > 0 && (
              <TabButton active={tab === ITEMS_TAB} onClick={() => setTab(ITEMS_TAB)}>
                {t("Their items (washed)")}
              </TabButton>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {tab === ITEMS_TAB
              ? itemRows.map((r) => (
                  <ProductTile
                    key={r.serviceItemId}
                    name={r.name}
                    price={formatMoney(r.price)}
                    info={t("With us: {count}", { count: r.withUs })}
                    count={itemQty[r.serviceItemId] ?? 0}
                    selected={selected?.kind === "item" && selected.id === r.serviceItemId}
                    onTap={() => tapItem(r.serviceItemId)}
                  />
                ))
              : rows
                  .filter((r) => r.category === tab)
                  .map((r) => (
                    <ProductTile
                      key={r.productId}
                      name={r.name}
                      price={formatMoney(r.agreedPrice)}
                      info={t("At hotel: {count}", { count: r.atHotel })}
                      photoPath={r.photoPath}
                      count={qty[r.productId] ?? 0}
                      selected={selected?.kind === "product" && selected.id === r.productId}
                      onTap={() => tapProduct(r.productId)}
                    />
                  ))}
          </div>

          <div className="grid gap-4 rounded-3xl border border-(--line) bg-white p-4 md:grid-cols-[1fr_260px]">
            <div className="space-y-3">
              <p className="text-sm text-(--muted)">
                {selected ? (
                  <>
                    {t("Selected")}: <span className="font-semibold text-(--ink)">{selectedName}</span>
                  </>
                ) : (
                  t("Tap a line or tile, then type the quantity.")
                )}
              </p>
              {selected?.kind === "product" && (
                <div className="flex gap-2">
                  <TabButton active={padMode === "qty"} onClick={() => { setPadMode("qty"); setBuffer(""); }}>
                    {t("Quantity")}
                  </TabButton>
                  <TabButton active={padMode === "extra"} onClick={() => { setPadMode("extra"); setBuffer(""); }}>
                    {t("Extra disc. / pc")}
                  </TabButton>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="lg" variant="secondary" disabled={!selected} onClick={() => setCount(selected, countOf(selected) - 1)} aria-label={t("One less")}>
                  <Minus className="size-5" aria-hidden />
                </Button>
                <Button size="lg" variant="secondary" disabled={!selected} onClick={() => setCount(selected, countOf(selected) + 1)} aria-label={t("One more")}>
                  <Plus className="size-5" aria-hidden />
                </Button>
                <Button size="lg" variant="secondary" disabled={!selected} onClick={removeSelected}>
                  <Trash2 className="size-5" aria-hidden />
                  {t("Remove")}
                </Button>
              </div>
              <FormMessage state={state} />
            </div>
            <Keypad onKey={onKey} allowDecimal={padMode === "extra"} disabled={!selected} />
          </div>
        </section>
      </div>

      {/* Fixed action bar */}
      <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-(--line) bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <Link href="/admin/send" className={buttonClass("secondary", "lg")}>
            <Building2 className="size-5" aria-hidden />
            {t("Hotel")}
          </Link>
          <Button size="lg" variant="secondary" onClick={() => setSheet("discount")}>
            <Percent className="size-5" aria-hidden />
            {t("Discount")}
            {hasExtra && <span className="size-2 rounded-full bg-amber-500" aria-hidden />}
          </Button>
          <Button size="lg" variant="secondary" onClick={() => setSheet("payment")}>
            <Banknote className="size-5" aria-hidden />
            {t("Payment")}
            {paid > 0 && <span className="tabular-nums">{formatMoney(paid)}</span>}
          </Button>
          <Button size="lg" variant="secondary" onClick={() => setSheet("note")}>
            <NotebookPen className="size-5" aria-hidden />
            {t("Note")}
          </Button>
          <div className="ml-auto flex gap-2">
            <Button size="lg" variant="danger" onClick={clearAll} disabled={pending}>
              <X className="size-5" aria-hidden />
              {t("Cancel")}
            </Button>
            <Button size="lg" onClick={confirmSend} disabled={pending || pieces === 0} className="min-w-48">
              {pending ? t("Saving...") : `${t("Confirm")} · ${formatMoney(totals.total)}`}
            </Button>
          </div>
        </div>
      </div>

      <Sheet open={sheet === "discount"} title="Extra discount" onClose={() => setSheet(null)}>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{t("Extra discount on the whole send (€)")}</span>
          <input className={inputClass} inputMode="decimal" placeholder="0" value={whole} onChange={(e) => setWhole(e.target.value)} />
        </label>
        <p className="text-sm text-(--muted)">{t("For a discount on one product, select it and use \"Extra disc. / pc\" on the number pad.")}</p>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">
            {t("Reason for extra discount")} {hasExtra && <span className="text-red-600">*</span>}
          </span>
          <input className={inputClass} placeholder={t("Festival offer")} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        {hasExtra && !reason.trim() && <p className="text-sm text-red-600">{t("Give a reason for the extra discount")}</p>}
      </Sheet>

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
        <Button variant="secondary" onClick={() => setPayment((totals.total / 100).toFixed(2).replace(".", ","))}>
          {t("Paid in full")} ({formatMoney(totals.total)})
        </Button>
      </Sheet>

      <Sheet open={sheet === "note"} title="Note" onClose={() => setSheet(null)}>
        <textarea className={`${inputClass} h-32 py-3`} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Optional note on the receipt")} />
      </Sheet>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`h-12 rounded-xl border-2 px-4 text-sm font-semibold transition ${
        active ? "border-(--ink) bg-(--ink) text-white" : "border-(--line) bg-white text-(--ink) hover:border-(--teal)"
      }`}
    >
      {children}
    </button>
  );
}

function Line({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${muted ? "text-(--muted)" : ""} ${strong ? "text-base font-semibold" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
