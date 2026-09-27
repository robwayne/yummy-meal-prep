"use client";

import { useActionState, useState } from "react";

import { FormMessage, SubmitButton } from "@/components/form";
import { cookRecipe, type ActionState } from "@/lib/actions";
import type { PlannedUse } from "@/lib/recommend";

const initial: ActionState = {};

export function CookForm({ recipeId, plan }: { recipeId: string; plan: PlannedUse[] }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState((prev: ActionState, fd: FormData) => {
    const res = cookRecipe(recipeId, prev, fd);
    if (res.ok) setOpen(false);
    return res;
  }, initial);

  if (!open) {
    return (
      <div className="space-y-2">
        <button type="button" className="btn btn-primary w-full" onClick={() => setOpen(true)}>
          🍳 I cooked this
        </button>
        <FormMessage state={state} />
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-stone-500">
        We&apos;ll take these out of your inventory. Adjust anything that doesn&apos;t look right.
      </p>
      {plan.length === 0 ? (
        <p className="text-sm">Nothing from your inventory is used by this recipe — we&apos;ll just log that you cooked it.</p>
      ) : (
        <ul className="space-y-2">
          {plan.map((p) => (
            <li key={p.itemId} className="flex items-center justify-between gap-2 text-sm">
              <label htmlFor={`use-${p.itemId}`} className="min-w-0 flex-1">
                <span className="font-medium">{p.itemName}</span>
                <span className="block text-xs text-stone-500">
                  have {p.available} {p.unit}
                  {p.amount === 0 && " · units differ, enter how much you used"}
                </span>
              </label>
              <input
                id={`use-${p.itemId}`}
                name={`use:${p.itemId}`}
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                max={p.available}
                defaultValue={p.amount}
                className="input w-24"
              />
              <span className="w-10 text-xs text-stone-500">{p.unit}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <SubmitButton pendingText="Saving…">Update inventory</SubmitButton>
        <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
