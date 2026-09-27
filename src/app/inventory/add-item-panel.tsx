"use client";

import { useActionState, useState } from "react";

import { addItem, addItemsBulk, type ActionState } from "@/app/actions/inventory";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { COMMON_UNITS } from "@/lib/ingredients";
import { LOCATION_LABELS, LOCATIONS, type Location } from "@/lib/types";

const initial: ActionState = {};

export type AddDefaults = { name?: string; unit?: string; location?: Location };

function LocationSelect({ defaultValue }: { defaultValue?: Location }) {
  return (
    <select name="location" className="input" defaultValue={defaultValue ?? "fridge"}>
      {LOCATIONS.map((l) => (
        <option key={l} value={l}>
          {LOCATION_LABELS[l]}
        </option>
      ))}
    </select>
  );
}

function SingleForm({ defaults, suggestions }: { defaults: AddDefaults; suggestions: string[] }) {
  const [state, action] = useActionState(addItem, initial);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-6">
      <div className="sm:col-span-3">
        <label className="label" htmlFor="add-name">Item</label>
        <input
          id="add-name"
          name="name"
          className="input"
          placeholder="e.g. Chicken thighs"
          defaultValue={defaults.name}
          list="known-products"
          autoFocus={Boolean(defaults.name)}
          required
        />
        <datalist id="known-products">
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <FieldError state={state} name="name" />
      </div>
      <div className="sm:col-span-1">
        <label className="label" htmlFor="add-qty">Qty</label>
        <input id="add-qty" name="quantity" type="number" step="any" min="0" defaultValue={1} className="input" required />
        <FieldError state={state} name="quantity" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="add-unit">Unit</label>
        <input id="add-unit" name="unit" className="input" placeholder="pcs, g, lb, cup…" list="units" defaultValue={defaults.unit ?? ""} />
        <datalist id="units">
          {COMMON_UNITS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
      </div>
      <div className="sm:col-span-2">
        <label className="label">Where</label>
        <LocationSelect defaultValue={defaults.location} />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="add-exp">Best before</label>
        <input id="add-exp" name="expiresOn" type="date" className="input" />
        <FieldError state={state} name="expiresOn" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="add-notes">Notes</label>
        <input id="add-notes" name="notes" className="input" placeholder="optional" />
      </div>
      <div className="flex items-center gap-3 sm:col-span-6">
        <SubmitButton pendingText="Adding…">Add to inventory</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

function BulkForm() {
  const [state, action] = useActionState(addItemsBulk, initial);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-6">
      <div className="sm:col-span-6">
        <label className="label" htmlFor="bulk-lines">One item per line</label>
        <textarea
          id="bulk-lines"
          name="lines"
          rows={6}
          className="input font-mono"
          placeholder={"2 lb chicken thighs\n1 dozen eggs\n500 g spaghetti\n3 bell peppers\nmilk"}
          required
        />
        <p className="mt-1 text-xs text-stone-500">
          Quantities and units are optional — &ldquo;milk&rdquo; is counted as 1. Great for unpacking groceries.
        </p>
        <FieldError state={state} name="lines" />
      </div>
      <div className="sm:col-span-3">
        <label className="label">Where</label>
        <LocationSelect />
      </div>
      <div className="sm:col-span-3">
        <label className="label" htmlFor="bulk-exp">Best before (all items, optional)</label>
        <input id="bulk-exp" name="expiresOn" type="date" className="input" />
      </div>
      <div className="flex items-center gap-3 sm:col-span-6">
        <SubmitButton pendingText="Adding…">Add all</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function AddItemPanel({ defaults, suggestions }: { defaults: AddDefaults; suggestions: string[] }) {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="section-title">Add groceries</h2>
        <div className="flex rounded-lg bg-stone-100 p-0.5 text-sm dark:bg-stone-800">
          {(["single", "bulk"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1 font-medium ${
                mode === m ? "bg-white shadow-sm dark:bg-stone-950" : "text-stone-500"
              }`}
            >
              {m === "single" ? "One item" : "Quick list"}
            </button>
          ))}
        </div>
      </div>
      {mode === "single" ? <SingleForm defaults={defaults} suggestions={suggestions} /> : <BulkForm />}
    </section>
  );
}
