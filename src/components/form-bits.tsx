"use client";

import { startTransition, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionState } from "@/lib/action-state";

export function SubmitButton({
  children,
  pendingText,
  pending: pendingProp,
  ...props
}: React.ComponentProps<typeof Button> & { pendingText?: string; pending?: boolean }) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <Button type="submit" {...props} disabled={pending || props.disabled}>
      {pending && <Loader2Icon className="animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}

/**
 * Submit handler that runs a server action without React's automatic form reset,
 * so typed values and chosen files stay when the action returns an error.
 */
export function keepValuesOnSubmit(action: (form: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(() => action(form));
  };
}

export function FormError({ state }: { state: ActionState }) {
  if (!state?.error) return null;
  return (
    <Alert variant="destructive">
      <AlertDescription>{state.error}</AlertDescription>
    </Alert>
  );
}

/**
 * Wraps a server action so its result is toasted straight away. Use this when the
 * form disappears after success (its effects would never run).
 */
export function withToast<A extends unknown[]>(
  fn: (...args: A) => Promise<ActionState>,
  onOk?: () => void,
) {
  return async (...args: A): Promise<ActionState> => {
    const res = await fn(...args);
    if (res?.error) toast.error(res.error);
    else if (res?.ok) {
      toast.success(res.ok);
      onOk?.();
    }
    return res;
  };
}

/** Shows action results as toasts, and optionally resets the form on success. */
export function useActionToast(state: ActionState, form?: React.RefObject<HTMLFormElement | null>) {
  const last = useRef<ActionState>(undefined);
  useEffect(() => {
    if (!state || state === last.current) return;
    last.current = state;
    if (state.error) toast.error(state.error);
    else if (state.ok) {
      toast.success(state.ok);
      form?.current?.reset();
    }
  }, [state, form]);
}
