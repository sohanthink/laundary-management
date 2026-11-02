"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "./button";

type ModalContextValue = { close: (message?: string) => void };

const ModalContext = createContext<ModalContextValue | null>(null);

export function useModal() {
  return useContext(ModalContext);
}

type ModalProps = {
  trigger: string;
  title: string;
  children: ReactNode;
  triggerVariant?: "primary" | "secondary" | "ghost" | "danger" | "dark";
  triggerSize?: "sm" | "md";
  description?: string;
};

export function Modal({
  trigger,
  title,
  children,
  triggerVariant = "primary",
  triggerSize = "md",
  description,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const close = useCallback((message?: string) => {
    dialogRef.current?.close();
    if (message) {
      setToast(message);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setToast(null), 5000);
    }
  }, []);
  const value = useMemo(() => ({ close }), [close]);

  return (
    <>
      <Button
        variant={triggerVariant}
        size={triggerSize}
        onClick={() => dialogRef.current?.showModal()}
      >
        {trigger}
      </Button>
      <dialog
        ref={dialogRef}
        className="m-auto w-full max-w-lg rounded-3xl border border-(--line) bg-white p-0 text-(--ink) shadow-[0_24px_80px_rgba(20,38,31,0.18)] backdrop:bg-black/30"
      >
        <div className="flex items-start justify-between gap-4 border-b border-(--line) px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-(--muted)">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => close()}
            className="rounded-full px-2 text-xl leading-none text-(--muted) hover:text-(--ink)"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">
          <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
        </div>
      </dialog>
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-lg"
        >
          {toast}
        </div>
      )}
    </>
  );
}
