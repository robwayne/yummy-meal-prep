/**
 * Search free online recipe databases from the browser:
 * - TheMealDB (https://www.themealdb.com) — meals and desserts, with measures;
 * - DummyJSON recipes (https://dummyjson.com/docs/recipes) — includes snacks
 *   and baking like chocolate chip cookies.
 * Results are turned into our Recipe shape so they can be matched against
 * the inventory exactly like saved recipes.
 */
import { parseIngredientLine } from "./ingredients";
import type { Recipe, RecipeIngredient } from "./types";

const MEALDB = "https://www.themealdb.com/api/json/v1/1";
const DUMMYJSON = "https://dummyjson.com/recipes";

type MealDbMeal = Record<string, string | null | undefined> & { idMeal: string; strMeal: string };
type DummyRecipe = {
  id: number;
  name: string;
  ingredients?: string[];
  instructions?: string[];
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  cuisine?: string;
  tags?: string[];
  mealType?: string[];
  image?: string;
};

function base(externalId: string, title: string): Pick<Recipe, "id" | "externalId" | "title" | "favorite" | "source" | "createdAt" | "updatedAt"> {
  const now = new Date().toISOString();
  return { id: externalId.replace(":", "-"), externalId, title, favorite: false, source: "online", createdAt: now, updatedAt: now };
}

/** "1 cup" + "flour" → { quantity: 1, unit: "cup", name: "flour" }; odd measures become a note. */
function ingredientFrom(name: string, measure: string): RecipeIngredient {
  const clean = name.trim();
  const m = measure.trim();
  if (!m) return { name: clean };
  const parsed = parseIngredientLine(`${m} ${clean}`);
  if (parsed && parsed.name.toLowerCase().includes(clean.toLowerCase()) && parsed.quantity !== undefined) {
    return { name: clean, quantity: parsed.quantity, unit: parsed.unit, note: parsed.note };
  }
  return { name: clean, note: m };
}

function splitSteps(text: string): string[] {
  const lines = text
    .split(/\r?\n+/)
    .map((l) => l.trim().replace(/^(step\s*\d+[:.)]?|\d+[.)])\s*/i, ""))
    .filter((l) => l.length > 2 && !/^step\s*\d+$/i.test(l));
  if (lines.length > 1) return lines;
  // One long paragraph: split into sentences.
  return text.split(/(?<=\.)\s+(?=[A-Z])/).map((s) => s.trim()).filter(Boolean);
}

export function fromMealDb(meal: MealDbMeal): Recipe {
  const ingredients: RecipeIngredient[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`]?.trim();
    if (name) ingredients.push(ingredientFrom(name, meal[`strMeasure${i}`] ?? ""));
  }
  const category = (meal.strCategory ?? "").toLowerCase();
  const tags = [
    ...(category ? [category] : []),
    ...(meal.strTags ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
    ...(category === "dessert" ? ["dessert", "sweet"] : []),
    ...(category === "starter" || category === "side" ? ["snack"] : []),
  ];
  return {
    ...base(`mealdb:${meal.idMeal}`, meal.strMeal.trim()),
    description: [meal.strArea, meal.strCategory].filter(Boolean).join(" · "),
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 30,
    cuisine: meal.strArea && meal.strArea !== "Unknown" ? meal.strArea : "Other",
    tags: [...new Set(tags)],
    ingredients,
    steps: splitSteps(meal.strInstructions ?? ""),
    image: meal.strMealThumb ?? undefined,
    sourceUrl: meal.strSource || meal.strYoutube || `https://www.themealdb.com/meal/${meal.idMeal}`,
  };
}

export function fromDummyJson(r: DummyRecipe): Recipe {
  const mealTypes = (r.mealType ?? []).map((t) => t.toLowerCase());
  const tags = [
    ...(r.tags ?? []).map((t) => t.toLowerCase()),
    ...mealTypes,
    ...(mealTypes.includes("dessert") || mealTypes.includes("snack") ? ["snack"] : []),
  ];
  return {
    ...base(`dummyjson:${r.id}`, r.name.trim()),
    description: [r.cuisine, ...(r.mealType ?? [])].filter(Boolean).join(" · "),
    servings: r.servings ?? 4,
    prepMinutes: r.prepTimeMinutes ?? 15,
    cookMinutes: r.cookTimeMinutes ?? 20,
    cuisine: r.cuisine ?? "Other",
    tags: [...new Set(tags)],
    ingredients: (r.ingredients ?? [])
      .map((line) => parseIngredientLine(line))
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .map((p) => ({ name: p.name, quantity: p.quantity, unit: p.unit, note: p.note, optional: p.optional })),
    steps: r.instructions ?? [],
    image: r.image,
    sourceUrl: `https://dummyjson.com/recipes/${r.id}`,
  };
}

async function getJson<T>(url: string, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// Recipes seen in this session, so opening a search result doesn't refetch it.
const cache = new Map<string, Recipe>();

async function searchBoth(q: string): Promise<{ recipes: Recipe[]; failed: number }> {
  const [meals, dummy] = await Promise.allSettled([
    getJson<{ meals: MealDbMeal[] | null }>(`${MEALDB}/search.php?s=${encodeURIComponent(q)}`),
    getJson<{ recipes: DummyRecipe[] }>(`${DUMMYJSON}/search?q=${encodeURIComponent(q)}&limit=20`),
  ]);
  const recipes: Recipe[] = [];
  if (dummy.status === "fulfilled") recipes.push(...(dummy.value.recipes ?? []).map(fromDummyJson));
  if (meals.status === "fulfilled") recipes.push(...(meals.value.meals ?? []).map(fromMealDb));
  return { recipes, failed: [meals, dummy].filter((r) => r.status === "rejected").length };
}

/**
 * Search online. If the exact phrase finds nothing, tries without a trailing
 * plural and then the most specific single word ("chocolate chip cookie" → "cookie").
 */
export async function searchOnline(query: string): Promise<{ recipes: Recipe[]; offline: boolean }> {
  const q = query.trim();
  if (q.length < 2) return { recipes: [], offline: false };
  const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const attempts = [q, q.replace(/s$/i, ""), ...(words.length > 1 ? [words.at(-1)!.replace(/s$/, "")] : [])];
  let failedAll = true;
  for (const attempt of [...new Set(attempts)]) {
    const { recipes, failed } = await searchBoth(attempt);
    if (failed < 2) failedAll = false;
    if (recipes.length) {
      const seen = new Set<string>();
      const unique = recipes.filter((r) => {
        const key = r.title.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      // Best title matches first.
      const lower = q.toLowerCase();
      unique.sort((a, b) => rank(b.title, lower) - rank(a.title, lower));
      for (const r of unique) cache.set(r.externalId!, r);
      return { recipes: unique, offline: false };
    }
  }
  return { recipes: [], offline: failedAll };
}

function rank(title: string, q: string): number {
  const t = title.toLowerCase();
  if (t === q) return 3;
  if (t.startsWith(q) || t.includes(q)) return 2;
  return q.split(/\s+/).filter((w) => t.includes(w.replace(/s$/, ""))).length / 10;
}

/** Fetch one online recipe by its external id ("mealdb:52772", "dummyjson:3"). */
export async function fetchOnlineRecipe(externalId: string): Promise<Recipe | undefined> {
  const cached = cache.get(externalId);
  if (cached) return cached;
  const [source, id] = externalId.split(":");
  if (!id || !/^[\w-]+$/.test(id)) return undefined;
  let recipe: Recipe | undefined;
  if (source === "mealdb") {
    const data = await getJson<{ meals: MealDbMeal[] | null }>(`${MEALDB}/lookup.php?i=${id}`);
    recipe = data.meals?.[0] ? fromMealDb(data.meals[0]) : undefined;
  } else if (source === "dummyjson") {
    recipe = fromDummyJson(await getJson<DummyRecipe>(`${DUMMYJSON}/${id}`));
  }
  if (recipe) cache.set(externalId, recipe);
  return recipe;
}
