import { describe, expect, it } from "vitest";

import { parseIngredientLines } from "../ingredients";
import {
  forYou,
  matchRecipe,
  planConsumption,
  recommend,
  shoppingList,
  similarRecipes,
  type RecommendContext,
} from "../recommend";
import type { InventoryItem, Recipe } from "../types";

const NOW = new Date("2026-09-27T12:00:00");

function item(name: string, quantity = 1, unit = "", extra: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: name,
    name,
    quantity,
    unit,
    location: "fridge",
    addedAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...extra,
  };
}

function recipe(id: string, ingredients: string, extra: Partial<Recipe> = {}): Recipe {
  return {
    id,
    title: id,
    description: "",
    servings: 2,
    prepMinutes: 5,
    cookMinutes: 5,
    cuisine: "Test",
    tags: [],
    ingredients: parseIngredientLines(ingredients),
    steps: [],
    favorite: false,
    source: "user",
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...extra,
  };
}

function ctx(inventory: InventoryItem[], recipes: Recipe[]): RecommendContext {
  return { inventory, recipes, staples: ["salt", "pepper", "oil"], cookLog: [], expiringSoonDays: 3, now: NOW };
}

describe("matchRecipe", () => {
  const omelette = recipe("omelette", "3 eggs\nsalt\ncheddar (optional)");

  it("counts staples as available and ignores optional ingredients", () => {
    const m = matchRecipe(omelette, ctx([item("eggs", 6)], [omelette]));
    expect(m.missing).toHaveLength(0);
    expect(m.coverage).toBe(1);
    expect(m.ingredients.find((i) => i.ingredient.name === "salt")?.status).toBe("staple");
  });

  it("flags insufficient quantities as low", () => {
    const m = matchRecipe(omelette, ctx([item("eggs", 2)], [omelette]));
    expect(m.ingredients[0].status).toBe("low");
  });

  it("converts units when checking quantity", () => {
    const r = recipe("r", "500 g flour");
    const m = matchRecipe(r, ctx([item("flour", 1, "kg")], [r]));
    expect(m.ingredients[0].status).toBe("have");
  });

  it("ignores expired and depleted items", () => {
    const m = matchRecipe(
      omelette,
      ctx([item("eggs", 6, "", { expiresOn: "2026-09-20" })], [omelette]),
    );
    expect(m.missing.map((i) => i.name)).toEqual(["eggs"]);
  });

  it("boosts recipes that use soon-expiring items", () => {
    const a = recipe("a", "spinach\neggs");
    const b = recipe("b", "rice\neggs");
    const inventory = [
      item("spinach", 1, "bag", { expiresOn: "2026-09-28" }),
      item("eggs", 6),
      item("rice", 1, "kg"),
    ];
    const recs = recommend(ctx(inventory, [a, b]));
    expect(recs.ready[0].recipe.id).toBe("a");
    expect(recs.ready[0].usesExpiring.map((i) => i.name)).toEqual(["spinach"]);
  });
});

describe("recommend", () => {
  it("buckets recipes by how many ingredients are missing", () => {
    const ready = recipe("ready", "eggs");
    const almost = recipe("almost", "eggs\nmilk");
    const far = recipe("far", "eggs\nmilk\nflour\nsugar\nbutter");
    const recs = recommend(ctx([item("eggs", 12)], [ready, almost, far]));
    expect(recs.ready.map((m) => m.recipe.id)).toEqual(["ready"]);
    expect(recs.almost.map((m) => m.recipe.id)).toEqual(["almost"]);
    expect(recs.stretch).toHaveLength(0);
    expect(shoppingList(recs.almost)).toEqual([{ name: "milk", forRecipes: ["almost"] }]);
  });
});

describe("planConsumption", () => {
  it("deducts converted amounts, soonest-expiring first", () => {
    const r = recipe("r", "300 g flour\n2 eggs\nsalt");
    const inventory = [
      item("flour", 1, "kg", { id: "late", expiresOn: "2027-01-01" }),
      item("flour", 0.2, "kg", { id: "early", expiresOn: "2026-10-01" }),
      item("eggs", 6),
    ];
    const plan = planConsumption(r, inventory, ["salt"], NOW);
    expect(plan).toEqual([
      expect.objectContaining({ itemId: "early", amount: 0.2 }),
      expect.objectContaining({ itemId: "late", amount: 0.1 }),
      expect.objectContaining({ itemId: "eggs", amount: 2 }),
    ]);
  });
});

describe("content-based suggestions", () => {
  const a = recipe("a", "chicken\nrice\nsoy sauce", { tags: ["asian"], favorite: true });
  const b = recipe("b", "chicken\nrice\nginger", { tags: ["asian"] });
  const c = recipe("c", "flour\nsugar\nbutter", { tags: ["baking"] });

  it("finds similar recipes", () => {
    expect(similarRecipes(a, [a, b, c]).map((r) => r.id)).toEqual(["b"]);
  });

  it("suggests recipes like your favourites", () => {
    expect(forYou([a, b, c], [], 6, NOW).map((r) => r.id)).toEqual(["b"]);
  });
});
