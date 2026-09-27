/**
 * Rough nutritional roles of ingredients, and a "balanced plate" profile per
 * recipe. Keyword based, not a calorie counter: the aim is to know whether a
 * meal has a protein (ideally meat or seafood), vegetables, a carb, a fat and
 * some fibre.
 */
import { ingredientMatches, normalizeName } from "./ingredients";
import type { Diet, Focus, InventoryItem, MealPlan, Recipe, RecipeIngredient } from "./types";

export type FoodGroup = "protein" | "veg" | "carb" | "fat" | "fiber";
export type ProteinKind = "meat" | "seafood" | "other";

const MEAT = [
  "chicken", "turkey", "ground turkey", "beef", "ground beef", "steak", "pork", "ground pork", "bacon", "ham",
  "sausage", "lamb", "veal", "duck", "chorizo", "prosciutto", "salami", "pepperoni", "meatball", "venison", "bison",
];
const SEAFOOD = [
  "fish", "salmon", "tuna", "cod", "tilapia", "halibut", "trout", "sardine", "mackerel", "anchovy", "shrimp", "prawn",
  "scallop", "crab", "lobster", "mussel", "clam", "squid", "seafood", "sea bass", "haddock", "mahi mahi",
];
const OTHER_PROTEIN = [
  "egg", "tofu", "tempeh", "seitan", "chickpea", "lentil", "black bean", "kidney bean", "pinto bean", "white bean",
  "cannellini bean", "bean", "edamame", "yogurt", "cottage cheese", "protein powder",
];
/** Vegetables commonly eaten raw (salads, slaws, toppings). */
const RAW_FRIENDLY_VEG = [
  "lettuce", "spinach", "arugula", "rocket", "mixed green", "salad green", "cucumber", "tomato", "cherry tomato",
  "bell pepper", "carrot", "celery", "radish", "cabbage", "red cabbage", "sprout", "avocado", "kale", "snap pea",
];
const COOKED_VEG = [
  "broccoli", "cauliflower", "zucchini", "eggplant", "mushroom", "pea", "green bean", "asparagus", "brussels sprout",
  "leek", "sweet potato", "beet", "squash", "butternut squash", "pumpkin", "bok choy", "corn", "okra",
  "canned tomato", "tomato sauce", "artichoke", "chard", "collard green",
];
const CARB = [
  "rice", "brown rice", "wild rice", "pasta", "noodle", "egg noodle", "rice noodle", "bread", "tortilla", "pita",
  "potato", "sweet potato", "quinoa", "oat", "couscous", "flour", "bagel", "bun", "wrap", "cracker", "barley",
  "corn", "naan", "baguette", "gnocchi", "polenta", "banana",
];
const FAT = [
  "oil", "olive oil", "sesame oil", "coconut oil", "butter", "avocado", "cheese", "cheddar", "mozzarella", "parmesan",
  "feta", "goat cheese", "heavy cream", "cream", "sour cream", "cream cheese", "nut", "almond", "walnut", "cashew",
  "peanut", "peanut butter", "almond butter", "coconut milk", "tahini", "mayonnaise", "olive", "pesto", "bacon",
  "salmon", "sardine", "mackerel",
];
const FIBER = [
  "bean", "black bean", "kidney bean", "pinto bean", "chickpea", "lentil", "oat", "brown rice", "quinoa", "barley",
  "whole wheat", "broccoli", "pea", "avocado", "berry", "apple", "pear", "spinach", "kale", "brussels sprout",
  "cabbage", "carrot", "sweet potato", "chia", "flax", "almond", "artichoke", "cauliflower", "green bean",
];

/** The heavy hitters: legumes, whole grains and seeds. */
const HIGH_FIBER = [
  "bean", "black bean", "kidney bean", "pinto bean", "white bean", "chickpea", "lentil", "split pea", "oat",
  "brown rice", "quinoa", "barley", "whole wheat", "chia", "flax", "berry", "bran",
];

const cache = new Map<string, Set<string>>();

function hits(name: string, list: string[]): boolean {
  return list.some((k) => ingredientMatches(k, name));
}

/** Every role an ingredient plays (e.g. avocado → veg, fat, fiber). */
export function classify(name: string): {
  groups: Set<FoodGroup>;
  proteinKind?: ProteinKind;
  rawFriendly: boolean;
  highFiber: boolean;
} {
  const key = normalizeName(name);
  let tags = cache.get(key);
  if (!tags) {
    tags = new Set<string>();
    if (hits(name, MEAT)) tags.add("meat");
    else if (hits(name, SEAFOOD)) tags.add("seafood");
    else if (hits(name, OTHER_PROTEIN)) tags.add("other-protein");
    if (hits(name, RAW_FRIENDLY_VEG)) tags.add("raw-veg");
    else if (hits(name, COOKED_VEG)) tags.add("cooked-veg");
    if (hits(name, CARB)) tags.add("carb");
    if (hits(name, FAT)) tags.add("fat");
    if (hits(name, FIBER)) tags.add("fiber");
    if (hits(name, HIGH_FIBER)) tags.add("fiber").add("high-fiber");
    cache.set(key, tags);
  }
  const groups = new Set<FoodGroup>();
  let proteinKind: ProteinKind | undefined;
  if (tags.has("meat")) proteinKind = "meat";
  else if (tags.has("seafood")) proteinKind = "seafood";
  else if (tags.has("other-protein")) proteinKind = "other";
  if (proteinKind) groups.add("protein");
  if (tags.has("raw-veg") || tags.has("cooked-veg")) groups.add("veg");
  if (tags.has("carb")) groups.add("carb");
  if (tags.has("fat")) groups.add("fat");
  if (tags.has("fiber")) groups.add("fiber");
  return { groups, proteinKind, rawFriendly: tags.has("raw-veg"), highFiber: tags.has("high-fiber") };
}

export type Balance = {
  /** Ingredients filling each role (required ingredients only). */
  groups: Record<FoodGroup, RecipeIngredient[]>;
  missing: FoodGroup[];
  mainProtein?: { ingredient: RecipeIngredient; kind: ProteinKind };
  /** Recipe serves at least one vegetable raw (a salad, slaw or fresh topping). */
  rawVeg: boolean;
};

const RAW_RECIPE_TAGS = ["no-cook", "salad", "raw"];

/**
 * Food groups in a recipe. Optional ingredients only count when
 * `includeOptional` says so (e.g. because you have them in stock).
 */
export function recipeBalance(
  recipe: Recipe,
  includeOptional: (ing: RecipeIngredient) => boolean = () => false,
): Balance {
  const groups: Record<FoodGroup, RecipeIngredient[]> = { protein: [], veg: [], carb: [], fat: [], fiber: [] };
  let mainProtein: Balance["mainProtein"];
  let rawVeg = false;
  const rawRecipe = recipe.tags.some((t) => RAW_RECIPE_TAGS.includes(t));
  const rank: Record<ProteinKind, number> = { meat: 3, seafood: 3, other: 1 };

  for (const ing of recipe.ingredients) {
    if (ing.optional && !includeOptional(ing)) continue;
    const c = classify(ing.name);
    for (const g of c.groups) groups[g].push(ing);
    if (c.proteinKind && (!mainProtein || rank[c.proteinKind] > rank[mainProtein.kind])) {
      mainProtein = { ingredient: ing, kind: c.proteinKind };
    }
    const servedRaw = rawRecipe || /\braw\b|to serve|for serving|topping|fresh/i.test(ing.note ?? "");
    if (c.groups.has("veg") && c.rawFriendly && servedRaw) rawVeg = true;
  }
  // Plenty of vegetables counts as fibre even without a classic high-fibre food.
  if (!groups.fiber.length && groups.veg.length >= 2) groups.fiber = [...groups.veg];

  const order: FoodGroup[] = ["protein", "veg", "carb", "fat", "fiber"];
  return { groups, missing: order.filter((g) => !groups[g].length), mainProtein, rawVeg };
}

/** Does the recipe fit the diet? */
export function fitsDiet(recipe: Recipe, diet: Diet): boolean {
  if (diet === "everything") return true;
  return !recipe.ingredients.some((ing) => {
    if (ing.optional) return false;
    const kind = classify(ing.name).proteinKind;
    return kind === "meat" || (diet === "vegetarian" && kind === "seafood");
  });
}

export const FOCUS_INFO: Record<Focus, { label: string; icon: string; blurb: string }> = {
  balanced: { label: "Balanced", icon: "⚖️", blurb: "Protein, veg, carbs, fat and fibre on every plate" },
  protein: { label: "High protein", icon: "💪", blurb: "Meat and seafood first, plenty of protein" },
  veggies: { label: "More veggies", icon: "🥦", blurb: "Veg-heavy meals, raw where possible" },
  fiber: { label: "High fibre", icon: "🌾", blurb: "Beans, whole grains and fibrous veg" },
  "low-carb": { label: "Low carb", icon: "🥩", blurb: "Go easy on rice, pasta, bread and potatoes" },
};

export const DIET_INFO: Record<Diet, { label: string }> = {
  everything: { label: "No restrictions" },
  pescatarian: { label: "Pescatarian" },
  vegetarian: { label: "Vegetarian" },
};

export const GROUP_INFO: Record<FoodGroup, { label: string; icon: string }> = {
  protein: { label: "Protein", icon: "🍗" },
  veg: { label: "Veg", icon: "🥦" },
  carb: { label: "Carbs", icon: "🍚" },
  fat: { label: "Fat", icon: "🥑" },
  fiber: { label: "Fibre", icon: "🌾" },
};

/** The plan in force today; an expired plan falls back to balanced / no restrictions. */
export function activePlan(plan: MealPlan | undefined, today: string): { focus: Focus; diet: Diet; plan?: MealPlan } {
  if (!plan || (plan.until && plan.until < today)) return { focus: "balanced", diet: "everything" };
  return { focus: plan.focus, diet: plan.diet, plan };
}

export type NutritionScore = { score: number; reasons: string[] };

/**
 * Score how well a recipe fits a balanced plate plus this week's focus.
 * `inStock` is the usable inventory, used to prefer meats you already have.
 */
export function nutritionScore(
  recipe: Recipe,
  balance: Balance,
  focus: Focus,
  diet: Diet,
  inStock: InventoryItem[],
): NutritionScore {
  const reasons: string[] = [];
  const g = balance.groups;
  const present = 5 - balance.missing.length;
  let score = present * 5;
  if (balance.missing.length === 0) reasons.push("Balanced plate");
  if (balance.rawVeg) score += 4;

  const main = balance.mainProtein;
  const animal = main && (main.kind === "meat" || main.kind === "seafood");
  const wantsAnimal = diet === "everything" ? true : diet === "pescatarian" ? main?.kind === "seafood" : false;
  if (!main) score -= 10;
  else if (animal && wantsAnimal) {
    score += 8;
    const stocked = inStock.find((i) => ingredientMatches(main.ingredient.name, i.name));
    if (stocked) {
      score += 10;
      reasons.push(`Uses your ${stocked.name}`);
    }
  }

  switch (focus) {
    case "protein":
      score += Math.min(24, g.protein.length * 8) + (animal ? 10 : 0) + (recipe.tags.includes("high-protein") ? 6 : 0);
      if (!main) score -= 25;
      if (g.protein.length) reasons.push(`Protein: ${g.protein.map((i) => i.name).join(", ")}`);
      break;
    case "veggies":
      score += Math.min(30, g.veg.length * 7) + (balance.rawVeg ? 6 : 0) - (g.veg.length ? 0 : 25);
      if (g.veg.length >= 2) reasons.push(`${g.veg.length} kinds of veg${balance.rawVeg ? ", some raw" : ""}`);
      break;
    case "fiber": {
      const points = g.fiber.reduce((sum, i) => sum + (classify(i.name).highFiber ? 10 : 5), 0);
      score += Math.min(30, points) - (g.fiber.length ? 0 : 20);
      if (g.fiber.length >= 2) reasons.push(`Fibre from ${g.fiber.slice(0, 3).map((i) => i.name).join(", ")}`);
      break;
    }
    case "low-carb":
      score += g.carb.length ? -15 * g.carb.length : 12;
      if (!g.carb.length) reasons.push("Low carb");
      break;
    case "balanced":
      score += present * 3;
      break;
  }
  return { score, reasons };
}

function sideRank(item: InventoryItem): number {
  const c = classify(item.name);
  return (c.proteinKind === "meat" || c.proteinKind === "seafood" ? 2 : 0) + (c.rawFriendly ? 1 : 0);
}

export type SideSuggestion = { group: FoodGroup; items: InventoryItem[] };

/** Proteins that can stand in for each other in a recipe. */
const PROTEIN_SWAPS: string[][] = [
  [
    "chicken thigh", "chicken breast", "chicken wing", "chicken drumstick", "chicken leg", "chicken tender",
    "whole chicken", "rotisserie chicken", "chicken quarter",
  ],
  ["ground beef", "ground turkey", "ground pork", "ground chicken", "ground lamb"],
  ["cod", "tilapia", "haddock", "halibut", "sea bass", "pollock", "hake", "white fish"],
  ["salmon", "trout", "arctic char"],
  ["shrimp", "scallop"],
];

/** Other proteins that could replace this one, or [] if it isn't a swappable protein. */
export function proteinSubstitutes(name: string): string[] {
  const group = PROTEIN_SWAPS.find((g) => g.some((m) => ingredientMatches(m, name)));
  return group ? group.filter((m) => !ingredientMatches(m, name)) : [];
}

/** Ingredients that make no sense served as a side on their own. */
const NOT_A_SIDE = ["canned tomato", "tomato sauce", "tomato paste", "flour", "oil", "olive oil", "butter", "cream"];

/** In-stock items that could fill a recipe's missing food groups as a side (animal protein and raw veg first). */
export function roundItOut(balance: Balance, inStock: InventoryItem[], diet: Diet): SideSuggestion[] {
  return balance.missing
    .filter((g) => g !== "fiber" || !balance.missing.includes("veg"))
    .map((group) => ({
      group,
      items: inStock
        .filter((i) => {
          const c = classify(i.name);
          if (!c.groups.has(group) || NOT_A_SIDE.some((n) => ingredientMatches(n, i.name))) return false;
          if (group === "protein" && diet !== "everything") {
            return c.proteinKind === "other" || (diet === "pescatarian" && c.proteinKind === "seafood");
          }
          return true;
        })
        .sort((a, b) => sideRank(b) - sideRank(a))
        .slice(0, 3),
    }))
    .filter((s) => s.items.length > 0);
}
