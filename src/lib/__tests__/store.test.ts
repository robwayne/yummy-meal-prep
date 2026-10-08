import { afterEach, describe, expect, it, vi } from "vitest";

import { createDatabase } from "../database";

function fakeStorage(initial: Record<string, string>) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe("storage after the rename", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("moves data saved under the old name to the new one", async () => {
    const old = { ...createDatabase(), recipes: [] };
    old.settings.expiringSoonDays = 9;
    const storage = fakeStorage({ "yummy-meal-prep:db": JSON.stringify(old) });
    vi.stubGlobal("localStorage", storage);
    vi.resetModules();
    const { getDb, STORAGE_KEY } = await import("../store");

    expect(STORAGE_KEY).toBe("hungryhungryrob:db");
    expect(getDb().settings.expiringSoonDays).toBe(9);
    expect(storage.data.has("yummy-meal-prep:db")).toBe(false);
    expect(JSON.parse(storage.data.get("hungryhungryrob:db")!).settings.expiringSoonDays).toBe(9);
  });

  it("prefers data already under the new name", async () => {
    const current = { ...createDatabase(), recipes: [] };
    current.settings.expiringSoonDays = 5;
    const storage = fakeStorage({
      "hungryhungryrob:db": JSON.stringify(current),
      "yummy-meal-prep:db": JSON.stringify({ ...current, settings: { ...current.settings, expiringSoonDays: 1 } }),
    });
    vi.stubGlobal("localStorage", storage);
    vi.resetModules();
    const { getDb } = await import("../store");
    expect(getDb().settings.expiringSoonDays).toBe(5);
  });
});
