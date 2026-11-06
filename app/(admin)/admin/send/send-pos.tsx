"use client";

import { Banknote, Building2, Minus, NotebookPen, Percent, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useMemo, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { clearDraft, draftKey, loadDraft, useSaveDraft } from "@/components/pos/draft";
import { applyKey, Keypad } from "@/components/pos/keypad";
import { ModeToggle } from "@/components/pos/mode-toggle";
import { ProductTile } from "@/components/pos/product-tile";
import { Sheet } from "@/components/pos/sheet";
import { FormMessage } from "@/components/ui/action-form";
import { Button, buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { formatMoney, isMoneyInput, toCents, toMoneyInput } from "@/server/money";
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
/** One kind of the hotel's own pieces (a product type or an "Other" name). */
type ItemRow = { key: string; productId: string | null; name: string; withUs: number; lastPrice: number | null };

type Selected = { kind: "product" | "item"; id: string } | null;

type SendDraft = {
  qty: Record<string, number>;
  extra: Record<string, string>;
  itemQty: Record<string, number>;
  itemPrice: Record<string, string>;
  extraItems: ItemRow[];
  whole: string;
  reason: string;
  payment: string;
  method: "CASH" | "BANK" | "POS" | "EMPLOYEE";
  note: string;
};
type PadMode = "qty" | "extra" | "price";

const itemKeyOf = (productId: string | null, name: string) =>
  productId ? `p:${productId}` : `n:${name.trim().toLowerCase()}`;

const PRODUCTS_TAB = "__products__";
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
  products,
  due,
}: {
  hotel: { id: string; name: string };
  rows: Row[];
  itemRows: ItemRow[];
  products: { id: string; name: string }[];
  due: number;
}) {
  const t = useT();
  const [state, action, pending] = useActionState(createSend, undefined);

  // Unfinished list for this hotel, saved in the browser (rendered client-only).
  const storageKey = draftKey("send", hotel.id);
  const [draft] = useState(() => loadDraft<SendDraft>(storageKey));
  const [restored, setRestored] = useState(draft !== null);

  const [tab, setTab] = useState(rows.length > 0 ? PRODUCTS_TAB : ITEMS_TAB);
  const [qty, setQty] = useState<Record<string, number>>(draft?.qty ?? {});
  const [extra, setExtra] = useState<Record<string, string>>(draft?.extra ?? {});
  const [itemQty, setItemQty] = useState<Record<string, number>>(draft?.itemQty ?? {});
  const [itemPrice, setItemPrice] = useState<Record<string, string>>(draft?.itemPrice ?? {});
  const [extraItems, setExtraItems] = useState<ItemRow[]>(draft?.extraItems ?? []);
  const [otherProduct, setOtherProduct] = useState("");
  const [otherName, setOtherName] = useState("");
  const [warning, setWarning] = useState("");
  const [selected, setSelected] = useState<Selected>(null);
  const [padMode, setPadMode] = useState<PadMode>("qty");
  const [buffer, setBuffer] = useState("");

  const [sheet, setSheet] = useState<"discount" | "payment" | "note" | "other" | null>(null);

  const allItems = useMemo(
    () => [...itemRows, ...extraItems.filter((e) => !itemRows.some((r) => r.key === e.key))],
    [itemRows, extraItems],
  );
  const priceText = (r: ItemRow) => itemPrice[r.key] ?? (r.lastPrice !== null ? toMoneyInput(r.lastPrice) : "");
  const [whole, setWhole] = useState(draft?.whole ?? "");
  const [reason, setReason] = useState(draft?.reason ?? "");
  const [payment, setPayment] = useState(draft?.payment ?? "");
  const [method, setMethod] = useState<(typeof METHODS)[number]>(draft?.method ?? "CASH");
  const [note, setNote] = useState(draft?.note ?? "");

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
        allItems.map((r) => ({
          price: cents(itemPrice[r.key] ?? (r.lastPrice !== null ? toMoneyInput(r.lastPrice) : "")),
          quantity: itemQty[r.key] ?? 0,
        })),
      ),
    [rows, allItems, qty, extra, itemQty, itemPrice, whole],
  );

  const productLines = rows.map((r, i) => ({ row: r, line: totals.lines[i] })).filter((x) => x.line.quantity > 0);
  const itemLines = allItems
    .map((r, i) => ({ row: r, line: totals.itemLines[i] }))
    .filter((x) => x.line.quantity > 0);
  const pieces = productLines.reduce((s, x) => s + x.line.quantity, 0) + itemLines.reduce((s, x) => s + x.line.quantity, 0);
  const hasExtra = totals.extraDiscountTotal > 0;
  const paid = cents(payment);

  useSaveDraft(
    storageKey,
    { qty, extra, itemQty, itemPrice, extraItems, whole, reason, payment, method, note } satisfies SendDraft,
    pieces > 0 && !pending,
    state,
  );

  function select(next: Selected, mode: PadMode = "qty") {
    setSelected(next);
    setBuffer("");
    setPadMode(mode);
    setWarning("");
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

  function tapItem(row: ItemRow) {
    const target = { kind: "item" as const, id: row.key };
    setCount(target, countOf(target) + 1);
    // No price yet: go straight to typing the washing price.
    select(target, isMoneyInput(priceText(row) || "x") ? "qty" : "price");
  }

  function addOther() {
    const product = products.find((p) => p.id === otherProduct);
    const name = product?.name ?? otherName.trim();
    if (!name) return;
    const row: ItemRow = {
      key: itemKeyOf(product?.id ?? null, name),
      productId: product?.id ?? null,
      name,
      withUs: 0,
      lastPrice: null,
    };
    setExtraItems((items) => (items.some((i) => i.key === row.key) ? items : [...items, row]));
    setOtherProduct("");
    setOtherName("");
    setSheet(null);
    setTab(ITEMS_TAB);
    tapItem(allItems.find((i) => i.key === row.key) ?? row);
  }

  function onKey(key: string) {
    if (!selected) return;
    if (padMode === "price" && selected.kind === "item") {
      const next = applyKey(buffer, key, true);
      setBuffer(next);
      setItemPrice((p) => ({ ...p, [selected.id]: next }));
      return;
    }
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
    setExtraItems([]);
    setWhole("");
    setReason("");
    setPayment("");
    setNote("");
    setRestored(false);
    select(null);
    clearDraft(storageKey);
  }

  function confirmSend() {
    if (hasExtra && !reason.trim()) {
      setSheet("discount");
      return;
    }
    const noPrice = itemLines.find(({ row }) => !isMoneyInput(priceText(row) || "x"));
    if (noPrice) {
      setTab(ITEMS_TAB);
      select({ kind: "item", id: noPrice.row.key }, "price");
      setWarning(t("Type the washing price for {item}", { item: noPrice.row.name }));
      return;
    }
    const formData = new FormData();
    formData.set("hotelId", hotel.id);
    formData.set(
      "lines",
      JSON.stringify(rows.map((r) => ({ productId: r.productId, quantity: qty[r.productId] ?? 0, extraPerPiece: extra[r.productId] ?? "" }))),
    );
    formData.set(
      "items",
      JSON.stringify(
        itemLines.map(({ row, line }) => ({
          productId: row.productId,
          name: row.name,
          quantity: line.quantity,
          price: priceText(row),
        })),
      ),
    );
    formData.set("wholeDiscount", whole);
    formData.set("discountReason", reason);
    formData.set("paymentAmount", payment);
    formData.set("paymentMethod", method);
    formData.set("note", note);
    // A successful send leaves this screen; if the server returns an error,
    // the draft is saved again by useSaveDraft (it re-runs when `state` changes).
    clearDraft(storageKey);
    startTransition(() => action(formData));
  }

  const selectedName =
    selected?.kind === "product"
      ? rows.find((r) => r.productId === selected.id)?.name
      : allItems.find((r) => r.key === selected?.id)?.name;

  return (
    <div className="flex flex-col gap-4 pb-28">
      <div className="flex flex-wrap items-center gap-3">
        <ModeToggle mode="send" hotelId={hotel.id} hotelName={hotel.name} />
        {restored && pieces > 0 && (
          <div className="ml-auto flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 py-1 pl-4 pr-1 text-sm text-amber-900">
            <span className="font-medium">{t("Unfinished list restored")}</span>
            <Button size="sm" variant="secondary" onClick={clearAll}>
              {t("Start over")}
            </Button>
          </div>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(260px,320px)_1fr_250px]">
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
              const isSel = selected?.kind === "item" && selected.id === row.key;
              const hasPrice = isMoneyInput(priceText(row) || "x");
              return (
                <li key={row.key}>
                  <button
                    type="button"
                    onClick={() => select({ kind: "item", id: row.key }, hasPrice ? "qty" : "price")}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${isSel ? "bg-(--teal-soft)" : "hover:bg-(--paper)"}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{row.name}</span>
                      <span className="block text-sm text-(--muted) tabular-nums">
                        {t("Their item")} · {line.quantity} ×{" "}
                        {hasPrice ? formatMoney(line.price) : <span className="font-semibold text-red-600">{t("price?")}</span>}
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
        <section className="order-1 min-w-0 space-y-3 lg:order-2">
          <div className="flex flex-wrap gap-2" role="tablist">
            {rows.length > 0 && (
              <TabButton active={tab === PRODUCTS_TAB} onClick={() => setTab(PRODUCTS_TAB)}>
                {t("Your products")}
              </TabButton>
            )}
            <TabButton active={tab === ITEMS_TAB} onClick={() => setTab(ITEMS_TAB)}>
              {t("Their items (washed)")}
            </TabButton>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(124px,1fr))] gap-2">
            {tab === ITEMS_TAB
              ? [
                  ...allItems.map((r) => (
                    <ProductTile
                      key={r.key}
                      name={r.name}
                      price={isMoneyInput(priceText(r) || "x") ? formatMoney(cents(priceText(r))) : undefined}
                      info={t("With us: {count}", { count: r.withUs })}
                      count={itemQty[r.key] ?? 0}
                      selected={selected?.kind === "item" && selected.id === r.key}
                      onTap={() => tapItem(r)}
                    />
                  )),
                  <button
                    key="__other__"
                    type="button"
                    onClick={() => setSheet("other")}
                    className="flex min-h-24 items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-(--line) bg-white p-2.5 text-sm font-semibold text-(--teal) hover:border-(--teal)"
                  >
                    <Plus className="size-5" aria-hidden />
                    {t("Other item")}
                  </button>,
                ]
              : [...rows]
                  .sort((a, b) => a.name.localeCompare(b.name))
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

          </section>

        {/* Number pad column */}
        <section className="order-2 space-y-3 self-start rounded-3xl border border-(--line) bg-white p-3 lg:sticky lg:top-24 lg:order-3">
            <div className="space-y-3">
              <p className="min-h-10 text-sm leading-snug text-(--muted)">
                {selected ? (
                  <>
                    {t("Selected")}: <span className="font-semibold text-(--ink)">{selectedName}</span>
                  </>
                ) : (
                  t("Tap a line or tile, then type the quantity.")
                )}
              </p>
              {selected && (
                <div className="grid grid-cols-2 gap-2">
                  <TabButton active={padMode === "qty"} onClick={() => { setPadMode("qty"); setBuffer(""); }}>
                    {t("Quantity")}
                  </TabButton>
                  {selected.kind === "product" ? (
                    <TabButton active={padMode === "extra"} onClick={() => { setPadMode("extra"); setBuffer(""); }}>
                      {t("Extra disc. / pc")}
                    </TabButton>
                  ) : (
                    <TabButton active={padMode === "price"} onClick={() => { setPadMode("price"); setBuffer(""); }}>
                      {t("Washing price / pc")}
                    </TabButton>
                  )}
                </div>
              )}
              {warning && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{warning}</p>}
              <div className="grid grid-cols-3 gap-2">
                <Button size="lg" variant="secondary" className="px-0" disabled={!selected} onClick={() => setCount(selected, countOf(selected) - 1)} aria-label={t("One less")}>
                  <Minus className="size-5" aria-hidden />
                </Button>
                <Button size="lg" variant="secondary" className="px-0" disabled={!selected} onClick={() => setCount(selected, countOf(selected) + 1)} aria-label={t("One more")}>
                  <Plus className="size-5" aria-hidden />
                </Button>
                <Button size="lg" variant="secondary" className="px-0" disabled={!selected} onClick={removeSelected} aria-label={t("Remove")}>
                  <Trash2 className="size-5" aria-hidden />
                </Button>
              </div>
              <FormMessage state={state} />
            </div>
            <Keypad onKey={onKey} allowDecimal={padMode !== "qty"} disabled={!selected} />
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
        <Button variant="secondary" onClick={() => setPayment((totals.total / 100).toFixed(2))}>
          {t("Paid in full")} ({formatMoney(totals.total)})
        </Button>
      </Sheet>

      <Sheet open={sheet === "other"} title="Other item" onClose={() => setSheet(null)}>
        <p className="text-sm text-(--muted)">{t("The hotel's own piece you are returning washed. Pick one of your product types, or type a name.")}</p>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{t("Product type")}</span>
          <select className={inputClass} value={otherProduct} onChange={(e) => setOtherProduct(e.target.value)}>
            <option value="">{t("Not in the list (type a name)")}</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {!otherProduct && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t("Name")}</span>
            <input className={inputClass} value={otherName} onChange={(e) => setOtherName(e.target.value)} placeholder={t("e.g. Curtain")} />
          </label>
        )}
        <Button size="lg" onClick={addOther} disabled={!otherProduct && !otherName.trim()}>
          <Plus className="size-5" aria-hidden />
          {t("Add")}
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
      className={`min-h-12 rounded-xl border-2 px-3 text-sm font-semibold leading-tight transition ${
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
