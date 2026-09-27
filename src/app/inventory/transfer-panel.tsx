"use client";

import { useRef, useState } from "react";

import { importInventory, type ActionState } from "@/lib/actions";
import { inventoryToText } from "@/lib/inventory-io";
import type { InventoryItem } from "@/lib/types";

function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Save the inventory as a .txt file and import it again later. */
export function TransferPanel({ items }: { items: InventoryItem[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const mode = useRef<"merge" | "replace">("merge");
  const [status, setStatus] = useState<ActionState>({});

  function pick(m: "merge" | "replace") {
    mode.current = m;
    fileRef.current?.click();
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (mode.current === "replace" && !confirm("Replace everything in your inventory with this file?")) return;
    setStatus(importInventory(await file.text(), mode.current));
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <details className="card group p-4 sm:p-5" id="backup">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span>
          <span className="section-title block">Save or import your inventory</span>
          <span className="text-sm text-stone-500">Keep a .txt copy on your phone and load it back any time.</span>
        </span>
        <span aria-hidden className="text-stone-400 transition group-open:rotate-180">▾</span>
      </summary>
      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <button
            type="button"
            className="btn btn-primary"
            disabled={items.length === 0}
            onClick={() => {
              downloadText(`inventory-${new Date().toISOString().slice(0, 10)}.txt`, inventoryToText(items));
              setStatus({ ok: true, message: `Saved ${items.length} items.` });
            }}
          >
            Save inventory (.txt)
          </button>
          <p className="text-xs text-stone-500">
            On iPhone it goes to <strong>Files → Downloads</strong>. Each line looks like{" "}
            <code className="font-mono">2 lb chicken thighs | fridge | 2026-10-01</code>.
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={() => pick("merge")}>Import .txt (add)</button>
            <button type="button" className="btn btn-danger" onClick={() => pick("replace")}>Import .txt (replace)</button>
          </div>
          <p className="text-xs text-stone-500">
            &ldquo;Add&rdquo; tops up what you have; &ldquo;replace&rdquo; swaps your whole inventory for the file.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>
        {status.message && (
          <p aria-live="polite" className={`text-sm ${status.ok ? "text-brand-700 dark:text-brand-200" : "text-red-600 dark:text-red-400"}`}>
            {status.message}
          </p>
        )}
      </div>
    </details>
  );
}
