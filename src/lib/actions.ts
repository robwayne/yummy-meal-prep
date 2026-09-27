/**
 * Everything that changes data. Each function validates its input, applies the
 * change through the browser store and returns a small result for the UI.
 */
import { z } from "zod";

import { newId } from "./database";
import { convert, normalizeName, normalizeUnit, parseIngredientLines } from "./ingredients";
import { todayIso } from "./recommend";
import { mutate, replaceDb } from "./store";
import { isDatabase } from "./database";
import {
  LOCATIONS,
  type Database,
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
  const lines = parseIngredientLines(parsed.data.lines);
  if (!lines.length) return { ok: false, errors: { lines: ["Couldn't read any items"] } };
  mutate((db) => {
    for (const l of lines) {
      addStock(db, {
        name: l.name,
        quantity: l.quantity && l.quantity > 0 ? l.quantity : 1,
        unit: normalizeUnit(l.unit),
        location: parsed.data.location,
        expiresOn: parsed.data.expiresOn,
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

export function toggleFavorite(id: string): void {
  mutate((db) => {
    const r = db.recipes.find((x) => x.id === id);
    if (r) r.favorite = !r.favorite;
  });
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
  if (!isDatabase(parsed)) return { ok: false, message: "That doesn't look like a Yummy Meal Prep backup" };
  replaceDb(parsed);
  return {
    ok: true,
    message: `Restored ${parsed.inventory.length} items, ${parsed.recipes.length} recipes and ${parsed.events.length} history entries`,
  };
}
