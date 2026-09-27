"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { mutateDb, newId } from "@/lib/db";
import { normalizeUnit, parseIngredientLines } from "@/lib/ingredients";
import type { Recipe } from "@/lib/types";

import type { ActionState } from "./inventory";

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
    .transform((v) =>
      [...new Set(v.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))],
    ),
  ingredients: z.string().trim().min(1, "Add at least one ingredient"),
  steps: z.string().default(""),
});

export async function saveRecipe(
  id: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = recipeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
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
  const savedId = await mutateDb((db) => {
    if (id) {
      const existing = db.recipes.find((r) => r.id === id);
      if (!existing) return undefined;
      Object.assign(existing, rest, { ingredients, steps, updatedAt: now });
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
  revalidatePath("/", "layout");
  redirect(`/recipes/${savedId}`);
}

export async function deleteRecipe(id: string): Promise<void> {
  await mutateDb((db) => {
    db.recipes = db.recipes.filter((r) => r.id !== id);
  });
  revalidatePath("/", "layout");
  redirect("/recipes");
}

export async function toggleFavorite(id: string): Promise<void> {
  await mutateDb((db) => {
    const r = db.recipes.find((x) => x.id === id);
    if (r) r.favorite = !r.favorite;
  });
  revalidatePath("/", "layout");
}

export async function rateRecipe(id: string, rating: number): Promise<void> {
  const value = Math.round(rating);
  await mutateDb((db) => {
    const r = db.recipes.find((x) => x.id === id);
    if (!r) return;
    r.rating = value >= 1 && value <= 5 && r.rating !== value ? value : undefined;
  });
  revalidatePath("/", "layout");
}

/**
 * Record that a recipe was cooked and deduct what was used from the inventory.
 * The form posts `use:<itemId>` = amount for every ingredient the user confirmed.
 */
export async function cookRecipe(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const uses: [string, number][] = [];
  for (const [key, value] of formData) {
    if (!key.startsWith("use:")) continue;
    const amount = Number(value);
    if (Number.isFinite(amount) && amount > 0) uses.push([key.slice(4), amount]);
  }

  const title = await mutateDb((db) => {
    const recipe = db.recipes.find((r) => r.id === id);
    if (!recipe) return undefined;
    const at = new Date().toISOString();
    for (const [itemId, requested] of uses) {
      const item = db.inventory.find((i) => i.id === itemId);
      if (!item) continue;
      const amount = Math.min(requested, item.quantity);
      item.quantity = Math.round((item.quantity - amount) * 1000) / 1000;
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
  revalidatePath("/", "layout");
  return { ok: true, message: `Enjoy your ${title}! Inventory updated.` };
}
