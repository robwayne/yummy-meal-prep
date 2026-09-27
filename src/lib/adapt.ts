/**
 * Show a recipe with a substituted protein, e.g. "Garlic Butter Chicken
 * Thighs" → "Garlic Butter Chicken Wings" when you only have wings. Display
 * only: the saved recipe is not changed.
 */
import type { Swap } from "./recommend";
import type { Recipe } from "./types";

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Make `replacement` follow the capitalisation of `sample`. */
function matchCase(sample: string, replacement: string): string {
  if (sample === sample.toUpperCase() && /[A-Z]/.test(sample)) return replacement.toUpperCase();
  const words = sample.split(/\s+/);
  if (words.length > 1 && words.every((w) => /^[A-Z]/.test(w))) {
    return replacement.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if (/^[A-Z]/.test(sample)) return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  return replacement;
}

const singular = (w: string) => w.replace(/(ies)$/, "y").replace(/(?<!s)s$/, "");
/** Words that mean the same thing for this purpose ("minced beef" is "ground beef"). */
const same = (a: string, b: string) => {
  const norm = (w: string) => (singular(w) === "minced" ? "ground" : singular(w));
  return norm(a) === norm(b);
};

function replaceSwap(text: string, swap: Swap): string {
  const from = swap.from.toLowerCase().trim();
  const to = swap.to.toLowerCase().trim();
  // 1. The whole name ("chicken thighs" → "chicken wings").
  let out = text.replace(new RegExp(`\\b${escape(from)}\\b`, "gi"), (m) => matchCase(m, to));
  // 2. The words that differ ("thighs" → "wings"), singular or plural.
  const fromWords = from.split(/\s+/);
  const toWords = to.split(/\s+/);
  const onlyFrom = fromWords.filter((w) => !toWords.some((t) => same(t, w)));
  const onlyTo = toWords.filter((w) => !fromWords.some((f) => same(f, w)));
  if (onlyFrom.length && onlyTo.length) {
    const phrase = onlyFrom.map((w) => `${escape(singular(w))}s?`).join("\\s+");
    out = out.replace(new RegExp(`\\b${phrase}\\b`, "gi"), (m) => {
      const plural = /s$/i.test(m);
      const base = onlyTo.map(singular).join(" ");
      return matchCase(m, plural ? `${base}s` : base);
    });
  }
  return out;
}

export function adaptRecipe(recipe: Recipe, swap?: Swap): Recipe {
  if (!swap) return recipe;
  return {
    ...recipe,
    title: replaceSwap(recipe.title, swap),
    description: replaceSwap(recipe.description, swap),
    steps: recipe.steps.map((s) => replaceSwap(s, swap)),
    ingredients: recipe.ingredients.map((i) =>
      i.name === swap.from ? { ...i, name: swap.to, note: `instead of ${swap.from}` } : i,
    ),
  };
}
