import { beforeEach, describe, expect, it } from "vitest";

import { addItemsBulk, cookRecipe, importMealHistory, logRecommendations, toggleDislike, toggleFavorite } from "../actions";
import { createDatabase } from "../database";
import { parseIngredientLines } from "../ingredients";
import { mealHistoryToText, parseMealHistory } from "../meal-history";
import { contextFor, matchRecipe, recommend, todayIso } from "../recommend";
import { getDb, mutate, replaceDb } from "../store";
import type { Recipe } from "../types";

function recipe(id: string, title: string, ingredients: string, extra: Partial<Recipe> = {}): Recipe {
  return {
    id, title, description: "", servings: 2, prepMinutes: 5, cookMinutes: 5, cuisine: "Test", tags: [],
    ingredients: parseIngredientLines(ingredients), steps: [], favorite: false, source: "user", createdAt: "", updatedAt: "", ...extra,
  };
}
const form = (v: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, x] of Object.entries(v)) fd.set(k, x);
  return fd;
};
const ids = () => recommend(contextFor(getDb())).ready.map((m) => m.recipe.id);
const score = (id: string) => matchRecipe(getDb().recipes.find((r) => r.id === id)!, contextFor(getDb())).score;

beforeEach(() => {
  replaceDb({ ...createDatabase(), recipes: [] });
  addItemsBulk({}, form({ lines: "1 kg chicken wings\n1 kg rice\n1 bag spinach", location: "fridge", expiresOn: "" }));
  mutate((db) => {
    db.recipes = [
      recipe("a", "Chicken Rice", "chicken wings\nrice", { cuisine: "Thai", tags: ["spicy"] }),
      recipe("b", "Spicy Chicken Rice", "chicken wings\nrice\nspinach", { cuisine: "Thai", tags: ["spicy"] }),
      recipe("c", "Chicken Spinach Rice", "chicken wings\nrice\nspinach", { cuisine: "Italian", tags: ["mild"] }),
    ];
  });
});

describe("save and dislike", () => {
  it("dislike hides the dish and nudges similar ones down; undo restores", () => {
    const before = score("b");
    toggleDislike("a");
    expect(ids()).not.toContain("a");
    expect(score("b")).toBeLessThan(before);
    toggleDislike("a");
    expect(ids()).toContain("a");
  });

  it("saving and disliking are exclusive and logged", () => {
    toggleFavorite("a");
    toggleDislike("a");
    const a = getDb().recipes.find((r) => r.id === "a")!;
    expect([a.favorite, a.disliked]).toEqual([false, true]);
    toggleFavorite("a");
    expect(getDb().recipes.find((r) => r.id === "a")).toMatchObject({ favorite: true, disliked: false });
    expect(getDb().feedback!.map((f) => f.kind)).toEqual(["saved", "disliked", "unsaved", "saved", "undisliked"]);
  });
});

describe("recommendation log", () => {
  it("records once per day and lets often-suggested, never-cooked dishes rest", () => {
    logRecommendations([{ id: "c", title: "Chicken Spinach Rice" }], "balanced");
    logRecommendations([{ id: "c", title: "Chicken Spinach Rice" }], "balanced");
    expect(getDb().recommendationLog).toHaveLength(1);

    const fresh = score("c");
    mutate((db) => {
      for (let d = 1; d <= 5; d++) {
        const date = todayIso(new Date(Date.now() - d * 86400000));
        db.recommendationLog!.push({ id: `x${d}`, date, recipeId: "c", recipeTitle: "Chicken Spinach Rice", focus: "balanced" });
      }
    });
    expect(score("c")).toBeLessThan(fresh);

    cookRecipe("c", {}, form({})); // cooking it resets the count
    expect(score("c")).toBeGreaterThanOrEqual(fresh - 15); // only the "cooked recently" dip remains
  });
});

describe("meal history .txt", () => {
  it("round-trips recommended, cooked, saved and disliked", () => {
    logRecommendations([{ id: "a", title: "Chicken Rice" }], "protein");
    cookRecipe("b", {}, form({}));
    toggleFavorite("b");
    toggleDislike("c");
    const text = mealHistoryToText(getDb());
    expect(parseMealHistory(text).map((l) => [l.kind, l.title])).toEqual([
      ["recommended", "Chicken Rice"],
      ["cooked", "Spicy Chicken Rice"],
      ["saved", "Spicy Chicken Rice"],
      ["disliked", "Chicken Spinach Rice"],
    ]);

    // Fresh start with the same recipe book, then import.
    const recipes = getDb().recipes.map((r) => ({ ...r, favorite: false, disliked: false }));
    replaceDb({ ...createDatabase(), recipes });
    expect(importMealHistory(text + "\n2026-01-01 | saved | Unknown Dish").message).toBe(
      "Imported 4 entries (1 skipped: recipe not in your book)",
    );
    const db = getDb();
    expect(db.recommendationLog![0]).toMatchObject({ recipeId: "a", focus: "protein" });
    expect(db.cookLog.map((c) => c.recipeTitle)).toEqual(["Spicy Chicken Rice"]);
    expect(db.recipes.find((r) => r.id === "b")!.favorite).toBe(true);
    expect(db.recipes.find((r) => r.id === "c")!.disliked).toBe(true);

    expect(importMealHistory(text).message).toBe("Nothing new to import");
    expect(importMealHistory("hello").ok).toBe(false);
  });
});
