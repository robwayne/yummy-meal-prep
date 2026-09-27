/**
 * What to buy: things running low or used up (from inventory history), and
 * ingredients that would unlock recommended recipes.
 */
import { adaptRecipe } from "./adapt";
import { productHistory } from "./history";
import { convert, normalizeName } from "./ingredients";
import { daysUntil, type RecipeMatch, type Recommendations } from "./recommend";
import type { Database, InventoryEvent, InventoryItem, Location, ShoppingListItem } from "./types";

const DAY = 24 * 60 * 60 * 1000;

export type LowItem = {
  key: string;
  name: string;
  /** Marked vital: always shown when low or out, and listed first. */
  vital: boolean;
  kind: "low" | "out" | "expired";
  reason: string;
  /** What you usually buy, for the list and for adding to inventory. */
  quantity?: number;
  unit: string;
  location: Location;
  /** How often you've bought it (staples first). */
  timesStocked: number;
};

function fmt(n: number) {
  return String(Math.round(n * 100) / 100);
}

/** The usual purchase for a product: last restock/add amount, unit and location. */
export function usualPurchase(events: InventoryEvent[], name: string): { quantity: number; unit: string; location: Location } | undefined {
  const key = normalizeName(name);
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if ((e.type === "added" || e.type === "restocked") && normalizeName(e.itemName) === key && e.quantityDelta && e.quantityDelta > 0) {
      return { quantity: e.quantityDelta, unit: e.unit, location: e.location };
    }
  }
  return undefined;
}

/**
 * Items to restock:
 * - low: below its low level (yours, or 1 of its unit);
 * - expired: past its date (it's excluded from recommendations);
 * - out: used up or tossed in the last 60 days and not back in stock.
 */
export function isVital(db: Database, name: string): boolean {
  const key = normalizeName(name);
  return (db.settings.vital ?? []).some((v) => normalizeName(v) === key);
}

/** The level below which an item counts as low: yours, or 1 of the item's unit. */
export function lowThreshold(db: Database, item: { name: string; unit: string }): { quantity: number; unit: string; custom: boolean } {
  const custom = db.settings.lowAt?.[normalizeName(item.name)];
  if (custom && convert(1, item.unit, custom.unit) !== undefined) return { ...custom, custom: true };
  return { quantity: 1, unit: item.unit, custom: false };
}

/** Is this inventory item below its low level? (Exactly at the level is not low.) */
export function isLow(db: Database, item: InventoryItem): boolean {
  const t = lowThreshold(db, item);
  const have = convert(item.quantity, item.unit, t.unit) ?? item.quantity;
  return have < t.quantity - 1e-9;
}

export function runningLow(db: Database, now = new Date()): LowItem[] {
  const out: LowItem[] = [];
  const seen = new Set<string>();
  const history = productHistory(db.events, db.inventory);
  const stockedCount = new Map(history.map((p) => [p.key, p.timesStocked]));

  for (const item of db.inventory) {
    const key = normalizeName(item.name);
    const usual = usualPurchase(db.events, item.name);
    const vital = isVital(db, item.name);
    const base = { key, name: item.name, vital, unit: item.unit, location: item.location, timesStocked: stockedCount.get(key) ?? 1 };
    if (item.expiresOn && daysUntil(item.expiresOn, now) < 0) {
      out.push({ ...base, kind: "expired", reason: `Expired ${-daysUntil(item.expiresOn, now)} day(s) ago`, quantity: usual?.quantity ?? item.quantity });
      seen.add(key);
    } else if (isLow(db, item)) {
      const t = lowThreshold(db, item);
      const unit = (u: string) => (u && u !== "pcs" ? ` ${u}` : "");
      out.push({
        ...base,
        kind: "low",
        reason: `${fmt(item.quantity)}${unit(item.unit)} left · low below ${fmt(t.quantity)}${unit(t.unit)}`,
        quantity: usual?.quantity,
      });
      seen.add(key);
    }
  }

  for (const p of history) {
    if (p.inStock > 0 || seen.has(p.key) || p.timesStocked === 0) continue;
    const vital = isVital(db, p.name);
    const last = [...db.events].reverse().find((e) => normalizeName(e.itemName) === p.key);
    if (!last) continue;
    // "removed" means you didn't want it — unless it's vital, which is always wanted.
    if (!vital && !["used", "cooked", "expired"].includes(last.type)) continue;
    const days = Math.floor((now.getTime() - new Date(last.at).getTime()) / DAY);
    if (days > 60 && !vital) continue;
    seen.add(p.key);
    const usual = usualPurchase(db.events, p.name);
    const when = days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
    out.push({
      key: p.key,
      name: p.name,
      vital,
      kind: "out",
      reason: `${last.type === "expired" ? "Tossed" : last.type === "removed" ? "Removed" : "Ran out"} ${when}`,
      quantity: usual?.quantity,
      unit: usual?.unit ?? p.unit,
      location: usual?.location ?? p.location,
      timesStocked: p.timesStocked,
    });
  }

  // Vital items you've never had in the app still need buying.
  for (const name of db.settings.vital ?? []) {
    const key = normalizeName(name);
    if (seen.has(key) || db.inventory.some((i) => normalizeName(i.name) === key)) continue;
    seen.add(key);
    out.push({ key, name, vital: true, kind: "out", reason: "Not in your kitchen", unit: "", location: "pantry", timesStocked: 0 });
  }

  const rank = { out: 0, low: 1, expired: 2 };
  return out.sort(
    (a, b) =>
      Number(b.vital) - Number(a.vital) ||
      rank[a.kind] - rank[b.kind] ||
      b.timesStocked - a.timesStocked ||
      a.name.localeCompare(b.name),
  );
}

export type RecipeGrocery = {
  key: string;
  name: string;
  quantity?: number;
  unit?: string;
  recipes: { id: string; title: string; missing: number }[];
  /** Recipes this single item would make fully cookable. */
  completes: number;
};

/** Missing ingredients across recommended recipes, the most useful first. */
export function recipeGroceries(recs: Recommendations, limit = 30): RecipeGrocery[] {
  const matches: RecipeMatch[] = [...recs.ready, ...recs.almost, ...recs.stretch];
  const map = new Map<string, RecipeGrocery>();
  for (const m of matches) {
    const title = adaptRecipe(m.recipe, m.swap).title;
    for (const ing of m.missing) {
      const key = normalizeName(ing.name);
      const g = map.get(key) ?? { key, name: ing.name, quantity: ing.quantity, unit: ing.unit, recipes: [], completes: 0 };
      if (!g.recipes.some((r) => r.id === m.recipe.id)) {
        g.recipes.push({ id: m.recipe.id, title, missing: m.missing.length });
        if (m.missing.length === 1) g.completes++;
      }
      map.set(key, g);
    }
  }
  return [...map.values()]
    .sort((a, b) => b.completes - a.completes || b.recipes.length - a.recipes.length || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** Is this product already on the (unticked) list? */
export function onList(list: ShoppingListItem[] | undefined, name: string): boolean {
  const key = normalizeName(name);
  return (list ?? []).some((i) => !i.done && normalizeName(i.name) === key);
}
