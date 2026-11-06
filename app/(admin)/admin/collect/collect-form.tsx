"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { FormMessage } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import type { ActionState } from "@/server/forms";
import { formatTk, isMoneyInput, toPoisha, toTkInput } from "@/server/money";
import { collectFromHotel } from "@/server/modules/collect/actions";

type Row = { productId: string; name: string; atHotel: number; creditPrice: number };
type ItemRow = { serviceItemId: string; name: string; withUs: number };

const cellInput = `${inputClass} h-10 w-20 text-right`;
const th = "px-2 py-2";

function count(value: string | undefined) {
  return Math.max(0, Math.floor(Number(value || 0)));
}

export function CollectForm({
  hotelId,
  rows,
  itemRows,
  due,
}: {
  hotelId: string;
  rows: Row[];
  itemRows: ItemRow[];
  due: number;
}) {
  const [returned, setReturned] = useState<Record<string, string>>({});
  const [rejected, setRejected] = useState<Record<string, string>>({});
  const [creditEdits, setCredit] = useState<Record<string, string>>({});
  const credit: Record<string, string> = Object.fromEntries(
    rows.map((r) => [r.productId, creditEdits[r.productId] ?? (r.creditPrice ? toTkInput(r.creditPrice) : "")]),
  );
  const [itemQty, setItemQty] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");

  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await collectFromHotel(prev, formData);
    if (result?.ok) {
      setReturned({});
      setRejected({});
      setItemQty({});
      setNote("");
    }
    return result;
  }, undefined);

  const creditOf = (r: Row) => {
    const value = credit[r.productId] ?? "";
    return isMoneyInput(value || "0") ? toPoisha(value || "0") * count(rejected[r.productId]) : 0;
  };
  const totalCredit = rows.reduce((s, r) => s + creditOf(r), 0);
  const backPieces = rows.reduce((s, r) => s + count(returned[r.productId]) + count(rejected[r.productId]), 0);
  const itemPieces = itemRows.reduce((s, r) => s + count(itemQty[r.serviceItemId]), 0);
  const tooMany = rows.some((r) => count(returned[r.productId]) + count(rejected[r.productId]) > r.atHotel);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("hotelId", hotelId);
    formData.set(
      "lines",
      JSON.stringify(
        rows.map((r) => ({
          productId: r.productId,
          returned: count(returned[r.productId]),
          rejected: count(rejected[r.productId]),
          creditPerPiece: credit[r.productId] ?? "",
        })),
      ),
    );
    formData.set(
      "items",
      JSON.stringify(itemRows.map((r) => ({ serviceItemId: r.serviceItemId, quantity: count(itemQty[r.serviceItemId]) }))),
    );
    formData.set("note", note);
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <p className="mb-2 text-sm font-semibold">Your products coming back</p>
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-(--muted)">
                <th className={th}>Product</th>
                <th className={`${th} text-right`}>At hotel</th>
                <th className={`${th} text-right`}>Used, returned</th>
                <th className={`${th} text-right`}>Rejected (not perfect)</th>
                <th className={`${th} text-right`}>Credit / pc</th>
                <th className={`${th} text-right`}>Credit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const over = count(returned[r.productId]) + count(rejected[r.productId]) > r.atHotel;
                return (
                  <tr key={r.productId} className="border-t border-(--line)">
                    <td className="px-2 py-2 font-medium">{r.name}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{r.atHotel}</td>
                    <td className="px-2 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="text-xs font-medium text-(--teal) hover:underline"
                          onClick={() =>
                            setReturned({
                              ...returned,
                              [r.productId]: String(Math.max(0, r.atHotel - count(rejected[r.productId]))),
                            })
                          }
                        >
                          All
                        </button>
                        <input
                          className={`${cellInput} ${over ? "border-red-400 ring-4 ring-red-100" : ""}`}
                          type="number"
                          min={0}
                          placeholder="0"
                          value={returned[r.productId] ?? ""}
                          onChange={(e) => setReturned({ ...returned, [r.productId]: e.target.value })}
                          aria-label={`Used ${r.name} returned`}
                        />
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <input
                        className={`${cellInput} ${over ? "border-red-400 ring-4 ring-red-100" : ""}`}
                        type="number"
                        min={0}
                        placeholder="0"
                        value={rejected[r.productId] ?? ""}
                        onChange={(e) => setRejected({ ...rejected, [r.productId]: e.target.value })}
                        aria-label={`Rejected ${r.name}`}
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <input
                        className={`${cellInput} w-24`}
                        inputMode="decimal"
                        value={credit[r.productId] ?? ""}
                        onChange={(e) => setCredit({ ...creditEdits, [r.productId]: e.target.value })}
                        aria-label={`Credit per rejected ${r.name}`}
                      />
                    </td>
                    <td className="px-2 py-2 text-right font-semibold tabular-nums">
                      {creditOf(r) > 0 ? `-${formatTk(creditOf(r))}` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-(--muted)">
            Rejected pieces are credited back to the hotel. Credit / pc starts at the last price charged; change it if needed.
          </p>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-(--line) px-4 py-4 text-sm text-(--muted)">
          This hotel doesn&apos;t hold any of your products right now.
        </p>
      )}

      {itemRows.length > 0 && (
        <div className="overflow-x-auto">
          <p className="mb-2 text-sm font-semibold">Hotel&apos;s own items to wash (picking up)</p>
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-(--muted)">
                <th className={th}>Item</th>
                <th className={`${th} text-right`}>Already with us</th>
                <th className={`${th} text-right`}>Picking up now</th>
              </tr>
            </thead>
            <tbody>
              {itemRows.map((r) => (
                <tr key={r.serviceItemId} className="border-t border-(--line)">
                  <td className="px-2 py-2 font-medium">{r.name}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-(--muted)">{r.withUs}</td>
                  <td className="px-2 py-2 text-right">
                    <input
                      className={cellInput}
                      type="number"
                      min={0}
                      placeholder="0"
                      value={itemQty[r.serviceItemId] ?? ""}
                      onChange={(e) => setItemQty({ ...itemQty, [r.serviceItemId]: e.target.value })}
                      aria-label={`${r.name} picked up`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-(--muted)">Not charged now. They are charged when you send them back on the Send screen.</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Note (optional)</span>
          <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="space-y-2 rounded-2xl bg-(--paper) p-5 text-sm">
          <Line label="Your pieces coming back" value={String(backPieces)} />
          <Line label="Their items picked up" value={String(itemPieces)} />
          <Line label="Credit for rejected" value={totalCredit > 0 ? `-${formatTk(totalCredit)}` : "-"} />
          <div className="border-t border-(--line) pt-2">
            <Line label="Due after" value={formatTk(due - totalCredit)} strong />
          </div>
        </div>
      </div>

      <FormMessage state={state} />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending || backPieces + itemPieces === 0 || tooMany}>
          {pending ? "Saving..." : "Confirm collection"}
        </Button>
      </div>
    </form>
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
