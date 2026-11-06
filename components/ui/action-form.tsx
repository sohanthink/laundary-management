"use client";

import {
  createContext,
  startTransition,
  useActionState,
  useContext,
  useEffect,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";
import type { ActionState } from "@/server/forms";
import { Button } from "./button";
import { useModal } from "./modal";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

const FormStateContext = createContext<ActionState>(undefined);

export function useFormState() {
  return useContext(FormStateContext);
}

type ActionFormProps = {
  action: Action;
  children: ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  submitVariant?: "primary" | "danger" | "dark";
  resetOnSuccess?: boolean;
  /** Inside a Modal: close it on success. Turn off when the message must stay visible. */
  closeOnSuccess?: boolean;
  confirm?: string;
  className?: string;
  footer?: ReactNode;
};

export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  pendingLabel = "Saving...",
  submitVariant = "primary",
  resetOnSuccess = true,
  closeOnSuccess = true,
  confirm,
  className = "space-y-4",
  footer,
}: ActionFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const modal = useModal();
  const closesModal = Boolean(modal) && closeOnSuccess;

  useEffect(() => {
    if (!state?.ok) return;
    if (resetOnSuccess) formRef.current?.reset();
    if (closesModal) modal?.close(state.message);
  }, [state, resetOnSuccess, closesModal, modal]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Submitting manually keeps the typed values when the server returns an error.
    event.preventDefault();
    if (confirm && !window.confirm(confirm)) return;
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <FormStateContext.Provider value={state}>
      {/* `action` handles submits made before the page finishes loading; after that, onSubmit takes over. */}
      <form ref={formRef} action={formAction} onSubmit={handleSubmit} className={className}>
        {children}
        {/* When the modal closes, its toast shows the success message instead. */}
        <FormMessage state={closesModal && state?.ok ? undefined : state} />
        <div className="flex items-center gap-3">
          <Button type="submit" variant={submitVariant} disabled={pending}>
            {pending ? pendingLabel : submitLabel}
          </Button>
          {footer}
        </div>
      </form>
    </FormStateContext.Provider>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (state?.error) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {state.error}
      </p>
    );
  }
  if (state?.ok && state.message) {
    return (
      <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        {state.message}
      </p>
    );
  }
  return null;
}
