"use client";

import { Building2, CheckCheck, Minus, NotebookPen, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { applyKey, Keypad } from "@/components/pos/keypad";
import { ModeToggle } from "@/components/pos/mode-toggle";
import { ProductTile } from "@/components/pos/product-tile";
import { Sheet } from "@/components/pos/sheet";
import { FormMessage } from "@/components/ui/action-form";
import { Button, buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import type { ActionState } from "@/server/forms";
import { formatMoney, isMoneyInput, toCents, toMoneyInput } from "@/server/money";
import { collectFromHotel } from "@/server/modules/collect/actions";

type Row = { productId: string; name: string; category: string; photoPath: string | null; atHotel: number; creditPrice: number };
/** One kind of the hotel's own pieces: one of our product types, or an "Other" name. */
type ItemRow = { key: string; productId: string | null; name: string; photoPath: string | null; withUs: number };

type Mode = "returned" | "rejected" | "items";
type Selected = { kind: Mode; id: string } | null;

export function CollectPos({
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
  const [returned, setReturned] = useState<Record<string, number>>({});
  const [rejected, setRejected] = useState<Record<string, number>>({});
  const [creditEdits, setCreditEdits] = useState<Record<string, string>>({});
  const [itemQty, setItemQty] = useState<Record<string, number>>({});
  const [extraItems, setExtraItems] = useState<ItemRow[]>([]);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherName, setOtherName] = useState("");
  const [mode, setMode] = useState<Mode>(rows.length > 0 ? "returned" : "items");
  const [selected, setSelected] = useState<Selected>(null);
  const [padMode, setPadMode] = useState<"qty" | "credit">("qty");
  const [buffer, setBuffer] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");

  function reset() {
    setReturned({});
    setRejected({});
    setCreditEdits({});
    setItemQty({});
    setExtraItems([]);
    setNote("");
    setSelected(null);
    setBuffer("");
  }

  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await collectFromHotel(prev, formData);
    if (result?.ok) reset();
    return result;
  }, undefined);

  const creditText = (r: Row) => creditEdits[r.productId] ?? (r.creditPrice ? toMoneyInput(r.creditPrice) : "");
  const creditCents = (r: Row) => {
    const v = creditText(r);
    return v && isMoneyInput(v) ? toCents(v) : 0;
  };
  const left = (r: Row) => r.atHotel - (returned[r.productId] ?? 0) - (rejected[r.productId] ?? 0);

  const returnedLines = rows.filter((r) => (returned[r.productId] ?? 0) > 0);
  const rejectedLines = rows.filter((r) => (rejected[r.productId] ?? 0) > 0);
  const allItems = [...itemRows, ...extraItems.filter((e) => !itemRows.some((r) => r.key === e.key))];
  const itemLines = allItems.filter((r) => (itemQty[r.key] ?? 0) > 0);
  const totalCredit = rejectedLines.reduce((s, r) => s + creditCents(r) * (rejected[r.productId] ?? 0), 0);
  const backPieces =
    returnedLines.reduce((s, r) => s + (returned[r.productId] ?? 0), 0) +
    rejectedLines.reduce((s, r) => s + (rejected[r.productId] ?? 0), 0);
  const itemPieces = itemLines.reduce((s, r) => s + (itemQty[r.key] ?? 0), 0);

  function countOf(target: Selected) {
    if (!target) return 0;
    if (target.kind === "returned") return returned[target.id] ?? 0;
    if (target.kind === "rejected") return rejected[target.id] ?? 0;
    return itemQty[target.id] ?? 0;
  }

  /**
   * Sets a count, never letting returned + rejected go above what the hotel holds.
   * Rejected pieces are taken out of "returned" when needed (after "All back").
   */
  function setCount(target: Selected, value: number) {
    if (!target) return;
    let n = Math.max(0, Math.min(99999, value));
    const row = target.kind !== "items" ? rows.find((r) => r.productId === target.id) : undefined;
    if (target.kind === "returned") {
      if (row) n = Math.min(n, row.atHotel - (rejected[target.id] ?? 0));
      setReturned((q) => ({ ...q, [target.id]: n }));
    } else if (target.kind === "rejected") {
      if (row) {
        n = Math.min(n, row.atHotel);
        if (n + (returned[target.id] ?? 0) > row.atHotel) {
          setReturned((q) => ({ ...q, [target.id]: row.atHotel - n }));
        }
      }
      setRejected((q) => ({ ...q, [target.id]: n }));
    } else {
      setItemQty((q) => ({ ...q, [target.id]: n }));
    }
  }

  function select(next: Selected) {
    setSelected(next);
    setBuffer("");
    setPadMode("qty");
  }

  function tap(id: string) {
    const target = { kind: mode, id };
    setCount(target, countOf(target) + 1);
    select(target);
  }

  function onKey(key: string) {
    if (!selected) return;
    if (padMode === "credit" && selected.kind === "rejected") {
      const next = applyKey(buffer, key, true);
      setBuffer(next);
      setCreditEdits((c) => ({ ...c, [selected.id]: next }));
      return;
    }
    const next = applyKey(buffer, key, false);
    setBuffer(next);
    setCount(selected, Number(next || 0));
  }

  function allBack() {
    setReturned(Object.fromEntries(rows.map((r) => [r.productId, r.atHotel - (rejected[r.productId] ?? 0)])));
    setMode("returned");
  }

  function confirmCollect() {
    const formData = new FormData();
    formData.set("hotelId", hotel.id);
    formData.set(
      "lines",
      JSON.stringify(
        rows.map((r) => ({
          productId: r.productId,
          returned: returned[r.productId] ?? 0,
          rejected: rejected[r.productId] ?? 0,
          creditPerPiece: creditText(r),
        })),
      ),
    );
    formData.set(
      "items",
      JSON.stringify(itemLines.map((r) => ({ productId: r.productId, name: r.name, quantity: itemQty[r.key] ?? 0 }))),
    );
    formData.set("note", note);
    startTransition(() => action(formData));
  }

  const modeTabs: { key: Mode; label: string; show: boolean }[] = [
    { key: "returned", label: "Used, returned", show: rows.length > 0 },
    { key: "rejected", label: "Rejected (not perfect)", show: rows.length > 0 },
    { key: "items", label: "Their items to wash", show: true },
  ];

  const selectedName =
    selected?.kind === "items"
      ? allItems.find((r) => r.key === selected.id)?.name
      : rows.find((r) => r.productId === selected?.id)?.name;

  return (
    <div className="flex flex-col gap-4 pb-28">
      <ModeToggle mode="collect" hotelId={hotel.id} hotelName={hotel.name} dirty={backPieces + itemPieces > 0} />
      <div className="grid gap-4 lg:grid-cols-[minmax(260px,320px)_1fr_250px]">
        <section className="order-2 flex flex-col rounded-3xl border border-(--line) bg-white lg:order-1" aria-label={t("Collect list")}>
          <div className="border-b border-(--line) px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-(--muted)">{t("Collect from")}</p>
            <p className="text-lg font-semibold">{hotel.name}</p>
          </div>
          <div className="max-h-[42vh] min-h-40 flex-1 overflow-y-auto">
            {backPieces + itemPieces === 0 && (
              <p className="px-4 py-10 text-center text-sm text-(--muted)">{t("Choose what is coming back, then tap the tiles.")}</p>
            )}
            <LineGroup title={t("Used, returned")} show={returnedLines.length > 0}>
              {returnedLines.map((r) => (
                <ListLine
                  key={r.productId}
                  active={selected?.kind === "returned" && selected.id === r.productId}
                  onClick={() => select({ kind: "returned", id: r.productId })}
                  name={r.name}
                  detail={`${returned[r.productId]} ${t("pcs")}`}
                />
              ))}
            </LineGroup>
            <LineGroup title={t("Rejected (credited)")} show={rejectedLines.length > 0}>
              {rejectedLines.map((r) => (
                <ListLine
                  key={r.productId}
                  active={selected?.kind === "rejected" && selected.id === r.productId}
                  onClick={() => select({ kind: "rejected", id: r.productId })}
                  name={r.name}
                  detail={`${rejected[r.productId]} × ${formatMoney(creditCents(r))}`}
                  value={`−${formatMoney(creditCents(r) * (rejected[r.productId] ?? 0))}`}
                />
              ))}
            </LineGroup>
            <LineGroup title={t("Their items picked up")} show={itemLines.length > 0}>
              {itemLines.map((r) => (
                <ListLine
                  key={r.key}
                  active={selected?.kind === "items" && selected.id === r.key}
                  onClick={() => select({ kind: "items", id: r.key })}
                  name={r.name}
                  detail={`${itemQty[r.key]} ${t("pcs")}`}
                />
              ))}
            </LineGroup>
          </div>
          <div className="space-y-1.5 border-t border-(--line) px-4 py-3 text-sm">
            <Line label={t("Your pieces coming back")} value={String(backPieces)} />
            <Line label={t("Their items picked up")} value={String(itemPieces)} />
            <Line label={t("Credit for rejected")} value={totalCredit > 0 ? `−${formatMoney(totalCredit)}` : "−"} />
            <Line label={t("Due after")} value={formatMoney(due - totalCredit)} strong />
          </div>
        </section>

        <section className="order-1 min-w-0 space-y-3 lg:order-2">
          <div className="flex flex-wrap gap-2" role="tablist">
            {modeTabs
              .filter((m) => m.show)
              .map((m) => (
                <button
                  key={m.key}
                  type="button"
                  role="tab"
                  aria-selected={mode === m.key}
                  onClick={() => setMode(m.key)}
                  className={`h-14 rounded-xl border-2 px-5 text-base font-semibold transition ${
                    mode === m.key
                      ? m.key === "rejected"
                        ? "border-amber-600 bg-amber-500 text-white"
                        : "border-(--ink) bg-(--ink) text-white"
                      : "border-(--line) bg-white text-(--ink) hover:border-(--teal)"
                  }`}
                >
                  {t(m.label)}
                </button>
              ))}
          </div>

          {mode === "items" ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(124px,1fr))] gap-2">
              {allItems.map((r) => (
                <ProductTile
                  key={r.key}
                  name={r.name}
                  info={r.withUs > 0 ? t("Already with us: {count}", { count: r.withUs }) : undefined}
                  photoPath={r.photoPath}
                  count={itemQty[r.key] ?? 0}
                  selected={selected?.kind === "items" && selected.id === r.key}
                  onTap={() => tap(r.key)}
                />
              ))}
              <button
                type="button"
                onClick={() => setOtherOpen(true)}
                className="flex min-h-24 items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-(--line) bg-white p-2.5 text-sm font-semibold text-(--teal) hover:border-(--teal)"
              >
                <Plus className="size-5" aria-hidden />
                {t("Other item")}
              </button>
            </div>
          ) : rows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-(--line) bg-white p-8 text-center text-(--muted)">
              {t("This hotel doesn't hold any of your products right now.")}
            </p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(124px,1fr))] gap-2">
              {rows.map((r) => (
                <ProductTile
                  key={r.productId}
                  name={r.name}
                  info={t("At hotel: {count} · left {left}", { count: r.atHotel, left: left(r) })}
                  photoPath={r.photoPath}
                  count={(mode === "returned" ? returned : rejected)[r.productId] ?? 0}
                  selected={selected?.kind === mode && selected.id === r.productId}
                  onTap={() => tap(r.productId)}
                />
              ))}
            </div>
          )}

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
              {selected?.kind === "rejected" && (
                <div className="grid grid-cols-2 gap-2">
                  <PadTab active={padMode === "qty"} onClick={() => { setPadMode("qty"); setBuffer(""); }}>
                    {t("Quantity")}
                  </PadTab>
                  <PadTab active={padMode === "credit"} onClick={() => { setPadMode("credit"); setBuffer(""); }}>
                    {t("Credit / pc")}
                  </PadTab>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                <Button size="lg" variant="secondary" className="px-0" disabled={!selected} onClick={() => setCount(selected, countOf(selected) - 1)} aria-label={t("One less")}>
                  <Minus className="size-5" aria-hidden />
                </Button>
                <Button size="lg" variant="secondary" className="px-0" disabled={!selected} onClick={() => setCount(selected, countOf(selected) + 1)} aria-label={t("One more")}>
                  <Plus className="size-5" aria-hidden />
                </Button>
                <Button size="lg" variant="secondary" className="px-0" disabled={!selected} onClick={() => { setCount(selected, 0); select(null); }} aria-label={t("Remove")}>
                  <Trash2 className="size-5" aria-hidden />
                </Button>
              </div>
              <FormMessage state={state} />
            </div>
            <Keypad onKey={onKey} allowDecimal={padMode === "credit"} disabled={!selected} />
        </section>
      </div>

      <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-(--line) bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <Link href="/admin/collect" className={buttonClass("secondary", "lg")}>
            <Building2 className="size-5" aria-hidden />
            {t("Hotel")}
          </Link>
          {rows.length > 0 && (
            <Button size="lg" variant="secondary" onClick={allBack}>
              <CheckCheck className="size-5" aria-hidden />
              {t("All back")}
            </Button>
          )}
          <Button size="lg" variant="secondary" onClick={() => setNoteOpen(true)}>
            <NotebookPen className="size-5" aria-hidden />
            {t("Note")}
          </Button>
          <div className="ml-auto flex gap-2">
            <Button
              size="lg"
              variant="danger"
              disabled={pending}
              onClick={() => {
                if (backPieces + itemPieces === 0 || window.confirm(t("Clear the whole list?"))) reset();
              }}
            >
              <X className="size-5" aria-hidden />
              {t("Cancel")}
            </Button>
            <Button size="lg" onClick={confirmCollect} disabled={pending || backPieces + itemPieces === 0} className="min-w-48">
              {pending ? t("Saving...") : t("Confirm collection")}
            </Button>
          </div>
        </div>
      </div>

      <Sheet open={otherOpen} title="Other item" onClose={() => setOtherOpen(false)}>
        <p className="text-sm text-(--muted)">{t("A type of item you don't have as a product, for example Curtain.")}</p>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{t("Name")}</span>
          <input className={inputClass} value={otherName} onChange={(e) => setOtherName(e.target.value)} placeholder={t("e.g. Curtain")} autoFocus />
        </label>
        <Button
          size="lg"
          disabled={!otherName.trim()}
          onClick={() => {
            const name = otherName.trim();
            const key = `n:${name.toLowerCase()}`;
            const existing = allItems.find((i) => i.key === key);
            if (!existing) setExtraItems((items) => [...items, { key, productId: null, name, photoPath: null, withUs: 0 }]);
            setOtherName("");
            setOtherOpen(false);
            setMode("items");
            setItemQty((q) => ({ ...q, [key]: (q[key] ?? 0) + 1 }));
            select({ kind: "items", id: key });
          }}
        >
          <Plus className="size-5" aria-hidden />
          {t("Add")}
        </Button>
      </Sheet>

      <Sheet open={noteOpen} title="Note" onClose={() => setNoteOpen(false)}>
        <textarea className={`${inputClass} h-32 py-3`} value={note} onChange={(e) => setNote(e.target.value)} />
      </Sheet>
    </div>
  );
}

function LineGroup({ title, show, children }: { title: string; show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <div>
      <p className="bg-(--paper) px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-(--muted)">{title}</p>
      <ul className="divide-y divide-(--line)">{children}</ul>
    </div>
  );
}

function ListLine({
  name,
  detail,
  value,
  active,
  onClick,
}: {
  name: string;
  detail: string;
  value?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${active ? "bg-(--teal-soft)" : "hover:bg-(--paper)"}`}
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">{name}</span>
          <span className="block text-sm tabular-nums text-(--muted)">{detail}</span>
        </span>
        {value && <span className="font-semibold tabular-nums">{value}</span>}
      </button>
    </li>
  );
}

function PadTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-12 rounded-xl border-2 px-3 text-sm font-semibold leading-tight ${active ? "border-(--ink) bg-(--ink) text-white" : "border-(--line) bg-white"}`}
    >
      {children}
    </button>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "text-base font-semibold" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
