/**
 * The recommendation engine. Pure functions over plain data so it's easy to
 * test and reason about.
 */
import { convert, ingredientMatches, nameWords, normalizeName } from "./ingredients";
import { activePlan, classify, fitsDiet, nutritionScore, proteinSubstitutes, recipeBalance, type Balance } from "./nutrition";
import type {
  CookLogEntry,
  Database,
  Diet,
  Focus,
  InventoryItem,
  Recipe,
  RecipeIngredient,
  RecommendationLogEntry,
} from "./types";

export type MatchStatus = "have" | "low" | "staple" | "missing";

export type IngredientMatch = {
  ingredient: RecipeIngredient;
  status: MatchStatus;
  items: InventoryItem[];
  /** Set when a different protein from your kitchen stands in (e.g. wings for thighs). */
  swappedFor?: InventoryItem;
};

/** A protein swap applied to a recipe: the recipe's ingredient name → what you have. */
export type Swap = { from: string; to: string };

export type RecipeMatch = {
  recipe: Recipe;
  ingredients: IngredientMatch[];
  requiredCount: number;
  haveCount: number;
  missing: RecipeIngredient[];
  /** 0..1 share of required ingredients available (staples included). */
  coverage: number;
  /** Items expiring soon that this recipe would use up. */
  usesExpiring: InventoryItem[];
  /** Food groups on the plate. */
  balance: Balance;
  /** False when the dish's main protein isn't in your kitchen (it's then never recommended). */
  proteinAvailable: boolean;
  /** Set when the main protein is covered by a substitute. */
  swap?: Swap;
  score: number;
  reasons: string[];
};

export type RecommendContext = {
  inventory: InventoryItem[];
  staples: string[];
  cookLog: CookLogEntry[];
  recipes: Recipe[];
  expiringSoonDays: number;
  /** This week's priority and diet (defaults: balanced, no restrictions). */
  focus?: Focus;
  diet?: Diet;
  /** Only meals, only snacks, or anything (default). */
  kind?: "meal" | "snack";
  /** What was recommended on previous days (to avoid suggesting the same thing forever). */
  recommendationLog?: RecommendationLogEntry[];
  now?: Date;
};

const DAY = 24 * 60 * 60 * 1000;

/** Snacks and sweet treats, as opposed to meals. */
export function isSnack(recipe: Recipe): boolean {
  return recipe.tags.some((t) => t === "snack" || t === "dessert");
}

/** Everything the engine needs, taken from the saved database. */
export function contextFor(db: Database, now = new Date()): RecommendContext {
  const { focus, diet } = activePlan(db.settings.plan, todayIso(now));
  return {
    inventory: db.inventory,
    staples: db.settings.staples,
    cookLog: db.cookLog,
    recipes: db.recipes,
    expiringSoonDays: db.settings.expiringSoonDays,
    focus,
    diet,
    recommendationLog: db.recommendationLog,
    now,
  };
}

export function todayIso(now = new Date()): string {
  const d = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 10);
}

/** Whole days until `expiresOn` (negative once expired). */
export function daysUntil(expiresOn: string, now = new Date()): number {
  const target = new Date(`${expiresOn}T00:00:00`);
  const today = new Date(`${todayIso(now)}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / DAY);
}

export type Freshness = "expired" | "soon" | "ok" | "none";

export function freshness(item: InventoryItem, soonDays: number, now = new Date()): Freshness {
  if (!item.expiresOn) return "none";
  const d = daysUntil(item.expiresOn, now);
  if (d < 0) return "expired";
  if (d <= soonDays) return "soon";
  return "ok";
}

/** Items that can actually be cooked with: in stock and not past their date. */
export function usableInventory(inventory: InventoryItem[], now = new Date()): InventoryItem[] {
  return inventory.filter(
    (i) => i.quantity > 0 && (!i.expiresOn || daysUntil(i.expiresOn, now) >= 0),
  );
}

function totalIn(items: InventoryItem[], unit: string): number | undefined {
  let total = 0;
  for (const item of items) {
    const q = convert(item.quantity, item.unit, unit);
    if (q === undefined) return undefined;
    total += q;
  }
  return total;
}

export function matchIngredient(
  ingredient: RecipeIngredient,
  inventory: InventoryItem[],
  staples: string[],
): IngredientMatch {
  let items = inventory.filter((i) => ingredientMatches(ingredient.name, i.name));
  const isProtein = Boolean(classify(ingredient.name).proteinKind);
  if (items.length === 0 && isProtein) {
    const subs = proteinSubstitutes(ingredient.name);
    items = inventory.filter((i) => subs.some((s) => ingredientMatches(s, i.name)));
  }
  if (items.length === 0) {
    const isStaple = staples.some((s) => ingredientMatches(ingredient.name, s));
    return { ingredient, status: isStaple ? "staple" : "missing", items };
  }
  // A protein is "swapped" when what you have is a different cut or kind, not the
  // same thing named more or less specifically (wings for thighs is a swap; wings for
  // "chicken", or minced beef for ground beef, is not).
  let swappedFor: InventoryItem | undefined;
  if (isProtein) {
    const key = normalizeName(ingredient.name);
    const wanted = nameWords(ingredient.name);
    const exact = items.find((i) => {
      if (normalizeName(i.name) === key) return true;
      const have = nameWords(i.name);
      return wanted.every((w) => have.includes(w)) || have.every((w) => wanted.includes(w));
    });
    if (exact) items = [exact, ...items.filter((i) => i !== exact)];
    else swappedFor = items[0];
  }
  if (ingredient.quantity !== undefined) {
    const have = totalIn(items, ingredient.unit ?? "");
    if (have !== undefined && have + 1e-9 < ingredient.quantity) {
      return { ingredient, status: "low", items, swappedFor };
    }
  }
  return { ingredient, status: "have", items, swappedFor };
}

/** Tag/cuisine affinity learnt from favourites, ratings and what actually gets cooked. */
export function tasteProfile(recipes: Recipe[], cookLog: CookLogEntry[]): Map<string, number> {
  const weights = new Map<string, number>();
  const bump = (r: Recipe, w: number) => {
    for (const key of [...r.tags, `cuisine:${r.cuisine.toLowerCase()}`]) {
      weights.set(key, (weights.get(key) ?? 0) + w);
    }
  };
  const byId = new Map(recipes.map((r) => [r.id, r]));
  for (const r of recipes) {
    if (r.favorite) bump(r, 3);
    if (r.disliked) bump(r, -3);
    if (r.rating) bump(r, r.rating - 3);
  }
  for (const c of cookLog) {
    const r = byId.get(c.recipeId);
    if (r) bump(r, 1);
  }
  const max = Math.max(1, ...weights.values());
  for (const [k, v] of weights) weights.set(k, v / max);
  return weights;
}

function affinity(recipe: Recipe, profile: Map<string, number>): number {
  let a = 0;
  for (const key of [...recipe.tags, `cuisine:${recipe.cuisine.toLowerCase()}`]) {
    a += profile.get(key) ?? 0;
  }
  return a;
}

function daysSinceCooked(recipeId: string, cookLog: CookLogEntry[], now: Date): number | undefined {
  let latest: number | undefined;
  for (const c of cookLog) {
    if (c.recipeId !== recipeId) continue;
    const t = new Date(c.at).getTime();
    if (latest === undefined || t > latest) latest = t;
  }
  return latest === undefined ? undefined : (now.getTime() - latest) / DAY;
}

/** Distinct days in the last two weeks this dish was recommended since you last cooked it. */
function recentRecommendationDays(recipeId: string, ctx: RecommendContext, now: Date): number {
  const log = ctx.recommendationLog;
  if (!log?.length) return 0;
  const cooked = ctx.cookLog.filter((c) => c.recipeId === recipeId).map((c) => c.at.slice(0, 10));
  const lastCooked = cooked.sort().at(-1) ?? "";
  const from = todayIso(new Date(now.getTime() - 14 * DAY));
  const days = new Set(log.filter((e) => e.recipeId === recipeId && e.date >= from && e.date > lastCooked).map((e) => e.date));
  return days.size;
}

export function matchRecipe(
  recipe: Recipe,
  ctx: RecommendContext,
  profile = tasteProfile(ctx.recipes, ctx.cookLog),
): RecipeMatch {
  const now = ctx.now ?? new Date();
  const usable = usableInventory(ctx.inventory, now);
  const ingredients = recipe.ingredients.map((ing) => matchIngredient(ing, usable, ctx.staples));
  const required = ingredients.filter((m) => !m.ingredient.optional);
  const haveCount = required.filter((m) => m.status !== "missing").length;
  const missing = required.filter((m) => m.status === "missing").map((m) => m.ingredient);
  const coverage = required.length ? haveCount / required.length : 1;

  const expiringIds = new Set<string>();
  const usesExpiring: InventoryItem[] = [];
  for (const m of ingredients) {
    for (const item of m.items) {
      if (freshness(item, ctx.expiringSoonDays, now) === "soon" && !expiringIds.has(item.id)) {
        expiringIds.add(item.id);
        usesExpiring.push(item);
      }
    }
  }

  // Ingredients that are really "yours" (not assumed staples) matter more.
  const realHits = ingredients.filter((m) => m.status === "have" || m.status === "low").length;
  const optionalHits = ingredients.filter(
    (m) => m.ingredient.optional && m.status !== "missing",
  ).length;
  const lowCount = required.filter((m) => m.status === "low").length;

  const reasons: string[] = [];
  let score = coverage * 100 - missing.length * 8 - lowCount * 3 + realHits * 2 + optionalHits;

  if (missing.length === 0) reasons.push("You have everything you need");
  else if (missing.length <= 2) reasons.push(`Only missing ${missing.map((m) => m.name).join(" & ")}`);

  if (usesExpiring.length) {
    score += Math.min(36, usesExpiring.length * 12);
    reasons.push(`Uses up ${usesExpiring.map((i) => i.name).join(", ")} before it expires`);
  }
  const balance = recipeBalance(recipe, (ing) =>
    ingredients.some((m) => m.ingredient === ing && m.status !== "missing"),
  );
  const mainMatch = balance.mainProtein && ingredients.find((m) => m.ingredient === balance.mainProtein!.ingredient);
  const nutrition = nutritionScore(recipe, balance, ctx.focus ?? "balanced", ctx.diet ?? "everything", usable);
  score += nutrition.score;
  reasons.push(...nutrition.reasons);
  if (mainMatch?.swappedFor && !reasons.some((r) => r.startsWith("Uses your"))) {
    score += 10;
    reasons.push(`Uses your ${mainMatch.swappedFor.name}`);
  }

  if (recipe.favorite) {
    score += 10;
    reasons.push("One of your favourites");
  }
  if (recipe.rating) score += (recipe.rating - 3) * 4;

  const aff = affinity(recipe, profile);
  if (aff > 0) {
    score += Math.min(15, aff * 5);
    if (aff >= 1 && !recipe.favorite) reasons.push("Matches what you like to cook");
  } else if (aff < 0) {
    // Resembles dishes you've marked "not for me".
    score += Math.max(-15, aff * 5);
  }

  // Recommended on several recent days but never cooked? Let it rest for a while.
  const shown = recentRecommendationDays(recipe.id, ctx, now);
  if (shown >= 4) score -= Math.min(15, (shown - 3) * 3);

  const since = daysSinceCooked(recipe.id, ctx.cookLog, now);
  if (since !== undefined && since < 3) {
    score -= 15;
    reasons.push("Cooked recently");
  }

  return {
    recipe,
    ingredients,
    requiredCount: required.length,
    haveCount,
    missing,
    coverage,
    usesExpiring,
    balance,
    proteinAvailable: !mainMatch || mainMatch.status !== "missing",
    swap: mainMatch?.swappedFor ? { from: mainMatch.ingredient.name, to: mainMatch.swappedFor.name } : undefined,
    score,
    reasons,
  };
}

export function rankRecipes(ctx: RecommendContext): RecipeMatch[] {
  const profile = tasteProfile(ctx.recipes, ctx.cookLog);
  const diet = ctx.diet ?? "everything";
  return ctx.recipes
    .filter((r) => !r.disliked && fitsDiet(r, diet))
    .filter((r) => !ctx.kind || (ctx.kind === "snack") === isSnack(r))
    .map((r) => matchRecipe(r, ctx, profile))
    .sort((a, b) => b.score - a.score || a.missing.length - b.missing.length);
}

export type Recommendations = {
  ready: RecipeMatch[];
  almost: RecipeMatch[];
  stretch: RecipeMatch[];
};

export function recommend(ctx: RecommendContext, almostThreshold = 2): Recommendations {
  // Never suggest a dish whose main protein you don't have (or can't swap in).
  const ranked = rankRecipes(ctx).filter((m) => m.proteinAvailable);
  return {
    ready: ranked.filter((m) => m.missing.length === 0),
    almost: ranked.filter((m) => m.missing.length > 0 && m.missing.length <= almostThreshold),
    stretch: ranked.filter((m) => m.missing.length > almostThreshold && m.coverage >= 0.4),
  };
}

/** The best few meals overall: ready or nearly ready, ordered purely by score. */
export function topPicks(recs: Recommendations, limit = 3): RecipeMatch[] {
  return [...recs.ready, ...recs.almost].sort((a, b) => b.score - a.score).slice(0, limit);
}

export type ShoppingItem = { name: string; forRecipes: string[] };

/** Missing ingredients across a set of recipes, most useful first. */
export function shoppingList(matches: RecipeMatch[]): ShoppingItem[] {
  const map = new Map<string, ShoppingItem>();
  for (const m of matches) {
    for (const ing of m.missing) {
      const key = normalizeName(ing.name);
      const entry = map.get(key) ?? { name: ing.name, forRecipes: [] };
      if (!entry.forRecipes.includes(m.recipe.title)) entry.forRecipes.push(m.recipe.title);
      map.set(key, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.forRecipes.length - a.forRecipes.length);
}

function recipeFeatures(r: Recipe): Set<string> {
  return new Set([
    ...r.tags.map((t) => `tag:${t}`),
    ...r.ingredients.filter((i) => !i.optional).map((i) => `ing:${normalizeName(i.name)}`),
  ]);
}

/** Shared tags/ingredients, with a small nudge for the same cuisine. */
function similarity(a: Recipe, af: Set<string>, b: Recipe, bf: Set<string>): number {
  const j = jaccard(af, bf);
  if (j === 0) return 0;
  return j + (a.cuisine.toLowerCase() === b.cuisine.toLowerCase() ? 0.1 : 0);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

/** Content-based "more like this". */
export function similarRecipes(target: Recipe, recipes: Recipe[], limit = 4): Recipe[] {
  const tf = recipeFeatures(target);
  return recipes
    .filter((r) => r.id !== target.id && !r.disliked)
    .map((r) => ({ r, s: similarity(target, tf, r, recipeFeatures(r)) }))
    .filter((x) => x.s > 0.1)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.r);
}

/** Recipes you haven't cooked lately that resemble the ones you love. */
export function forYou(recipes: Recipe[], cookLog: CookLogEntry[], limit = 6, now = new Date()): Recipe[] {
  const liked = recipes.filter((r) => r.favorite || (r.rating ?? 0) >= 4);
  const cookedCount = new Map<string, number>();
  for (const c of cookLog) cookedCount.set(c.recipeId, (cookedCount.get(c.recipeId) ?? 0) + 1);
  const seeds = liked.length
    ? liked
    : recipes.filter((r) => cookedCount.has(r.id));
  if (!seeds.length) return [];
  const seedFeatures = seeds.map((s) => [s, recipeFeatures(s)] as const);
  const seedIds = new Set(seeds.map((s) => s.id));
  return recipes
    .filter((r) => !r.disliked)
    .filter((r) => !seedIds.has(r.id))
    .filter((r) => {
      const since = daysSinceCooked(r.id, cookLog, now);
      return since === undefined || since > 7;
    })
    .map((r) => {
      const f = recipeFeatures(r);
      return { r, s: Math.max(...seedFeatures.map(([s, sf]) => similarity(s, sf, r, f))) };
    })
    .filter((x) => x.s > 0.1)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.r);
}

export type PlannedUse = {
  itemId: string;
  itemName: string;
  unit: string;
  available: number;
  amount: number;
  ingredient: string;
};

/**
 * Work out how much of each inventory item cooking `recipe` would use. Uses
 * the soonest-expiring stock first. When units can't be compared (e.g. "4
 * cloves garlic" vs "1 head") the suggestion is 0 and the user can adjust it.
 */
export function planConsumption(
  recipe: Recipe,
  inventory: InventoryItem[],
  staples: string[],
  now = new Date(),
): PlannedUse[] {
  const usable = usableInventory(inventory, now).sort((a, b) =>
    (a.expiresOn ?? "9999").localeCompare(b.expiresOn ?? "9999"),
  );
  const remaining = new Map(usable.map((i) => [i.id, i.quantity]));
  const plan: PlannedUse[] = [];
  for (const ing of recipe.ingredients) {
    const m = matchIngredient(ing, usable, staples);
    if (m.items.length === 0) continue;
    let need = ing.quantity;
    for (const item of m.items) {
      const left = remaining.get(item.id) ?? 0;
      let amount = 0;
      if (need !== undefined && need > 0) {
        const needInItemUnit = convert(need, ing.unit ?? "", item.unit);
        if (needInItemUnit !== undefined) {
          amount = Math.min(left, needInItemUnit);
          const usedInIngUnit = convert(amount, item.unit, ing.unit ?? "") ?? 0;
          need -= usedInIngUnit;
        }
      }
      amount = Math.round(amount * 100) / 100;
      remaining.set(item.id, left - amount);
      const existing = plan.find((p) => p.itemId === item.id);
      if (existing) {
        existing.amount = Math.round((existing.amount + amount) * 100) / 100;
        existing.ingredient += `, ${ing.name}`;
      } else {
        plan.push({
          itemId: item.id,
          itemName: item.name,
          unit: item.unit,
          available: item.quantity,
          amount,
          ingredient: ing.name,
        });
      }
      if (need === undefined || need <= 1e-9) break;
    }
  }
  return plan;
}
