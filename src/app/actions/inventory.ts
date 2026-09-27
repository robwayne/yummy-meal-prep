"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mutateDb, newId } from "@/lib/db";
import { convert, normalizeName, normalizeUnit, parseIngredientLines } from "@/lib/ingredients";
import { todayIso } from "@/lib/recommend";
import {
  LOCATIONS,
  type Database,
  type InventoryEvent,
  type InventoryItem,
  type Location,
} from "@/lib/types";

export type ActionState = { ok?: boolean; message?: string; errors?: Record<string, string[]> };

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

function logEvent(db: Database, item: InventoryItem, event: Omit<InventoryEvent, "id" | "itemId" | "itemName" | "unit" | "location" | "at">) {
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

function done(message: string): ActionState {
  revalidatePath("/", "layout");
  return { ok: true, message };
}

export async function addItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = itemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
  const kind = await mutateDb((db) => addStock(db, parsed.data));
  return done(`${kind === "added" ? "Added" : "Restocked"} ${parsed.data.name}`);
}

export async function addItemsBulk(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = bulkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
  const lines = parseIngredientLines(parsed.data.lines);
  if (!lines.length) return { ok: false, errors: { lines: ["Couldn't read any items"] } };
  await mutateDb((db) => {
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
  return done(`Added ${lines.length} item${lines.length === 1 ? "" : "s"}`);
}

export async function updateItem(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = itemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
  const found = await mutateDb((db) => {
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
  return done(`Updated ${parsed.data.name}`);
}

const useSchema = z.object({ amount: z.coerce.number().positive("Enter an amount") });

export async function consumeItem(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = useSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
  const name = await mutateDb((db) => {
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
  return done(`Used some ${name}`);
}

/** Remove an item entirely, recording why (thrown out because it expired, or just removed). */
export async function discardItem(id: string, reason: "expired" | "removed"): Promise<void> {
  await mutateDb((db) => {
    const item = db.inventory.find((i) => i.id === id);
    if (!item) return;
    logEvent(db, item, { type: reason, quantityDelta: -item.quantity, quantityAfter: 0 });
    db.inventory = db.inventory.filter((i) => i.id !== id);
  });
  revalidatePath("/", "layout");
}

/** Throw out everything past its date in one go. */
export async function discardAllExpired(): Promise<void> {
  const today = todayIso();
  await mutateDb((db) => {
    const expired = db.inventory.filter((i) => i.expiresOn && i.expiresOn < today);
    for (const item of expired) {
      logEvent(db, item, { type: "expired", quantityDelta: -item.quantity, quantityAfter: 0 });
    }
    const ids = new Set(expired.map((i) => i.id));
    db.inventory = db.inventory.filter((i) => !ids.has(i.id));
  });
  revalidatePath("/", "layout");
}
