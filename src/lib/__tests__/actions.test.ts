import { beforeEach, describe, expect, it } from "vitest";

import {
  addItem,
  addItemsBulk,
  consumeItem,
  cookRecipe,
  discardItem,
  restoreBackup,
  saveRecipe,
} from "../actions";
import { createDatabase } from "../database";
import { getDb, replaceDb } from "../store";

function form(values: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

beforeEach(() => replaceDb({ ...createDatabase(), recipes: [] }));

describe("inventory actions", () => {
  it("adds items, restocks matches and logs history", () => {
    expect(addItem({}, form({ name: "Eggs", quantity: "6", unit: "", location: "fridge", expiresOn: "", notes: "" })).ok).toBe(true);
    const res = addItemsBulk({}, form({ lines: "6 eggs\n1 kg rice", location: "fridge", expiresOn: "" }));
    expect(res.message).toBe("Added 2 items");

    const db = getDb();
    expect(db.inventory.map((i) => [i.name, i.quantity])).toEqual([["Eggs", 12], ["rice", 1]]);
    expect(db.events.map((e) => e.type)).toEqual(["added", "restocked", "added"]);
  });

  it("validates input", () => {
    const res = addItem({}, form({ name: "", quantity: "0", unit: "", location: "fridge", expiresOn: "", notes: "" }));
    expect(res.ok).toBe(false);
    expect(Object.keys(res.errors ?? {})).toEqual(expect.arrayContaining(["name", "quantity"]));
  });

  it("removes items that are used up but keeps their history", () => {
    addItem({}, form({ name: "Milk", quantity: "1", unit: "l", location: "fridge", expiresOn: "", notes: "" }));
    const id = getDb().inventory[0].id;
    consumeItem(id, {}, form({ amount: "5" }));
    expect(getDb().inventory).toHaveLength(0);
    expect(getDb().events.at(-1)).toMatchObject({ type: "used", quantityDelta: -1, note: "Used up" });
  });

  it("records tossed items", () => {
    addItem({}, form({ name: "Spinach", quantity: "1", unit: "bag", location: "fridge", expiresOn: "", notes: "" }));
    discardItem(getDb().inventory[0].id, "expired");
    expect(getDb().inventory).toHaveLength(0);
    expect(getDb().events.at(-1)?.type).toBe("expired");
  });
});

describe("recipes and cooking", () => {
  it("saves a recipe and deducts ingredients when cooked", () => {
    addItem({}, form({ name: "eggs", quantity: "6", unit: "", location: "fridge", expiresOn: "", notes: "" }));
    const saved = saveRecipe(
      null,
      {},
      form({
        title: "Eggs",
        description: "",
        servings: "1",
        prepMinutes: "1",
        cookMinutes: "5",
        cuisine: "",
        tags: "Quick, quick",
        ingredients: "2 eggs\nsalt",
        steps: "1. Fry",
      }),
    );
    expect(saved.ok).toBe(true);
    const recipe = getDb().recipes.find((r) => r.id === saved.id)!;
    expect(recipe).toMatchObject({ cuisine: "Other", tags: ["quick"], steps: ["Fry"] });

    const eggs = getDb().inventory[0];
    cookRecipe(recipe.id, {}, form({ [`use:${eggs.id}`]: "2" }));
    expect(getDb().inventory[0].quantity).toBe(4);
    expect(getDb().cookLog).toHaveLength(1);
    expect(getDb().events.at(-1)).toMatchObject({ type: "cooked", recipeId: recipe.id });
  });
});

describe("backups", () => {
  it("restores a valid backup and rejects junk", () => {
    const backup = { ...createDatabase(), recipes: [] };
    backup.settings.expiringSoonDays = 9;
    expect(restoreBackup(JSON.stringify(backup)).ok).toBe(true);
    expect(getDb().settings.expiringSoonDays).toBe(9);
    expect(restoreBackup("{}").ok).toBe(false);
    expect(restoreBackup("not json").ok).toBe(false);
  });
});
