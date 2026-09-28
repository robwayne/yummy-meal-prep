"use client";

import Link from "next/link";
import { useState } from "react";

import { addToShoppingList } from "@/lib/actions";
import type { RecipeIngredient } from "@/lib/types";

/** Put every missing ingredient of a recipe on the grocery list (skipping ones already on it). */
export function AddMissingButton({ title, missing }: { title: string; missing: RecipeIngredient[] }) {
  const [message, setMessage] = useState("");
  if (missing.length === 0) return null;
  return (
    <div className="space-y-1">
      <button
        type="button"
        className="btn w-full"
        onClick={() => {
          const added = addToShoppingList(
            missing.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit, reason: `For ${title}` })),
          );
          setMessage(
            added
              ? `Added ${added} item${added === 1 ? "" : "s"} to your shopping list.`
              : "Everything missing is already on your shopping list.",
          );
        }}
      >
        🛒 Add {missing.length} missing to shopping list
      </button>
      {message && (
        <p aria-live="polite" className="text-sm text-brand-700 dark:text-brand-200">
          {message} <Link href="/groceries" className="underline">View list</Link>
        </p>
      )}
    </div>
  );
}
