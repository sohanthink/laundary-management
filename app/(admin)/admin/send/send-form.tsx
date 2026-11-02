"use client";

import { startTransition, useActionState, useMemo, useState, type FormEvent } from "react";
import { FormMessage } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { formatTk, isMoneyInput, toPoisha } from "@/server/money";
import { createSend } from "@/server/modules/send/actions";
import { calculateSend } from "@/server/pricing";

type Row = {
  productId: string;
  name: string;
  category: string;
  basePrice: number;
  agreedPrice: number;
  available: number;
};

const cellInput = `${inputClass} h-10 w-24 text-right`;

function money(value: string) {
  return value && isMoneyInput(value) ? toPoisha(value) : 0;
}

export function SendForm({ hotelId, rows, due }: { hotelId: string; rows: Row[]; due: number }) {
  const [state, action, pending] = useActionState(createSend, undefined);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [whole, setWhole] = useState("");
  const [reason, setReason] = useState("");
  const [payment, setPayment] = useState("");
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");

  const totals = useMemo(
    () =>
      calculateSend(
        rows.map((r) => ({
          basePrice: r.basePrice,
          agreedPrice: r.agreedPrice,
          extraPerPiece: money(extra[r.productId] ?? ""),
          quantity: Math.max(0, Math.floor(Number(qty[r.productId] || 0))),
        })),
        money(whole),
      ),
    [rows, qty, extra, whole],
  );

  const paid = money(payment);
  const dueAfter = due + totals.total - paid;
  const hasExtra = totals.extraDiscountTotal > 0;
  const overStock = rows.some((r) => Number(qty[r.productId] || 0) > r.available);
  const anyQuantity = rows.some((r) => Number(qty[r.productId] || 0) > 0);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("hotelId", hotelId);
    formData.set(
      "lines",
      JSON.stringify(
        rows.map((r) => ({
          productId: r.productId,
          quantity: Math.max(0, Math.floor(Number(qty[r.productId] || 0))),
          extraPerPiece: extra[r.productId] ?? "",
        })),
      ),
    );
    formData.set("wholeDiscount", whole);
    formData.set("discountReason", reason);
    formData.set("paymentAmount", payment);
    formData.set("paymentMethod", method);
    formData.set("note", note);
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-(--muted)">
              <th className="px-2 py-2">Product</th>
              <th className="px-2 py-2 text-right">Available</th>
              <th className="px-2 py-2 text-right">Base</th>
              <th className="px-2 py-2 text-right">Agreed</th>
              <th className="px-2 py-2 text-right">Extra disc. / pc</th>
              <th className="px-2 py-2 text-right">Final</th>
              <th className="px-2 py-2 text-right">Qty</th>
              <th className="px-2 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const line = totals.lines[i];
              const tooMany = Number(qty[r.productId] || 0) > r.available;
              return (
                <tr key={r.productId} className="border-t border-(--line)">
                  <td className="px-2 py-2">
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-(--muted)">{r.category}</p>
                  </td>
                  <td className={`px-2 py-2 text-right tabular-nums ${r.available === 0 ? "text-red-600" : ""}`}>
                    {r.available}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-(--muted) line-through decoration-(--muted)/50">
                    {formatTk(r.basePrice)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatTk(r.agreedPrice)}</td>
                  <td className="px-2 py-2 text-right">
                    <input
                      className={cellInput}
                      inputMode="decimal"
                      placeholder="0"
                      value={extra[r.productId] ?? ""}
                      onChange={(e) => setExtra({ ...extra, [r.productId]: e.target.value })}
                      aria-label={`Extra discount per piece for ${r.name}`}
                    />
                  </td>
                  <td className="px-2 py-2 text-right font-medium tabular-nums">
                    {formatTk(line.finalUnitPrice)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <input
                      className={`${cellInput} ${tooMany ? "border-red-400 ring-4 ring-red-100" : ""}`}
                      type="number"
                      min={0}
                      max={r.available}
                      placeholder="0"
                      value={qty[r.productId] ?? ""}
                      onChange={(e) => setQty({ ...qty, [r.productId]: e.target.value })}
                      aria-label={`Quantity of ${r.name}`}
                    />
                  </td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums">
                    {formatTk(line.lineTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Extra discount on the whole send (tk)</span>
            <input className={inputClass} inputMode="decimal" placeholder="0" value={whole} onChange={(e) => setWhole(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              Reason for extra discount {hasExtra && <span className="text-red-600">*</span>}
            </span>
            <input
              className={inputClass}
              placeholder="Festival offer"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required={hasExtra}
            />
            {state?.fieldErrors?.discountReason && (
              <span className="mt-1 block text-xs text-red-600">{state.fieldErrors.discountReason[0]}</span>
            )}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Note (optional)</span>
            <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>

        <div className="space-y-3 rounded-2xl bg-(--paper) p-5 text-sm">
          <Line label="Subtotal" value={formatTk(totals.subtotal)} />
          {totals.wholeDiscount > 0 && <Line label="Extra discount (whole)" value={`-${formatTk(totals.wholeDiscount)}`} />}
          {totals.agreedDiscountTotal > 0 && (
            <Line label="Saved by agreed deal" value={formatTk(totals.agreedDiscountTotal)} muted />
          )}
          {hasExtra && <Line label="Extra discount given" value={formatTk(totals.extraDiscountTotal)} muted />}
          <div className="border-t border-(--line) pt-3">
            <Line label="Total charge" value={formatTk(totals.total)} strong />
          </div>
          <Line label="Current due" value={formatTk(due)} muted />
          <div className="grid grid-cols-[1fr_auto] items-end gap-3">
            <label className="block">
              <span className="mb-1.5 block font-medium">Payment now (tk)</span>
              <input className={inputClass} inputMode="decimal" placeholder="0" value={payment} onChange={(e) => setPayment(e.target.value)} />
            </label>
            <select className={`${inputClass} w-40`} value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Payment method">
              <option value="CASH">Cash</option>
              <option value="BANK">Bank</option>
              <option value="EMPLOYEE">Employee</option>
            </select>
          </div>
          <div className="border-t border-(--line) pt-3">
            <Line label="Due after this send" value={formatTk(dueAfter)} strong />
          </div>
        </div>
      </div>

      <FormMessage state={state} />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending || !anyQuantity || overStock}>
          {pending ? "Saving..." : "Confirm & send"}
        </Button>
      </div>
    </form>
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
