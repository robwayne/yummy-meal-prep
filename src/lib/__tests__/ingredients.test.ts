import { describe, expect, it } from "vitest";

import {
  convert,
  formatQuantity,
  ingredientMatches,
  normalizeName,
  parseIngredientLine,
} from "../ingredients";

describe("parseIngredientLine", () => {
  it.each([
    ["2 lb chicken breast", { name: "chicken breast", quantity: 2, unit: "lb" }],
    ["1 1/2 cups rice", { name: "rice", quantity: 1.5, unit: "cup" }],
    ["3 eggs", { name: "eggs", quantity: 3 }],
    ["milk", { name: "milk" }],
    ["200g flour", { name: "flour", quantity: 200, unit: "g" }],
    ["garlic, 4 cloves", { name: "garlic", quantity: 4, unit: "clove" }],
    ["½ cup heavy cream", { name: "heavy cream", quantity: 0.5, unit: "cup" }],
    ["1 can of black beans", { name: "black beans", quantity: 1, unit: "can" }],
    ["2-3 carrots", { name: "carrots", quantity: 3 }],
    ["- 1 onion, finely chopped", { name: "onion", quantity: 1, note: "finely chopped" }],
  ])("parses %s", (line, expected) => {
    expect(parseIngredientLine(line)).toMatchObject(expected);
  });

  it("detects optional ingredients", () => {
    expect(parseIngredientLine("parsley (optional)")).toMatchObject({ name: "parsley", optional: true });
  });

  it("does not treat a lone unit-like word as a unit", () => {
    expect(parseIngredientLine("2 cans")).toMatchObject({ name: "cans", quantity: 2 });
  });

  it("ignores blank lines", () => {
    expect(parseIngredientLine("   ")).toBeUndefined();
  });
});

describe("normalizeName", () => {
  it("strips descriptors, plurals and applies synonyms", () => {
    expect(normalizeName("Fresh Tomatoes")).toBe("tomato");
    expect(normalizeName("Scallions")).toBe("green onion");
    expect(normalizeName("boneless skinless chicken thighs")).toBe("chicken");
    expect(normalizeName("Berries")).toBe("berry");
  });
});

describe("ingredientMatches", () => {
  it("matches equivalent names", () => {
    expect(ingredientMatches("spaghetti", "penne")).toBe(true);
    expect(ingredientMatches("cheddar", "sharp cheddar")).toBe(true);
    expect(ingredientMatches("chicken thighs", "chicken")).toBe(true);
    expect(ingredientMatches("oil", "olive oil")).toBe(true);
    expect(ingredientMatches("cilantro", "coriander")).toBe(true);
  });

  it("does not confuse distinct compounds", () => {
    expect(ingredientMatches("butter", "peanut butter")).toBe(false);
    expect(ingredientMatches("milk", "coconut milk")).toBe(false);
    expect(ingredientMatches("soy sauce", "sauce")).toBe(false);
    expect(ingredientMatches("pepper", "bell pepper")).toBe(false);
    expect(ingredientMatches("potato", "sweet potato")).toBe(false);
    expect(ingredientMatches("egg", "eggplant")).toBe(false);
  });
});

describe("convert", () => {
  it("converts within a dimension", () => {
    expect(convert(1, "kg", "g")).toBe(1000);
    expect(convert(3, "tsp", "tbsp")).toBeCloseTo(1);
    expect(convert(1, "dozen", "")).toBe(12);
  });
  it("refuses across dimensions", () => {
    expect(convert(1, "cup", "g")).toBeUndefined();
  });
});

describe("formatQuantity", () => {
  it("renders friendly fractions", () => {
    expect(formatQuantity(1.5, "cup")).toBe("1½ cups");
    expect(formatQuantity(0.25, "tsp")).toBe("¼ tsp");
    expect(formatQuantity(3, "pcs")).toBe("3");
  });
});

describe("display round-trip", () => {
  it("pluralises units and re-parses", () => {
    expect(formatQuantity(2, "clove")).toBe("2 cloves");
    expect(parseIngredientLine("2 cloves garlic")).toMatchObject({ quantity: 2, unit: "clove", name: "garlic" });
    expect(parseIngredientLine("1 bulb garlic")).toMatchObject({ unit: "head", name: "garlic" });
  });
});
