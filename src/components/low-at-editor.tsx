"use client";

import { useState } from "react";

import { setLowThreshold } from "@/lib/actions";

type Threshold = { quantity: number; unit: string; custom: boolean };

const u = (unit: string) => (unit && unit !== "pcs" ? ` ${unit}` : "");

/** "low below 1 kg" — tap to change when this product counts as running low. */
export function LowAtEditor({ name, unit, threshold }: { name: string; unit: string; threshold: Threshold }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(threshold.quantity));

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(String(threshold.quantity));
          setEditing(true);
        }}
        className="text-xs text-stone-500 underline decoration-dotted underline-offset-2"
        title="Change when this counts as running low"
      >
        {threshold.quantity === 0 ? "low only when out" : `low below ${threshold.quantity}${u(threshold.unit)}`}
        {!threshold.custom && " (default)"}
      </button>
    );
  }

  const save = (q: number | undefined) => {
    setLowThreshold(name, q, threshold.custom ? threshold.unit : unit);
    setEditing(false);
  };

  return (
    <form
      className="flex flex-wrap items-center gap-1.5 text-xs"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(value);
        save(value.trim() === "" || !Number.isFinite(n) ? undefined : n);
      }}
    >
      <label htmlFor={`low-${name}`} className="text-stone-500">Low below</label>
      <input
        id={`low-${name}`}
        type="number"
        inputMode="decimal"
        step="any"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="input w-20 px-2 py-1"
        autoFocus
      />
      <span className="text-stone-500">{(threshold.custom ? threshold.unit : unit) || "items"}</span>
      <button type="submit" className="btn btn-primary btn-sm">Save</button>
      {threshold.custom && (
        <button type="button" className="btn btn-sm" onClick={() => save(undefined)} title="Back to 1 of its unit">
          Default
        </button>
      )}
      <button type="button" className="btn btn-sm" onClick={() => setEditing(false)}>Cancel</button>
    </form>
  );
}
