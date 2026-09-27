"use client";

import { useActionState, useState } from "react";

import { consumeItem, discardItem, updateItem, type ActionState } from "@/app/actions/inventory";
import { ExpiryBadge } from "@/components/badges";
import { FieldError, SubmitButton } from "@/components/form";
import { formatQuantity } from "@/lib/ingredients";
import { LOCATION_LABELS, LOCATIONS, type InventoryItem } from "@/lib/types";

const initial: ActionState = {};

function UseForm({ item, onDone }: { item: InventoryItem; onDone: () => void }) {
  const [state, action] = useActionState(async (prev: ActionState, fd: FormData) => {
    const res = await consumeItem(item.id, prev, fd);
    if (res.ok) onDone();
    return res;
  }, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="label" htmlFor={`use-${item.id}`}>Amount used {item.unit && `(${item.unit})`}</label>
        <input
          id={`use-${item.id}`}
          name="amount"
          type="number"
          step="any"
          min="0"
          max={item.quantity}
          defaultValue={Math.min(1, item.quantity)}
          className="input w-32"
          autoFocus
        />
        <FieldError state={state} name="amount" />
      </div>
      <SubmitButton className="btn btn-primary btn-sm">Save</SubmitButton>
      <button
        type="submit"
        className="btn btn-sm"
        onClick={(e) => {
          const input = e.currentTarget.form?.elements.namedItem("amount") as HTMLInputElement | null;
          if (input) input.value = String(item.quantity);
        }}
      >
        Used it all
      </button>
      <button type="button" className="btn btn-sm" onClick={onDone}>Cancel</button>
    </form>
  );
}

function EditForm({ item, onDone }: { item: InventoryItem; onDone: () => void }) {
  const [state, action] = useActionState(async (prev: ActionState, fd: FormData) => {
    const res = await updateItem(item.id, prev, fd);
    if (res.ok) onDone();
    return res;
  }, initial);
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-6">
      <div className="sm:col-span-2">
        <label className="label">Name</label>
        <input name="name" defaultValue={item.name} className="input" required />
        <FieldError state={state} name="name" />
      </div>
      <div>
        <label className="label">Qty</label>
        <input name="quantity" type="number" step="any" min="0" defaultValue={item.quantity} className="input" required />
        <FieldError state={state} name="quantity" />
      </div>
      <div>
        <label className="label">Unit</label>
        <input name="unit" defaultValue={item.unit} className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Where</label>
        <select name="location" defaultValue={item.location} className="input">
          {LOCATIONS.map((l) => (
            <option key={l} value={l}>{LOCATION_LABELS[l]}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="label">Best before</label>
        <input name="expiresOn" type="date" defaultValue={item.expiresOn ?? ""} className="input" />
      </div>
      <div className="sm:col-span-4">
        <label className="label">Notes</label>
        <input name="notes" defaultValue={item.notes ?? ""} className="input" />
      </div>
      <div className="flex gap-2 sm:col-span-6">
        <SubmitButton className="btn btn-primary btn-sm">Save changes</SubmitButton>
        <button type="button" className="btn btn-sm" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}

export function ItemRow({ item, soonDays }: { item: InventoryItem; soonDays: number }) {
  const [mode, setMode] = useState<"view" | "use" | "edit">("view");
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{item.name}</span>
            <span className="text-sm text-stone-500">{formatQuantity(item.quantity, item.unit) || item.quantity}</span>
            <ExpiryBadge item={item} soonDays={soonDays} />
          </div>
          {item.notes && <p className="text-xs text-stone-500">{item.notes}</p>}
        </div>
        {mode === "view" && (
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className="btn btn-sm" onClick={() => setMode("use")}>Use</button>
            <button type="button" className="btn btn-sm" onClick={() => setMode("edit")}>Edit</button>
            <form action={discardItem.bind(null, item.id, "expired")}>
              <button className="btn btn-sm btn-danger" title="Throw out (spoiled / expired)">Toss</button>
            </form>
            <form action={discardItem.bind(null, item.id, "removed")}>
              <button className="btn btn-sm btn-danger" title="Remove from inventory">Remove</button>
            </form>
          </div>
        )}
      </div>
      {mode === "use" && (
        <div className="mt-3">
          <UseForm item={item} onDone={() => setMode("view")} />
        </div>
      )}
      {mode === "edit" && (
        <div className="mt-3">
          <EditForm item={item} onDone={() => setMode("view")} />
        </div>
      )}
    </li>
  );
}
