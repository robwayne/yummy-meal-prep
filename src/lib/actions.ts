/**
 * Everything that changes data. Each function validates its input, applies the
 * change through the browser store and returns a small result for the UI.
 */
import { z } from "zod";

import { convert, normalizeName, normalizeUnit, parseIngredientLines } from "./ingredients";
import { parseInventoryText } from "./inventory-io";
import { usualPurchase } from "./shopping";
import { todayIso } from "./recommend";
import { isDatabase, migrateDatabase, newId } from "./database";
import { isFocus, parseMealHistory } from "./meal-history";
import { getDb, mutate, replaceDb } from "./store";
import {
  LOCATIONS,
  type Database,
  type Diet,
  type FeedbackEntry,
  type Focus,
  type InventoryEvent,
  type InventoryItem,
  type Location,
  type Recipe,
} from "./types";

export type ActionState = { ok?: boolean; message?: string; errors?: Record<string, string[]>; id?: string };

const fail = (error: z.ZodError): ActionState => ({ ok: false, errors: z.flattenError(error).fieldErrors });
const fields = (formData: FormData) => Object.fromEntries(formData);

// ---------------------------------------------------------------------------
// Inventory

const optionalDate = z
  .string()
  .trim()
  .transform((v) => v || undefined)
  .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date").optional());

const itemSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  quantity: z.coerce.number().positive("Quantity must be more than 0").max(100000),
  unit: z.string().trim().max(20).transform(normalizeUnit),
  location: z.enum(LOCATIONS),
  expiresOn: optionalDate,
  notes: z
    .string()
    .trim()
    .max(500)
    .transform((v) => v || undefined),
});

const bulkSchema = z.object({
  lines: z.string().trim().min(1, "Enter at least one item"),
  location: z.enum(LOCATIONS),
  expiresOn: optionalDate,
});

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

function logEvent(
  db: Database,
  item: InventoryItem,
  event: Omit<InventoryEvent, "id" | "itemId" | "itemName" | "unit" | "location" | "at">,
) {
  db.events.push({
    id: newId(),
    itemId: item.id,
    itemName: item.name,
    unit: item.unit,
    location: item.location,
    at: new Date().toISOString(),
    ...event,
  });
}

/**
 * Add stock. If a matching item (same product, same place, compatible unit,
 * same expiry) already exists, it is topped up and logged as a restock.
 */
function addStock(
  db: Database,
  input: { name: string; quantity: number; unit: string; location: Location; expiresOn?: string; notes?: string },
): "added" | "restocked" {
  const now = new Date().toISOString();
  const key = normalizeName(input.name);
  const existing = db.inventory.find(
    (i) =>
      normalizeName(i.name) === key &&
      i.location === input.location &&
      (i.expiresOn ?? "") === (input.expiresOn ?? "") &&
      convert(input.quantity, input.unit, i.unit) !== undefined,
  );
  if (existing) {
    const delta = round(convert(input.quantity, input.unit, existing.unit)!);
    existing.quantity = round(existing.quantity + delta);
    existing.updatedAt = now;
    if (input.notes) existing.notes = input.notes;
    logEvent(db, existing, { type: "restocked", quantityDelta: delta, quantityAfter: existing.quantity });
    return "restocked";
  }
  const item: InventoryItem = { id: newId(), ...input, addedAt: now, updatedAt: now };
  db.inventory.push(item);
  logEvent(db, item, { type: "added", quantityDelta: item.quantity, quantityAfter: item.quantity });
  return "added";
}

export function addItem(_prev: ActionState, formData: FormData): ActionState {
  const parsed = itemSchema.safeParse(fields(formData));
  if (!parsed.success) return fail(parsed.error);
  const kind = mutate((db) => addStock(db, parsed.data));
  return { ok: true, message: `${kind === "added" ? "Added" : "Restocked"} ${parsed.data.name}` };
}

export function addItemsBulk(_prev: ActionState, formData: FormData): ActionState {
  const parsed = bulkSchema.safeParse(fields(formData));
  if (!parsed.success) return fail(parsed.error);
  // Lines may carry their own "| location | date" (as produced by "Copy list").
  const lines = parseInventoryText(parsed.data.lines);
  if (!lines.length) return { ok: false, errors: { lines: ["Couldn't read any items"] } };
  mutate((db) => {
    for (const l of lines) {
      addStock(db, {
        name: l.name,
        quantity: l.quantity && l.quantity > 0 ? l.quantity : 1,
        unit: normalizeUnit(l.unit),
        location: l.location ?? parsed.data.location,
        expiresOn: l.expiresOn ?? parsed.data.expiresOn,
        notes: l.note,
      });
    }
  });
  return { ok: true, message: `Added ${lines.length} item${lines.length === 1 ? "" : "s"}` };
}

export function updateItem(id: string, _prev: ActionState, formData: FormData): ActionState {
  const parsed = itemSchema.safeParse(fields(formData));
  if (!parsed.success) return fail(parsed.error);
  const found = mutate((db) => {
    const item = db.inventory.find((i) => i.id === id);
    if (!item) return false;
    const before = item.quantity;
    Object.assign(item, parsed.data, { updatedAt: new Date().toISOString() });
    logEvent(db, item, {
      type: "updated",
      quantityDelta: round(item.quantity - before) || undefined,
      quantityAfter: item.quantity,
    });
    return true;
  });
  if (!found) return { ok: false, message: "That item no longer exists" };
  return { ok: true, message: `Updated ${parsed.data.name}` };
}

const useSchema = z.object({ amount: z.coerce.number().positive("Enter an amount") });

export function consumeItem(id: string, _prev: ActionState, formData: FormData): ActionState {
  const parsed = useSchema.safeParse(fields(formData));
  if (!parsed.success) return fail(parsed.error);
  const name = mutate((db) => {
    const item = db.inventory.find((i) => i.id === id);
    if (!item) return undefined;
    const amount = Math.min(parsed.data.amount, item.quantity);
    item.quantity = round(item.quantity - amount);
    item.updatedAt = new Date().toISOString();
    const usedUp = item.quantity <= 0;
    logEvent(db, item, {
      type: "used",
      quantityDelta: -amount,
      quantityAfter: item.quantity,
      note: usedUp ? "Used up" : undefined,
    });
    if (usedUp) db.inventory = db.inventory.filter((i) => i.id !== id);
    return item.name;
  });
  if (!name) return { ok: false, message: "That item no longer exists" };
  return { ok: true, message: `Used some ${name}` };
}

/**
 * Import a saved inventory text file (or any pasted list).
 * "merge" adds the items on top of what's there (topping up matches);
 * "replace" first clears the current inventory. Both are logged in history.
 */
export function importInventory(text: string, mode: "merge" | "replace"): ActionState {
  const lines = parseInventoryText(text);
  if (!lines.length) return { ok: false, message: "Couldn't find any items in that file" };
  mutate((db) => {
    if (mode === "replace") {
      for (const item of db.inventory) {
        logEvent(db, item, { type: "removed", quantityDelta: -item.quantity, quantityAfter: 0, note: "Replaced by import" });
      }
      db.inventory = [];
    }
    for (const l of lines) {
      addStock(db, {
        name: l.name,
        quantity: l.quantity && l.quantity > 0 ? l.quantity : 1,
        unit: normalizeUnit(l.unit),
        location: l.location ?? "other",
        expiresOn: l.expiresOn,
        notes: l.note,
      });
    }
  });
  const n = `${lines.length} item${lines.length === 1 ? "" : "s"}`;
  return { ok: true, message: mode === "replace" ? `Replaced your inventory with ${n}` : `Imported ${n}` };
}

/** Remove an item entirely, recording why (thrown out because it expired, or just removed). */
export function discardItem(id: string, reason: "expired" | "removed"): void {
  mutate((db) => {
    const item = db.inventory.find((i) => i.id === id);
    if (!item) return;
    logEvent(db, item, { type: reason, quantityDelta: -item.quantity, quantityAfter: 0 });
    db.inventory = db.inventory.filter((i) => i.id !== id);
  });
}

/** Throw out everything past its date in one go. */
export function discardAllExpired(): void {
  const today = todayIso();
  mutate((db) => {
    const expired = db.inventory.filter((i) => i.expiresOn && i.expiresOn < today);
    for (const item of expired) {
      logEvent(db, item, { type: "expired", quantityDelta: -item.quantity, quantityAfter: 0 });
    }
    const ids = new Set(expired.map((i) => i.id));
    db.inventory = db.inventory.filter((i) => !ids.has(i.id));
  });
}

// ---------------------------------------------------------------------------
// Recipes

const recipeSchema = z.object({
  title: z.string().trim().min(1, "Give your recipe a name").max(120),
  description: z.string().trim().max(1000).default(""),
  servings: z.coerce.number().int().min(1).max(100),
  prepMinutes: z.coerce.number().int().min(0).max(24 * 60),
  cookMinutes: z.coerce.number().int().min(0).max(7 * 24 * 60),
  cuisine: z.string().trim().max(40).default(""),
  tags: z
    .string()
    .default("")
    .transform((v) => [...new Set(v.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))]),
  ingredients: z.string().trim().min(1, "Add at least one ingredient"),
  steps: z.string().default(""),
});

/** Create (id = null) or update a recipe. On success the result carries the recipe's id. */
export function saveRecipe(id: string | null, _prev: ActionState, formData: FormData): ActionState {
  const parsed = recipeSchema.safeParse(fields(formData));
  if (!parsed.success) return fail(parsed.error);
  const { ingredients: ingredientText, steps: stepText, ...rest } = parsed.data;
  const ingredients = parseIngredientLines(ingredientText).map((i) => ({
    ...i,
    unit: i.unit ? normalizeUnit(i.unit) : undefined,
  }));
  if (!ingredients.length) return { ok: false, errors: { ingredients: ["Couldn't read any ingredients"] } };
  const steps = stepText
    .split(/\r?\n/)
    .map((s) => s.trim().replace(/^\d+[.)]\s*/, ""))
    .filter(Boolean);

  const now = new Date().toISOString();
  const savedId = mutate((db) => {
    if (id) {
      const existing = db.recipes.find((r) => r.id === id);
      if (!existing) return undefined;
      Object.assign(existing, rest, { cuisine: rest.cuisine || "Other", ingredients, steps, updatedAt: now });
      return existing.id;
    }
    const recipe: Recipe = {
      id: newId(),
      ...rest,
      cuisine: rest.cuisine || "Other",
      ingredients,
      steps,
      favorite: false,
      source: "user",
      createdAt: now,
      updatedAt: now,
    };
    db.recipes.push(recipe);
    return recipe.id;
  });
  if (!savedId) return { ok: false, message: "That recipe no longer exists" };
  return { ok: true, id: savedId, message: "Saved" };
}

export function deleteRecipe(id: string): void {
  mutate((db) => {
    db.recipes = db.recipes.filter((r) => r.id !== id);
  });
}

function logFeedback(db: Database, recipe: Recipe, kind: FeedbackEntry["kind"]) {
  (db.feedback ??= []).push({ id: newId(), at: new Date().toISOString(), recipeId: recipe.id, recipeTitle: recipe.title, kind });
}

/** 👍 Save a recipe (a favourite): boosts it and dishes like it. Clears a dislike. */
export function toggleFavorite(id: string): void {
  mutate((db) => {
    const r = db.recipes.find((x) => x.id === id);
    if (!r) return;
    r.favorite = !r.favorite;
    logFeedback(db, r, r.favorite ? "saved" : "unsaved");
    if (r.favorite && r.disliked) {
      r.disliked = false;
      logFeedback(db, r, "undisliked");
    }
  });
}

/** 👎 Not for me: never recommended again (until undone), and similar dishes are nudged down. */
export function toggleDislike(id: string): void {
  mutate((db) => {
    const r = db.recipes.find((x) => x.id === id);
    if (!r) return;
    r.disliked = !r.disliked;
    logFeedback(db, r, r.disliked ? "disliked" : "undisliked");
    if (r.disliked && r.favorite) {
      r.favorite = false;
      logFeedback(db, r, "unsaved");
    }
  });
}

/**
 * Remember today's recommendations (once per recipe per day). Does nothing —
 * and doesn't re-render — when they're already recorded.
 */
export function logRecommendations(recipes: { id: string; title: string }[], focus: Focus): void {
  const today = todayIso();
  const known = new Set((getDb().recommendationLog ?? []).filter((e) => e.date === today).map((e) => e.recipeId));
  const fresh = recipes.filter((r) => !known.has(r.id));
  if (!fresh.length) return;
  mutate((db) => {
    const log = (db.recommendationLog ??= []);
    for (const r of fresh) log.push({ id: newId(), date: today, recipeId: r.id, recipeTitle: r.title, focus });
    // Keep the last year only.
    const cutoff = todayIso(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
    db.recommendationLog = log.filter((e) => e.date >= cutoff);
  });
}

/**
 * Import a meal history .txt: adds recommendations and cooked meals that
 * aren't already recorded, and applies saved/disliked to matching recipes
 * (by title). Lines for recipes that aren't in your book are counted as skipped.
 */
export function importMealHistory(text: string): ActionState {
  const lines = parseMealHistory(text);
  if (!lines.length) return { ok: false, message: "Couldn't find any meal history in that file" };
  const result = mutate((db) => {
    const byTitle = new Map(db.recipes.map((r) => [r.title.toLowerCase(), r]));
    let added = 0;
    let skipped = 0;
    for (const l of lines) {
      const recipe = byTitle.get(l.title.toLowerCase());
      if (l.kind === "recommended") {
        if (!recipe) { skipped++; continue; }
        const log = (db.recommendationLog ??= []);
        if (log.some((e) => e.date === l.date && e.recipeId === recipe.id)) continue;
        log.push({ id: newId(), date: l.date, recipeId: recipe.id, recipeTitle: recipe.title, focus: isFocus(l.detail) ? l.detail : "balanced" });
        added++;
      } else if (l.kind === "cooked") {
        const title = recipe?.title ?? l.title;
        if (db.cookLog.some((c) => c.at.slice(0, 10) === l.date && c.recipeTitle.toLowerCase() === title.toLowerCase())) continue;
        db.cookLog.push({ id: newId(), recipeId: recipe?.id ?? "", recipeTitle: title, at: `${l.date}T12:00:00.000Z` });
        added++;
      } else {
        if (!recipe) { skipped++; continue; }
        const at = `${l.date}T12:00:00.000Z`;
        if (l.kind === "saved" && !recipe.favorite) {
          recipe.favorite = true;
          recipe.disliked = false;
          db.feedback = [...(db.feedback ?? []), { id: newId(), at, recipeId: recipe.id, recipeTitle: recipe.title, kind: "saved" }];
          added++;
        } else if (l.kind === "disliked" && !recipe.disliked) {
          recipe.disliked = true;
          recipe.favorite = false;
          db.feedback = [...(db.feedback ?? []), { id: newId(), at, recipeId: recipe.id, recipeTitle: recipe.title, kind: "disliked" }];
          added++;
        }
      }
    }
    db.cookLog.sort((a, b) => a.at.localeCompare(b.at));
    (db.recommendationLog ?? []).sort((a, b) => a.date.localeCompare(b.date));
    return { added, skipped };
  });
  const skippedNote = result.skipped ? ` (${result.skipped} skipped: recipe not in your book)` : "";
  return {
    ok: true,
    message: result.added ? `Imported ${result.added} entr${result.added === 1 ? "y" : "ies"}${skippedNote}` : `Nothing new to import${skippedNote}`,
  };
}

/** Set a 1–5 rating; choosing the current rating again clears it. */
export function rateRecipe(id: string, rating: number): void {
  const value = Math.round(rating);
  mutate((db) => {
    const r = db.recipes.find((x) => x.id === id);
    if (!r) return;
    r.rating = value >= 1 && value <= 5 && r.rating !== value ? value : undefined;
  });
}

/**
 * Record that a recipe was cooked and deduct what was used from the inventory.
 * The form posts `use:<itemId>` = amount for every ingredient the user confirmed.
 */
export function cookRecipe(id: string, _prev: ActionState, formData: FormData): ActionState {
  const uses: [string, number][] = [];
  for (const [key, value] of formData) {
    if (!key.startsWith("use:")) continue;
    const amount = Number(value);
    if (Number.isFinite(amount) && amount > 0) uses.push([key.slice(4), amount]);
  }

  const title = mutate((db) => {
    const recipe = db.recipes.find((r) => r.id === id);
    if (!recipe) return undefined;
    const at = new Date().toISOString();
    for (const [itemId, requested] of uses) {
      const item = db.inventory.find((i) => i.id === itemId);
      if (!item) continue;
      const amount = Math.min(requested, item.quantity);
      item.quantity = round(item.quantity - amount);
      item.updatedAt = at;
      db.events.push({
        id: newId(),
        itemId: item.id,
        itemName: item.name,
        type: "cooked",
        quantityDelta: -amount,
        quantityAfter: item.quantity,
        unit: item.unit,
        location: item.location,
        at,
        recipeId: recipe.id,
        note: `${recipe.title}${item.quantity <= 0 ? " · used up" : ""}`,
      });
    }
    db.inventory = db.inventory.filter((i) => i.quantity > 0);
    db.cookLog.push({ id: newId(), recipeId: recipe.id, recipeTitle: recipe.title, at });
    return recipe.title;
  });
  if (!title) return { ok: false, message: "That recipe no longer exists" };
  return { ok: true, message: `Enjoy your ${title}! Inventory updated.` };
}

// ---------------------------------------------------------------------------
// Settings & backups

const settingsSchema = z.object({
  staples: z
    .string()
    .default("")
    .transform((v) => [...new Set(v.split(/[\n,]/).map((s) => s.trim().toLowerCase()).filter(Boolean))]),
  expiringSoonDays: z.coerce.number().int().min(0).max(60),
});

export function saveSettings(_prev: ActionState, formData: FormData): ActionState {
  const parsed = settingsSchema.safeParse(fields(formData));
  if (!parsed.success) return fail(parsed.error);
  mutate((db) => {
    db.settings = parsed.data;
  });
  return { ok: true, message: "Settings saved" };
}

/** Replace all data with the contents of a backup file. */
export function restoreBackup(json: string): ActionState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, message: "That file isn't valid JSON" };
  }
  if (!isDatabase(parsed)) return { ok: false, message: "That doesn't look like a HungryHungryRob backup" };
  migrateDatabase(parsed);
  replaceDb(parsed);
  return {
    ok: true,
    message: `Restored ${parsed.inventory.length} items, ${parsed.recipes.length} recipes and ${parsed.events.length} history entries`,
  };
}

// ---------------------------------------------------------------------------
// Weekly focus

/** Set what recommendations prioritise. "week" lasts 7 days including today. */
export function setMealPlan(focus: Focus, diet: Diet, duration: "week" | "ongoing"): void {
  const today = todayIso();
  let until: string | undefined;
  if (duration === "week") {
    const d = new Date(`${today}T00:00:00`);
    d.setDate(d.getDate() + 6);
    until = todayIso(d);
  }
  mutate((db) => {
    db.settings.plan =
      focus === "balanced" && diet === "everything" ? undefined : { focus, diet, until, setOn: today };
  });
}

// ---------------------------------------------------------------------------
// Grocery list

export type NewListItem = { name: string; quantity?: number; unit?: string; location?: Location; reason?: string };

/** Add items to the grocery list, skipping anything already on it (unticked). */
export function addToShoppingList(items: NewListItem[]): number {
  return mutate((db) => {
    const list = (db.shoppingList ??= []);
    let added = 0;
    for (const i of items) {
      const name = i.name.trim();
      if (!name) continue;
      const key = normalizeName(name);
      if (list.some((x) => !x.done && normalizeName(x.name) === key)) continue;
      list.push({ id: newId(), ...i, name, done: false, addedAt: new Date().toISOString() });
      added++;
    }
    return added;
  });
}

/** Add a free-typed line ("2 lb chicken wings") to the list. */
export function addListLine(_prev: ActionState, formData: FormData): ActionState {
  const line = String(formData.get("line") ?? "");
  const parsed = parseInventoryText(line)[0];
  if (!parsed) return { ok: false, errors: { line: ["Type an item"] } };
  const added = addToShoppingList([
    { name: parsed.name, quantity: parsed.quantity, unit: parsed.unit ? normalizeUnit(parsed.unit) : undefined, location: parsed.location },
  ]);
  return added ? { ok: true, message: `Added ${parsed.name}` } : { ok: false, message: `${parsed.name} is already on your list` };
}

export function toggleShoppingItem(id: string): void {
  mutate((db) => {
    const item = db.shoppingList?.find((i) => i.id === id);
    if (item) item.done = !item.done;
  });
}

export function removeShoppingItem(id: string): void {
  mutate((db) => {
    db.shoppingList = (db.shoppingList ?? []).filter((i) => i.id !== id);
  });
}

/**
 * Put every ticked item into the inventory and take it off the list. Amount,
 * unit and place default to what you usually buy (from history), else 1.
 */
export function addTickedToInventory(): ActionState {
  const count = mutate((db) => {
    const ticked = (db.shoppingList ?? []).filter((i) => i.done);
    for (const i of ticked) {
      const usual = usualPurchase(db.events, i.name);
      addStock(db, {
        name: i.name,
        quantity: i.quantity && i.quantity > 0 ? i.quantity : (usual?.quantity ?? 1),
        unit: normalizeUnit(i.quantity ? i.unit : (i.unit ?? usual?.unit)),
        location: i.location ?? usual?.location ?? "pantry",
        expiresOn: undefined,
        notes: undefined,
      });
    }
    db.shoppingList = (db.shoppingList ?? []).filter((i) => !i.done);
    return ticked.length;
  });
  if (!count) return { ok: false, message: "Tick the items you bought first" };
  return { ok: true, message: `Added ${count} item${count === 1 ? "" : "s"} to your inventory` };
}

// ---------------------------------------------------------------------------
// Vital items

/** Mark or unmark a product as vital (never run out). */
export function toggleVital(name: string): void {
  const key = normalizeName(name);
  mutate((db) => {
    const vital = db.settings.vital ?? [];
    db.settings.vital = vital.some((v) => normalizeName(v) === key)
      ? vital.filter((v) => normalizeName(v) !== key)
      : [...vital, name.trim()];
  });
}

/** Add vital products from a comma- or line-separated list. */
export function addVital(_prev: ActionState, formData: FormData): ActionState {
  const names = String(formData.get("names") ?? "")
    .split(/[,\n]/)
    .map((n) => n.trim())
    .filter(Boolean);
  if (!names.length) return { ok: false, errors: { names: ["Type an item"] } };
  const added = mutate((db) => {
    const vital = (db.settings.vital ??= []);
    const fresh = names.filter((n) => !vital.some((v) => normalizeName(v) === normalizeName(n)));
    vital.push(...fresh);
    return fresh.length;
  });
  return { ok: true, message: added ? `Marked ${added} as vital` : "Already vital" };
}

/**
 * Set when a product counts as low, in `unit`. An empty value goes back to the
 * default (1 of the item's unit); 0 means "only when it runs out".
 */
export function setLowThreshold(name: string, quantity: number | undefined, unit: string): void {
  const key = normalizeName(name);
  mutate((db) => {
    const lowAt = { ...(db.settings.lowAt ?? {}) };
    if (quantity === undefined || !Number.isFinite(quantity) || quantity < 0) delete lowAt[key];
    else lowAt[key] = { quantity, unit: normalizeUnit(unit) };
    db.settings.lowAt = lowAt;
  });
}

/** Save an online recipe into your book (once). Returns the saved recipe's id. */
export function saveOnlineRecipe(recipe: Recipe): string {
  return mutate((db) => {
    const existing = db.recipes.find((r) => r.externalId && r.externalId === recipe.externalId);
    if (existing) return existing.id;
    const now = new Date().toISOString();
    const saved: Recipe = { ...recipe, id: newId(), source: "online", favorite: false, disliked: false, createdAt: now, updatedAt: now };
    db.recipes.push(saved);
    return saved.id;
  });
}
