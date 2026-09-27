import { expect, it } from "vitest";

import { adaptRecipe } from "../adapt";
import { parseIngredientLines } from "../ingredients";
import type { Recipe } from "../types";

it("rewrites title, steps and the ingredient for a protein swap", () => {
  const r = {
    id: "x", title: "Garlic Butter Chicken Thighs", description: "Crispy chicken thighs.", servings: 4, prepMinutes: 1,
    cookMinutes: 1, cuisine: "", tags: [], favorite: false, source: "seed", createdAt: "", updatedAt: "",
    ingredients: parseIngredientLines("4 chicken thighs\nbutter"),
    steps: ["Season the chicken thighs.", "Sear the thighs skin-side down.", "Rest each thigh.", "THIGHS!"],
  } as Recipe;
  const a = adaptRecipe(r, { from: "chicken thighs", to: "chicken wings" });
  expect(a.title).toBe("Garlic Butter Chicken Wings");
  expect(a.description).toBe("Crispy chicken wings.");
  expect(a.steps).toEqual(["Season the chicken wings.", "Sear the wings skin-side down.", "Rest each wing.", "WINGS!"]);
  expect(a.ingredients[0]).toMatchObject({ name: "chicken wings", quantity: 4, note: "instead of chicken thighs" });
  expect(a.ingredients[1].name).toBe("butter");
  expect(adaptRecipe(r)).toBe(r);
});

it("renames the meat when ground/minced differ only in wording", () => {
  const r = {
    id: "y", title: "Turkey & Sweet Potato Skillet", description: "One-pan ground turkey and sweet potato.", servings: 4,
    prepMinutes: 1, cookMinutes: 1, cuisine: "", tags: [], favorite: false, source: "seed", createdAt: "", updatedAt: "",
    ingredients: parseIngredientLines("1 lb ground turkey"), steps: ["Push aside, add turkey and brown well."],
  } as Recipe;
  const a = adaptRecipe(r, { from: "ground turkey", to: "minced beef" });
  expect(a.title).toBe("Beef & Sweet Potato Skillet");
  expect(a.description).toBe("One-pan minced beef and sweet potato.");
  expect(a.steps[0]).toBe("Push aside, add beef and brown well.");
});
