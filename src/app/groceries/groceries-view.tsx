"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { FieldError, SubmitButton } from "@/components/form";
import { LowAtEditor } from "@/components/low-at-editor";
import { Loading } from "@/components/page-state";
import {
  addListLine,
  addVital,
  toggleVital,
  addTickedToInventory,
  addToShoppingList,
  removeShoppingItem,
  toggleShoppingItem,
  type ActionState,
} from "@/lib/actions";
import { formatQuantity } from "@/lib/ingredients";
import { FOCUS_INFO } from "@/lib/nutrition";
import { contextFor, recommend } from "@/lib/recommend";
import { lowThreshold, onList, recipeGroceries, runningLow, type LowItem } from "@/lib/shopping";
import { useDb } from "@/lib/store";
import type { ShoppingListItem } from "@/lib/types";

function VitalStar({ name, vital }: { name: string; vital: boolean }) {
  return (
    <button
      type="button"
      onClick={() => toggleVital(name)}
      aria-pressed={vital}
      aria-label={vital ? `Unmark ${name} as vital` : `Mark ${name} as vital`}
      title={vital ? "Vital — tap to unmark" : "Mark as vital"}
      className={`shrink-0 px-1 text-xl leading-none ${vital ? "text-red-600" : "text-stone-300 dark:text-stone-600"}`}
    >
      {vital ? "★" : "☆"}
    </button>
  );
}

const KIND_BADGE: Record<LowItem["kind"], string> = {
  out: "badge-red",
  low: "badge-amber",
  expired: "badge-muted",
};
const KIND_LABEL: Record<LowItem["kind"], string> = { out: "Out", low: "Low", expired: "Expired" };

function AddButton({ added, onAdd }: { added: boolean; onAdd: () => void }) {
  return added ? (
    <span className="badge badge-green shrink-0">✓ On list</span>
  ) : (
    <button type="button" className="btn btn-sm shrink-0" onClick={onAdd}>+ Add</button>
  );
}

function VitalItems({ names }: { names: string[] }) {
  const [state, action] = useActionState(addVital, {} as ActionState);
  return (
    <details className="card group p-4 sm:p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span>
          <span className="section-title block">‼️ Vital items {names.length > 0 && <span className="text-stone-400">({names.length})</span>}</span>
          <span className="text-sm text-stone-500">Things you never want to run out of. Always shown and flagged when low or out.</span>
        </span>
        <span aria-hidden className="text-stone-400 transition group-open:rotate-180">▾</span>
      </summary>
      <div className="mt-3 space-y-3">
        {names.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {names.map((n) => (
              <li key={n}>
                <button type="button" className="badge badge-red gap-1 py-1" onClick={() => toggleVital(n)} aria-label={`Unmark ${n} as vital`}>
                  {n} <span aria-hidden>×</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <form action={action} className="flex gap-2">
          <input name="names" className="input" placeholder="e.g. rice, eggs, olive oil" aria-label="Vital items to add" />
          <SubmitButton className="btn shrink-0">Mark vital</SubmitButton>
        </form>
        <FieldError state={state} name="names" />
      </div>
    </details>
  );
}

function MyList({ items }: { items: ShoppingListItem[] }) {
  const [state, action] = useActionState(addListLine, {} as ActionState);
  const [result, setResult] = useState<ActionState>({});
  const ticked = items.filter((i) => i.done).length;
  return (
    <section className="card space-y-3 p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="section-title">🛒 My list</h2>
        <span className="text-xs text-stone-500">{items.length ? `${ticked}/${items.length} ticked` : ""}</span>
      </div>
      <form action={action} className="flex gap-2">
        <input name="line" className="input" placeholder="Add an item, e.g. 2 lb chicken wings" aria-label="Add an item" />
        <SubmitButton className="btn shrink-0">Add</SubmitButton>
      </form>
      <FieldError state={state} name="line" />
      {state.message && !state.ok && <p className="text-sm text-stone-500">{state.message}</p>}
      {items.length === 0 ? (
        <p className="text-sm text-stone-500">Your list is empty. Tap &ldquo;+ Add&rdquo; on the suggestions below.</p>
      ) : (
        <ul className="divide-y divide-stone-100 dark:divide-stone-800">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 py-2">
              <input
                type="checkbox"
                checked={i.done}
                onChange={() => toggleShoppingItem(i.id)}
                className="h-5 w-5 shrink-0 accent-brand-600"
                aria-label={`Bought ${i.name}`}
              />
              <span className={`min-w-0 flex-1 ${i.done ? "text-stone-400 line-through" : ""}`}>
                <span className="font-medium">{i.name}</span>
                {i.quantity !== undefined && (
                  <span className="text-sm text-stone-500"> · {formatQuantity(i.quantity, i.unit) || i.quantity}</span>
                )}
                {i.reason && <span className="block truncate text-xs text-stone-500">{i.reason}</span>}
              </span>
              <button
                type="button"
                className="shrink-0 px-2 text-lg text-stone-400"
                aria-label={`Remove ${i.name}`}
                onClick={() => removeShoppingItem(i.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {ticked > 0 && (
        <button type="button" className="btn btn-primary w-full" onClick={() => setResult(addTickedToInventory())}>
          Add {ticked} ticked item{ticked === 1 ? "" : "s"} to inventory
        </button>
      )}
      {result.message && (
        <p aria-live="polite" className={`text-sm ${result.ok ? "text-brand-700 dark:text-brand-200" : "text-red-600"}`}>
          {result.message}
        </p>
      )}
    </section>
  );
}

export function GroceriesView() {
  const db = useDb();
  if (!db) return <Loading />;

  const list = db.shoppingList ?? [];
  const low = runningLow(db);
  const ctx = { ...contextFor(db), kind: "meal" as const };
  const groceries = recipeGroceries(recommend(ctx, 3));
  const focus = FOCUS_INFO[ctx.focus ?? "balanced"];

  const addLow = (items: LowItem[]) =>
    addToShoppingList(
      items.map((l) => ({ name: l.name, quantity: l.quantity, unit: l.unit, location: l.location, reason: `${KIND_LABEL[l.kind]}: ${l.reason}` })),
    );
  const lowToAdd = low.filter((l) => !onList(list, l.name));
  const vitalLow = low.filter((l) => l.vital);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Groceries</h1>
        <p className="text-stone-500">What&apos;s running low, and what to buy for meals you could make.</p>
      </div>

      {vitalLow.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/40">
          <p className="text-sm text-red-900 dark:text-red-200">
            <strong>‼️ Vital items need buying:</strong> {vitalLow.map((l) => l.name).join(", ")}
          </p>
          {vitalLow.some((l) => !onList(list, l.name)) && (
            <button type="button" className="btn btn-sm" onClick={() => addLow(vitalLow.filter((l) => !onList(list, l.name)))}>
              + Add to list
            </button>
          )}
        </div>
      )}

      <MyList items={list} />

      <section className="card space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="section-title">Inventory running low</h2>
            <p className="text-sm text-stone-500">Running out, used up recently, or past its date. Tap ☆ to mark vital.</p>
          </div>
          {lowToAdd.length > 1 && (
            <button type="button" className="btn btn-sm" onClick={() => addLow(lowToAdd)}>+ Add all {lowToAdd.length}</button>
          )}
        </div>
        {low.length === 0 ? (
          <p className="text-sm text-stone-500">
            Nothing is running low. Items show up here when they drop below their &ldquo;low below&rdquo; level (1 of their unit
            unless you change it), or once you use something up.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {low.map((l) => (
              <li
                key={l.key}
                className={`flex items-center gap-2 py-2 ${l.vital ? "-mx-2 rounded-lg bg-red-50 px-2 dark:bg-red-950/30" : ""}`}
              >
                <VitalStar name={l.name} vital={l.vital} />
                <span className={`badge ${KIND_BADGE[l.kind]} w-16 shrink-0 justify-center`}>{KIND_LABEL[l.kind]}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{l.name}</span>
                  {l.vital && <span className="badge ml-2 bg-red-600 text-white">Vital</span>}
                  <span className="block text-xs text-stone-500">
                    {l.reason}
                    {l.timesStocked > 1 && ` · bought ${l.timesStocked}×`}
                  </span>
                  {l.kind === "low" && (
                    <LowAtEditor name={l.name} unit={l.unit} threshold={lowThreshold(db, { name: l.name, unit: l.unit })} />
                  )}
                </span>
                <AddButton added={onList(list, l.name)} onAdd={() => addLow([l])} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <VitalItems names={db.settings.vital ?? []} />

      <section className="card space-y-3 p-4 sm:p-5">
        <div>
          <h2 className="section-title">Recommended for recipes</h2>
          <p className="text-sm text-stone-500">
            Missing ingredients for meals you&apos;re close to making ({focus.icon} {focus.label.toLowerCase()} focus). Only
            dishes whose main protein you already have.
          </p>
        </div>
        {groceries.length === 0 ? (
          <p className="text-sm text-stone-500">
            Nothing to suggest yet — <Link href="/inventory" className="underline">add what&apos;s in your kitchen</Link> first.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {groceries.map((g) => (
              <li key={g.key} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{g.name}</span>
                  {g.completes > 0 && (
                    <span className="badge badge-green ml-2">
                      completes {g.completes} dish{g.completes === 1 ? "" : "es"}
                    </span>
                  )}
                  <span className="block text-xs text-stone-500">
                    for{" "}
                    {g.recipes.slice(0, 3).map((r, idx) => (
                      <span key={r.id}>
                        {idx > 0 && ", "}
                        <Link href={`/recipes/view?id=${r.id}`} className="underline decoration-stone-300">{r.title}</Link>
                      </span>
                    ))}
                    {g.recipes.length > 3 && ` +${g.recipes.length - 3} more`}
                  </span>
                </span>
                <AddButton
                  added={onList(list, g.name)}
                  onAdd={() =>
                    addToShoppingList([
                      { name: g.name, quantity: g.quantity, unit: g.unit, reason: `For ${g.recipes.map((r) => r.title).slice(0, 2).join(", ")}` },
                    ])
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
