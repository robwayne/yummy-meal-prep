import { SEED_RECIPES } from "./seed-recipes";
import type { Database } from "./types";

export const DEFAULT_STAPLES = ["salt", "pepper", "water", "oil", "olive oil"];

export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** A fresh database, seeded with the starter recipe book. */
export function createDatabase(): Database {
  const now = new Date().toISOString();
  return {
    version: 1,
    inventory: [],
    events: [],
    recipes: SEED_RECIPES.map((r) => ({
      ...r,
      id: newId(),
      favorite: false,
      source: "seed" as const,
      createdAt: now,
      updatedAt: now,
    })),
    cookLog: [],
    settings: { staples: DEFAULT_STAPLES, expiringSoonDays: 3 },
  };
}

/** Loose check that parsed JSON is a database (used when restoring a backup). */
export function isDatabase(value: unknown): value is Database {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === 1 &&
    Array.isArray(v.inventory) &&
    Array.isArray(v.events) &&
    Array.isArray(v.recipes) &&
    Array.isArray(v.cookLog) &&
    typeof v.settings === "object" &&
    v.settings !== null
  );
}
