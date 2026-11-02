"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { FormMessage } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { formatTk } from "@/server/money";
import { createServiceOrder } from "@/server/modules/services/actions";

type Row = { serviceItemId: string; name: string; price: number };

export function ServiceOrderForm({ hotelId, rows }: { hotelId: string; rows: Row[] }) {
  const [state, action, pending] = useActionState(createServiceOrder, undefined);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");

  const quantity = (id: string) => Math.max(0, Math.floor(Number(qty[id] || 0)));
  const estimate = rows.reduce((sum, r) => sum + r.price * quantity(r.serviceItemId), 0);
  const pieces = rows.reduce((sum, r) => sum + quantity(r.serviceItemId), 0);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("hotelId", hotelId);
    formData.set(
      "lines",
      JSON.stringify(rows.map((r) => ({ serviceItemId: r.serviceItemId, quantity: quantity(r.serviceItemId) }))),
    );
    formData.set("note", note);
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-(--muted)">
            <th className="px-2 py-2">Item</th>
            <th className="px-2 py-2 text-right">Price / piece</th>
            <th className="px-2 py-2 text-right">Pieces received</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.serviceItemId} className="border-t border-(--line)">
              <td className="px-2 py-2 font-medium">{r.name}</td>
              <td className="px-2 py-2 text-right tabular-nums">{formatTk(r.price)}</td>
              <td className="px-2 py-2 text-right">
                <input
                  className={`${inputClass} h-10 w-24 text-right`}
                  type="number"
                  min={0}
                  placeholder="0"
                  value={qty[r.serviceItemId] ?? ""}
                  onChange={(e) => setQty({ ...qty, [r.serviceItemId]: e.target.value })}
                  aria-label={`Pieces of ${r.name}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <label className="block max-w-md">
        <span className="mb-1.5 block text-sm font-medium">Note (optional)</span>
        <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <FormMessage state={state} />
      <div className="flex items-center justify-end gap-4 text-sm">
        <span className="text-(--muted)">
          {pieces} pieces · about {formatTk(estimate)} (charged at delivery)
        </span>
        <Button type="submit" disabled={pending || pieces === 0}>
          {pending ? "Saving..." : "Receive items"}
        </Button>
      </div>
    </form>
  );
}
