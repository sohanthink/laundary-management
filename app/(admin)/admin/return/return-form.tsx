"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { FormMessage } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import type { ActionState } from "@/server/forms";
import { createReturn } from "@/server/modules/returns/actions";

type Row = { productId: string; name: string; category: string; held: number };

export function ReturnForm({ hotelId, rows }: { hotelId: string; rows: Row[] }) {
  const [qty, setQty] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await createReturn(prev, formData);
    if (result?.ok) {
      setQty({});
      setNote("");
    }
    return result;
  }, undefined);

  const total = rows.reduce((sum, r) => sum + Math.max(0, Number(qty[r.productId] || 0)), 0);
  const tooMany = rows.some((r) => Number(qty[r.productId] || 0) > r.held);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("hotelId", hotelId);
    formData.set(
      "lines",
      JSON.stringify(
        rows.map((r) => ({ productId: r.productId, quantity: Math.max(0, Math.floor(Number(qty[r.productId] || 0))) })),
      ),
    );
    formData.set("note", note);
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-(--muted)">
            <th className="px-2 py-2">Product</th>
            <th className="px-2 py-2 text-right">Hotel holds</th>
            <th className="px-2 py-2 text-right">Returned now</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const over = Number(qty[r.productId] || 0) > r.held;
            return (
              <tr key={r.productId} className="border-t border-(--line)">
                <td className="px-2 py-2">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-(--muted)">{r.category}</p>
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{r.held}</td>
                <td className="px-2 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-(--teal) hover:underline"
                      onClick={() => setQty({ ...qty, [r.productId]: String(r.held) })}
                    >
                      All
                    </button>
                    <input
                      className={`${inputClass} h-10 w-24 text-right ${over ? "border-red-400 ring-4 ring-red-100" : ""}`}
                      type="number"
                      min={0}
                      max={r.held}
                      placeholder="0"
                      value={qty[r.productId] ?? ""}
                      onChange={(e) => setQty({ ...qty, [r.productId]: e.target.value })}
                      aria-label={`Returned ${r.name}`}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <label className="block max-w-md">
        <span className="mb-1.5 block text-sm font-medium">Note (optional)</span>
        <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <FormMessage state={state} />
      <div className="flex items-center justify-end gap-4">
        <span className="text-sm text-(--muted)">{total} pieces</span>
        <Button type="submit" disabled={pending || total === 0 || tooMany}>
          {pending ? "Saving..." : "Confirm return"}
        </Button>
      </div>
    </form>
  );
}
