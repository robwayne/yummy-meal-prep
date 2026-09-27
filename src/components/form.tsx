"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import type { ActionState } from "@/app/actions/inventory";

export function SubmitButton({
  children,
  pendingText,
  className = "btn btn-primary",
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

export function FieldError({ state, name }: { state: ActionState; name: string }) {
  const errors = state.errors?.[name];
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors[0]}</p>;
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p
      aria-live="polite"
      className={`text-sm ${state.ok ? "text-brand-700 dark:text-brand-200" : "text-red-600 dark:text-red-400"}`}
    >
      {state.message}
    </p>
  );
}
