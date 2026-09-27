/**
 * Ingredient text parsing, name normalisation, matching and unit conversion.
 * Pure functions only — safe to use on the server and in the browser.
 */

const UNIT_ALIASES: Record<string, string> = {
  g: "g", gram: "g", grams: "g", gr: "g",
  kg: "kg", kilo: "kg", kilos: "kg", kilogram: "kg", kilograms: "kg",
  mg: "mg",
  oz: "oz", ounce: "oz", ounces: "oz",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
  ml: "ml", milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml",
  l: "l", liter: "l", liters: "l", litre: "l", litres: "l",
  tsp: "tsp", teaspoon: "tsp", teaspoons: "tsp",
  tbsp: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp", tbs: "tbsp",
  cup: "cup", cups: "cup", c: "cup",
  pint: "pint", pints: "pint", pt: "pint",
  quart: "quart", quarts: "quart", qt: "quart",
  gallon: "gallon", gallons: "gallon", gal: "gallon",
  "fl oz": "fl oz",
  pcs: "pcs", pc: "pcs", piece: "pcs", pieces: "pcs", x: "pcs",
  clove: "clove", cloves: "clove",
  can: "can", cans: "can", tin: "can", tins: "can",
  jar: "jar", jars: "jar",
  bottle: "bottle", bottles: "bottle",
  bag: "bag", bags: "bag",
  box: "box", boxes: "box",
  pack: "pack", packs: "pack", package: "pack", packages: "pack", pkg: "pack",
  bunch: "bunch", bunches: "bunch",
  head: "head", heads: "head", bulb: "head", bulbs: "head",
  slice: "slice", slices: "slice",
  stick: "stick", sticks: "stick",
  dozen: "dozen",
  pinch: "pinch", pinches: "pinch",
  sprig: "sprig", sprigs: "sprig",
  loaf: "loaf", loaves: "loaf",
  fillet: "fillet", fillets: "fillet",
};

export const COMMON_UNITS = [
  "pcs", "g", "kg", "oz", "lb", "ml", "l", "cup", "tbsp", "tsp",
  "can", "jar", "bottle", "bag", "box", "pack", "bunch", "head", "clove", "slice", "dozen",
];

type Dimension = "mass" | "volume" | "count";

/** Conversion factor to the base unit of each dimension (g, ml, pcs). */
const UNIT_FACTORS: Record<string, { dim: Dimension; factor: number }> = {
  mg: { dim: "mass", factor: 0.001 },
  g: { dim: "mass", factor: 1 },
  kg: { dim: "mass", factor: 1000 },
  oz: { dim: "mass", factor: 28.3495 },
  lb: { dim: "mass", factor: 453.592 },
  ml: { dim: "volume", factor: 1 },
  l: { dim: "volume", factor: 1000 },
  tsp: { dim: "volume", factor: 4.92892 },
  tbsp: { dim: "volume", factor: 14.7868 },
  "fl oz": { dim: "volume", factor: 29.5735 },
  cup: { dim: "volume", factor: 236.588 },
  pint: { dim: "volume", factor: 473.176 },
  quart: { dim: "volume", factor: 946.353 },
  gallon: { dim: "volume", factor: 3785.41 },
  pcs: { dim: "count", factor: 1 },
  "": { dim: "count", factor: 1 },
  dozen: { dim: "count", factor: 12 },
};

export function normalizeUnit(unit: string | undefined): string {
  if (!unit) return "";
  const u = unit.trim().toLowerCase().replace(/\.$/, "");
  return UNIT_ALIASES[u] ?? u;
}

/**
 * Convert `quantity` from one unit to another. Returns undefined when the
 * units measure different things (e.g. grams vs cups).
 */
export function convert(quantity: number, from: string, to: string): number | undefined {
  const f = normalizeUnit(from);
  const t = normalizeUnit(to);
  if (f === t) return quantity;
  const a = UNIT_FACTORS[f];
  const b = UNIT_FACTORS[t];
  if (!a || !b || a.dim !== b.dim) return undefined;
  return (quantity * a.factor) / b.factor;
}

const UNICODE_FRACTIONS: Record<string, string> = {
  "½": "1/2", "⅓": "1/3", "⅔": "2/3", "¼": "1/4", "¾": "3/4", "⅛": "1/8",
};

function parseNumber(token: string): number | undefined {
  if (/^\d+\/\d+$/.test(token)) {
    const [n, d] = token.split("/").map(Number);
    return d ? n / d : undefined;
  }
  if (/^\d*\.?\d+$/.test(token)) return Number(token);
  return undefined;
}

export type ParsedIngredient = {
  name: string;
  quantity?: number;
  unit?: string;
  note?: string;
  optional?: boolean;
};

/**
 * Parse free-form lines such as "2 lb chicken breast", "1 1/2 cups rice",
 * "3 eggs", "milk", "garlic, 4 cloves", "parsley (optional)".
 */
export function parseIngredientLine(raw: string): ParsedIngredient | undefined {
  let line = raw.trim().replace(/^[-*•]\s*/, "");
  for (const [k, v] of Object.entries(UNICODE_FRACTIONS)) line = line.replaceAll(k, ` ${v}`);
  line = line.replace(/\s+/g, " ").trim();
  if (!line) return undefined;

  let optional = false;
  if (/\(optional\)|,\s*optional$/i.test(line)) {
    optional = true;
    line = line.replace(/\(optional\)|,\s*optional$/i, "").trim();
  }

  let note: string | undefined;
  const paren = line.match(/\(([^)]*)\)/);
  if (paren) {
    note = paren[1].trim() || undefined;
    line = line.replace(paren[0], "").replace(/\s+/g, " ").trim();
  }

  // "garlic, 4 cloves" → "4 cloves garlic"
  const trailing = line.match(/^(.*?),\s*([\d./]+(?:\s+[\d/]+)?\s*[a-zA-Z. ]*)$/);
  if (trailing && /^\d/.test(trailing[2])) line = `${trailing[2]} ${trailing[1]}`;
  else if (line.includes(",")) {
    const [head, ...rest] = line.split(",");
    const extra = rest.join(",").trim();
    if (extra) note = note ? `${note}; ${extra}` : extra;
    line = head.trim();
  }

  // Allow "2x eggs" / "200g flour"
  line = line.replace(/^(\d+(?:\.\d+)?)([a-zA-Z]+)\b/, "$1 $2");

  const tokens = line.split(" ");
  let quantity: number | undefined;
  let i = 0;
  const first = tokens[0] !== undefined ? parseNumber(tokens[0]) : undefined;
  if (first !== undefined) {
    quantity = first;
    i = 1;
    const second = tokens[1] !== undefined && /\//.test(tokens[1]) ? parseNumber(tokens[1]) : undefined;
    if (second !== undefined) {
      quantity += second;
      i = 2;
    } else if (tokens[1] === "-" || /^\d/.test(tokens[1] ?? "")) {
      // ranges like "2 - 3" or "2-3": take the upper bound
      const upper = parseNumber(tokens[1] === "-" ? tokens[2] ?? "" : tokens[1]);
      if (upper !== undefined) {
        quantity = upper;
        i = tokens[1] === "-" ? 3 : 2;
      }
    }
  } else if (/^\d+-\d+$/.test(tokens[0] ?? "")) {
    quantity = Number(tokens[0].split("-")[1]);
    i = 1;
  } else if (/^(a|an)$/i.test(tokens[0] ?? "") && tokens.length > 1) {
    quantity = 1;
    i = 1;
  }

  let unit: string | undefined;
  if (quantity !== undefined && tokens[i]) {
    const twoWord = `${tokens[i]} ${tokens[i + 1] ?? ""}`.toLowerCase();
    if (twoWord === "fl oz") {
      unit = "fl oz";
      i += 2;
    } else {
      const candidate = tokens[i].toLowerCase().replace(/\.$/, "");
      if (UNIT_ALIASES[candidate] && tokens.length > i + 1) {
        unit = UNIT_ALIASES[candidate];
        i += 1;
      }
    }
    if (tokens[i]?.toLowerCase() === "of") i += 1;
  }

  const name = tokens.slice(i).join(" ").trim();
  if (!name) return undefined;
  return { name, quantity, unit, note, optional: optional || undefined };
}

export function parseIngredientLines(text: string): ParsedIngredient[] {
  return text
    .split(/\r?\n/)
    .map(parseIngredientLine)
    .filter((x): x is ParsedIngredient => Boolean(x));
}

/** Words that describe preparation/state rather than the ingredient itself. */
const DESCRIPTORS = new Set([
  "fresh", "freshly", "chopped", "diced", "minced", "sliced", "grated", "shredded", "large",
  "small", "medium", "ripe", "raw", "cooked", "boneless", "skinless", "frozen", "dried", "whole",
  "finely", "roughly", "thinly", "peeled", "crushed", "ground", "to", "taste", "unsalted", "salted",
  "organic", "extra", "virgin", "plain", "cold", "warm", "softened", "melted", "beaten", "lean",
  "the", "and", "or", "for", "serving", "some", "cubed", "halved", "rinsed", "drained", "packed",
  "low", "sodium", "reduced", "fat", "free", "light", "leftover", "day", "old", "store", "bought",
]);

const SYNONYMS: Record<string, string> = {
  scallion: "green onion",
  scallions: "green onion",
  "spring onion": "green onion",
  "garbanzo bean": "chickpea",
  cilantro: "coriander",
  "coriander leaf": "coriander",
  aubergine: "eggplant",
  courgette: "zucchini",
  capsicum: "bell pepper",
  "sweet pepper": "bell pepper",
  "red pepper": "bell pepper",
  "green pepper": "bell pepper",
  "yellow pepper": "bell pepper",
  "caster sugar": "sugar",
  "granulated sugar": "sugar",
  "white sugar": "sugar",
  "all purpose flour": "flour",
  "plain flour": "flour",
  "ap flour": "flour",
  "vegetable oil": "oil",
  "canola oil": "oil",
  "cooking oil": "oil",
  "egg yolk": "egg",
  "egg white": "egg",
  "minced beef": "ground beef",
  "beef mince": "ground beef",
  "hamburger meat": "ground beef",
  "heavy whipping cream": "heavy cream",
  "double cream": "heavy cream",
  "whipping cream": "heavy cream",
  "parmigiano reggiano": "parmesan",
  "parmesan cheese": "parmesan",
  "spaghetti": "pasta",
  "penne": "pasta",
  "linguine": "pasta",
  "fusilli": "pasta",
  "macaroni": "pasta",
  "rigatoni": "pasta",
  "fettuccine": "pasta",
  "jasmine rice": "rice",
  "basmati rice": "rice",
  "white rice": "rice",
  "long grain rice": "rice",
  "tomato puree": "tomato sauce",
  "passata": "tomato sauce",
  "crushed tomato": "canned tomato",
  "diced tomato": "canned tomato",
  "tinned tomato": "canned tomato",
  "chopped tomato": "canned tomato",
  "shallot": "onion",
  "yellow onion": "onion",
  "white onion": "onion",
  "brown onion": "onion",
  "red onion": "onion",
  "chili": "chili pepper",
  "chilli": "chili pepper",
  "jalapeno": "chili pepper",
  "chile": "chili pepper",
  "soy": "soy sauce",
  "shoyu": "soy sauce",
  "tamari": "soy sauce",
  "chicken stock": "chicken broth",
  "vegetable stock": "vegetable broth",
  "beef stock": "beef broth",
  "stock": "broth",
  "tortilla chip": "tortilla chips",
  "corn tortilla": "tortilla",
  "flour tortilla": "tortilla",
  "greek yogurt": "yogurt",
  "natural yogurt": "yogurt",
  "yoghurt": "yogurt",
  "cheddar cheese": "cheddar",
  "mozzarella cheese": "mozzarella",
  "feta cheese": "feta",
  "garlic clove": "garlic",
  "lemon juice": "lemon",
  "lime juice": "lime",
  "bread crumb": "breadcrumbs",
  "breadcrumb": "breadcrumbs",
  "panko": "breadcrumbs",
  "black pepper": "pepper",
  "black peppercorn": "pepper",
  "sea salt": "salt",
  "kosher salt": "salt",
  "table salt": "salt",
  "baby spinach": "spinach",
  "sirloin": "steak",
  "ribeye": "steak",
  "chicken thigh": "chicken",
  "chicken breast": "chicken",
  "chicken drumstick": "chicken",
  "chicken leg": "chicken",
  "chicken tender": "chicken",
  "rotisserie chicken": "chicken",
};

/** Multi-word ingredients that must not match their individual words (peanut butter ≠ butter). */
const DISTINCT_COMPOUNDS = new Set([
  "peanut butter", "almond butter", "coconut milk", "almond milk", "oat milk", "soy milk",
  "soy sauce", "fish sauce", "hot sauce", "tomato sauce", "oyster sauce", "sweet potato",
  "green onion", "bell pepper", "chili pepper", "cream cheese", "sour cream", "ice cream",
  "heavy cream", "coconut oil", "sesame oil", "olive oil", "baking soda", "baking powder",
  "brown sugar", "powdered sugar", "maple syrup", "corn starch", "cornstarch", "rice vinegar",
  "green bean", "black bean", "kidney bean", "pinto bean", "tortilla chips", "chicken broth",
  "vegetable broth", "beef broth", "ground beef", "ground turkey", "ground pork", "egg noodle",
  "rice noodle", "coconut cream", "tomato paste", "canned tomato", "garlic powder", "onion powder",
  "chili powder", "curry powder", "red pepper flake", "lemon zest", "lime zest", "hot dog",
  "hash brown", "pie crust", "pizza dough", "puff pastry", "brown rice", "wild rice",
]);

function singularize(word: string): string {
  if (word.length <= 3) return word;
  if (/(ss|us|is)$/.test(word)) return word;
  if (/ies$/.test(word)) return word.slice(0, -3) + "y";
  if (/(tomato|potato|mango|avocado)es$/.test(word)) return word.slice(0, -2);
  if (/(ch|sh|x)es$/.test(word)) return word.slice(0, -2);
  if (/oes$/.test(word)) return word.slice(0, -1);
  if (/ves$/.test(word) && word !== "olives" && word !== "chives") return word.slice(0, -3) + "f";
  if (/s$/.test(word)) return word.slice(0, -1);
  return word;
}

/** Canonical form of an ingredient name used for matching. */
export function normalizeName(name: string): string {
  const words = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z\s-]/g, " ")
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(singularize);
  // Check the full name first: "crushed tomatoes" is a canned product, not fresh tomatoes.
  const whole = SYNONYMS[words.join(" ")];
  if (whole) return whole;
  const cleaned = words.filter((w) => !DESCRIPTORS.has(w)).join(" ");
  if (!cleaned) return name.toLowerCase().trim();
  return SYNONYMS[cleaned] ?? cleaned;
}

/** Compounds that are still a kind of their last word, so they can stand in for it (olive oil → "oil"). */
const SPECIFIC_VARIANTS = new Set([
  "olive oil", "coconut oil", "sesame oil", "brown rice", "wild rice", "brown sugar",
  "heavy cream", "egg noodle", "rice noodle", "ground beef", "ground turkey", "ground pork",
  "black bean", "kidney bean", "pinto bean", "green bean",
]);

function containsAllWords(haystack: string, needle: string): boolean {
  const words = new Set(haystack.split(" "));
  return needle.split(" ").every((w) => words.has(w));
}

/**
 * Does an inventory item satisfy a recipe ingredient?
 *
 * - exact canonical match;
 * - the item is a more specific version of what the recipe asks for
 *   ("sharp cheddar" for "cheddar", "olive oil" for "oil") — but never a
 *   distinct compound ("peanut butter" is not "butter");
 * - the recipe asks for something more specific than a generic item
 *   ("chicken thighs" from "chicken") — unless the recipe's ingredient is a
 *   distinct compound ("soy sauce" is not satisfied by "sauce").
 */
export function ingredientMatches(recipeIngredient: string, inventoryItem: string): boolean {
  const r = normalizeName(recipeIngredient);
  const inv = normalizeName(inventoryItem);
  if (r === inv) return true;
  if (containsAllWords(inv, r)) {
    // "egg noodle" is a kind of noodle, not a kind of egg.
    return !DISTINCT_COMPOUNDS.has(inv) || (SPECIFIC_VARIANTS.has(inv) && inv.endsWith(` ${r}`));
  }
  if (containsAllWords(r, inv)) {
    return !DISTINCT_COMPOUNDS.has(r);
  }
  return false;
}

const PLURAL_UNITS = new Set([
  "cup", "clove", "can", "jar", "bottle", "bag", "pack", "slice", "stick", "head", "pinch", "sprig", "fillet",
]);

export function formatQuantity(quantity: number | undefined, unit?: string): string {
  if (quantity === undefined || Number.isNaN(quantity)) return unit ?? "";
  const rounded = Math.round(quantity * 100) / 100;
  const whole = Math.floor(rounded);
  const frac = rounded - whole;
  const fracs: [number, string][] = [[0.25, "¼"], [0.33, "⅓"], [0.5, "½"], [0.67, "⅔"], [0.75, "¾"]];
  const hit = fracs.find(([v]) => Math.abs(frac - v) < 0.02);
  const q = hit ? `${whole || ""}${hit[1]}` : String(rounded);
  const plural = rounded > 1 && PLURAL_UNITS.has(unit ?? "") ? "s" : "";
  const u = unit && unit !== "pcs" ? ` ${unit}${plural}` : "";
  return `${q}${u}`;
}

export function formatIngredient(i: { name: string; quantity?: number; unit?: string }): string {
  const q = formatQuantity(i.quantity, i.unit);
  return q ? `${q} ${i.name}` : i.name;
}
