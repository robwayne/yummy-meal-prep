"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { importMealHistory, type ActionState } from "@/lib/actions";
import { formatDate } from "@/lib/format";
import { mealHistoryLines, mealHistoryToText, type MealKind } from "@/lib/meal-history";
import { FOCUS_INFO } from "@/lib/nutrition";
import type { Database } from "@/lib/types";

const KIND: Record<MealKind, { label: string; badge: string }> = {
  recommended: { label: "Suggested", badge: "badge-muted" },
  cooked: { label: "Cooked", badge: "badge-amber" },
  saved: { label: "👍 Saved", badge: "badge-green" },
  disliked: { label: "👎 Disliked", badge: "badge-red" },
};

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

/** Recommended / cooked / saved / disliked, newest first, with .txt save and import. */
export function MealHistoryPanel({ db }: { db: Database }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<ActionState>({});
  const [kind, setKind] = useState<MealKind | "all">("all");
  const lines = mealHistoryLines(db).reverse();
  const shown = lines.filter((l) => kind === "all" || l.kind === kind);
  const idByTitle = new Map(db.recipes.map((r) => [r.title.toLowerCase(), r.id]));

  // Group by day for a readable timeline.
  const days = new Map<string, typeof shown>();
  for (const l of shown) days.set(l.date, [...(days.get(l.date) ?? []), l]);

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-stone-500">Save your meal history as a .txt and import it back any time.</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={lines.length === 0}
            onClick={() => {
              downloadText(`meal-history-${new Date().toISOString().slice(0, 10)}.txt`, mealHistoryToText(db));
              setStatus({ ok: true, message: `Saved ${lines.length} entries.` });
            }}
          >
            Save history (.txt)
          </button>
          <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}>Import .txt</button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setStatus(importMealHistory(await file.text()));
              e.target.value = "";
            }}
          />
        </div>
        {status.message && (
          <p aria-live="polite" className={`w-full text-sm ${status.ok ? "text-brand-700 dark:text-brand-200" : "text-red-600"}`}>
            {status.message}
          </p>
        )}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {(["all", "recommended", "cooked", "saved", "disliked"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${
              kind === k ? "border-brand-600 bg-brand-600 text-white" : "border-stone-300 dark:border-stone-700"
            }`}
          >
            {k === "all" ? "Everything" : KIND[k].label}
          </button>
        ))}
      </div>

      <div className="card">
        {shown.length === 0 ? (
          <p className="p-8 text-center text-stone-500">
            Nothing yet. Recommendations are recorded when you open Home or Cook; tap 👍/👎 on them, or &ldquo;I cooked
            this&rdquo; on a recipe.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {[...days].map(([date, entries]) => (
              <li key={date} className="p-3">
                <p className="mb-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">{formatDate(date)}</p>
                <ul className="space-y-1.5">
                  {entries.map((l, i) => {
                    const id = idByTitle.get(l.title.toLowerCase());
                    return (
                      <li key={`${l.kind}-${l.title}-${i}`} className="flex items-center gap-2 text-sm">
                        <span className={`badge ${KIND[l.kind].badge} w-24 shrink-0 justify-center`}>{KIND[l.kind].label}</span>
                        {id ? (
                          <Link href={`/recipes/view?id=${id}`} className="min-w-0 truncate font-medium hover:underline">{l.title}</Link>
                        ) : (
                          <span className="min-w-0 truncate font-medium">{l.title}</span>
                        )}
                        {l.kind === "recommended" && l.detail && l.detail !== "balanced" && (
                          <span className="shrink-0 text-xs text-stone-400">{FOCUS_INFO[l.detail as keyof typeof FOCUS_INFO]?.icon}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
