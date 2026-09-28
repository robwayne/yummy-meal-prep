import { afterEach, describe, expect, it, vi } from "vitest";

import { fromDummyJson, fromMealDb, searchOnline } from "../online-recipes";

const meal = {
  idMeal: "52893",
  strMeal: "Apple & Blackberry Crumble",
  strCategory: "Dessert",
  strArea: "British",
  strInstructions: "Heat oven to 190C.\r\nMix flour and butter.\r\nBake 40 minutes.",
  strMealThumb: "https://www.themealdb.com/images/media/meals/xvsurr1511719182.jpg",
  strTags: "Pudding",
  strSource: "https://www.bbcgoodfood.com/recipes/778642/apple-and-blackberry-crumble",
  strIngredient1: "Plain Flour",
  strMeasure1: "120g",
  strIngredient2: "Butter",
  strMeasure2: "60g",
  strIngredient3: "Blackberries",
  strMeasure3: "300g",
  strIngredient4: "Cinnamon",
  strMeasure4: "¼ teaspoon",
  strIngredient5: "Sugar",
  strMeasure5: "To taste",
  strIngredient6: "",
  strMeasure6: " ",
};

const cookies = {
  id: 3,
  name: "Chocolate Chip Cookies",
  ingredients: ["All-purpose flour", "Butter, softened", "Brown sugar", "White sugar", "Eggs", "Vanilla extract", "Baking soda", "Salt", "Chocolate chips"],
  instructions: ["Preheat the oven to 350°F (175°C).", "Cream the butter and sugars.", "Bake for 10-12 minutes."],
  prepTimeMinutes: 15,
  cookTimeMinutes: 10,
  servings: 24,
  cuisine: "American",
  tags: ["Cookies", "Chocolate chip"],
  mealType: ["Snack", "Dessert"],
  image: "https://cdn.dummyjson.com/recipe-images/3.webp",
};

describe("converting online recipes", () => {
  it("reads TheMealDB meals with measures", () => {
    const r = fromMealDb(meal);
    expect(r).toMatchObject({ id: "mealdb-52893", externalId: "mealdb:52893", source: "online", cuisine: "British" });
    expect(r.tags).toEqual(["dessert", "pudding", "sweet"]);
    expect(r.ingredients).toEqual([
      { name: "Plain Flour", quantity: 120, unit: "g", note: undefined },
      { name: "Butter", quantity: 60, unit: "g", note: undefined },
      { name: "Blackberries", quantity: 300, unit: "g", note: undefined },
      { name: "Cinnamon", quantity: 0.25, unit: "tsp", note: undefined },
      { name: "Sugar", note: "To taste" },
    ]);
    expect(r.steps).toEqual(["Heat oven to 190C.", "Mix flour and butter.", "Bake 40 minutes."]);
  });

  it("reads DummyJSON recipes and marks snacks", () => {
    const r = fromDummyJson(cookies);
    expect(r).toMatchObject({ externalId: "dummyjson:3", servings: 24, prepMinutes: 15, cookMinutes: 10 });
    expect(r.tags).toEqual(expect.arrayContaining(["cookies", "snack", "dessert"]));
    expect(r.ingredients[1]).toMatchObject({ name: "Butter", note: "softened" });
  });
});

describe("searchOnline", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("combines both sources and falls back to the key word", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(url);
      const body = url.includes("themealdb")
        ? { meals: url.includes("s=cookie") ? [{ ...meal, idMeal: "1", strMeal: "Peanut Butter Cookies" }] : null }
        : { recipes: url.includes("q=cookie") ? [cookies] : [] };
      return new Response(JSON.stringify(body), { status: 200 });
    });
    const { recipes, offline } = await searchOnline("chocolate chip cookies");
    expect(offline).toBe(false);
    expect(recipes.map((r) => r.title)).toEqual(["Chocolate Chip Cookies", "Peanut Butter Cookies"]);
    expect(calls.some((u) => u.includes("s=cookie"))).toBe(true);
  });

  it("reports offline when both sites fail", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await searchOnline("cookie")).toEqual({ recipes: [], offline: true });
  });
});
