import { beforeEach, describe, expect, it } from "vitest";

import {
  addItemsBulk,
  addTickedToInventory,
  addToShoppingList,
  addVital,
  consumeItem,
  discardItem,
  toggleShoppingItem,
  setLowThreshold,
  toggleVital,
} from "../actions";
import { createDatabase } from "../database";
import { parseIngredientLines } from "../ingredients";
import { contextFor, recommend } from "../recommend";
import { lowThreshold, onList, recipeGroceries, runningLow } from "../shopping";
import { getDb, mutate, replaceDb } from "../store";
import type { Recipe } from "../types";

function form(values: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}
const bulk = (lines: string, location = "fridge") => addItemsBulk({}, form({ lines, location, expiresOn: "" }));
const idOf = (name: string) => getDb().inventory.find((i) => i.name === name)!.id;

function recipe(id: string, ingredients: string): Recipe {
  return {
    id, title: id, description: "", servings: 2, prepMinutes: 5, cookMinutes: 5, cuisine: "", tags: [],
    ingredients: parseIngredientLines(ingredients), steps: [], favorite: false, source: "user", createdAt: "", updatedAt: "",
  };
}

beforeEach(() => replaceDb({ ...createDatabase(), recipes: [] }));

describe("runningLow", () => {
  it("flags items at or below 1 of their unit, used up, and tossed — but not deliberately removed", () => {
    bulk("4 kg rice\n2 l milk\n6 eggs\n1 bag spinach\n1 jar olives\n3 cans beans");
    consumeItem(idOf("rice"), {}, form({ amount: "3.2" })); // 0.8 kg ≤ 1 kg → low
    consumeItem(idOf("milk"), {}, form({ amount: "0.5" })); // 1.5 l → fine
    consumeItem(idOf("eggs"), {}, form({ amount: "6" })); // out
    discardItem(idOf("spinach"), "expired"); // tossed
    discardItem(idOf("olives"), "removed"); // removed: not shown

    const low = runningLow(getDb());
    expect(low.map((l) => [l.name, l.kind])).toEqual([["eggs", "out"], ["spinach", "out"], ["rice", "low"]]);
    expect(low.find((l) => l.name === "rice")).toMatchObject({ reason: "0.8 kg left · low at 1 kg", quantity: 4, unit: "kg" });
    expect(low.find((l) => l.name === "eggs")).toMatchObject({ reason: "Ran out today", quantity: 6 });
  });

  it("uses your own threshold, in any compatible unit, and 0 means only when out", () => {
    bulk("4 kg rice\n1 bottle fish sauce");
    expect(runningLow(getDb()).map((l) => l.name)).toEqual(["fish sauce"]); // 1 ≤ 1 by default

    setLowThreshold("fish sauce", 0, "bottle");
    setLowThreshold("Rice", 5000, "g");
    const low = runningLow(getDb());
    expect(low.map((l) => [l.name, l.reason])).toEqual([["rice", "4 kg left · low at 5000 g"]]);
    expect(lowThreshold(getDb(), { name: "rice", unit: "kg" })).toEqual({ quantity: 5000, unit: "g", custom: true });

    setLowThreshold("rice", undefined, "kg");
    expect(lowThreshold(getDb(), { name: "rice", unit: "kg" })).toEqual({ quantity: 1, unit: "kg", custom: false });
    expect(runningLow(getDb())).toEqual([]);
  });
});

describe("recipeGroceries", () => {
  it("ranks items that complete a dish first and skips dishes without their protein", () => {
    bulk("1 kg chicken wings\n1 kg rice");
    mutate((db) => {
      db.recipes = [
        recipe("wings & rice", "chicken wings\nrice\nlemon"),
        recipe("wing tacos", "chicken wings\ntortillas\nlemon\nsalsa"),
        recipe("steak", "steak\nrice\nlemon"),
      ];
    });
    const g = recipeGroceries(recommend(contextFor(getDb()), 3));
    expect(g.map((x) => [x.name, x.completes, x.recipes.length])).toEqual([
      ["lemon", 1, 2],
      ["salsa", 0, 1],
      ["tortillas", 0, 1],
    ]);
  });
});

describe("grocery list", () => {
  it("adds without duplicates, then moves ticked items into inventory using your usual amount", () => {
    bulk("2 l milk", "fridge");
    consumeItem(idOf("milk"), {}, form({ amount: "2" }));
    expect(addToShoppingList([{ name: "milk" }, { name: "Milk" }, { name: "bread", quantity: 1, unit: "loaf" }])).toBe(2);
    expect(onList(getDb().shoppingList, "milk")).toBe(true);

    expect(addTickedToInventory().ok).toBe(false);
    toggleShoppingItem(getDb().shoppingList![0].id);
    expect(addTickedToInventory().message).toBe("Added 1 item to your inventory");
    expect(getDb().inventory).toEqual([expect.objectContaining({ name: "milk", quantity: 2, unit: "l", location: "fridge" })]);
    expect(getDb().shoppingList!.map((i) => i.name)).toEqual(["bread"]);
  });
});

describe("vital items", () => {
  it("are always shown when low or out (even removed or never stocked), and listed first", () => {
    bulk("4 kg rice\n2 l milk\n1 jar olives\n6 eggs");
    consumeItem(idOf("rice"), {}, form({ amount: "3.5" })); // low
    consumeItem(idOf("eggs"), {}, form({ amount: "6" })); // out, not vital
    discardItem(idOf("olives"), "removed"); // removed: only shown if vital

    expect(runningLow(getDb()).map((l) => l.name)).toEqual(["eggs", "rice"]);

    toggleVital("Rice");
    toggleVital("olives");
    addVital({}, form({ names: "coffee, rice" }));
    expect(getDb().settings.vital).toEqual(["Rice", "olives", "coffee"]);

    const low = runningLow(getDb());
    expect(low.map((l) => [l.name, l.vital, l.kind])).toEqual([
      ["olives", true, "out"],
      ["coffee", true, "out"],
      ["rice", true, "low"],
      ["eggs", false, "out"],
    ]);
    expect(low[0].reason).toBe("Removed today");
    expect(low[1].reason).toBe("Not in your kitchen");

    toggleVital("rice");
    expect(runningLow(getDb()).find((l) => l.name === "rice")?.vital).toBe(false);
  });
});
