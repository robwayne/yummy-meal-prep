import { describe, expect, it } from "vitest";

import { parseIngredientLines } from "../ingredients";
import { activePlan, classify, fitsDiet, recipeBalance, roundItOut } from "../nutrition";
import { recommend, type RecommendContext } from "../recommend";
import { SEED_RECIPES, SEED_RECIPES_V2 } from "../seed-recipes";
import type { InventoryItem, Recipe } from "../types";

const NOW = new Date("2026-09-27T12:00:00");

function recipe(id: string, ingredients: string, extra: Partial<Recipe> = {}): Recipe {
  return {
    id, title: id, description: "", servings: 2, prepMinutes: 5, cookMinutes: 5, cuisine: "Test", tags: [],
    ingredients: parseIngredientLines(ingredients), steps: [], favorite: false, source: "user",
    createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), ...extra,
  };
}

function item(name: string, quantity = 1, unit = ""): InventoryItem {
  return { id: name, name, quantity, unit, location: "fridge", addedAt: NOW.toISOString(), updatedAt: NOW.toISOString() };
}

describe("classify", () => {
  it.each([
    ["chicken thighs", ["protein"], "meat"],
    ["ground beef", ["protein"], "meat"],
    ["salmon fillets", ["protein", "fat"], "seafood"],
    ["shrimp", ["protein"], "seafood"],
    ["eggs", ["protein"], "other"],
    ["black beans", ["protein", "fiber"], "other"],
    ["egg noodles", ["carb"], undefined],
    ["chicken broth", [], undefined],
    ["peanut butter", ["fat"], undefined],
    ["avocado", ["veg", "fat", "fiber"], undefined],
    ["brown rice", ["carb", "fiber"], undefined],
    ["olive oil", ["fat"], undefined],
  ])("%s", (name, groups, kind) => {
    const c = classify(name);
    expect([...c.groups].sort()).toEqual([...groups].sort());
    expect(c.proteinKind).toBe(kind);
  });
});

describe("recipeBalance", () => {
  it("finds every food group and the main protein", () => {
    const b = recipeBalance(recipe("bowl", "chicken breast\nrice\nbroccoli\ncucumber (raw)\nolive oil"));
    expect(b.missing).toEqual([]);
    expect(b.mainProtein?.kind).toBe("meat");
    expect(b.rawVeg).toBe(true);
  });

  it("prefers meat over eggs as the main protein and reports gaps", () => {
    const b = recipeBalance(recipe("r", "2 eggs\nbacon\nbutter"));
    expect(b.mainProtein?.ingredient.name).toBe("bacon");
    expect(b.missing).toEqual(["veg", "carb", "fiber"]);
  });

  it("every new starter recipe is a complete plate with an animal protein", () => {
    for (const r of SEED_RECIPES_V2) {
      const b = recipeBalance({ ...recipe(r.title, ""), ...r });
      expect(b.missing, r.title).toEqual([]);
      expect(["meat", "seafood"], r.title).toContain(b.mainProtein?.kind);
    }
  });
});

describe("diet", () => {
  it("filters meat and seafood", () => {
    const shrimp = recipe("s", "shrimp\nrice");
    const beef = recipe("b", "beef\nrice");
    expect(fitsDiet(shrimp, "pescatarian")).toBe(true);
    expect(fitsDiet(beef, "pescatarian")).toBe(false);
    expect(fitsDiet(shrimp, "vegetarian")).toBe(false);
    expect(fitsDiet(recipe("t", "tofu\nchicken broth (optional)"), "vegetarian")).toBe(true);
  });
});

describe("activePlan", () => {
  it("expires after its end date", () => {
    const plan = { focus: "protein" as const, diet: "everything" as const, until: "2026-09-30", setOn: "2026-09-24" };
    expect(activePlan(plan, "2026-09-30").focus).toBe("protein");
    expect(activePlan(plan, "2026-10-01").focus).toBe("balanced");
    expect(activePlan(undefined, "2026-10-01")).toEqual({ focus: "balanced", diet: "everything" });
  });
});

describe("focus changes the ranking", () => {
  const inventory = ["chicken breast", "rice", "broccoli", "spinach", "carrot", "cucumber", "bell pepper", "black beans", "oats", "eggs", "bread", "butter"].map((n) => item(n));
  const proteinBowl = recipe("protein", "chicken breast\nrice\nbroccoli\noil");
  const vegPlate = recipe("veg", "spinach\ncarrot\ncucumber\nbell pepper\nbroccoli\nrice\noil\neggs", { tags: ["salad"] });
  const fiberBowl = recipe("fiber", "black beans\noats\nspinach\nrice\noil\neggs");
  const toast = recipe("toast", "bread\nbutter\neggs");

  const ctx = (focus: RecommendContext["focus"], diet: RecommendContext["diet"] = "everything"): RecommendContext => ({
    inventory, recipes: [proteinBowl, vegPlate, fiberBowl, toast], staples: ["oil"], cookLog: [],
    expiringSoonDays: 3, focus, diet, now: NOW,
  });
  const top = (c: RecommendContext) => recommend(c).ready[0].recipe.id;

  it("puts the matching recipe first for each focus", () => {
    expect(top(ctx("protein"))).toBe("protein");
    expect(top(ctx("veggies"))).toBe("veg");
    expect(top(ctx("fiber"))).toBe("fiber");
  });

  it("low carb pushes carb-heavy meals down", () => {
    const ids = recommend(ctx("low-carb")).ready.map((m) => m.recipe.id);
    expect(ids.indexOf("toast")).toBeGreaterThan(ids.indexOf("protein"));
  });

  it("prefers meat you have in stock and explains why", () => {
    const m = recommend(ctx("balanced")).ready.find((r) => r.recipe.id === "protein")!;
    expect(m.reasons).toContain("Uses your chicken breast");
  });

  it("vegetarian hides meat dishes", () => {
    expect(recommend(ctx("balanced", "vegetarian")).ready.map((m) => m.recipe.id)).not.toContain("protein");
  });
});

describe("roundItOut", () => {
  it("suggests in-stock items for missing groups, raw veg first", () => {
    const b = recipeBalance(recipe("r", "chicken\nrice\noil"));
    const s = roundItOut(b, [item("broccoli"), item("cucumber"), item("steak")], "everything");
    expect(s).toEqual([{ group: "veg", items: [expect.objectContaining({ name: "cucumber" }), expect.objectContaining({ name: "broccoli" })] }]);
  });
});

it("original starter recipes still classify without errors", () => {
  expect(SEED_RECIPES.every((r) => recipeBalance({ ...recipe(r.title, ""), ...r }).missing.length < 5)).toBe(true);
});

it("counts optional ingredients you have toward the balance", () => {
  const omelette = recipe("omelette", "3 eggs\nbutter\nspinach (optional)");
  const ctx: RecommendContext = {
    inventory: [item("eggs", 6), item("butter"), item("spinach")], recipes: [omelette], staples: [],
    cookLog: [], expiringSoonDays: 3, now: NOW,
  };
  expect(recommend(ctx).ready[0].balance.groups.veg.map((i) => i.name)).toEqual(["spinach"]);
  expect(recommend({ ...ctx, inventory: ctx.inventory.slice(0, 2) }).ready[0].balance.groups.veg).toEqual([]);
});
