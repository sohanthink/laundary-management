"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

/** Simple dialog controlled by the parent (open/onClose), used by the POS screens. */
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-full max-w-md rounded-3xl border border-(--line) bg-white p-0 text-(--ink) shadow-[0_24px_80px_rgba(20,38,31,0.18)] backdrop:bg-black/30"
    >
      <div className="border-b border-(--line) px-6 py-4">
        <h2 className="text-xl font-semibold">{t(title)}</h2>
      </div>
      <div className="space-y-4 px-6 py-5">{children}</div>
      <div className="flex justify-end border-t border-(--line) px-6 py-4">
        <Button size="lg" onClick={onClose}>
          {t("Done")}
        </Button>
      </div>
    </dialog>
  );
}
