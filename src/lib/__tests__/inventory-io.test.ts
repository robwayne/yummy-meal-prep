import { beforeEach, describe, expect, it } from "vitest";

import { addItemsBulk, importInventory } from "../actions";
import { createDatabase } from "../database";
import { inventoryToText, parseInventoryLine } from "../inventory-io";
import { getDb, replaceDb } from "../store";

function form(values: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

const bulk = (lines: string, location = "fridge") => addItemsBulk({}, form({ lines, location, expiresOn: "" }));

beforeEach(() => replaceDb({ ...createDatabase(), recipes: [] }));

describe("text list", () => {
  it("parses location and date suffixes", () => {
    expect(parseInventoryLine("2 lb chicken thighs | fridge | 2026-10-01")).toMatchObject({
      name: "chicken thighs", quantity: 2, unit: "lb", location: "fridge", expiresOn: "2026-10-01",
    });
    expect(parseInventoryLine("1 bag rice | Pantry / Cabinet")).toMatchObject({ name: "rice", location: "pantry" });
    expect(parseInventoryLine("# header")).toBeUndefined();
  });

  it("round-trips the whole inventory through Copy list → Quick list", () => {
    bulk("2 lb chicken thighs\n1 dozen eggs\n1 1/2 cups rice (jasmine)", "fridge");
    bulk("3 cans crushed tomatoes\n1 head garlic", "pantry");
    const before = getDb().inventory.map(({ name, quantity, unit, location, notes }) => ({ name, quantity, unit, location, notes }));

    const text = inventoryToText(getDb().inventory);
    replaceDb({ ...createDatabase(), recipes: [] });
    expect(bulk(text, "other").ok).toBe(true);

    const after = getDb().inventory.map(({ name, quantity, unit, location, notes }) => ({ name, quantity, unit, location, notes }));
    const sort = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
    expect(after.sort(sort)).toEqual(before.sort(sort));
  });
});

describe("inventory .txt import", () => {
  it("adds or replaces, and logs history", () => {
    bulk("6 eggs\n1 kg rice");
    const file = inventoryToText(getDb().inventory);

    expect(importInventory(file, "merge").ok).toBe(true);
    expect(getDb().inventory.map((i) => [i.name, i.quantity])).toEqual([["eggs", 12], ["rice", 2]]);

    expect(importInventory(file, "replace").message).toBe("Replaced your inventory with 2 items");
    expect(getDb().inventory.map((i) => [i.name, i.quantity, i.location])).toEqual([["eggs", 6, "fridge"], ["rice", 1, "fridge"]]);
    expect(getDb().events.filter((e) => e.note === "Replaced by import")).toHaveLength(2);
  });

  it("rejects files with no items", () => {
    expect(importInventory("# just a header\n\n", "merge")).toMatchObject({ ok: false });
  });
});
