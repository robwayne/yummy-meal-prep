/**
 * Meal history as a plain text file: what was recommended, cooked, saved and
 * disliked. Save it on the phone and import it back later.
 *
 *   2026-09-27 | recommended | Garlic Butter Chicken Thighs | balanced
 *   2026-09-27 | cooked | Chicken Stir-Fry
 *   2026-09-27 | saved | Beef Chili
 *   2026-09-27 | disliked | Caprese Salad
 */
import { FOCUSES, type Database, type Focus } from "./types";

export const MEAL_KINDS = ["recommended", "cooked", "saved", "disliked"] as const;
export type MealKind = (typeof MEAL_KINDS)[number];

export type MealLine = { date: string; kind: MealKind; title: string; detail?: string };

/** Latest date a saved/disliked state was set, falling back to the recipe's last update. */
function feedbackDate(db: Database, recipeId: string, kind: "saved" | "disliked", fallback: string): string {
  const last = [...(db.feedback ?? [])].reverse().find((f) => f.recipeId === recipeId && f.kind === kind);
  return (last?.at ?? fallback).slice(0, 10);
}

/** Everything in the meal history, oldest first. Saved/disliked reflect the current state. */
export function mealHistoryLines(db: Database): MealLine[] {
  const lines: MealLine[] = [];
  for (const r of db.recommendationLog ?? []) lines.push({ date: r.date, kind: "recommended", title: r.recipeTitle, detail: r.focus });
  for (const c of db.cookLog) lines.push({ date: c.at.slice(0, 10), kind: "cooked", title: c.recipeTitle });
  for (const r of db.recipes) {
    if (r.favorite) lines.push({ date: feedbackDate(db, r.id, "saved", r.updatedAt), kind: "saved", title: r.title });
    if (r.disliked) lines.push({ date: feedbackDate(db, r.id, "disliked", r.updatedAt), kind: "disliked", title: r.title });
  }
  const order: Record<MealKind, number> = { recommended: 0, cooked: 1, saved: 2, disliked: 3 };
  return lines.sort((a, b) => a.date.localeCompare(b.date) || order[a.kind] - order[b.kind] || a.title.localeCompare(b.title));
}

export function mealHistoryToText(db: Database, now = new Date()): string {
  const lines = mealHistoryLines(db);
  return [
    `# HungryHungryRob meal history · ${now.toISOString().slice(0, 10)} · ${lines.length} entries`,
    "# date | recommended/cooked/saved/disliked | recipe | focus",
    ...lines.map((l) => [l.date, l.kind, l.title.replace(/\|/g, "/"), l.detail].filter(Boolean).join(" | ")),
  ].join("\n");
}

export function parseMealHistory(text: string): MealLine[] {
  const out: MealLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [date, kind, title, detail] = line.split("|").map((p) => p.trim());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || !MEAL_KINDS.includes(kind as MealKind) || !title) continue;
    out.push({ date, kind: kind as MealKind, title, detail: detail || undefined });
  }
  return out;
}

export function isFocus(v: string | undefined): v is Focus {
  return FOCUSES.includes(v as Focus);
}
